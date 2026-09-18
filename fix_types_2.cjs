const fs = require('fs');

// Fix orchestrator.ts
let orch = fs.readFileSync('server/orchestrator.ts', 'utf8');
orch = orch.replace(/PRACTICE_PREREQUISITE/g, "REVIEW_CONCEPT");
orch = orch.replace(/EXPLORE_TUTOR/g, "ASK_TUTOR");
orch = orch.replace(/learningFocusConcepts/g, "weakConcepts");
fs.writeFileSync('server/orchestrator.ts', orch);

// Fix structured-ai.ts
let ai = fs.readFileSync('server/structured-ai.ts', 'utf8');
ai = ai.replace(/c\.chunkId/g, "c.id");
ai = ai.replace(/c\.documentId/g, "c.docId");
ai = ai.replace(/c\.metadata\.sourceTitle/g, "c.docTitle");
ai = ai.replace(/c\.text/g, "c.content");
ai = ai.replace(/learningFocusConcepts/g, "weakConcepts");

// Fix generateAdaptiveQuizQuestion call inside generateExamConfig
ai = ai.replace(/conceptId: conceptId/g, "topic: conceptId");
ai = ai.replace(/learnerId: params\.learnerId,\n\s*topic: conceptId/g, "topic: conceptId");

fs.writeFileSync('server/structured-ai.ts', ai);
