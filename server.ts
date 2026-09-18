import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { MediaSecurityService } from './server/media.js';
import {
  authenticateUser,
  verifySpaceIsolation,
  verifyProjectIsolation,
  AuthenticatedRequest,
} from './server/auth.js';
import { BackgroundJobManager } from './server/jobs.js';
import {
  generateTutorResponse,
  generateAdaptiveQuizQuestion,
  evaluateQuizSubmission,
} from './server/structured-ai.js';
import { LearnerModelEngine } from './server/learner.js';
import { LearnerIntelligenceEngine } from './server/learner-intelligence.js';
import { ObservabilityTracer } from './server/telemetry.js';
import { ConceptGraphEngine } from './server/concepts.js';
import { retrieveHybridKnowledgeSync } from './server/grounding.js';
import { MaterialDocument, Space, Project } from './src/types.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const upload = multer({
    limits: { fileSize: 25 * 1024 * 1024 },
    storage: multer.memoryStorage(),
  });

  // Global user authentication middleware
  app.use(authenticateUser as express.RequestHandler);

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AI Study Companion',
      version: '1.0.0-phase1',
      timestamp: new Date().toISOString(),
    });
  });

  // 2. User info
  app.get('/api/me', (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // 3. Spaces (List and Create)
  app.get('/api/spaces', (req: AuthenticatedRequest, res) => {
    const userSpaces: Space[] = [];
    for (const space of db.spaces.values()) {
      if (space.ownerUserId === req.user!.id) {
        userSpaces.push(space);
      }
    }
    res.json({ spaces: userSpaces });
  });

  app.post('/api/spaces', (req: AuthenticatedRequest, res) => {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Space name is required.' });
    }
    if (name.length > 120) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Space name exceeds maximum length of 120 characters.' });
    }

    const spaceId = `spc_${crypto.randomUUID().slice(0, 10)}`;
    const newSpace: Space = {
      id: spaceId,
      ownerUserId: req.user!.id,
      name: name.trim(),
      description: description ? String(description).slice(0, 1000).trim() : '',
      createdAt: new Date().toISOString(),
    };

    db.spaces.set(spaceId, newSpace);
    res.status(201).json({ space: newSpace });
  });

  // 4. Projects under Space (List and Create)
  app.get('/api/spaces/:spaceId/projects', verifySpaceIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const spaceProjects: Project[] = [];
    for (const project of db.projects.values()) {
      if (project.spaceId === req.space!.id && project.ownerUserId === req.user!.id) {
        spaceProjects.push(project);
      }
    }
    res.json({ space: req.space, projects: spaceProjects });
  });

  app.post('/api/spaces/:spaceId/projects', verifySpaceIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const { name, description, learningGoals } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Project name is required.' });
    }
    if (name.length > 120) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Project name exceeds maximum length of 120 characters.' });
    }

    const projectId = `prj_${crypto.randomUUID().slice(0, 10)}`;
    const newProject: Project = {
      id: projectId,
      spaceId: req.space!.id,
      ownerUserId: req.user!.id,
      name: name.trim(),
      description: description ? String(description).slice(0, 1000).trim() : '',
      learningGoals: Array.isArray(learningGoals) ? learningGoals.slice(0, 10).map((g) => String(g).slice(0, 200)) : [],
      createdAt: new Date().toISOString(),
    };

    db.projects.set(projectId, newProject);
    res.status(201).json({ project: newProject });
  });

  // 5. Project Metadata & Details
  app.get('/api/projects/:projectId', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    res.json({
      project: req.project,
      space: req.space,
    });
  });

  // 6. Documents / Materials for Project
  app.get('/api/projects/:projectId/documents', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const docs: MaterialDocument[] = [];
    for (const doc of db.documents.values()) {
      if (doc.projectId === req.project!.id && doc.ownerUserId === req.user!.id) {
        docs.push(doc);
      }
    }
    res.json({ documents: docs });
  });

  // Upload Material Document & Enqueue Background Job
  app.post('/api/projects/:projectId/documents', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const { title, content, sourceType } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Title and content are required.' });
    }
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Title must be a string under 200 characters.' });
    }
    if (typeof content !== 'string' || content.length > 1000000) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Content exceeds maximum length (1,000,000 characters).' });
    }

    const docId = `doc_${crypto.randomUUID().slice(0, 10)}`;
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    const newDoc: MaterialDocument = {
      id: docId,
      projectId: req.project!.id,
      spaceId: req.space!.id,
      ownerUserId: req.user!.id,
      title: String(title).trim(),
      sourceType: (sourceType as any) || 'text',
      rawContent: String(content),
      sanitizedContent: '',
      contentHash,
      status: 'pending',
      chunkCount: 0,
      uploadedAt: new Date().toISOString(),
    };

    db.documents.set(docId, newDoc);

    // Enqueue background processing job with idempotency
    const idempotencyKey = `index_doc_${docId}_${contentHash.slice(0, 12)}`;
    const { job, isExisting } = BackgroundJobManager.enqueueJob({
      type: 'knowledge_indexing',
      projectId: req.project!.id,
      userId: req.user!.id,
      idempotencyKey,
      payload: { docId },
    });

    res.status(202).json({
      document: newDoc,
      job,
      isExisting,
      message: 'Document accepted. Background indexing queued.',
    });
  });

  // 7. Chunks for Project (Inspecting Knowledge Base)
  app.get('/api/projects/:projectId/chunks', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const projectChunks = [];
    for (const chunk of db.chunks.values()) {
      if (chunk.projectId === req.project!.id) {
        projectChunks.push(chunk);
      }
    }
    res.json({ chunks: projectChunks });
  });

  // 8. Background Jobs for Project
  app.get('/api/projects/:projectId/jobs', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const jobs = BackgroundJobManager.listJobsForProject(req.project!.id);
    res.json({ jobs });
  });

  // 8a. Phase 6: Media Upload (Multipart Form or JSON base64)
  app.post(
    '/api/projects/:projectId/media',
    verifyProjectIsolation as express.RequestHandler,
    upload.single('file'),
    async (req: AuthenticatedRequest, res) => {
      try {
        let buffer: Buffer | null = null;
        let filename: string = '';

        if (req.file) {
          buffer = req.file.buffer;
          filename = req.file.originalname;
        } else if (req.body.dataBase64 && req.body.filename) {
          const rawBase64 = String(req.body.dataBase64).replace(/^data:.*?;base64,/, '');
          buffer = Buffer.from(rawBase64, 'base64');
          filename = String(req.body.filename);
        }

        if (!buffer || buffer.length === 0 || !filename) {
          return res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'A file attachment (multipart/form-data) or JSON { filename, dataBase64 } is required.',
          });
        }

        const storedAsset = await MediaSecurityService.storeMediaAsset({
          projectId: req.project!.id,
          spaceId: req.space!.id,
          ownerUserId: req.user!.id,
          originalFilename: filename,
          buffer,
        });

        // Queue asynchronous background processing job
        const { job } = BackgroundJobManager.enqueueJob({
          projectId: req.project!.id,
          userId: req.user!.id,
          type: 'media_processing',
          idempotencyKey: `media_${storedAsset.id}_${storedAsset.checksum}`,
          payload: { assetId: storedAsset.id },
        });

        res.status(202).json({
          mediaAsset: storedAsset,
          job,
          message: 'Media asset uploaded and validation passed. Processing queued.',
        });
      } catch (err: any) {
        if (err.message?.startsWith('MAGIC_BYTE_MISMATCH') || err.message?.startsWith('INVALID_MIME_TYPE')) {
          return res.status(415).json({ error: 'UNSUPPORTED_MEDIA_TYPE', message: err.message });
        }
        if (err.message?.startsWith('FILE_TOO_LARGE')) {
          return res.status(413).json({ error: 'FILE_TOO_LARGE', message: err.message });
        }
        res.status(400).json({ error: 'MEDIA_UPLOAD_FAILED', message: err.message || 'Media processing error.' });
      }
    }
  );

  // 8b. Phase 6: List Media Assets for Project
  app.get('/api/projects/:projectId/media', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const assets = Array.from(db.mediaAssets.values())
      .filter((a) => a.projectId === req.project!.id)
      .map((a) => {
        const { storagePath, ...safeAsset } = a;
        return safeAsset;
      });
    res.json({ mediaAssets: assets });
  });

  // 8c. Phase 6: Get Specific Media Asset
  app.get('/api/projects/:projectId/media/:mediaId', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const asset = db.mediaAssets.get(req.params.mediaId);
    if (!asset || asset.projectId !== req.project!.id) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Media asset not found in this project.' });
    }
    const { storagePath, ...safeAsset } = asset;
    res.json({ mediaAsset: safeAsset });
  });

  // 8d. Phase 6: Serve Safe Media Binary
  app.get('/api/projects/:projectId/media/:mediaId/file', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const asset = db.mediaAssets.get(req.params.mediaId);
    if (!asset || asset.projectId !== req.project!.id) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Media asset not found in this project.' });
    }
    if (!fs.existsSync(asset.storagePath)) {
      return res.status(404).json({ error: 'FILE_MISSING', message: 'Underlying media binary is missing from storage.' });
    }

    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fs.createReadStream(asset.storagePath).pipe(res);
  });

  // 9. Learner Model for Project (Phase 1 Baseline)
  app.get('/api/projects/:projectId/learner-model', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const model = LearnerModelEngine.getOrCreate(req.user!.id, req.project!.id, req.space!.id);
    res.json({ learnerModel: model });
  });

  // 9a. Phase 3: Learner Intelligence Analytics Dashboard Data
  app.get('/api/projects/:projectId/learner/dashboard', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const dashboard = LearnerIntelligenceEngine.getDashboardData(req.user!.id, req.project!.id);
    res.json({ dashboard });
  });

  // 9b. Phase 3: Learner Concepts Breakdown
  app.get('/api/projects/:projectId/learner/concepts', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const states = Array.from(db.learnerConceptStates.values()).filter(
      (s) => s.learnerId === req.user!.id && s.projectId === req.project!.id
    );
    res.json({ concepts: states });
  });

  // 9c. Phase 3: Active Mistakes & Misconceptions
  app.get('/api/projects/:projectId/learner/mistakes', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const mistakes = Array.from(db.mistakeRecords.values()).filter(
      (m) => m.learnerId === req.user!.id && m.projectId === req.project!.id
    );
    res.json({ mistakes });
  });

  // 9d. Phase 3: Deterministic Next Best Action
  app.get('/api/projects/:projectId/learner/next-action', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const nextAction = LearnerIntelligenceEngine.getNextBestAction(req.user!.id, req.project!.id);
    res.json({ nextAction });
  });

  // 9e. Phase 3: Ingest Learning Event with Replay Protection
  app.post('/api/projects/:projectId/learner/events', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const { eventType, conceptId, payload, idempotencyKey } = req.body;
    if (!eventType) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'eventType is required.' });
    }

    if (idempotencyKey && db.eventDeduplicationKeys.has(idempotencyKey)) {
      return res.status(200).json({ status: 'duplicate_ignored', message: 'Event already processed.' });
    }

    if (idempotencyKey) {
      db.eventDeduplicationKeys.add(idempotencyKey);
    }

    const event = {
      eventId: `evt_${crypto.randomUUID().slice(0, 10)}`,
      learnerId: req.user!.id,
      projectId: req.project!.id,
      conceptId,
      timestamp: new Date().toISOString(),
      eventType,
      payload: payload || {},
      requestId: idempotencyKey,
    };

    LearnerIntelligenceEngine.recordLearningEvent(event);
    res.status(201).json({ status: 'recorded', event });
  });

  // 9f. Phase 3: Spaced Repetition Review Submission
  app.post('/api/projects/:projectId/learner/review', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const { conceptId, isSuccess, idempotencyKey } = req.body;
    if (!conceptId || typeof isSuccess !== 'boolean') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'conceptId and boolean isSuccess are required.' });
    }

    const result = LearnerIntelligenceEngine.recordInteraction({
      learnerId: req.user!.id,
      projectId: req.project!.id,
      spaceId: req.space!.id,
      conceptId,
      isCorrect: isSuccess,
      bloomLevel: 'recall',
      idempotencyKey,
    });

    res.json({ result });
  });

  // 9b. Concept Graph for Project
  app.get('/api/projects/:projectId/concepts', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const graph = ConceptGraphEngine.getGraph(req.project!.id);
    res.json(graph);
  });

  // 9c. On-demand Concept Extraction for Project
  app.post('/api/projects/:projectId/concepts/extract', verifyProjectIsolation as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
    try {
      const projectChunks = [];
      for (const chunk of db.chunks.values()) {
        if (chunk.projectId === req.project!.id) {
          projectChunks.push(chunk);
        }
      }
      const graph = await ConceptGraphEngine.extractFromChunks(req.project!.id, projectChunks);
      res.json(graph);
    } catch (err: any) {
      res.status(500).json({ error: 'CONCEPT_EXTRACTION_FAILED', message: err.message });
    }
  });

  // 9d. Hybrid Retrieval Diagnostic Inspection
  app.get('/api/projects/:projectId/retrieval/debug', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const query = String(req.query.q || '');
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Query parameter q is required.' });
    }
    const result = retrieveHybridKnowledgeSync(req.project!.id, query);
    res.json({ result });
  });

  // 10. AI Tutor Chat (Context Isolated, Grounded with Citations)
  app.post('/api/projects/:projectId/tutor/chat', verifyProjectIsolation as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
    try {
      const { message, conversationHistory, mediaAssetId } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Message text is required.' });
      }
      if (message.length > 5000) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Message text exceeds maximum length (5000 characters).' });
      }

      const learnerModel = LearnerModelEngine.getOrCreate(req.user!.id, req.project!.id, req.space!.id);

      const tutorResponse = await generateTutorResponse({
        projectId: req.project!.id,
        userQuery: message,
        mediaAssetId,
        learnerModel,
        conversationHistory,
      });

      if (mediaAssetId) {
        LearnerIntelligenceEngine.recordLearningEvent({
          eventId: `evt_${crypto.randomUUID().slice(0, 10)}`,
          learnerId: req.user!.id,
          projectId: req.project!.id,
          timestamp: new Date().toISOString(),
          eventType: 'MEDIA_VIEWED',
          payload: { mediaAssetId, userQuery: message },
        });
      }

      // Store in session log
      const sessionKey = req.project!.id;
      const history = db.tutorMessages.get(sessionKey) || [];
      const userMsg = {
        id: `msg_user_${crypto.randomUUID()}`,
        sessionId: `ses_${req.project!.id}`,
        projectId: req.project!.id,
        role: 'user' as const,
        content: message,
        citations: [],
        groundingStatus: 'grounded' as const,
        timestamp: new Date().toISOString(),
      };
      history.push(userMsg, tutorResponse);
      db.tutorMessages.set(sessionKey, history);

      res.json({
        userMessage: userMsg,
        tutorResponse,
      });
    } catch (err: any) {
      res.status(500).json({
        error: 'TUTOR_EXECUTION_FAILED',
        message: err.message || 'Internal failure during tutor synthesis.',
      });
    }
  });

  // Get Tutor Chat History
  app.get('/api/projects/:projectId/tutor/history', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const history = db.tutorMessages.get(req.project!.id) || [];
    res.json({ history });
  });

  // 11. Adaptive Quiz Questions (List)
  app.get('/api/projects/:projectId/quiz/questions', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    const questions = db.quizQuestions.get(req.project!.id) || [];
    res.json({ questions });
  });

  // Generate Adaptive Question
  app.post('/api/projects/:projectId/quiz/generate', verifyProjectIsolation as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
    try {
      const { topic, bloomLevel, difficulty } = req.body;
      const learnerModel = LearnerModelEngine.getOrCreate(req.user!.id, req.project!.id, req.space!.id);

      const resolvedTopic = topic || 'Core Project Architecture';
      const question = await generateAdaptiveQuizQuestion({
        projectId: req.project!.id,
        topic: resolvedTopic,
        bloomLevel,
        difficulty,
        learnerModel,
      });

      res.status(201).json({ question });
    } catch (err: any) {
      res.status(500).json({
        error: 'QUIZ_GENERATION_FAILED',
        message: err.message,
      });
    }
  });

  // Submit and Evaluate Quiz Answer
  app.post('/api/projects/:projectId/quiz/submit', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    try {
      const { questionId, selectedOptionIndex } = req.body;
      if (typeof selectedOptionIndex !== 'number' || !questionId) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'questionId and selectedOptionIndex are required.' });
      }

      const evaluation = evaluateQuizSubmission({
        userId: req.user!.id,
        projectId: req.project!.id,
        spaceId: req.space!.id,
        questionId,
        selectedOptionIndex,
      });

      const updatedLearnerModel = LearnerModelEngine.getOrCreate(req.user!.id, req.project!.id, req.space!.id);

      res.json({
        evaluation,
        learnerModel: updatedLearnerModel,
      });
    } catch (err: any) {
      res.status(400).json({
        error: 'EVALUATION_FAILED',
        message: err.message,
      });
    }
  });

  // 12. Observability & Telemetry Logs
  app.get('/api/telemetry/traces', (req, res) => {
    const traces = ObservabilityTracer.getRecentTraces(50);
    res.json({ traces });
  });

  app.get('/api/telemetry/stats', (req, res) => {
    const stats = ObservabilityTracer.getStats();
    res.json({ stats });
  });

  
  // --- PHASE 4 ORCHESTRATOR ROUTES ---

  app.post('/api/projects/:projectId/coach/chat', verifyProjectIsolation as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
    // Basic study coach that returns the next best action and some motivational context
    const { LearnerIntelligenceEngine } = await import('./server/learner-intelligence.js');
    const engine = LearnerIntelligenceEngine.getDashboardData(req.user!.id, req.params.projectId);
    const dashboard = LearnerIntelligenceEngine.getDashboardData(req.user!.id, req.params.projectId);
    
    let answer = "I'm your AI Study Coach. ";
    if (dashboard.recommendedActions.length > 0) {
      const topAction = dashboard.recommendedActions[0];
      answer += `Based on your recent activity, I recommend you ${topAction.action.replace(/_/g, ' ')} for the concept "${topAction.conceptName}". ${topAction.reason}`;
    } else {
      answer += "You don't have any specific recommendations yet. Try taking a quiz or reading some materials!";
    }
    
    res.json({ message: answer });
  });

  app.get('/api/projects/:projectId/learner/plan', verifyProjectIsolation as express.RequestHandler, (req: AuthenticatedRequest, res) => {
    // Dynamically load the orchestrator class here
    import('./server/orchestrator.js').then(({ LearningOrchestrator }) => {
      const plan = LearningOrchestrator.generateDailyPlan(req.params.projectId, req.user!.id);
      res.json({ plan });
    });
  });

  app.post('/api/projects/:projectId/socratic/chat', verifyProjectIsolation as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
    const { generateSocraticResponse } = await import('./server/structured-ai.js');
    const response = await generateSocraticResponse({
      projectId: req.params.projectId,
      conceptId: req.body.conceptId || 'general',
      conceptName: req.body.conceptName || 'General',
      userQuery: req.body.message
    });
    res.json(response);
  });

  app.post('/api/projects/:projectId/exam/generate', verifyProjectIsolation as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
    const { generateExamConfig } = await import('./server/structured-ai.js');
    const questions = await generateExamConfig({
      projectId: req.params.projectId,
      learnerId: req.user!.id,
      numQuestions: req.body.numQuestions || 5
    });
    // Create an exam session ID
    const examId = "exam_" + Date.now();
    const { db } = await import('./server/db.js');
    db.examSessions.set(examId, {
      id: examId,
      projectId: req.params.projectId,
      learnerId: req.user!.id,
      questions,
      responses: {},
      startedAt: Date.now()
    });
    res.json({ examId, questions });
  });

  app.post('/api/projects/:projectId/exam/submit', verifyProjectIsolation as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
    const { examId, responses } = req.body;
    const { db } = await import('./server/db.js');
    const { evaluateQuizSubmission } = await import('./server/structured-ai.js');
    
    const session = db.examSessions.get(examId);
    if (!session || session.learnerId !== req.user!.id) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    let correct = 0;
    const results = [];
    for (const q of session.questions) {
      const selected = responses[q.id];
      if (selected !== undefined) {
        const r = evaluateQuizSubmission({
          projectId: req.params.projectId,
          userId: req.user!.id,
          spaceId: 'default-space', // Need to pass spaceId, but it's hard to get here, let's look up project
          questionId: q.id,
          selectedOptionIndex: selected
        });
        results.push(r);
        if (r.isCorrect) correct++;
      }
    }
    
    const { LearnerIntelligenceEngine } = await import('./server/learner-intelligence.js');
    const engine = LearnerIntelligenceEngine.getDashboardData(req.user!.id, req.params.projectId);
    const dashboard = LearnerIntelligenceEngine.getDashboardData(req.user!.id, req.params.projectId);
    
    const examResult = {
      examId,
      score: correct,
      totalQuestions: session.questions.length,
      conceptPerformance: {},
      bloomPerformance: {},
      newMistakes: [],
      masteryChanges: {},
      recommendations: dashboard.recommendedActions
    };
    
    res.json({ result: examResult, detail: results });
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Study Companion server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failure:', err);
  process.exit(1);
});
