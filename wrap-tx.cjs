const fs = require('fs');

let code = fs.readFileSync('server/learner-intelligence.ts', 'utf-8');

const targetMethod = 'public static recordInteraction(params: {';
const startIdx = code.indexOf(targetMethod);

// Find the opening brace of the method
let bodyStartIdx = code.indexOf('{', code.indexOf(') {', startIdx) + 1);

// Replace '{' with '{ return db.transaction(() => {'
// Then find the closing brace and replace it with '}); }'

let count = 1;
let bodyEndIdx = bodyStartIdx + 1;
while(count > 0 && bodyEndIdx < code.length) {
    if (code[bodyEndIdx] === '{') count++;
    if (code[bodyEndIdx] === '}') count--;
    bodyEndIdx++;
}

let newCode = code.slice(0, bodyStartIdx + 1) + 
  '\n    return db.transaction(() => {\n' + 
  code.slice(bodyStartIdx + 1, bodyEndIdx - 1) + 
  '\n    });\n' + 
  code.slice(bodyEndIdx - 1);

fs.writeFileSync('server/learner-intelligence.ts', newCode);
console.log('Wrapped recordInteraction in transaction');
