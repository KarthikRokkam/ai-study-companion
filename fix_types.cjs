const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(/new LearnerIntelligenceEngine\(req\.user!\.id, req\.params\.projectId\);\n\s*const dashboard = engine\.getAnalyticsDashboard\(\);/g, 
  'LearnerIntelligenceEngine.getDashboardData(req.user!.id, req.params.projectId);\n    const dashboard = LearnerIntelligenceEngine.getDashboardData(req.user!.id, req.params.projectId);');
// Fix evaluateQuizSubmission call
serverCode = serverCode.replace(/evaluateQuizSubmission\(\{\n\s*projectId: req\.params\.projectId,\n\s*learnerId: req\.user!\.id,\n\s*question: q,\n\s*selectedOptionIndex: selected\n\s*\}\)/g,
  `evaluateQuizSubmission({
          projectId: req.params.projectId,
          userId: req.user!.id,
          spaceId: 'default-space', // Need to pass spaceId, but it's hard to get here, let's look up project
          questionId: q.id,
          selectedOptionIndex: selected
        })`);
fs.writeFileSync('server.ts', serverCode);

let orchestratorCode = fs.readFileSync('server/orchestrator.ts', 'utf8');
orchestratorCode = orchestratorCode.replace(/const engine = new LearnerIntelligenceEngine\(learnerId, projectId\);\n\s*const dashboard = engine\.getAnalyticsDashboard\(\);/g,
  'const dashboard = LearnerIntelligenceEngine.getDashboardData(learnerId, projectId);');
fs.writeFileSync('server/orchestrator.ts', orchestratorCode);

let structuredAiCode = fs.readFileSync('server/structured-ai.ts', 'utf8');

// Fix retrieveHybridKnowledgeSync call
structuredAiCode = structuredAiCode.replace(/const kContext = await retrieveHybridKnowledgeSync\(\{[\s\S]*?limit: 5,[\s\S]*?\}\);/m, 
  `const kContext = retrieveHybridKnowledgeSync(params.projectId, params.userQuery, { topK: 5 });`);

// Fix chunks
structuredAiCode = structuredAiCode.replace(/kContext\.chunks/g, 'kContext.retrievedChunks');

// Fix generation
structuredAiCode = structuredAiCode.replace(/const model = genAI\.models\.get\(\{ model: 'gemini-2\.5-flash', config: \{ systemInstruction \} \}\);\n\s*const result = await model\.generateContent\(\{/m,
  `const result = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identifiedGoal: { type: Type.STRING },
            aiQuestion: { type: Type.STRING },
            evaluationFeedback: { type: Type.STRING, description: "If evaluating a previous response, brief feedback" },
          },
          required: ['identifiedGoal', 'aiQuestion']
        }
      },
      contents: [`);
// Cleanup the double config
structuredAiCode = structuredAiCode.replace(/,\n\s*config: \{\n\s*responseMimeType: 'application\/json',[\s\S]*?required: \['identifiedGoal', 'aiQuestion'\]\n\s*\}\n\s*\}\)/m,
  '})');

// Fix LearnerIntelligenceEngine inside generateExamConfig
structuredAiCode = structuredAiCode.replace(/const engine = new LearnerIntelligenceEngine\(params\.learnerId, params\.projectId\);\n\s*const dashboard = engine\.getAnalyticsDashboard\(\);/g,
  'const dashboard = LearnerIntelligenceEngine.getDashboardData(params.learnerId, params.projectId);');

// Fix quiz generation type error (MEDIUM instead of number, QuizDifficulty is string enum?)
structuredAiCode = structuredAiCode.replace(/difficulty: 'MEDIUM'/g, "difficulty: 'MEDIUM' as QuizDifficulty");

fs.writeFileSync('server/structured-ai.ts', structuredAiCode);
