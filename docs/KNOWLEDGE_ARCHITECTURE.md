# Hybrid Knowledge Intelligence Architecture

**Project**: AI Study Companion — Adaptive Learning Intelligence  
**Phase**: Phase 2 — Knowledge Intelligence Engine  
**Document**: Knowledge Retrieval & Intelligence Architecture Specification  

---

## 1. High-Level Retrieval Pipeline

```
                              USER QUERY
                                  │
                       [QUERY UNDERSTANDING]
                      (Normalize, Stems, Aligns)
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
         LEXICAL RETRIEVAL                 SEMANTIC RETRIEVAL
      (BM25 / Token Frequency)           (Dense Vector Embeddings)
      Strict Project Filtering           Strict Project Filtering
                 │                                 │
                 └────────────────┬────────────────┘
                                  ▼
                         CANDIDATE FUSION
                   (Reciprocal Rank Fusion - RRF)
                                  │
                                  ▼
                       DETERMINISTIC RERANKING
                    (Section Alignment & Salience)
                                  │
                                  ▼
                     EVIDENCE SUFFICIENCY FILTER
                      (Strong / Weak / No Evidence)
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
          SUFFICIENT EVIDENCE            INSUFFICIENT EVIDENCE
                  │                               │
        [CONTEXT BUILDER]                   [SAFE RESULT]
   Wrap in <untrusted_project_data>       Return structured status
   Append verified citation metadata      0 fabricated citations
                  │                       No LLM hallucination
                  ▼
              AI TUTOR
      (Strict System Prompts)
```

---

## 2. Core Invariants & Security Boundaries

1. **Strict Project Tenancy Isolation**: Both lexical and semantic candidate generation filter chunks *prior* to scoring:
   $$\forall c \in \text{Candidates}, \quad c.\text{projectId} === \text{request}.\text{projectId}$$
   Cross-project candidates can never enter the fusion stage.
2. **Provider Agnostic Embedding Abstraction**: All vector operations interact through `EmbeddingProvider`, ensuring zero vendor lock-in. A local deterministic vector projection provider guarantees offline testability and zero external runtime dependencies when keys are missing.
3. **Evidence Sufficiency Over Similarity**: High semantic similarity does not imply factual sufficiency. The evidence evaluator classifies candidates into:
   - **Strong Evidence**: Both semantic and lexical correlation or high semantic similarity with key query term matches.
   - **Weak Evidence**: Low correlation or semantic similarity below safe threshold ($< 0.35$).
   - **No Evidence**: Zero lexical matches and low semantic similarity ($< 0.25$).
4. **Citation Fidelity**: Citations are derived exclusively from the reranked chunks that survive the evidence sufficiency filter. The generative model is prohibited from synthesizing citation IDs.

---

## 3. Candidate Fusion & Reranking Formulation

### Reciprocal Rank Fusion (RRF)
To merge candidates from lexical and semantic rankers without fragile score calibration, we employ Reciprocal Rank Fusion:

$$RRF(d) = \frac{w_{\text{lex}}}{k + \text{rank}_{\text{lex}}(d)} + \frac{w_{\text{sem}}}{k + \text{rank}_{\text{sem}}(d)}$$

Where:
- $k = 60$ (standard smoothing constant)
- $w_{\text{lex}} = 0.45$ (weight for lexical exact keyword matches)
- $w_{\text{sem}} = 0.55$ (weight for semantic meaning and synonym alignment)
- If chunk $d$ only exists in one retriever, its rank in the other is treated as $\infty$.

### Combined Normalized Score
For deterministic downstream thresholding, each chunk also receives a normalized hybrid score:
$$\text{Score}_{\text{hybrid}} = 0.45 \times \text{Score}_{\text{lexical}} + 0.55 \times \text{Score}_{\text{semantic}}$$

If embeddings are missing or unavailable for a chunk, the system falls back seamlessly to $\text{Score}_{\text{lexical}}$.

---

## 4. Concept Graph Foundation

Knowledge chunks are processed to construct a project-isolated Concept Graph:

### Schema
```typescript
interface Concept {
  id: string;
  projectId: string;
  name: string;
  description: string;
  sourceChunkIds: string[];
  prerequisiteConceptIds: string[];
  relatedConceptIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface ConceptRelationship {
  id: string;
  projectId: string;
  sourceConceptId: string;
  targetConceptId: string;
  type: 'PREREQUISITE' | 'RELATED_TO' | 'EXAMPLE_OF' | 'PART_OF';
  confidence: number;
  sourceEvidenceIds: string[];
}
```

### Extraction & Validation
Concepts are extracted during background ingestion. Extraction outputs pass through strict JSON schema validation, ensuring only structured, verified concepts with valid source chunk references are persisted.
