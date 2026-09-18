# PHASE 6 SPECIFICATION: MULTI-MODAL ADAPTIVE LEARNING

## 1. Objective
Extend the AI Study Companion from a purely text/PDF-based learning companion to a unified multi-modal adaptive learning engine supporting:
- Text
- Documents (PDF)
- Visual media (Images, Screenshots, Diagrams, Technical Charts, Formula Figures)
- Audio recordings (Educational lectures, voice explanations, spoken notes)

The core principle is strict preservation of the unified learning loop: multi-modal inputs must not become disconnected media silos. All media must feed into the same Knowledge Intelligence, Grounded Retrieval, Bayesian Knowledge Tracing (BKT), Mistake Intelligence, Next Best Action (NBA) engine, and persistent relational state.

---

## 2. Scope & Non-Goals

### In Scope
1. **Media Foundation & Storage (6A)**:
   - Secure media asset storage with project and tenant isolation (`ownerUserId`, `spaceId`, `projectId`).
   - Magic byte verification for PNG, JPEG, WEBP; file size and dimension checks; SHA-256 integrity checksums.
   - Non-executable disk storage under `uploads/projects/:projectId/media/:mediaId`.
   - Drizzle ORM `media_assets` table and migrations.
2. **Image & Diagram Intelligence (6B)**:
   - Asynchronous processing via `BackgroundJobQueue`.
   - Structured vision analysis using `@google/genai` (Gemini 2.5/3.0/3.8 multi-modal parts).
   - Defanged OCR extraction passing through `sanitizeUntrustedDocument()`.
   - Visual concept extraction with strict media provenance and uncertainty metrics.
3. **Multi-Modal Grounded Tutor (6C)**:
   - Tutor chat supporting mixed text and visual evidence context budgets.
   - Grounded citations with `mediaAssetId`, bounding box coordinates (`bbox`), and snippet previews.
   - Defenses against indirect prompt injection embedded within visual text or OCR output.
4. **Multi-Modal Retrieval & Evidence (6D)**:
   - Partitioned visual-text index avoiding vector corruption.
   - Reciprocal Rank Fusion (RRF) across lexical text, dense semantic text, and visual metadata/concepts.
   - Evidence sufficiency gating for visual questions (preventing hallucinations on diagram queries).
5. **Audio & Speech Learning (6E)**:
   - Educational audio upload (WAV, MP3, M4A, OGG) with magic byte validation and size limits.
   - Asynchronous transcription via Gemini multimodal audio processing.
   - Transcript sanitization, chunking, and timestamped audio citations (`startSeconds`, `endSeconds`).
6. **Adaptive Multi-Modal Intelligence (6F)**:
   - Multi-modal learning events feeding directly into the existing 4-parameter BKT engine.
   - Modality-aware Next Best Actions (e.g., visual misconception remediation, diagram practice, audio review).
   - Multi-modal activity metrics on the Learning Dashboard.
7. **Full Integration & Forensic Verification (6G)**:
   - Comprehensive test suite covering units, security, isolation, and end-to-end golden paths.

### Non-Goals
- Real-time live bi-directional WebRTC audio streaming (unjustified complexity for asynchronous study companion).
- Unrestricted public file hosting or CDN distribution.
- Bypassing deterministic BKT with LLM-generated learner scores.
- Arbitrary code execution inside uploaded SVG files (SVG is explicitly rejected for safety).

---

## 3. Architecture & Data Model

