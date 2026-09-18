export type Role = 'user' | 'assistant' | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Space {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Project {
  id: string;
  spaceId: string;
  ownerUserId: string;
  name: string;
  description: string;
  learningGoals: string[];
  createdAt: string;
}

export type DocumentSourceType = 'pdf' | 'notes' | 'text' | 'article';
export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export interface MaterialDocument {
  id: string;
  projectId: string;
  spaceId: string;
  ownerUserId: string;
  title: string;
  sourceType: DocumentSourceType;
  rawContent: string;
  sanitizedContent: string;
  contentHash: string;
  status: DocumentStatus;
  chunkCount: number;
  uploadedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  docTitle: string;
  projectId: string;
  spaceId: string;
  chunkIndex: number;
  content: string;
  sectionTitle: string;
  tokenCount: number;
  securityFlags: {
    promptInjectionDetected: boolean;
    sanitized: boolean;
    suspiciousPatternsFound: string[];
  };
  mediaAssetId?: string;
  mediaType?: 'text' | 'image' | 'diagram' | 'audio_transcript';
  boundingBox?: { xmin: number; ymin: number; xmax: number; ymax: number };
  timeRange?: { startSeconds: number; endSeconds: number };
}

export interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface TimeRange {
  startSeconds: number;
  endSeconds: number;
}

export interface Citation {
  chunkId: string;
  docId: string;
  docTitle: string;
  section: string;
  snippet: string;
  relevanceScore: number;
  page?: number;
  sourceLocation?: string;
  mediaAssetId?: string;
  mediaType?: 'text' | 'image' | 'diagram' | 'audio' | 'audio_transcript';
  boundingBox?: BoundingBox;
  timeRange?: TimeRange;
}

export type GroundingStatus = 'grounded' | 'insufficient_evidence' | 'partial';
export type EvidenceClassification = 'strong' | 'weak' | 'insufficient';

export type ConceptRelationshipType = 'PREREQUISITE' | 'RELATED_TO' | 'EXAMPLE_OF' | 'PART_OF';

export interface Concept {
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

export interface ConceptRelationship {
  id: string;
  projectId: string;
  sourceConceptId: string;
  targetConceptId: string;
  type: ConceptRelationshipType;
  confidence: number;
  sourceEvidenceIds: string[];
}

export interface ConceptGraph {
  concepts: Concept[];
  relationships: ConceptRelationship[];
}

export interface AIInteractionTelemetry {
  traceId: string;
  requestId: string;
  workflowId: string;
  feature: 'tutor' | 'quiz_generation' | 'assessment' | 'indexing' | 'hybrid_retrieval' | 'concept_extraction';
  model: string;
  latencyMs: number;
  retrievalLatencyMs: number;
  embeddingLatencyMs?: number;
  lexicalCandidateCount?: number;
  semanticCandidateCount?: number;
  mergedCandidateCount?: number;
  finalEvidenceCount?: number;
  evidenceClassification?: EvidenceClassification;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  success: boolean;
  error?: string | null;
  timestamp: string;
}

export interface TutorMessage {
  id: string;
  sessionId: string;
  projectId: string;
  role: Role;
  content: string;
  citations: Citation[];
  groundingStatus: GroundingStatus;
  telemetry?: AIInteractionTelemetry;
  timestamp: string;
}

export type BloomTaxonomyLevel = 'recall' | 'comprehension' | 'application' | 'analysis';
export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface QuizQuestion {
  id: string;
  projectId: string;
  topic: string;
  bloomLevel: BloomTaxonomyLevel;
  difficulty: QuizDifficulty;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  groundingChunkId?: string;
  sourceCitation?: Citation;
}

export interface QuizSubmissionResult {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  score: number; // 0 - 100
  feedback: string;
  explanation: string;
  masteryDelta: number;
  sourceCitation?: Citation;
  telemetry?: AIInteractionTelemetry;
}

export interface ConceptMastery {
  topic: string;
  masteryScore: number; // 0 - 100 (Estimate, not ground truth)
  confidenceScore: number; // 0 - 100
  attemptsCount: number;
  successCount: number;
  mistakes: string[];
  lastPracticedAt: string;
}

export interface LearningRecommendation {
  id: string;
  recommendedTopic: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  action: 'review_concept' | 'attempt_quiz' | 'ask_tutor' | 'read_material';
}

export interface LearnerModel {
  id: string;
  userId: string;
  projectId: string;
  spaceId: string;
  conceptMastery: Record<string, ConceptMastery>;
  overallMastery: number;
  learningVelocity: number;
  recommendations: LearningRecommendation[];
  updatedAt: string;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type JobType = 'document_processing' | 'knowledge_indexing' | 'quiz_generation' | 'media_processing';

export type MediaProcessingStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'READY_FOR_PROCESSING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'failed';

export interface MediaAsset {
  id: string;
  ownerUserId: string;
  spaceId: string;
  projectId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  byteSize?: number;
  storagePath: string;
  checksum: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  mediaType: 'image' | 'diagram' | 'audio';
  processingStatus: MediaProcessingStatus;
  processingError?: string | null;
  metadata?: string | null; // JSON encoded metadata
  visionMetadata?: {
    detectedRegions?: Array<{ label: string; boundingBox: BoundingBox; description?: string }>;
    ocrExtractedText?: string;
  };
  audioMetadata?: {
    durationSeconds?: number;
    segments?: Array<{ startSeconds: number; endSeconds: number; text: string }>;
    fullTranscript?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  projectId: string;
  userId: string;
  progress: number;
  retryCount: number;
  maxRetries: number;
  error: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  resultSummary?: string;
}

// ==========================================
// Phase 3: Learner Intelligence Engine Types
// ==========================================

export type MistakeType =
  | 'CONCEPT_GAP'
  | 'MISCONCEPTION'
  | 'CARELESS_ERROR'
  | 'RECALL_FAILURE'
  | 'APPLICATION_FAILURE'
  | 'PREREQUISITE_GAP';

export interface MistakeRecord {
  mistakeId: string;
  learnerId: string;
  projectId: string;
  conceptId: string;
  questionId: string;
  mistakeType: MistakeType;
  learnerAnswer: string;
  correctAnswer: string;
  explanation: string;
  sourceEvidence: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  resolved: boolean;
  resolutionEvidence?: string;
}

export type LearningEventType =
  | 'MATERIAL_VIEWED'
  | 'TUTOR_QUESTION'
  | 'TUTOR_RESPONSE'
  | 'QUIZ_STARTED'
  | 'QUIZ_ANSWERED'
  | 'QUIZ_COMPLETED'
  | 'MISTAKE_CREATED'
  | 'MISTAKE_RESOLVED'
  | 'CONCEPT_REVIEWED'
  | 'RECOMMENDATION_CREATED'
  | 'RECOMMENDATION_COMPLETED'
  | 'MEDIA_VIEWED'
  | 'DIAGRAM_INTERACTED'
  | 'AUDIO_PLAYED';

export interface LearningEvent {
  eventId: string;
  learnerId: string;
  projectId: string;
  conceptId?: string;
  timestamp: string;
  eventType: LearningEventType;
  payload: Record<string, any>;
  requestId?: string;
}

export type SpacedRepetitionState =
  | 'NEW'
  | 'LEARNING'
  | 'REVIEW'
  | 'MASTERED'
  | 'AT_RISK';

export interface LearnerConceptState {
  id: string;
  learnerId: string;
  projectId: string;
  conceptId: string;
  conceptName: string;

  mastery: number; // 0.0 -> 1.0 (BKT or calibrated posterior)
  confidence: number; // 0.0 -> 1.0 (monotonic sample certainty)

  attemptCount: number;
  correctCount: number;
  incorrectCount: number;

  lastAttemptAt?: string;
  lastCorrectAt?: string;

  recentPerformance: number[]; // Array of recent binary results [1, 0, 1] (max 10)

  mistakeCount: number;
  repeatedMistakeCount: number;

  retentionStrength: number; // 0.0 -> 1.0
  reviewDueAt: string; // ISO-8601
  repetitionState: SpacedRepetitionState;

  stabilityHours: number; // Memory stability in hours for decay model

  updatedAt: string;
}

export type LearnerActionType =
  | 'REVIEW_CONCEPT'
  | 'PRACTICE_QUIZ'
  | 'READ_SOURCE'
  | 'ASK_TUTOR'
  | 'REVIEW_MISTAKE'
  | 'STUDY_PREREQUISITE'
  | 'TAKE_ASSESSMENT'
  | 'REVIEW_DIAGRAM'
  | 'EXPLAIN_CONCEPT_VISUALLY'
  | 'LISTEN_EXPLANATION'
  | 'REVIEW_AUDIO_TRANSCRIPT'
  | 'ANSWER_VISUAL_QUESTION'
  | 'PRACTICE_WITH_DIAGRAM';

export interface AdaptiveNextAction {
  action: LearnerActionType;
  conceptId: string;
  conceptName: string;
  priority: number; // 0.0 -> 1.0
  reason: string;
  evidence: string[];
  createdAt: string;
  mediaAssetId?: string;
  mediaType?: 'image' | 'diagram' | 'audio';
}

export interface LearnerAnalyticsDashboardData {
  overallMastery: number; // 0.0 -> 1.0
  overallConfidence: number; // 0.0 -> 1.0
  conceptsTracked: number;
  masteryDistribution: {
    beginner: number; // mastery < 0.40
    developing: number; // 0.40 - 0.70
    mastered: number; // >= 0.70
  };
  weakConcepts: Array<{
    conceptId: string;
    conceptName: string;
    mastery: number;
    confidence: number;
    repeatedMistakes: number;
  }>;
  strongConcepts: Array<{
    conceptId: string;
    conceptName: string;
    mastery: number;
  }>;
  retentionRiskConcepts: Array<{
    conceptId: string;
    conceptName: string;
    retentionStrength: number;
    reviewDueAt: string;
  }>;
  activeMistakes: MistakeRecord[];
  recentEvents: LearningEvent[];
  recommendedActions: AdaptiveNextAction[];
  multimodalActivity?: {
    visualConceptsCount: number;
    audioConceptsCount: number;
    diagramsPracticedCount: number;
    recentVisualAssets: Array<{ id: string; filename: string; mediaType: string }>;
    recentAudioAssets: Array<{ id: string; filename: string; durationSeconds?: number }>;
  };
}


// --- PHASE 4: ORCHESTRATION & LEARNING LOOP EXPERIENCES ---

export type SocraticHintLevel = 'HINT_1' | 'HINT_2' | 'HINT_3' | 'EXPLANATION';

export interface SocraticInteraction {
  id: string;
  projectId: string;
  conceptId: string;
  userQuery: string;
  identifiedGoal: string;
  currentHintLevel: SocraticHintLevel;
  aiQuestion: string;
  userResponse?: string;
  evaluation?: 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT';
  evaluationFeedback?: string;
  nextHint?: string;
  explanation?: string;
  citations: Citation[];
  createdAt: number;
  updatedAt: number;
}

export type StudyPlanActionType = 'REVIEW_PREREQUISITE' | 'PRACTICE_QUIZ' | 'REVIEW_MISTAKE' | 'ASK_TUTOR' | 'READ_SOURCE' | 'TAKE_ASSESSMENT' | 'REVIEW_CONCEPT';

export interface StudyPlanItem {
  id: string;
  type: StudyPlanActionType;
  conceptId: string;
  conceptName: string;
  reason: string;
  estimatedMinutes: number;
  completed: boolean;
  priority: number;
}

export interface DailyStudyPlan {
  id: string;
  projectId: string;
  learnerId: string;
  dateStr: string; // YYYY-MM-DD
  items: StudyPlanItem[];
  createdAt: number;
}

export interface ExamConfig {
  topic?: string;
  numQuestions: number;
  difficulty: 'BALANCED' | 'ADAPTIVE' | 'CHALLENGE';
  timeLimitMinutes?: number;
}

export interface ExamQuestion extends QuizQuestion {
  id: string;
}

export interface ExamSession {
  id: string;
  projectId: string;
  learnerId: string;
  config: ExamConfig;
  questions: ExamQuestion[];
  responses: Record<string, number>; // questionId -> selectedOptionIndex
  startedAt: number;
  completedAt?: number;
}

export interface ExamResult {
  examId: string;
  score: number;
  totalQuestions: number;
  conceptPerformance: Record<string, { correct: number; total: number }>;
  bloomPerformance: Record<BloomTaxonomyLevel, { correct: number; total: number }>;
  newMistakes: MistakeRecord[];
  masteryChanges: Record<string, { previous: number; new: number }>;
  recommendations: AdaptiveNextAction[];
}
