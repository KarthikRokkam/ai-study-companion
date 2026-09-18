# Phase 2A — Repository Forensics & Architectural Analysis

**Date**: September 17, 2026  
**Author**: Principal Engineer & AI Systems Architect  
**Project**: AI Study Companion — Adaptive Learning Intelligence  
**Phase**: Phase 2 — Knowledge Intelligence Engine  

---

## 1. Current Architecture Overview

The repository operates as a single-process full-stack Express + Vite application with server-authoritative AI orchestration, project-level tenancy isolation, in-memory transactional database storage, and an asynchronous background worker.

### Primary Subsystems
1. **Application Server (`server.ts`)**: Express server binding to `0.0.0.0:3000`. Houses all REST APIs (`/api/spaces`, `/api/projects`, `/api/documents`, `/api/chunks`, `/api/tutor/chat`, `/api/quiz/*`, `/api/telemetry/*`).
2. **Authentication & Boundary Isolation (`server/auth.ts`)**: Global `authenticateUser` middleware resolving verified user identity, combined with `verifySpaceIsolation` and `verifyProjectIsolation` which enforce strict ownership validation:
   $$\text{User} \longrightarrow \text{Space} \longrightarrow \text{Project} \longrightarrow \text{Resource}$$
3. **Database Layer (`server/db.ts`)**: `DatabaseStore` holding typed in-memory Maps (`users`, `spaces`, `projects`, `documents`, `chunks`, `tutorMessages`, `quizQuestions`, `learnerModels`, `backgroundJobs`). Seeded with primary and rival tenants for cross-boundary testing.
4. **Knowledge Grounding & Document Processing (`server/grounding.ts`)**:
   - `sanitizeUntrustedDocument`: Lexical regex defanging of known prompt-injection triggers and XML sandbox escape tags (`<untrusted_project_data>`, `<system>`).
   - `chunkDocument`: Paragraph-aware chunking (default 600 chars, 100 chars overlap) with section metadata extraction.
   - `retrieveGroundedKnowledge`: Lexical token matching with word boundary regex, frequency damping ($\min(\text{matches} \times 0.2, 0.6)$), section title boost ($+0.3$), normalization by $\sqrt{|\text{queryTokens}|}$, and strict evidence thresholding ($0.25$).
   - `formatSandboxedKnowledgeContext`: Encloses chunks inside `<untrusted_project_data>` XML sandbox tags.
5. **AI Orchestration (`server/structured-ai.ts`)**: Server-side Google GenAI SDK (`@google/genai`) client lazy-loaded from `process.env.GEMINI_API_KEY`. Enforces schema validation on quiz generation and safe fallback upon invalid outputs or insufficient evidence.
6. **Learner Modeling (`server/learner.ts`)**: Bounded asymptotic step-heuristic engine tracking mastery ($5\% \le S \le 100\%$) and monotonic confidence ($C \le 98\%$) per topic with Bloom's taxonomy cognitive complexity weighting.
7. **Background Jobs (`server/jobs.ts`)**: `BackgroundJobManager` with idempotency registry, async scheduling via `setTimeout`, and exponential backoff retry handling ($2^{\text{retryCount}} \times 500\text{ms}$).
8. **Observability (`server/telemetry.ts`)**: `ObservabilityTracer` capturing trace IDs, request IDs, latencies, token consumption, and cost estimates.
9. **Frontend UI (`src/`)**: React 19 + Tailwind CSS single-page app displaying study spaces, project materials, interactive AI tutor with verified citation chips, adaptive quizzes, and telemetry inspector.

---

## 2. Existing Retrieval Flow & Data Path

The current knowledge flow is strictly lexical:

```
User Query (e.g., "How does leader election work?")
   ↓
server.ts: POST /api/projects/:projectId/tutor/chat
   ↓
verifyProjectIsolation (HTTP 403 if unauthorized)
   ↓
generateTutorResponse (server/structured-ai.ts)
   ↓
retrieveGroundedKnowledge (server/grounding.ts)
   ├── Extract queryTokens (lowercase, strip non-alphanumeric, filter STOP_WORDS, slice to 30)
   ├── Filter db.chunks strictly WHERE chunk.projectId === projectId
   ├── Calculate Lexical Score for each project chunk:
   │     Score = (FrequencyMatches + SectionBoost) / sqrt(|queryTokens|)
   ├── Sort descending & slice to topK (3)
   └── Evaluate Evidence Threshold (0.25):
         ├── If maxScore < 0.25:
         │     status = 'insufficient_evidence', citations = []
         │     Return safe declaration without calling LLM
         └── If maxScore >= 0.25:
               status = 'grounded' | 'partial'
               Build citations from chunk metadata
               Wrap chunks in <untrusted_project_data>
               Call Gemini 3.8 Flash with strict system prompt
```

