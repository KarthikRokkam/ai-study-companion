import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

const users = sqliteTable('users', { id: text('id').primaryKey(), name: text('name') });
const sqlite = new Database(':memory:');
sqlite.exec('CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT)');

const db = drizzle(sqlite);
db.insert(users).values({ id: '1', name: 'A' }).run();
db.insert(users).values({ id: '1', name: 'B' }).onConflictDoUpdate({ target: users.id, set: { name: 'B' } }).run();
console.log(db.select().from(users).all());
