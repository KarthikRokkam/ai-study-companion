import { db } from './db.js';
import {
  LearnerModel,
  ConceptMastery,
  LearningRecommendation,
  BloomTaxonomyLevel,
  QuizDifficulty,
} from '../src/types.js';

export class LearnerModelEngine {
  /**
   * Retrieves or initializes learner model for the specified user and project.
   */
  public static getOrCreate(userId: string, projectId: string, spaceId: string): LearnerModel {
    const key = `${userId}:${projectId}`;
    let model = db.learnerModels.get(key);

    if (!model) {
      model = {
        userId,
        projectId,
        spaceId,
        conceptMastery: {},
        overallMastery: 0,
        id: key,
        learningVelocity: 1.0,
        recommendations: [
          {
            id: `rec_${Date.now()}_init`,
            recommendedTopic: 'Foundational Project Concepts',
            reason: 'Begin by exploring foundational concepts in this project with the AI Tutor.',
            priority: 'high',
            action: 'ask_tutor',
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      db.learnerModels.set(key, model);
    }

    return model;
  }

  /**
   * Updates concept mastery following an assessment attempt or tutor discussion.
   * Mastery is mathematically treated as a probabilistic estimate.
   */
  public static recordQuizAttempt(
    userId: string,
    projectId: string,
    spaceId: string,
    topic: string,
    isCorrect: boolean,
    bloomLevel: BloomTaxonomyLevel,
    mistakeContext?: string
  ): {
    model: LearnerModel;
    masteryDelta: number;
    newConceptMastery: ConceptMastery;
  } {
    const model = this.getOrCreate(userId, projectId, spaceId);
    let concept = model.conceptMastery[topic];

    if (!concept) {
      concept = {
        topic,
        masteryScore: isCorrect ? 50 : 25,
        confidenceScore: 30,
        attemptsCount: 0,
        successCount: 0,
        mistakes: [],
        lastPracticedAt: new Date().toISOString(),
      };
    }

    const previousScore = concept.masteryScore;
    concept.attemptsCount += 1;
    if (isCorrect) {
      concept.successCount += 1;
    } else if (mistakeContext && !concept.mistakes.includes(mistakeContext)) {
      concept.mistakes.unshift(mistakeContext);
      if (concept.mistakes.length > 5) {
        concept.mistakes.pop();
      }
    }

    // Weight delta by Bloom's cognitive complexity
    const bloomWeights: Record<BloomTaxonomyLevel, number> = {
      recall: 6,
      comprehension: 9,
      application: 13,
      analysis: 17,
    };
    const step = bloomWeights[bloomLevel] || 10;

    // Asymptotic adjustment toward 100 or 0
    let masteryDelta = 0;
    if (isCorrect) {
      masteryDelta = Math.round((100 - concept.masteryScore) * (step / 100));
      concept.masteryScore = Math.min(concept.masteryScore + masteryDelta, 100);
    } else {
      masteryDelta = -Math.round(concept.masteryScore * (step / 120));
      concept.masteryScore = Math.max(concept.masteryScore + masteryDelta, 5);
    }

    // Increase confidence as evidence accumulates
    concept.confidenceScore = Math.min(
      Math.round(concept.confidenceScore + 10 + concept.attemptsCount * 2),
      98
    );
    concept.lastPracticedAt = new Date().toISOString();
    model.conceptMastery[topic] = concept;

    // Recalculate overall project mastery estimate
    const concepts = Object.values(model.conceptMastery);
    const totalScore = concepts.reduce((sum, c) => sum + c.masteryScore, 0);
    model.overallMastery = concepts.length > 0 ? Math.round(totalScore / concepts.length) : 0;

    // Recalculate learning velocity
    const recentAccuracy =
      concepts.reduce((sum, c) => sum + c.successCount, 0) /
      Math.max(concepts.reduce((sum, c) => sum + c.attemptsCount, 0), 1);
    model.learningVelocity = Number((0.8 + recentAccuracy * 1.2).toFixed(2));

    // Regenerate actionable learning recommendations
    model.recommendations = this.generateRecommendations(model);
    model.updatedAt = new Date().toISOString();

    db.learnerModels.set(`${userId}:${projectId}`, model);

    return {
      model,
      masteryDelta,
      newConceptMastery: { ...concept, mistakes: [...concept.mistakes] },
    };
  }

  /**
   * Generates dynamic, prioritized next steps based on mastery gaps.
   */
  public static generateRecommendations(model: LearnerModel): LearningRecommendation[] {
    const recs: LearningRecommendation[] = [];
    const concepts = Object.values(model.conceptMastery);

    // Identify weak concepts (mastery < 60%)
    const weakConcepts = concepts.filter((c) => c.masteryScore < 60);
    weakConcepts.sort((a, b) => a.masteryScore - b.masteryScore);

    if (weakConcepts.length > 0) {
      const weakest = weakConcepts[0];
      recs.push({
        id: `rec_weak_${Date.now()}_1`,
        recommendedTopic: weakest.topic,
        reason: `Current mastery estimate is ${weakest.topic} (${weakest.masteryScore}%). Review identified misconceptions with the AI Tutor.`,
        priority: 'high',
        action: 'review_concept',
      });
    }

    // Identify moderate concepts ready for advancement (60% - 85%)
    const moderateConcepts = concepts.filter((c) => c.masteryScore >= 60 && c.masteryScore < 85);
    if (moderateConcepts.length > 0) {
      const target = moderateConcepts[0];
      recs.push({
        id: `rec_mod_${Date.now()}_2`,
        recommendedTopic: target.topic,
        reason: `Solid progress (${target.masteryScore}%). Attempt an analysis-level quiz to cement mastery.`,
        priority: 'medium',
        action: 'attempt_quiz',
      });
    }

    // Default recommendation if all high or empty
    if (recs.length === 0) {
      recs.push({
        id: `rec_growth_${Date.now()}_default`,
        recommendedTopic: 'Advanced Synthesis & Cross-Topic Validation',
        reason: 'Excellent retention across tracked topics. Ask the AI Tutor challenging cross-cutting architectural questions.',
        priority: 'low',
        action: 'ask_tutor',
      });
    }

    return recs;
  }

  /**
   * Recommends optimal Bloom's taxonomy and difficulty for next quiz.
   */
  public static getRecommendedDifficulty(
    model: LearnerModel,
    topic: string
  ): { bloomLevel: BloomTaxonomyLevel; difficulty: QuizDifficulty } {
    const concept = model.conceptMastery[topic];
    if (!concept || concept.masteryScore < 45) {
      return { bloomLevel: 'comprehension', difficulty: 'beginner' };
    }
    if (concept.masteryScore < 75) {
      return { bloomLevel: 'application', difficulty: 'intermediate' };
    }
    return { bloomLevel: 'analysis', difficulty: 'advanced' };
  }
}