---

## 3. Insertion Points for Hybrid Intelligence Engine

| Module | Location | Purpose in Phase 2 |
|---|---|---|
| **Embedding Abstraction** | `server/embeddings.ts` (New) | Vendor-agnostic `EmbeddingProvider` interface with local/mock deterministic provider and Gemini embedding provider (`gemini-embedding-2-preview`). |
| **Vector Index** | `server/vector-store.ts` (New) | In-memory project-isolated cosine similarity index mapping `chunkId -> Float32Array` with metadata. |
| **Query Understanding** | `server/query-analyzer.ts` (New) | Normalization, token expansion, stop-word handling, and morphological variation matching. |
| **Hybrid Retrieval & Fusion** | `server/grounding.ts` (Upgraded) | Merges lexical candidate scoring with semantic candidate scoring via Reciprocal Rank Fusion (RRF) / weighted score combination. |
| **Evidence Sufficiency Evaluator** | `server/grounding.ts` (Upgraded) | Decouples semantic similarity from factual evidence support; classifies into Strong, Weak, or No Evidence. |
| **Concept Graph Foundation** | `server/concepts.ts` (New) | Project-isolated `Concept` and `ConceptRelationship` definitions, AI extraction workflow with structured JSON schema validation. |
| **Background Processing** | `server/jobs.ts` (Upgraded) | Extends ingestion pipeline: `PARSE -> CHUNK -> INDEX LEXICAL -> GENERATE EMBEDDINGS -> EXTRACT CONCEPTS -> BUILD RELATIONSHIPS -> READY`. |
| **8-Layer Prompt Injection Defense** | `server/grounding.ts` (Upgraded) | Multi-layered defense covering encoding checks, role-play/system spoof detection, and structured boundary verification. |
| **REST Endpoints** | `server.ts` (Upgraded) | Endpoints for concept graph visualization, background status monitoring, and hybrid retrieval debug telemetry. |

---

## 4. Reusable Components

- **Project Isolation Verification (`server/auth.ts`)**: Fully reusable without alteration. Protects every new route.
- **Idempotency Registry (`server/jobs.ts`)**: Can be used directly for embedding generation and concept extraction tasks.
- **Observability Tracer (`server/telemetry.ts`)**: Telemetry records already support latency breakdowns; we will record `embeddingLatencyMs`, candidate counts (`lexicalCount`, `semanticCount`, `mergedCount`), and cost.
- **DatabaseStore (`server/db.ts`)**: Can be extended with `concepts` and `conceptRelationships` Maps.

---

## 5. Architectural Risks & Vulnerabilities

1. **Vocabulary vs. Semantic Mismatch (Resolved in Phase 2)**: Lexical search fails when users ask questions using synonyms. Semantic embedding retrieval solves this.
2. **Semantic Similarity $\ne$ Factual Evidence**: A chunk discussing "State machines" has high semantic vector similarity to "How does leader election fail?", but might contain zero evidence regarding leader election failure. The evidence evaluator must distinguish semantic relevance from evidentiary sufficiency.
3. **External Embedding Dependency Failure**: If Gemini embedding API is rate-limited, unavailable, or missing an API key, the system must fail gracefully and fall back to lexical retrieval without crashing or blocking ingestion.
4. **Prompt Injection Evasion**: As proven in Phase 1 forensics, simple regex sanitizers do not catch semantic paraphrases or encoded strings. Layered defenses must defang encoded strings and treat all chunk text as untrusted data blocks.
5. **Memory & Performance Footprint**: Generating high-dimensional vector embeddings for hundreds of chunks in Node.js memory could increase memory usage. Vectors must be stored efficiently (`Float32Array`).

---

## 6. Dependencies & Migration Concerns

- **Zero New Heavy Infrastructure**: No external vector database daemon (Pinecone, Weaviate, Qdrant, Milvus) will be introduced for this prototype. An in-memory vector index with project-scoped cosine distance is mathematically rigorous, portable, fast, and testable.
- **Backward Compatibility**: All Phase 1 tests, existing data contracts, and client APIs must remain fully functional.
