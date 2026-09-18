import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

const testTbl = sqliteTable('test', { id: text('id') });
const sqlite = new Database(':memory:');
sqlite.exec('CREATE TABLE test (id TEXT)');

const dbClient = drizzle(sqlite);

const tx = sqlite.transaction(() => {
  dbClient.insert(testTbl).values({ id: '1' }).run();
  dbClient.insert(testTbl).values({ id: '2' }).run();
});
tx();

console.log(dbClient.select().from(testTbl).all());
