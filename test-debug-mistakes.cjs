const Database = require('better-sqlite3');
const sqlite = new Database('local.db');
const rows = sqlite.prepare('SELECT * FROM mistake_records').all();
console.log('mistake_records in DB:', rows);
