# Phase 4 Repository Analysis

**Date**: September 17, 2026
**Author**: Principal Engineer & AI Systems Architect
**Project**: AI Study Companion — Adaptive Learning Intelligence
**Phase**: Phase 4 — Adaptive Learning Experience & AI Orchestration

---

## 1. Existing Systems Overview (Phases 1-3)

The repository currently contains a robust, highly verified set of backend intelligence capabilities:

1.  **Phase 1 (Foundation)**:
    *   Multi-tenant project/space isolation with middleware enforcement (`server/auth.ts`).
    *   Document chunking and lexical retrieval (`server/grounding.ts`).
    *   Basic Learner Model with heuristic step tracking (`server/learner.ts`).
    *   Background Jobs framework (`server/jobs.ts`).
    *   Observability Tracer (`server/telemetry.ts`).
    *   In-memory `DatabaseStore` (`server/db.ts`).
2.  **Phase 2 (Knowledge Intelligence)**:
    *   Dense Vector Embeddings (local 256-dim provider) and partitioned Vector Store (`server/embeddings.ts`, `server/vector-store.ts`).
    *   Query Analyzer and Hybrid Retrieval with Reciprocal Rank Fusion (RRF) (`server/query-analyzer.ts`, `server/grounding.ts`).
    *   Concept Graph Engine for concept extraction and prerequisite relationship mapping (`server/concepts.ts`).
    *   Prompt Injection Defense and Semantic Guardrails.
3.  **Phase 3 (Learner Intelligence)**:
    *   Formal Bayesian Knowledge Tracing (BKT) replacing heuristics (`server/learner-intelligence.ts`).
    *   Mistake Intelligence: Structured classification and recurrence tracking.
    *   Retention Decay: Exponential decay modeling and spaced repetition scheduling.
    *   Next-Best-Action Engine: Prioritizing actions based on mistakes, retention risk, and prerequisite blockages.
    *   Append-only Learning Event stream with idempotency.

## 2. Existing UI & User Flows

The current React frontend (`src/App.tsx` and `src/components/`) provides functional testing interfaces for the backend capabilities:
*   **Projects View**: Basic selection of Space and Project.
*   **Materials View** (`MaterialsView.tsx`): Document upload, processing status, and raw chunk inspection.
*   **Tutor View** (`TutorView.tsx`): Chat interface for asking questions, displaying AI responses with grounding citations (`CitationModal.tsx`).
*   **Quiz View** (`QuizView.tsx`): Basic multiple-choice adaptive quiz interface.
*   **Mastery View** (`MasteryView.tsx`): A dashboard showing Bayesian stats, Mistake Intelligence, Spaced Review, and Next Best Action. It serves as a good foundation but needs deeper integration into a cohesive loop.

## 3. Missing UX Capabilities for Phase 4

The application currently feels like a collection of disjointed tools (Tutor, Quiz, Mastery Dashboard) rather than a persistent, cohesive learning loop. To achieve the Phase 4 objective, we need:

1.  **AI Learning Orchestrator**: A central coordinator that determines the user's intent and routes them to the right pedagogical mode (Socratic, Tutor, Coach).
2.  **Adaptive AI Tutor & Socratic Mode**: The tutor must actively read the learner's state (mistakes, BKT) and adapt its tone, depth, and strategy. Socratic mode needs explicit support.
3.  **Study Coach & Daily Plan**: An intelligent coach that generates a daily plan (Next Best Actions) rather than just showing a list in the mastery dashboard.
4.  **Learning Health Dashboard & Concept Explorer**: A more unified dashboard and a visual graph explorer for concepts.
5.  **Exam Mode & Post-Assessment Loop**: A dedicated exam interface that generates a balanced set of questions and explicitly updates state afterward with a "What Changed" view.
6.  **Cohesive Learning Loop UX**: The UI must naturally guide the user from Material -> Coach -> Next Action -> Tutor/Quiz -> Post-Assessment Review.

## 4. Technical Debt & Integration Points

*   **In-Memory DB Volatility**: Data is still lost on server restart. (Deferred to Phase 4 Roadmap / Cloud Persistence).
*   **Orchestration Gap**: Currently, the UI directly calls `/api/projects/:id/tutor` or `/api/projects/:id/quiz/next`. An orchestrator (`server/orchestrator.ts`) is needed to manage complex flows (like Socratic hints and Daily Plans).
*   **UI Component Monoliths**: `App.tsx` manages main routing via a simple state. A cleaner dashboard layout (e.g., sidebar navigation, consistent headers) is needed for the complex features.
*   **AI Mutation Boundaries**: Must ensure that new Socratic and Coach modes continue to rely on deterministic server endpoints (`/learner/review`, etc.) rather than the LLM outputting state mutations directly.

## 5. Architectural Risks for Phase 4

1.  **Over-complicating Prompts**: Adding too much context (BKT, mistakes, graph, chunks) to the Tutor prompt might exceed token limits or confuse the model. We need strict schema and context window management.
2.  **Breaking Retrieval**: Any changes to how the orchestrator fetches context must not bypass the multi-tenant isolation and prompt injection defenses built in Phases 1-2.
3.  **Scope Creep**: Implementing visual graphs (Concept Explorer) and Daily Plans can bloat the frontend. We must rely on standard Tailwind + Lucide and avoid complex D3/Canvas if a clean DOM representation suffices, or use simple SVG/CSS grids.
4.  **Performance Degradation**: Calling the Next Best Action engine repeatedly in the UI loop could be slow if not optimized. We should cache or fetch it strategically.

## 6. Implementation Strategy

1.  **Backend Extensions**:
    *   Create `server/orchestrator.ts` to manage Study Coach, Socratic Tutor, and Daily Plan generation.
    *   Enhance `structured-ai.ts` schemas to support Socratic hints and Exam generation.
    *   Update `server.ts` with new API endpoints.
2.  **Frontend Layout Refactor**:
    *   Implement a sidebar/main-content layout for easier navigation.
3.  **Feature Development**:
    *   **Dashboard & Daily Plan**: The central landing page.
    *   **Concept Explorer**: Visual representation of the graph.
    *   **Adaptive Quiz & Exam Mode**: Polished flows with explicit post-assessment feedback.
    *   **Socratic Tutor**: Progressive hint UI.
4.  **Testing & Verification**:
    *   Add behavioral tests for the orchestrator, Socratic mode, and Exam mode.
    *   Run end-to-end learning loop scenario.
