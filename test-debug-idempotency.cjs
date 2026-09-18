const Database = require('better-sqlite3');
const sqlite = new Database('local.db');
const rows = sqlite.prepare('SELECT * FROM learner_concept_states').all();
console.log('learner_concept_states in DB:', rows);
