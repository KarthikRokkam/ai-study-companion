import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
});

export const spaces = sqliteTable('spaces', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  createdAt: text('created_at').notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  spaceId: text('space_id').notNull(),
  ownerUserId: text('owner_user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  learningGoals: text('learning_goals', { mode: 'json' }).$type<string[]>().notNull(),
  createdAt: text('created_at').notNull(),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  spaceId: text('space_id').notNull(),
  ownerUserId: text('owner_user_id').notNull(),
  title: text('title').notNull(),
  sourceType: text('source_type').notNull(),
  rawContent: text('raw_content').notNull(),
  sanitizedContent: text('sanitized_content').notNull(),
  contentHash: text('content_hash').notNull(),
  status: text('status').notNull(),
  chunkCount: integer('chunk_count').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
});

export const chunks = sqliteTable('chunks', {
  id: text('id').primaryKey(),
  docId: text('doc_id').notNull(),
  docTitle: text('doc_title').notNull(),
  projectId: text('project_id').notNull(),
  spaceId: text('space_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  sectionTitle: text('section_title'),
  content: text('content').notNull(),
  tokenCount: integer('token_count').notNull(),
  securityFlags: text('security_flags', { mode: 'json' }).notNull(),
  mediaAssetId: text('media_asset_id'),
  mediaType: text('media_type').default('text'),
  boundingBox: text('bounding_box', { mode: 'json' }),
  timeRange: text('time_range', { mode: 'json' }),
});

export const concepts = sqliteTable('concepts', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  sourceChunkIds: text('source_chunk_ids', { mode: 'json' }).$type<string[]>().notNull(),
  prerequisiteConceptIds: text('prerequisite_concept_ids', { mode: 'json' }).$type<string[]>().notNull(),
  relatedConceptIds: text('related_concept_ids', { mode: 'json' }).$type<string[]>().notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const conceptRelationships = sqliteTable('concept_relationships', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  sourceConceptId: text('source_concept_id').notNull(),
  targetConceptId: text('target_concept_id').notNull(),
  type: text('type').notNull().default('text'), // ConceptRelationshipType
  confidence: real('confidence').notNull(),
  sourceEvidenceIds: text('source_evidence_ids', { mode: 'json' }).$type<string[]>().notNull(),
});

export const learnerConceptStates = sqliteTable('learner_concept_states', {
  id: text('id').primaryKey(),
  learnerId: text('learner_id').notNull(),
  projectId: text('project_id').notNull(),
  conceptId: text('concept_id').notNull(),
  conceptName: text('concept_name').notNull(),
  mastery: real('mastery').notNull(),
  confidence: real('confidence').notNull(),
  attemptCount: integer('attempt_count').notNull(),
  correctCount: integer('correct_count').notNull(),
  incorrectCount: integer('incorrect_count').notNull(),
  lastAttemptAt: text('last_attempt_at'),
  lastCorrectAt: text('last_correct_at'),
  recentPerformance: text('recent_performance', { mode: 'json' }).$type<number[]>().notNull(),
  mistakeCount: integer('mistake_count').notNull(),
  repeatedMistakeCount: integer('repeated_mistake_count').notNull(),
  retentionStrength: real('retention_strength').notNull(),
  reviewDueAt: text('review_due_at').notNull(),
  repetitionState: text('repetition_state').notNull(),
  stabilityHours: real('stability_hours').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => {
  return {
    learnerProjectIdx: index('idx_learner_project').on(table.learnerId, table.projectId),
  };
});

export const mistakeRecords = sqliteTable('mistake_records', {
  mistakeId: text('mistake_id').primaryKey(),
  learnerId: text('learner_id').notNull(),
  projectId: text('project_id').notNull(),
  conceptId: text('concept_id').notNull(),
  questionId: text('question_id').notNull(),
  mistakeType: text('mistake_type').notNull(),
  learnerAnswer: text('learner_answer').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation').notNull(),
  sourceEvidence: text('source_evidence').notNull(),
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  occurrenceCount: integer('occurrence_count').notNull(),
  resolved: integer('resolved', { mode: 'boolean' }).notNull(),
  resolutionEvidence: text('resolution_evidence'),
});

export const learningEvents = sqliteTable('learning_events', {
  eventId: text('event_id').primaryKey(),
  learnerId: text('learner_id').notNull(),
  projectId: text('project_id').notNull(),
  conceptId: text('concept_id'),
  timestamp: text('timestamp').notNull(),
  eventType: text('event_type').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  requestId: text('request_id'),
});

export const backgroundJobs = sqliteTable('background_jobs', {
  id: text('id').primaryKey(),
  type: text('type').notNull().default('text'),
  status: text('status').notNull(),
  projectId: text('project_id').notNull(),
  userId: text('user_id').notNull(),
  progress: real('progress').notNull(),
  retryCount: integer('retry_count').notNull(),
  maxRetries: integer('max_retries').notNull(),
  error: text('error'),
  idempotencyKey: text('idempotency_key').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  resultSummary: text('result_summary'),
});

export const quizQuestions = sqliteTable('quiz_questions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  topic: text('topic').notNull(),
  bloomLevel: text('bloom_level').notNull(),
  difficulty: text('difficulty').notNull(),
  prompt: text('prompt').notNull(),
  options: text('options', { mode: 'json' }).$type<string[]>().notNull(),
  correctOptionIndex: integer('correct_option_index').notNull(),
  explanation: text('explanation').notNull(),
  groundingChunkId: text('grounding_chunk_id'),
  sourceCitation: text('source_citation', { mode: 'json' }).notNull(),
});

export const examSessions = sqliteTable('exam_sessions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  learnerId: text('learner_id').notNull(),
  config: text('config', { mode: 'json' }).notNull(),
  questions: text('questions', { mode: 'json' }).notNull(),
  responses: text('responses', { mode: 'json' }).notNull(),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
});

