import crypto from 'crypto';
import { db } from './db.js';
import {
  LearnerConceptState,
  MistakeRecord,
  MistakeType,
  LearningEvent,
  LearningEventType,
  AdaptiveNextAction,
  LearnerActionType,
  SpacedRepetitionState,
  LearnerAnalyticsDashboardData,
  BloomTaxonomyLevel,
  QuizDifficulty,
} from '../src/types.js';
import { LearnerModelEngine } from './learner.js';

/**
 * ============================================================================
 * Phase 3 — Learner Intelligence Engine
 * ============================================================================
 * Implements:
 * 1. Bayesian Knowledge Tracing (BKT) with documented 4-parameter formulation
 * 2. Monotonic Sample-Bounded Confidence Accumulation
 * 3. Deterministic Exponential Memory Retention Decay & Spaced Repetition
 * 4. Structured Mistake Intelligence with Recurrence Detection
 * 5. Prerequisite-Aware Graph Reasoning (using Phase 2 Concept Graph)
 * 6. Deterministic Next Best Action Recommendation Engine with Traceable Evidence
 * 7. Replay-Protected Idempotent Learning Event System
 */

export interface BKTParameters {
  pL0: number; // Prior probability of initial knowledge
  pT: number;  // Transition probability (learning opportunity)
  pG: number;  // Guess probability (answering correctly without knowing)
  pS: number;  // Slip probability (answering incorrectly despite knowing)
}

export const DEFAULT_BKT_PARAMS: BKTParameters = {
  pL0: 0.20,
  pT: 0.15,
  pG: 0.25, // Standard for 4-option multiple choice
  pS: 0.10,
};

export class LearnerIntelligenceEngine {
  /**
   * --------------------------------------------------------------------------
   * 1. Bayesian Knowledge Tracing (BKT) Engine
   * --------------------------------------------------------------------------
   * Updates knowledge probability P(L_t) given observation O_t in {0, 1}.
   * All updates remain bounded within [0.01, 0.99].
   */
  public static updateBKT(
    priorKnowledge: number,
    isCorrect: boolean,
    params: BKTParameters = DEFAULT_BKT_PARAMS
  ): number {
    // Bound prior to prevent numeric division by zero
    const L_prev = Math.min(Math.max(priorKnowledge, 0.01), 0.99);
    const { pT, pG, pS } = params;

    let posteriorKnown: number;
    if (isCorrect) {
      // P(L_t | O_t = 1) = [P(L_t-1) * (1 - S)] / [P(L_t-1) * (1 - S) + (1 - P(L_t-1)) * G]
      const numerator = L_prev * (1 - pS);
      const denominator = numerator + (1 - L_prev) * pG;
      posteriorKnown = numerator / Math.max(denominator, 1e-6);
    } else {
      // P(L_t | O_t = 0) = [P(L_t-1) * S] / [P(L_t-1) * S + (1 - P(L_t-1)) * (1 - G)]
      const numerator = L_prev * pS;
      const denominator = numerator + (1 - L_prev) * (1 - pG);
      posteriorKnown = numerator / Math.max(denominator, 1e-6);
    }

    // Knowledge transition step: P(L_t+1) = P(L_t | O_t) + (1 - P(L_t | O_t)) * T
    const nextKnowledge = posteriorKnown + (1 - posteriorKnown) * pT;

    // Strict bounding
    return Number(Math.min(Math.max(nextKnowledge, 0.01), 0.99).toFixed(4));
  }

  /**
   * --------------------------------------------------------------------------
   * 2. Confidence Accumulator
   * --------------------------------------------------------------------------
   * Confidence reflects sample certainty. It increases monotonically with
   * accumulated attempts and is strictly capped at 0.98.
   */
  public static computeConfidence(attemptCount: number): number {
    if (attemptCount <= 0) return 0.0;
    // C = 1 - exp(-N / 5.0), capped at 0.98
    const raw = 1.0 - Math.exp(-attemptCount / 5.0);
    return Number(Math.min(Math.max(raw, 0.0), 0.98).toFixed(4));
  }

  /**
   * --------------------------------------------------------------------------
   * 3. Memory Retention Decay & Spaced Repetition
   * --------------------------------------------------------------------------
   * R(t) = exp(-elapsedHours / stabilityHours)
   */
  public static computeRetention(lastAttemptAt?: string, stabilityHours: number = 24.0): number {
    if (!lastAttemptAt) return 1.0;
    const elapsedMs = Date.now() - new Date(lastAttemptAt).getTime();
    const elapsedHours = Math.max(elapsedMs / (1000 * 60 * 60), 0);
    const retention = Math.exp(-elapsedHours / Math.max(stabilityHours, 1.0));
    return Number(Math.min(Math.max(retention, 0.0), 1.0).toFixed(4));
  }