### Relational Schema (SQLite via Drizzle)
```typescript
// media_assets
export const mediaAssets = sqliteTable('media_assets', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id').notNull(),
  spaceId: text('space_id').notNull(),
  projectId: text('project_id').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  storagePath: text('storage_path').notNull(),
  checksum: text('checksum').notNull(),
  width: integer('width'),
  height: integer('height'),
  durationSeconds: real('duration_seconds'),
  mediaType: text('media_type').notNull(), // 'image' | 'diagram' | 'audio'
  processingStatus: text('processing_status').notNull().default('UPLOADED'),
  processingError: text('processing_error'),
  metadata: text('metadata'), // JSON: OCR text, description, components, transcript, uncertainty
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

### Chunks Extension
Existing `chunks` schema extended with:
- `mediaAssetId`: Foreign key to `media_assets.id` (nullable)
- `mediaType`: `'text' | 'image' | 'diagram' | 'audio_transcript'`
- `boundingBox`: JSON string `{ xmin: number, ymin: number, xmax: number, ymax: number }`
- `timeRange`: JSON string `{ startSeconds: number, endSeconds: number }`

---

## 4. Media Lifecycle & Background Processing
1. `UPLOADED`: Binary validated, SHA-256 computed, saved to sandboxed directory.
2. `QUEUED`: Enqueued in `BackgroundJobQueue` with job type `PROCESS_MEDIA_ASSET`.
3. `PROCESSING`: Extracted via Gemini Vision/Audio; OCR sanitized via `sanitizeUntrustedDocument()`.
4. `CHUNKING_AND_INDEXING`: Media chunks created with visual anchors and ingested into vector/lexical index.
5. `CONCEPT_EXTRACTION`: Visual concepts and verified relationships mapped into Concept Graph with provenance.
6. `READY`: Asset ready for grounded tutor citations, quiz generation, and learner retrieval.
7. `FAILED`: Processing failure recorded with safe error details; job retried up to 3 times.

---

## 5. Security & Isolation Model
- **Tenancy Boundary**: Every media endpoint requires `verifyProjectIsolation`, asserting `req.user.id == asset.ownerUserId` and `req.params.projectId == asset.projectId`.
- **Upload Hardening**:
  - Max image size: 10MB; Max audio size: 25MB.
  - Magic byte validation: PNG (`89 50 4E 47`), JPEG (`FF D8 FF`), WEBP (`52 49 46 46 ... 57 45 42 50`), MP3 (`49 44 33` or frame sync), WAV (`52 49 46 46 ... 57 41 56 45`), OGG (`4F 67 67 53`).
  - Strict rejection of SVG, HTML, scripts, polyglot files, and directory traversal characters in filenames.
- **Indirect Prompt Injection**:
  - Image text / OCR and audio transcripts are enclosed inside `<untrusted_visual_evidence>` / `<untrusted_audio_transcript>` blocks.
  - Sanitizer neutralizes role-play tokens, markdown escapes, and system prompt override attempts.

---

## 6. AI Boundaries & Authoritative State
- **Deterministic vs. Generative**: The LLM analyzes images and produces descriptions, candidate OCR text, and explanations. The LLM **NEVER** mutates learner mastery, BKT probability, or mistake records directly.
- **Learning Event Ingestion**: Interactions with visual/audio content emit structured `LearningEvent` payloads (`QUIZ_SUBMISSION`, `TUTOR_CHAT`, `DIAGRAM_PRACTICE`) processed deterministically by `LearnerIntelligenceEngine.recordInteraction()`.

---

## 7. Citation & Evidence Model
Citations are extended in `src/types.ts` and `server/grounding.ts`:
```typescript
export interface MultiModalCitation {
  id: string;
  sourceType: 'document' | 'media_image' | 'media_diagram' | 'media_audio';
  documentId?: string;
  mediaAssetId?: string;
  title: string;
  snippet: string;
  page?: number;
  boundingBox?: { xmin: number; ymin: number; xmax: number; ymax: number };
  timeRange?: { startSeconds: number; endSeconds: number };
  relevanceScore: number;
}
```

---

## 8. Acceptance Criteria
- [ ] Schema updated in `server/db/schema.ts` and migration applied cleanly without data loss.
- [ ] Secure upload endpoints (`POST /api/projects/:projectId/media`) reject invalid MIME and enforce quotas.
- [ ] Safe file serving (`GET /api/projects/:projectId/media/:mediaId`) enforces project isolation.
- [ ] Background job processes images, diagrams, and audio with OCR and concept extraction.
- [ ] Tutor handles multimodal queries, grounded in visual evidence with bounding box citations.
- [ ] Multi-modal interactions trigger learning events updating BKT and NBA deterministically.
- [ ] Regression suite (all 38 Phase 1–5 tests + Phase 4 tests) remains 100% green.
- [ ] Comprehensive Phase 6 test suite passing.
- [ ] Documentation and forensic review completed.
