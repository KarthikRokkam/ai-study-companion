# Phase 3A — Learner Intelligence Engine: Repository Forensics & Architectural Analysis

**Date**: September 17, 2026  
**Author**: Principal Engineer & AI Learning Systems Architect  
**Project**: AI Study Companion — Adaptive Learning Intelligence  
**Phase**: Phase 3 — Learner Intelligence Layer  

---

## 1. Executive Summary

This forensic audit analyzes the current learner-state modeling, assessment pipeline, mistake tracking, event recording, and recommendation mechanisms in the AI Study Companion repository.

The Phase 1 and Phase 2 implementations established a functional foundation:
1. `LearnerModelEngine` computes bounded mastery scores ($5\% \le S \le 100\%$) and confidence estimates ($C \le 98\%$).
2. Project and space isolation protects learner records from cross-tenant leakage.
3. Structured AI and fallback mechanisms prevent unvalidated question schemas from corrupting state.

However, forensic inspection reveals that the current model is an **asymptotic step-heuristic**, not a formal probabilistic or Bayesian Knowledge Tracing (BKT) distribution, lacks discrete concept IDs linked to the Phase 2 Concept Graph, lacks retention/forgetting decay, lacks fine-grained mistake categorization (misconceptions vs. slips), and does not trace recommendations back to explicit interaction evidence.

---

## 2. Current Learner-State Model

In `server/learner.ts` and `src/types.ts`, learner state is keyed by `${userId}:${projectId}` in `db.learnerModels`:

```typescript
export interface ConceptMastery {
  topic: string;             // Plain text topic name (e.g. "Raft Consensus")
  masteryScore: number;       // Integer 0-100 (Estimate, not ground truth)
  confidenceScore: number;    // Integer 0-100
  attemptsCount: number;
  successCount: number;
  mistakes: string[];         // Array of raw mistake string descriptions (max 5)
  lastPracticedAt: string;    // ISO-8601 timestamp
}

export interface LearnerModel {
  userId: string;
  projectId: string;
  spaceId: string;
  conceptMastery: Record<string, ConceptMastery>;
  overallMastery: number;     // Arithmetic mean of tracked concept scores
  learningVelocity: number;   // 0.8 + (successCount / attemptsCount) * 1.2
  recommendations: LearningRecommendation[];
  updatedAt: string;
}
```

---

## 3. Existing Mathematical Formulations

### 3.1 Mastery Score Adjustment
Mastery changes upon a quiz attempt using an **asymptotic delta step**:

$$\text{step} = \begin{cases}
6 & \text{if Bloom level is 'recall'} \\
9 & \text{if Bloom level is 'comprehension'} \\
13 & \text{if Bloom level is 'application'} \\
17 & \text{if Bloom level is 'analysis'}
\end{cases}$$

If response is **correct**:
$$\Delta M = \text{round}\left((100 - M) \times \frac{\text{step}}{100}\right)$$
$$M_{\text{new}} = \min(M + \Delta M, 100)$$

If response is **incorrect**:
$$\Delta M = -\text{round}\left(M \times \frac{\text{step}}{120}\right)$$
$$M_{\text{new}} = \max(M + \Delta M, 5)$$

### 3.2 Confidence Score Adjustment
$$\Delta C = 10 + (\text{attemptsCount} \times 2)$$
$$C_{\text{new}} = \min(C + \Delta C, 98)$$

### 3.3 Overall Mastery & Velocity
$$\text{overallMastery} = \frac{1}{|K|} \sum_{c \in K} M(c)$$
$$\text{velocity} = 0.8 + 1.2 \times \frac{\sum \text{successCount}}{\sum \text{attemptsCount}}$$

---

## 4. Current Update Triggers & Call Sites

1. **`evaluateQuizSubmission` (`server/structured-ai.ts` line 403)**:
   - Evaluates selected index against `question.correctOptionIndex`.
   - Calls `LearnerModelEngine.recordQuizAttempt(...)`.
   - Inserts mistake string if incorrect.
2. **Missing Update Triggers**:
   - Material view / reading does NOT update learner state.
   - Tutor conversation questions / explanations do NOT update learner state.
   - Concept graph exploration does NOT update learner state.
   - No time-based decay or retention loss occurs over elapsed time.

---

## 5. Current Recommendation Logic

