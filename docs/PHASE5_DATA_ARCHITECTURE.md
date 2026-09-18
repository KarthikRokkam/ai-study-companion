# Phase 5 Data Architecture

## Overview
The AI Study Companion has been migrated from in-memory transient Maps to a persistent relational SQLite database using Drizzle ORM. This ensures learner state, analytics, mistakes, embeddings, and project context survive application restarts.

## Entities and Ownership

### 1. Identity & Tenancy
* **Users (`users`)**: Represents individual learners.
* **Spaces (`spaces`)**: Logical grouping of projects for a user.
* **Projects (`projects`)**: A specific study project containing documents, concepts, and learner state.
Ownership: User -> Space -> Project. All material and learner state strictly roll up to a Project.

### 2. Learning Material
* **Documents (`documents`)**: Uploaded study material.
* **Chunks (`chunks`)**: Processed segments of documents with embedding metadata.

### 3. Knowledge Intelligence
* **Concepts (`concepts`)**: Extracted knowledge topics.
* **Concept Relationships (`concept_relationships`)**: Edges in the knowledge graph (e.g., PREREQUISITE, RELATED).

### 4. Learner Intelligence
* **Learner Models (`learner_models`)**: High-level aggregation of a user's mastery and learning velocity within a project.
* **Learner Concept States (`learner_concept_states`)**: The authoritative BKT (Bayesian Knowledge Tracing) state, confidence, attempt counts, and spaced-repetition parameters for a specific user-concept pair.
* **Mistake Records (`mistake_records`)**: Granular tracking of specific misconceptions, categorized by cognitive failure type.

### 5. Assessment
* **Quiz Questions (`quiz_questions`)**: Generated adaptive questions.
* **Learning Events (`learning_events`)**: Append-only log of all learner interactions (quiz attempts, AI tutor chats, exam completions) used for idempotency and audit trails.
* **Exam Sessions (`exam_sessions`)**: State of a formal exam.
* **Exam Results (`exam_results`)**: Final graded output of an exam session.
* **Socratic Interactions (`socratic_interactions`) & Tutor Messages (`tutor_messages`)**: Chat history with the AI.

### 6. Planning & Background Jobs
* **Daily Study Plans (`daily_study_plans`)**: AI-generated study agendas.
* **Background Jobs (`background_jobs`)**: Tracking for document ingestion pipeline stages.
* **Idempotency Keys (`idempotency_keys`)**: Duplicate request protection.

## State Authority
* **Persistent Database**: The authoritative source for all data.
* **Learner State**: `learner_concept_states` is the single source of truth for BKT parameters. Recommendations and Next Best Actions are dynamically derived from this state rather than statically persisted, ensuring determinism.
