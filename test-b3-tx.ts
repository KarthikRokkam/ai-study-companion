import Database from 'better-sqlite3';

const sqlite = new Database(':memory:');
sqlite.exec('CREATE TABLE test (id TEXT)');

const insert = sqlite.prepare('INSERT INTO test VALUES (?)');
const tx = sqlite.transaction(() => {
  insert.run('1');
  insert.run('2');
});
tx();

console.log(sqlite.prepare('SELECT * FROM test').all());