  /**
   * Calculates next review due date given current stability factor.
   * Due threshold is when retention reaches 0.70.
   */
  public static calculateReviewDueDate(lastAttemptAt: string, stabilityHours: number): string {
    const baseDate = new Date(lastAttemptAt).getTime();
    // t_due = -S * ln(0.70) approx S * 0.3567 hours
    const hoursUntilDue = Math.max(stabilityHours * 0.3567, 1.0);
    const dueDateMs = baseDate + hoursUntilDue * 60 * 60 * 1000;
    return new Date(dueDateMs).toISOString();
  }

  /**
   * Determines the Spaced Repetition State.
   */
  public static determineRepetitionState(
    attempts: number,
    mastery: number,
    confidence: number,
    retention: number
  ): SpacedRepetitionState {
    if (attempts === 0) return 'NEW';
    if (retention < 0.60 && attempts >= 1) return 'AT_RISK';
    if (mastery >= 0.85 && confidence >= 0.70 && retention >= 0.70) return 'MASTERED';
    if (mastery < 0.60) return 'LEARNING';
    return 'REVIEW';
  }

  /**
   * --------------------------------------------------------------------------
   * 4. Concept State Retrieval / Initialization
   * --------------------------------------------------------------------------
   */
  public static getOrCreateConceptState(
    learnerId: string,
    projectId: string,
    conceptId: string,
    conceptName?: string
  ): LearnerConceptState {
    const key = `${learnerId}:${projectId}:${conceptId}`;
    let state = db.learnerConceptStates.get(key);

    if (!state) {
      // Resolve concept name if available from DB
      const resolvedName =
        conceptName ||
        db.concepts.get(conceptId)?.name ||
        conceptId.replace(/^cpt_/, '').replace(/_/g, ' ');

      const now = new Date().toISOString();
      state = {
        id: key,
        learnerId,
        projectId,
        conceptId,
        conceptName: resolvedName,
        mastery: 0.20, // Initial prior P(L0)
        confidence: 0.0,
        attemptCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        recentPerformance: [],
        mistakeCount: 0,
        repeatedMistakeCount: 0,
        retentionStrength: 1.0,
        stabilityHours: 24.0,
        reviewDueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        repetitionState: 'NEW',
        updatedAt: now,
      };
      db.learnerConceptStates.set(key, state);
    }

    return state;
  }

