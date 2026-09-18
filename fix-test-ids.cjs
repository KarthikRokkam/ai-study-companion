const fs = require('fs');
let code = fs.readFileSync('test/run-tests.ts', 'utf-8');

// Revert the naive inline Date.now()
code = code.replace(/\`usr_test_\$\{Date\.now\(\)\}\`/g, "'usr_test'");
code = code.replace(/\`prj_test_\$\{Date\.now\(\)\}\`/g, "'prj_test_1'");

// Now properly inject a local variable
code = code.replace(
  /runTest\('Learner Model: updates mastery estimate and increases confidence monotonically with evidence', \(\) => \{/,
  "runTest('Learner Model: updates mastery estimate and increases confidence monotonically with evidence', () => {\n      const usr = `usr_test_${Date.now()}`;\n      const prj = `prj_test_${Date.now()}`;"
);

code = code.replace(/LearnerModelEngine\.getOrCreate\('usr_test', 'prj_test_1',/g, "LearnerModelEngine.getOrCreate(usr, prj,");
code = code.replace(/LearnerModelEngine\.recordQuizAttempt\('usr_test', 'prj_test_1',/g, "LearnerModelEngine.recordQuizAttempt(usr, prj,");

fs.writeFileSync('test/run-tests.ts', code);
