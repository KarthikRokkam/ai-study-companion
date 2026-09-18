# Phase 3C — Learner Evidence Model: Taxonomy & Mathematical Weights

**Date**: September 17, 2026  
**Author**: Principal Engineer & AI Learning Systems Architect  
**Project**: AI Study Companion — Adaptive Learning Intelligence  
**Phase**: Phase 3 — Learner Intelligence Layer  

---

## 1. Principles of Learning Evidence

Not all user interactions represent evidence of concept mastery.
To prevent spurious state mutation, the AI Study Companion strictly classifies interaction signals:

1. **Passive consumption is NOT mastery evidence**: Viewing a document or reading a summary indicates *exposure*, not *understanding*. Exposure updates recency and retention estimates, but does not increase mastery.
2. **Generative recall & problem solving IS primary evidence**: Successfully answering a question without hints provides strong positive evidence.
3. **Repeated identical submissions do NOT multiply evidence**: Idempotency filters prevent artificial mastery inflation.
4. **Direction, magnitude, and confidence are decoupled**:
   - *Mastery*: Probability that the skill/knowledge is acquired ($0.0 \to 1.0$).
   - *Confidence*: Epistemic certainty of the system's estimate ($0.0 \to 1.0$), scaling monotonically with sample count.
   - *Retention*: Estimated memory persistence over time ($0.0 \to 1.0$).

---

## 2. Evidence Taxonomy Matrix

| Evidence Type | Signal Strength | Direction | Confidence Impact | Affects Mastery? | Affects Confidence? | Affects Retention? | Description |
|---|---|---|---|---|---|---|---|
| `quiz_correct` | High (0.85) | Positive (+1.0) | High (+0.12) | **Yes** | **Yes** | **Yes** | Learner answered an assessment question correctly without hints. |
| `quiz_incorrect` | High (0.85) | Negative (-1.0) | High (+0.10) | **Yes** | **Yes** | **Yes** | Learner selected an incorrect option on a validated question. |
| `quiz_partial` | Medium (0.50) | Neutral (+0.2) | Medium (+0.06) | **Yes** (Marginal) | **Yes** | **Yes** | Partial correctness on multi-part assessment. |
| `tutor_question` | Low (0.25) | Neutral (0.0) | Low (+0.02) | **No** | **Yes** (Marginal) | **No** | Learner asked a conceptual question to the AI Tutor (indicates engagement). |
| `tutor_explanation_request` | Medium (0.40) | Negative (-0.3) | Medium (+0.05) | **Yes** (Slight drop) | **Yes** | **No** | Learner explicitly asked for explanation of a fundamental concept (indicates confusion). |
| `concept_review` | Low (0.20) | Neutral (0.0) | Low (+0.01) | **No** | **No** | **Yes** (Resets decay) | Learner opened and reviewed concept notes/cards. |
| `mistake_recurrence` | Very High (0.95) | Negative (-1.2) | High (+0.15) | **Yes** (Penalty) | **Yes** | **Yes** | Same mistake pattern repeated across multiple distinct questions. |
| `retrieval_success` | High (0.80) | Positive (+0.9) | High (+0.10) | **Yes** | **Yes** | **Yes** | Learner successfully recalled concept during spaced review session. |
| `review_success` | High (0.75) | Positive (+0.8) | Medium (+0.08) | **Yes** | **Yes** | **Yes** (Strengthens) | Completed scheduled spaced repetition card correctly. |
| `review_failure` | High (0.80) | Negative (-0.9) | Medium (+0.08) | **Yes** | **Yes** | **Yes** (Resets interval) | Failed scheduled spaced repetition card. |

---

## 3. Mathematical Update Rules per Evidence Type

### 3.1 Bayesian Knowledge Tracing (BKT) Formulation

For primary assessment evidence (`quiz_correct`, `quiz_incorrect`, `review_success`, `review_failure`), we apply formal 4-parameter BKT:

- $P(L_0) = 0.20$ (Prior probability of initial knowledge before observation)
- $P(T) = 0.15$ (Probability of acquiring knowledge during a transition opportunity)
- $P(G) = 0.25$ (Probability of a correct guess despite not knowing; 4-option multiple choice $\approx 0.25$)
- $P(S) = 0.10$ (Probability of a careless slip despite knowing)

#### Evidence Step 1: Posterior Update Given Observation $O_t$

If observation is **CORRECT** ($O_t = 1$):
$$P(L_t \mid O_t = 1) = \frac{P(L_{t-1}) \cdot (1 - P(S))}{P(L_{t-1}) \cdot (1 - P(S)) + (1 - P(L_{t-1})) \cdot P(G)}$$

If observation is **INCORRECT** ($O_t = 0$):
$$P(L_t \mid O_t = 0) = \frac{P(L_{t-1}) \cdot P(S)}{P(L_{t-1}) \cdot P(S) + (1 - P(L_{t-1})) \cdot (1 - P(G))}$$

#### Evidence Step 2: Learning Transition for Next State

$$P(L_{t+1}) = P(L_t \mid O_t) + (1 - P(L_t \mid O_t)) \cdot P(T)$$

All probabilities remain strictly bounded within $[0.01, 0.99]$.

---

### 3.2 Confidence Accumulation Formulation

Confidence $C \in [0.0, 0.98]$ reflects sample size and variance:

$$C_t = 1.0 - \exp\left(-\frac{N_{\text{attempts}}}{5.0}\right)$$

Where:
- At $N = 0$: $C = 0.00$ (complete uncertainty)
- At $N = 1$: $C = 0.18$
- At $N = 3$: $C = 0.45$
- At $N = 7$: $C = 0.75$
- At $N = 15$: $C = 0.95$
- Asymptotically capped at $0.98$ to preserve epistemic humility.

---

### 3.3 Memory Retention Decay Formulation

Retention $R(t) \in [0.0, 1.0]$ decays exponentially as a function of elapsed time $t$ (hours) and stability factor $S$:

$$R(t) = \exp\left(-\frac{t}{S}\right)$$

Where stability $S$ (in hours) increases with successful spaced reviews:
$$S_{\text{new}} = \begin{cases}
S_{\text{old}} \times 2.2 & \text{on review success} \\
\max(12.0, S_{\text{old}} \times 0.5) & \text{on review failure}
\end{cases}$$

Base stability for a newly acquired concept is initialized to $S = 24.0$ hours (1 day).
A concept is marked `AT_RISK` when $R(t) < 0.60$.
A review is due when $R(t) \le 0.70$.