  /**
   * --------------------------------------------------------------------------
   * 5. Record Interaction & Update Learner State
   * --------------------------------------------------------------------------
   */
  public static recordInteraction(params: any): any {
    return db.transaction(() => this._recordInteraction(params));
  }
  public static _recordInteraction(params: {
    learnerId: string;
    projectId: string;
    spaceId: string;
    conceptId: string;
    isCorrect: boolean;
    bloomLevel?: BloomTaxonomyLevel;
    questionId?: string;
    learnerAnswer?: string;
    correctAnswer?: string;
    explanation?: string;
    sourceEvidence?: string;
    idempotencyKey?: string;
  }): {
    conceptState: LearnerConceptState;
    mistakeRecord?: MistakeRecord;
    previousMastery: number;
    newMastery: number;
    previousConfidence: number;
    newConfidence: number;
  } {
    const {
      learnerId,
      projectId,
      spaceId,
      conceptId,
      isCorrect,
      bloomLevel = 'application',
      questionId = `q_${Date.now()}`,
      learnerAnswer = '',
      correctAnswer = '',
      explanation = '',
      sourceEvidence = '',
      idempotencyKey,
    } = params;

    // Idempotency check to prevent duplicate submission mutations
    if (idempotencyKey) {
    

      if (db.eventDeduplicationKeys.has(idempotencyKey)) {
        const existingState = this.getOrCreateConceptState(learnerId, projectId, conceptId);
        return {
          conceptState: existingState,
          previousMastery: existingState.mastery,
          newMastery: existingState.mastery,
          previousConfidence: existingState.confidence,
          newConfidence: existingState.confidence,
        };
      }
      db.eventDeduplicationKeys.add(idempotencyKey);
}

    const state = this.getOrCreateConceptState(learnerId, projectId, conceptId);
    const previousMastery = state.mastery;
    const previousConfidence = state.confidence;
    const now = new Date().toISOString();

    // 1. Update attempt counts
    state.attemptCount += 1;
    if (isCorrect) {
      state.correctCount += 1;
      state.lastCorrectAt = now;
      state.stabilityHours = Math.min(state.stabilityHours * 2.2, 720.0);
    } else {
      state.incorrectCount += 1;
      state.stabilityHours = Math.max(state.stabilityHours * 0.5, 12.0);
    }
    state.lastAttemptAt = now;

    // 2. Update recent performance sliding window (max 10)
    state.recentPerformance.push(isCorrect ? 1 : 0);
    if (state.recentPerformance.length > 10) {
      state.recentPerformance.shift();
    }

    // 3. Update BKT mastery
    state.mastery = this.updateBKT(state.mastery, isCorrect);

    // 4. Update confidence monotonically
    state.confidence = this.computeConfidence(state.attemptCount);

    // 5. Update retention and spaced repetition schedule
    state.retentionStrength = this.computeRetention(state.lastAttemptAt, state.stabilityHours);
    state.reviewDueAt = this.calculateReviewDueDate(state.lastAttemptAt, state.stabilityHours);
    state.repetitionState = this.determineRepetitionState(
      state.attemptCount,
      state.mastery,
      state.confidence,
      state.retentionStrength
    );

    let mistakeRecord: MistakeRecord | undefined;

    // 6. Mistake Intelligence handling on incorrect responses
    if (!isCorrect) {
      state.mistakeCount += 1;
      mistakeRecord = this.classifyAndRecordMistake({
        learnerId,
        projectId,
        conceptId,
        questionId,
        learnerAnswer,
        correctAnswer,
        explanation,
        sourceEvidence,
        bloomLevel,
        currentMastery: previousMastery,
      });

      if (mistakeRecord.occurrenceCount > 1) {
        state.repeatedMistakeCount += 1;
      }
    }

    state.updatedAt = now;
    db.learnerConceptStates.set(`${learnerId}:${projectId}:${conceptId}`, state);

    // 7. Log learning event
    this.recordLearningEvent({
      eventId: `evt_${crypto.randomUUID().slice(0, 10)}`,
      learnerId,
      projectId,
      conceptId,
      timestamp: now,
      eventType: isCorrect ? 'QUIZ_ANSWERED' : 'MISTAKE_CREATED',
      payload: {
        isCorrect,
        bloomLevel,
        previousMastery,
        newMastery: state.mastery,
        questionId,
      },
      requestId: idempotencyKey,
    });

    // 8. Bridge to legacy LearnerModelEngine so Phase 1 tests & endpoints remain in sync
    LearnerModelEngine.recordQuizAttempt(
      learnerId,
      projectId,
      spaceId,
      state.conceptName,
      isCorrect,
      bloomLevel,
      mistakeRecord ? `${mistakeRecord.mistakeType}: ${learnerAnswer}` : undefined
    );

    return {
      conceptState: state,
      mistakeRecord,
      previousMastery,
      newMastery: state.mastery,
      previousConfidence,
      newConfidence: state.confidence,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * 6. Mistake Intelligence & Classification
   * --------------------------------------------------------------------------
   */
  public static classifyAndRecordMistake(params: {
    learnerId: string;
    projectId: string;
    conceptId: string;
    questionId: string;
    learnerAnswer: string;
    correctAnswer: string;
    explanation: string;
    sourceEvidence: string;
    bloomLevel: BloomTaxonomyLevel;
    currentMastery: number;
  }): MistakeRecord {
    const {
      learnerId,
      projectId,
      conceptId,
      questionId,
      learnerAnswer,
      correctAnswer,
      explanation,
      sourceEvidence,
      bloomLevel,
      currentMastery,
    } = params;

    // Check for prerequisite weakness in Concept Graph
    const hasWeakPrereq = this.hasWeakPrerequisite(learnerId, projectId, conceptId);

    // Deterministic mistake classification
    let mistakeType: MistakeType;
    if (hasWeakPrereq) {
      mistakeType = 'PREREQUISITE_GAP';
    } else if (currentMastery >= 0.70 && (bloomLevel === 'recall' || bloomLevel === 'comprehension')) {
      mistakeType = 'CARELESS_ERROR';
    } else if (bloomLevel === 'application' || bloomLevel === 'analysis') {
      mistakeType = 'APPLICATION_FAILURE';
    } else if (currentMastery < 0.35 && bloomLevel === 'recall') {
      mistakeType = 'RECALL_FAILURE';
    } else if (
      learnerAnswer.toLowerCase().includes('always') ||
      learnerAnswer.toLowerCase().includes('never') ||
      learnerAnswer.toLowerCase().includes('client') ||
      learnerAnswer.toLowerCase().includes('dual')
    ) {
      // Recognizable conceptual trap
      mistakeType = 'MISCONCEPTION';
    } else {
      mistakeType = 'CONCEPT_GAP';
    }

    // Check for existing mistake to detect recurrence
    const existingMistakes = Array.from(db.mistakeRecords.values()).filter(
      (m) =>
        m.learnerId === learnerId &&
        m.projectId === projectId &&
        m.conceptId === conceptId &&
        !m.resolved
    );

    const now = new Date().toISOString();
    let record: MistakeRecord;

    const matchingMistake = existingMistakes.find(
      (m) => m.mistakeType === mistakeType || m.learnerAnswer === learnerAnswer
    );

    if (matchingMistake) {
      matchingMistake.occurrenceCount += 1;
      matchingMistake.lastSeenAt = now;
      matchingMistake.explanation = explanation;
      record = matchingMistake;
      db.mistakeRecords.set(matchingMistake.mistakeId, matchingMistake);
    } else {
      record = {
        mistakeId: `mst_${crypto.randomUUID().slice(0, 8)}`,
        learnerId,
        projectId,
        conceptId,
        questionId,
        mistakeType,
        learnerAnswer,
        correctAnswer,
        explanation,
        sourceEvidence,
        firstSeenAt: now,
        lastSeenAt: now,
        occurrenceCount: 1,
        resolved: false,
      };
      db.mistakeRecords.set(record.mistakeId, record);
    }

    return record;
  }

  /**
   * --------------------------------------------------------------------------
   * 7. Prerequisite-Aware Reasoning
   * --------------------------------------------------------------------------
   * Checks if concept has prerequisites in Phase 2 Concept Graph with low mastery.
   */
  public static hasWeakPrerequisite(
    learnerId: string,
    projectId: string,
    conceptId: string
  ): boolean {
    const relationships = Array.from(db.conceptRelationships.values()).filter(
      (r) =>
        r.projectId === projectId &&
        r.targetConceptId === conceptId &&
        r.type === 'PREREQUISITE'
    );

    for (const rel of relationships) {
      const prereqState = db.learnerConceptStates.get(
        `${learnerId}:${projectId}:${rel.sourceConceptId}`
      );
      if (prereqState && prereqState.mastery < 0.50) {
        return true;
      }
    }
    return false;
  }

  /**
   * Retrieves prerequisite explanation if upstream concepts are weak.
   */
  public static getPrerequisiteExplanation(
    learnerId: string,
    projectId: string,
    conceptId: string
  ): { prereqConceptId: string; prereqName: string; prereqMastery: number } | null {
    const relationships = Array.from(db.conceptRelationships.values()).filter(
      (r) =>
        r.projectId === projectId &&
        r.targetConceptId === conceptId &&
        r.type === 'PREREQUISITE'
    );

    for (const rel of relationships) {
      const prereqState = db.learnerConceptStates.get(
        `${learnerId}:${projectId}:${rel.sourceConceptId}`
      );
      if (prereqState && prereqState.mastery < 0.50) {
        return {
          prereqConceptId: rel.sourceConceptId,
          prereqName: prereqState.conceptName,
          prereqMastery: prereqState.mastery,
        };
      }
    }
    return null;
  }

  /**
   * --------------------------------------------------------------------------
   * 8. Next Best Action Recommendation Engine
   * --------------------------------------------------------------------------
   * Generates deterministic, evidence-traceable next learning actions.
   */
  public static getNextBestAction(
    learnerId: string,
    projectId: string
  ): AdaptiveNextAction {
    const conceptStates = Array.from(db.learnerConceptStates.values()).filter(
      (s) => s.learnerId === learnerId && s.projectId === projectId
    );

    const now = new Date().toISOString();

    // 1. Priority 1: High Recurrence Mistakes (occurrenceCount >= 2)
    const activeMistakes = Array.from(db.mistakeRecords.values())
      .filter((m) => m.learnerId === learnerId && m.projectId === projectId && !m.resolved)
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount);

    if (activeMistakes.length > 0 && activeMistakes[0].occurrenceCount >= 2) {
      const mistake = activeMistakes[0];
      const state = this.getOrCreateConceptState(learnerId, projectId, mistake.conceptId);
      const priority = Math.min(0.60 + 0.10 * mistake.occurrenceCount, 0.95);

      return {
        action: 'REVIEW_MISTAKE',
        conceptId: mistake.conceptId,
        conceptName: state.conceptName,
        priority: Number(priority.toFixed(2)),
        reason: `Repeated mistake (${mistake.occurrenceCount}x) identified under ${state.conceptName}. Review the specific invariant failure with the AI Tutor.`,
        evidence: [
          `Mistake Type: ${mistake.mistakeType}`,
          `Last Answer: "${mistake.learnerAnswer}"`,
          `Occurrences: ${mistake.occurrenceCount}`,
        ],
        createdAt: now,
      };
    }

    // 2. Priority 2: Prerequisite Weakness Blocking Target Concept
    for (const state of conceptStates) {
      if (state.mastery < 0.60 && state.attemptCount > 0) {
        const prereqInfo = this.getPrerequisiteExplanation(learnerId, projectId, state.conceptId);
        if (prereqInfo) {
          return {
            action: 'STUDY_PREREQUISITE',
            conceptId: prereqInfo.prereqConceptId,
            conceptName: prereqInfo.prereqName,
            priority: 0.88,
            reason: `Concept "${state.conceptName}" may be difficult because prerequisite concept "${prereqInfo.prereqName}" has lower demonstrated mastery (${Math.round(prereqInfo.prereqMastery * 100)}%).`,
            evidence: [
              `Target concept mastery: ${Math.round(state.mastery * 100)}%`,
              `Prerequisite concept mastery: ${Math.round(prereqInfo.prereqMastery * 100)}%`,
              `Graph Relationship: PREREQUISITE`,
            ],
            createdAt: now,
          };
        }
      }
    }

    // 3. Priority 3: Forgetting Risk (AT_RISK Spaced Repetition concepts)
    const atRiskConcepts = conceptStates
      .filter((s) => s.repetitionState === 'AT_RISK' || s.retentionStrength < 0.60)
      .sort((a, b) => a.retentionStrength - b.retentionStrength);

    if (atRiskConcepts.length > 0) {
      const atRisk = atRiskConcepts[0];
      return {
        action: 'REVIEW_CONCEPT',
        conceptId: atRisk.conceptId,
        conceptName: atRisk.conceptName,
        priority: 0.82,
        reason: `Retention estimate for "${atRisk.conceptName}" has decayed to ${Math.round(atRisk.retentionStrength * 100)}%. Spaced review recommended to prevent forgetting.`,
        evidence: [
          `Retention Strength: ${Math.round(atRisk.retentionStrength * 100)}%`,
          `Stability: ${atRisk.stabilityHours}h`,
          `Last Practiced: ${atRisk.lastAttemptAt || 'Never'}`,
        ],
        createdAt: now,
      };
    }

    // 4. Priority 4: Low Mastery Concepts Needing Practice
    const lowMastery = conceptStates
      .filter((s) => s.mastery < 0.60)
      .sort((a, b) => a.mastery - b.mastery);

    if (lowMastery.length > 0) {
      const target = lowMastery[0];
      return {
        action: target.attemptCount === 0 ? 'READ_SOURCE' : 'PRACTICE_QUIZ',
        conceptId: target.conceptId,
        conceptName: target.conceptName,
        priority: 0.75,
        reason: `Current mastery estimate for "${target.conceptName}" is ${Math.round(target.mastery * 100)}% with ${Math.round(target.confidence * 100)}% confidence.`,
        evidence: [
          `Mastery: ${Math.round(target.mastery * 100)}%`,
          `Confidence: ${Math.round(target.confidence * 100)}%`,
          `Attempts: ${target.attemptCount}`,
        ],
        createdAt: now,
      };
    }

    // 5. Priority 5: Moderate Mastery Concepts Ready for Advancing
    const developing = conceptStates
      .filter((s) => s.mastery >= 0.60 && s.mastery < 0.85)
      .sort((a, b) => a.mastery - b.mastery);

    if (developing.length > 0) {
      const target = developing[0];
      return {
        action: 'PRACTICE_QUIZ',
        conceptId: target.conceptId,
        conceptName: target.conceptName,
        priority: 0.65,
        reason: `Solid foundation on "${target.conceptName}" (${Math.round(target.mastery * 100)}%). Advance to higher cognitive challenge.`,
        evidence: [
          `Mastery: ${Math.round(target.mastery * 100)}%`,
          `Recent Accuracy: ${target.correctCount}/${target.attemptCount}`,
        ],
        createdAt: now,
      };
    }

    // 6. Default Growth Action
    const fallbackConceptId = conceptStates[0]?.conceptId || 'cpt_general_synthesis';
    const fallbackName = conceptStates[0]?.conceptName || 'Comprehensive Project Synthesis';
    return {
      action: 'TAKE_ASSESSMENT',
      conceptId: fallbackConceptId,
      conceptName: fallbackName,
      priority: 0.50,
      reason: 'Strong performance across established concepts. Complete a comprehensive cross-topic assessment.',
      evidence: ['All tracked concepts meet or exceed 85% mastery.'],
      createdAt: now,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * 9. Adaptive Quiz Selection Parameters
   * --------------------------------------------------------------------------
   */
  public static getAdaptiveQuizParameters(
    learnerId: string,
    projectId: string,
    conceptId: string
  ): {
    bloomLevel: BloomTaxonomyLevel;
    difficulty: QuizDifficulty;
  } {
    const state = this.getOrCreateConceptState(learnerId, projectId, conceptId);

    if (state.mastery < 0.40) {
      return { bloomLevel: 'comprehension', difficulty: 'beginner' };
    }
    if (state.mastery < 0.70) {
      return { bloomLevel: 'application', difficulty: 'intermediate' };
    }
    return { bloomLevel: 'analysis', difficulty: 'advanced' };
  }

  /**
   * --------------------------------------------------------------------------
   * 10. Learning Event Logging
   * --------------------------------------------------------------------------
   */
  public static recordLearningEvent(event: LearningEvent): void {
    db.learningEvents.set(event.eventId, event);
  }

  /**
   * --------------------------------------------------------------------------
   * 11. Structured Analytics Dashboard Data
   * --------------------------------------------------------------------------
   */
  public static getDashboardData(
    learnerId: string,
    projectId: string
  ): LearnerAnalyticsDashboardData {
    const states = Array.from(db.learnerConceptStates.values()).filter(
      (s) => s.learnerId === learnerId && s.projectId === projectId
    );

    const totalConcepts = states.length;
    const overallMastery =
      totalConcepts > 0
        ? Number((states.reduce((sum, s) => sum + s.mastery, 0) / totalConcepts).toFixed(2))
        : 0.0;

    const overallConfidence =
      totalConcepts > 0
        ? Number((states.reduce((sum, s) => sum + s.confidence, 0) / totalConcepts).toFixed(2))
        : 0.0;

    const masteryDistribution = {
      beginner: states.filter((s) => s.mastery < 0.40).length,
      developing: states.filter((s) => s.mastery >= 0.40 && s.mastery < 0.70).length,
      mastered: states.filter((s) => s.mastery >= 0.70).length,
    };

    const weakConcepts = states
      .filter((s) => s.mastery < 0.60)
      .map((s) => ({
        conceptId: s.conceptId,
        conceptName: s.conceptName,
        mastery: s.mastery,
        confidence: s.confidence,
        repeatedMistakes: s.repeatedMistakeCount,
      }))
      .sort((a, b) => a.mastery - b.mastery);

    const strongConcepts = states
      .filter((s) => s.mastery >= 0.70)
      .map((s) => ({
        conceptId: s.conceptId,
        conceptName: s.conceptName,
        mastery: s.mastery,
      }))
      .sort((a, b) => b.mastery - a.mastery);

    const retentionRiskConcepts = states
      .filter((s) => s.repetitionState === 'AT_RISK' || s.retentionStrength < 0.60)
      .map((s) => ({
        conceptId: s.conceptId,
        conceptName: s.conceptName,
        retentionStrength: s.retentionStrength,
        reviewDueAt: s.reviewDueAt,
      }))
      .sort((a, b) => a.retentionStrength - b.retentionStrength);

    const activeMistakes = Array.from(db.mistakeRecords.values())
      .filter((m) => m.learnerId === learnerId && m.projectId === projectId && !m.resolved)
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount);

    const recentEvents = Array.from(db.learningEvents.values())
      .filter((e) => e.learnerId === learnerId && e.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    const nextAction = this.getNextBestAction(learnerId, projectId);

    return {
      overallMastery,
      overallConfidence,
      conceptsTracked: totalConcepts,
      masteryDistribution,
      weakConcepts,
      strongConcepts,
      retentionRiskConcepts,
      activeMistakes,
      recentEvents,
      recommendedActions: [nextAction],
    };
  }
}
