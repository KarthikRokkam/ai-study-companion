const fs = require('fs');

let ai = fs.readFileSync('server/structured-ai.ts', 'utf8');
ai = ai.replace(/documentId: c.docId/g, "docId: c.docId");
ai = ai.replace(/sourceTitle: c.docTitle/g, "docTitle: c.docTitle");
ai = ai.replace(/section: c\.sectionTitle/g, "section: c.sectionTitle");

fs.writeFileSync('server/structured-ai.ts', ai);

