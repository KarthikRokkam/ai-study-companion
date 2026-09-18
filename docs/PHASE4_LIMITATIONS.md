# Phase 4 Limitations and Errata

## Modality
*   **Claimed:** Multi-modal adaptive learning engine.
*   **Actual:** CURRENT MODALITY: TEXT/PDF. There are no computer vision or audio processing pipelines implemented.

## State Persistence
*   **Claimed:** Stateful interactions.
*   **Actual:** TRANSIENT STATE. The database (`db.ts`) relies exclusively on in-memory `Map` objects. State is completely wiped upon process termination or redeployment.

## LLM Verification Scope
*   **Limitation:** Phase 4 tests (`e2e-phase4.ts`) do not explicitly assert the logical validity of the Gemini LLM output for the Socratic Tutor or Exam Generation because they run in an environment without a mocked Gemini client, relying instead on catching expected errors gracefully.

## Exam Submission Pipeline
*   **Limitation:** Submitting an exam currently logs the submission and updates the in-memory array but relies on the UI or subsequent background pipelines (which may be partially stubbed) to feed the results back into the formal Phase 3 BKT knowledge tracker.