// Idempotency tracking for explicit operations that shouldn't be duplicated
export const idempotencyKeys = sqliteTable('idempotency_keys', {
  key: text('key').primaryKey(),
  createdAt: text('created_at').notNull(),
});

export const tutorMessages = sqliteTable('tutor_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  projectId: text('project_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  citations: text('citations', { mode: 'json' }).notNull(),
  groundingStatus: text('grounding_status', { mode: 'json' }).notNull(),
  telemetry: text('telemetry', { mode: 'json' }),
  timestamp: text('timestamp').notNull(),
});

export const socraticInteractions = sqliteTable('socratic_interactions', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  conceptId: text('concept_id').notNull(),
  userQuery: text('user_query').notNull(),
  identifiedGoal: text('identified_goal').notNull(),
  currentHintLevel: text('current_hint_level').notNull(),
  aiQuestion: text('ai_question').notNull(),
  userResponse: text('user_response'),
  evaluation: text('evaluation'),
  evaluationFeedback: text('evaluation_feedback'),
  nextHint: text('next_hint'),
  explanation: text('explanation'),
  citations: text('citations', { mode: 'json' }).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const dailyStudyPlans = sqliteTable('daily_study_plans', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  learnerId: text('learner_id').notNull(),
  dateStr: text('date_str').notNull(),
  items: text('items', { mode: 'json' }).notNull(),
  createdAt: integer('created_at').notNull(),
});

export const examResults = sqliteTable('exam_results', {
  examId: text('exam_id').primaryKey(),
  score: real('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  conceptPerformance: text('concept_performance', { mode: 'json' }).notNull(),
  bloomPerformance: text('bloom_performance', { mode: 'json' }).notNull(),
  newMistakes: text('new_mistakes', { mode: 'json' }).notNull(),
  masteryChanges: text('mastery_changes', { mode: 'json' }).notNull(),
  recommendations: text('recommendations', { mode: 'json' }).notNull(),
});

export const learnerModels = sqliteTable('learner_models', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  projectId: text('project_id').notNull(),
  spaceId: text('space_id').notNull(),
  conceptMastery: text('concept_mastery', { mode: 'json' }).notNull(),
  overallMastery: real('overall_mastery').notNull(),
  learningVelocity: real('learning_velocity').notNull(),
  recommendations: text('recommendations', { mode: 'json' }).notNull(),
  updatedAt: text('updated_at').notNull(),
});

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
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

