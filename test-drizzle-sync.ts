import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

const users = sqliteTable('users', { id: text('id') });
const sqlite = new Database(':memory:');
sqlite.exec('CREATE TABLE users (id TEXT)');
sqlite.exec("INSERT INTO users VALUES ('test')");

const db = drizzle(sqlite);
const result = db.select().from(users).all();
console.log(result);
