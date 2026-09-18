import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

const users = sqliteTable('users', { id: text('id').primaryKey(), data: text('data', { mode: 'json' }) });
const sqlite = new Database(':memory:');
sqlite.exec('CREATE TABLE users (id TEXT PRIMARY KEY, data TEXT)');

const db = drizzle(sqlite);
db.insert(users).values({ id: '1', data: { foo: 'bar' } }).run();
console.log(db.select().from(users).all());