In `LearnerModelEngine.generateRecommendations`:
- Filters concepts with $M(c) < 60\%$, sorts by lowest score, recommends `review_concept` with highest priority for the lowest concept.
- If no concept $< 60\%$, filters concepts $60\% \le M(c) < 85\%$, recommends `attempt_quiz`.
- If all concepts $\ge 85\%$, recommends default `"Advanced Synthesis & Cross-Topic Validation"`.

### Limitations of Current Recommendations:
- Recommendations are not linked to the Phase 2 Concept Graph (cannot detect that Concept B is weak because prerequisite Concept A was failed).
- No spaced repetition scheduling (does not track retention risk or time since last practice).
- Does not distinguish careless errors from recurring misconceptions.
- Lacks traceable evidence arrays (e.g. references to question IDs or timestamps).

---

## 6. Current Event Model

- The repository currently lacks a unified `LearningEvent` schema.
- Telemetry records (`AIInteractionTelemetry`) track LLM inference latency and token counts, but do not record pedagogical learning events (`QUIZ_ANSWERED`, `CONCEPT_REVIEWED`, `MISTAKE_CREATED`).
- Duplicate HTTP submissions (replays) directly increment attempts if not protected by client request idempotency.

---

## 7. Missing Capabilities for Phase 3

| Domain | Current State | Phase 3 Requirement |
|---|---|---|
| **Concept State Entity** | `ConceptMastery` keyed by unstructured topic string | `LearnerConceptState` with explicit ranges ($0.0 \to 1.0$), linked to Phase 2 `conceptId` |
| **Evidence Model** | Implicit boolean quiz correctness | Formal `LearnerEvidence` schema with signal strength, direction, confidence, and target attributes |
| **Probabilistic Mastery** | Asymptotic step-heuristic ($0 \to 100$) | Controlled comparison: Model A (Asymptotic) vs. Model B (BKT / Probabilistic Bounded Engine) |
| **Mistake Intelligence** | Raw strings in array | Structured `Mistake` entity with classification (`CONCEPT_GAP`, `MISCONCEPTION`, `CARELESS_ERROR`, etc.) |
| **Repeated Mistakes** | Basic string deduplication | Pattern detection, occurrence counts, bounded priority inflation |
| **Prerequisite Awareness** | No graph traversal | Graph traversal over Phase 2 `ConceptRelationship` to identify upstream prerequisite blockers |
| **Retention & Decay** | No decay (static score forever) | Deterministic exponential memory retention decay model ($R(t) = S \cdot e^{-\lambda t}$) |
| **Spaced Repetition** | None | Review scheduler (`NEW`, `LEARNING`, `REVIEW`, `MASTERED`, `AT_RISK`) |
| **Next Best Action** | 3 static if-else branches | Multi-factor decision engine with explicit traceable evidence and reasoning |
| **Adaptive Difficulty** | Simple 3-tier threshold (<45, <75, >75) | Smooth multi-factor progression combining mastery, confidence, and Bloom's taxonomy |
| **Event System** | None | Append-only `LearningEvent` log with idempotency keys and replay protection |

---

## 8. Migration Risks & Guardrails

1. **Regression Risk on Existing Phase 1 Tests**:
   - `test/run-tests.ts` contains explicit tests for `LearnerModelEngine`:
     - Test #11: `updates mastery estimate and increases confidence monotonically with evidence`
     - Test #12: `repeated correct answers asymptotically approach 100 without overflow`
     - Test #13: `repeated incorrect answers asymptotically approach lower floor without negative scores`
     - Test #14: `generates adaptive recommendations addressing mastery gaps`
   - *Guardrail*: Phase 3 must maintain backward compatibility for `LearnerModelEngine.recordQuizAttempt` while introducing the advanced `LearnerIntelligenceEngine` and `LearnerConceptState`.
2. **Mathematical Honesty**:
   - Never label a heuristic as "Bayesian".
   - If Bayesian Knowledge Tracing (BKT) is used, explicitly state parameters $P(L_0), P(T), P(G), P(S)$ and maintain regression benchmarks.
3. **Data Boundary Integrity**:
   - AI models must NEVER directly mutate authoritative learner state. AI proposes; deterministic application logic validates and commits.
   - Learner state must remain strictly isolated by `userId` and `projectId`.
