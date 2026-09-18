const fs = require('fs');

let exam = fs.readFileSync('src/components/ExamView.tsx', 'utf8');
exam = exam.replace(/q\.concept/g, "q.topic");
fs.writeFileSync('src/components/ExamView.tsx', exam);

let socratic = fs.readFileSync('src/components/SocraticTutorView.tsx', 'utf8');
socratic = socratic.replace(/c\.sourceTitle/g, "c.docTitle");
socratic = socratic.replace(/c\.documentId/g, "c.docId");
fs.writeFileSync('src/components/SocraticTutorView.tsx', socratic);

