# Phase 3 Security Review: Learner State Isolation, Replay Defenses, and AI Mutation Boundaries

**Date**: September 17, 2026  
**Author**: Principal Engineer & AI Learning Systems Architect  
**Project**: AI Study Companion — Adaptive Learning Intelligence  
**Phase**: Phase 3 — Learner Intelligence Engine  

---

## 1. Threat Model & Security Invariants

The Learner Intelligence Engine manages sensitive cognitive and pedagogical state. The threat model addresses three primary attack vectors:

1. **Cross-Tenant Learner State Leakage**: Malicious tenants or unauthorized users attempting to inspect or alter another user's mastery scores, mistake records, or learning recommendations.
2. **Replay & Ingestion Spoofing**: Attackers or buggy clients replaying quiz submissions or learning events to artificially inflate mastery or poison mistake statistics.
3. **Unsanitized AI State Mutation**: LLM hallucinations or adversarial prompt injections attempting to directly modify authoritative learner state.

---

## 2. Security Invariant Verification

### Invariant 1: Project & Space Isolation on Learner Records
- **Mechanism**: Every `LearnerConceptState` is keyed in `db.learnerConceptStates` as `${learnerId}:${projectId}:${conceptId}`.
- **Middleware Enforcement**: `verifyProjectIsolation` verifies that `req.user.id` and `req.params.projectId` match verified project ownership in `db.projects` before executing any controller logic.
- **Verification**: Behavioral Test #30 verifies that submitting an interaction in Project Alpha does NOT create or alter records in Project Beta.

### Invariant 2: Replay Attack Defense & Event Idempotency
- **Mechanism**: The engine maintains a global deduplication set `db.eventDeduplicationKeys`.
- **Enforcement**: When an interaction or learning event arrives with an `idempotencyKey`, the system checks for presence:
  - If present: returns the existing state as a clean no-op, preventing duplicate attempt count increments or score re-computation.
  - If absent: atomically records the key and executes state updates.
- **Verification**: Behavioral Test #28 validates that identical submissions with the same idempotency key result in identical attempt counts and mastery scores.

### Invariant 3: AI Mutation Boundary (AI Proposes; System Validates)
- **Principle**: Generative AI models (e.g. Gemini 2.5 Flash) NEVER directly execute database mutations or write directly to `db.learnerConceptStates` or `db.mistakeRecords`.
- **Data Flow**:
  1. AI generates quiz options and explanations via strict JSON schema.
  2. The server application validates options, schema boundaries, and Bloom taxonomy rules.
  3. The learner's client submits a selected option index.
  4. The server's deterministic `LearnerIntelligenceEngine` independently evaluates correctness, executes BKT equations, updates retention stability, and classifies mistakes.
  5. The AI has zero write access to learner state.

### Invariant 4: Bounded State Protection
- To prevent integer overflow, division by zero, or negative score corruption from adversarial repeated sequences:
  - BKT mastery is strictly clamped in $[0.01, 0.99]$.
  - Epistemic confidence is strictly clamped in $[0.0, 0.98]$.
  - Retention strength is strictly clamped in $[0.0, 1.0]$.
  - Recommendation priority is strictly clamped in $[0.10, 0.95]$.
- Behavioral Tests #22, #23, and #24 verify that 25 consecutive correct or incorrect answers never produce NaN, Infinity, or impossible scores.
