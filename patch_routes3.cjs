const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const coachRoute = `
  app.post('/api/projects/:projectId/coach/chat', verifyProjectIsolation as express.RequestHandler, async (req: AuthenticatedRequest, res) => {
    // Basic study coach that returns the next best action and some motivational context
    const { LearnerIntelligenceEngine } = await import('./server/learner-intelligence.js');
    const engine = new LearnerIntelligenceEngine(req.user!.id, req.params.projectId);
    const dashboard = engine.getAnalyticsDashboard();
    
    let answer = "I'm your AI Study Coach. ";
    if (dashboard.recommendedActions.length > 0) {
      const topAction = dashboard.recommendedActions[0];
      answer += \`Based on your recent activity, I recommend you \${topAction.action.replace(/_/g, ' ')} for the concept "\${topAction.conceptName}". \${topAction.reason}\`;
    } else {
      answer += "You don't have any specific recommendations yet. Try taking a quiz or reading some materials!";
    }
    
    res.json({ message: answer });
  });
`;

code = code.replace('// --- PHASE 4 ORCHESTRATOR ROUTES ---', '// --- PHASE 4 ORCHESTRATOR ROUTES ---' + '\n' + coachRoute);
fs.writeFileSync('server.ts', code);
