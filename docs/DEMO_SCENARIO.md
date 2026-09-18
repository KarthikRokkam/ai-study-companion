# Phase 4 Product Demonstration Path

**Date**: September 17, 2026
**Project**: AI Study Companion — Adaptive Learning Intelligence
**Phase**: Phase 4 — Adaptive Learning Experience & AI Orchestration

This document outlines the optimal path to demonstrate the end-to-end capabilities built across all 4 phases.

---

## The "Golden Loop" Scenario

### Step 1: Project & Document Ingestion (Phase 1 & 2)
1. **Navigate to the Materials View**.
2. Upload a complex PDF document (e.g., a biology textbook chapter on Cellular Respiration, or a computer science paper on Database Transactions).
3. Observe the "Processing..." state. Wait for the chunking, embedding generation (Phase 2 local vectors), and Concept Graph Extraction to complete.

### Step 2: Concept Visualization (Phase 4)
1. **Navigate to the Concept Explorer**.
2. Observe the extracted concepts. Notice how the intelligence engine has broken down the document into distinct knowledge nodes (e.g., "Glycolysis", "Krebs Cycle", "Electron Transport Chain") and mapped their prerequisites.
3. This visualizes the underlying graph that powers the AI's pedagogy.

### Step 3: Initial Baseline Assessment (Phase 4)
1. **Navigate to Exam Mode**.
2. Click "Start Assessment" to begin an adaptive exam.
3. The AI orchestrator dynamically generates 5 questions spanning the extracted concepts.
4. Answer some correctly, and deliberately get others wrong.
5. Submit the exam. The post-assessment screen explicitly shows your score and recommended next actions based on Bayesian Knowledge Tracing.

### Step 4: The Intelligent Dashboard & Daily Plan (Phase 3 & 4)
1. **Navigate to the Dashboard**.
2. Observe the **Overall Mastery** and **Retention Risk** metrics. They have updated to reflect your exam performance.
3. Observe **Today's Study Plan**. The AI has generated a prioritized list of actions (e.g., "Review Mistake", "Read Source") targeting your weak areas.
4. Observe **Your Next Best Action** highlighted prominently. Click "Ask Coach" to interact with it.

### Step 5: Coaching & Socratic Guidance (Phase 4)
1. **Navigate to Study Coach** (or use the modal).
2. Ask: *"Why did you recommend I study Glycolysis next?"*
3. The coach will respond with BKT evidence: *"Your mastery of Glycolysis dropped below 40% after your recent exam mistakes. Since it is a prerequisite for the Krebs Cycle, it's critical we address it first."*
4. **Navigate to the Socratic Tutor**.
5. Ask: *"I don't understand how ATP is generated."*
6. The Socratic Tutor will **not** give you the answer. Instead, it will use hybrid semantic retrieval to find the relevant chunks, identify your goal, and ask a leading question: *"Let's trace it back. Where does the energy in the glucose molecule initially come from?"*

### Step 6: Idempotent Mistake Intelligence & Spaced Repetition (Phase 3)
1. **Navigate to Mastery View**.
2. Expand the "Mistake Intelligence" section. Observe the categorized mistakes (e.g., "Conceptual Error", "Factual Error") tracked from your exam.
3. Notice the "Spaced Repetition Schedule" tracking your retention curve based on an exponential decay formula.

---

## Why This Sequence Matters

This path demonstrates the core value proposition of the platform: it is not a wrapper around an LLM chat, but a **stateful, adaptive, pedagogical intelligence engine**. 

*   **Phases 1-2** power the knowledge extraction.
*   **Phase 3** powers the state and tracking.
*   **Phase 4** orchestrates the UX loop that makes it feel like a cohesive, persistent AI tutor.
