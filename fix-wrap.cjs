const fs = require('fs');
let code = fs.readFileSync('server/learner-intelligence.ts', 'utf-8');

code = code.replace(/return db\.transaction\(\(\) => \{/, '');
code = code.replace(/    \}\);\n  \}\n\n  \/\*\*/, '  }\n\n  /**');

fs.writeFileSync('server/learner-intelligence.ts', code);
