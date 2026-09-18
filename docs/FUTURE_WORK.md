# Future Work & Deferred Phase Roadmap

This document outlines enhancements identified during Phase 1 development that are intentionally deferred to preserve strict phase boundaries.

## 1. Vector Database & Hybrid Semantic Indexing
- **Status**: **COMPLETED IN PHASE 2**. Implemented hybrid retrieval fuses dense 256-dim embeddings and lexical BM25/TF-IDF rankings via Reciprocal Rank Fusion (RRF) with project-partitioned vector store.

## 2. Multi-Layer Prompt Injection Defense & Semantic Guardrails
- **Status**: **COMPLETED IN PHASE 2**. Implemented 8-layer multi-stage defensive pipeline neutralizing Base64, Hex, XML tag breakouts, role-play spoofing, and delimiter tampering.

## 3. Formal Bayesian Knowledge Tracing (BKT) Calibration
- **Status**: **COMPLETED IN PHASE 3**. Implemented 4-parameter BKT ($P(L_0)=0.20, P(T)=0.15, P(G)=0.25, P(S)=0.10$) with asymptotic stability bounds $[0.01, 0.99]$ and monotonic confidence accumulation.

## 4. Spaced Repetition Scheduling Engine & Memory Decay
- **Status**: **COMPLETED IN PHASE 3**. Implemented deterministic exponential retention decay $R(t) = \exp(-t/S)$, review stability scaling, and spaced review scheduler.

## 5. Collaborative Study Spaces & Multi-Learner Cohorts (Phase 4 Roadmap)
- **Concept**: Support team projects with role-based access control (Learner, Contributor, Mentor, Admin), real-time peer discussion channels, and collective mastery dashboards.
- **Benefits**: Enables enterprise and classroom collaborative study.
- **Status**: Scheduled for Phase 4.

## 6. Cloud-Durable Database Persistence (Phase 4 Roadmap)
- **Concept**: Back the in-memory `DatabaseStore` and `VectorStore` with durable cloud storage (Firestore / PostgreSQL with pgvector).
- **Benefits**: Enables cross-session persistence and enterprise multi-replica horizontal scaling.
- **Status**: Scheduled for Phase 4.
