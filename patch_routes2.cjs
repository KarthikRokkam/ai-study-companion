const fs = require('fs');
const path = require('path');

let code = fs.readFileSync('server.ts', 'utf8');

const newRoutes = `
  // --- PHASE 4 ORCHESTRATOR ROUTES ---
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
          learnerId: req.user!.id,
          question: q,
          selectedOptionIndex: selected
        });
        results.push(r);
        if (r.isCorrect) correct++;
      }
    }
    
    const { LearnerIntelligenceEngine } = await import('./server/learner-intelligence.js');
    const engine = new LearnerIntelligenceEngine(req.user!.id, req.params.projectId);
    const dashboard = engine.getAnalyticsDashboard();
    
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
`;

code = code.replace('// Vite development middleware or static production serving', newRoutes + '\n  // Vite development middleware or static production serving');
fs.writeFileSync('server.ts', code);
