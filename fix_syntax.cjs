const fs = require('fs');
let code = fs.readFileSync('server/structured-ai.ts', 'utf8');

// The block starts around "try {" and ends at "});\n\n    const parsed"
code = code.replace(/try \{\n\s*const result = await genAI\.models\.generateContent\(\{[\s\S]*?\}\);\n\s*const parsed/m, 
`try {
    const result = await genAI.models.generateContent({
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
      contents: [
        { role: 'user', parts: [{ text: \`Learner asks: "\${params.userQuery}"\\nWhat question should I ask them next?\` }] }
      ]
    });

    const parsed`);

fs.writeFileSync('server/structured-ai.ts', code);
