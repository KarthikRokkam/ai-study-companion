const fs = require('fs');

const oldCode = fs.readFileSync('server/db.ts', 'utf-8');
const seedDefaultsFn = oldCode.match(/private seedDefaults\(\) \{([\s\S]*?)\n  \}\n\n  \/\*\*?\n/m) || oldCode.match(/private seedDefaults\(\) \{([\s\S]*?)\n\}\n\nexport const db/m) || oldCode.match(/private seedDefaults\(\) \{([\s\S]*?)\n\}\nexport const db/m);

const newCode = `import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, inArray } from 'drizzle-orm';
import * as schema from './db/schema.js';

import {
  User,
  Space,
  Project,
  MaterialDocument,
  KnowledgeChunk,
  TutorMessage,
  QuizQuestion,
  LearnerModel,
  BackgroundJob,
  Concept,
  ConceptRelationship,
  LearnerConceptState,
  MistakeRecord,
  LearningEvent,
} from '../src/types.js';

import { globalVectorStore } from './vector-store.js';
import { DeterministicLocalEmbeddingProvider } from './embeddings.js';

// Setup SQLite and Drizzle
const sqlite = new Database('local.db');
sqlite.pragma('journal_mode = WAL');
export const dbClient = drizzle(sqlite, { schema });

// Run migrations synchronously on startup
migrate(dbClient, { migrationsFolder: './server/db/migrations' });

// Generic Map wrapper backed by SQLite
class DbMap<K extends string | number, V> {
  constructor(private table: any, private keyCol: any) {}

  get(key: K): V | undefined {
    return dbClient.select().from(this.table).where(eq(this.keyCol, key)).get() as V | undefined;
  }

  set(key: K, value: V): this {
    dbClient.insert(this.table).values(value as any).onConflictDoUpdate({ target: this.keyCol, set: value as any }).run();
    return this;
  }

  has(key: K): boolean {
    const res = dbClient.select({ id: this.keyCol }).from(this.table).where(eq(this.keyCol, key)).get();
    return !!res;
  }

  delete(key: K): boolean {
    const res = dbClient.delete(this.table).where(eq(this.keyCol, key)).run();
    return res.changes > 0;
  }

  values(): IterableIterator<V> {
    const rows = dbClient.select().from(this.table).all() as V[];
    return rows.values();
  }

  keys(): IterableIterator<K> {
    const rows = dbClient.select({ key: this.keyCol }).from(this.table).all() as { key: K }[];
    return rows.map(r => r.key).values();
  }

  clear(): void {
    dbClient.delete(this.table).run();
  }
}

class ArrayDbMap<K extends string | number, V> {
  constructor(private table: any, private keyCol: any) {}

  get(key: K): V[] | undefined {
    const res = dbClient.select().from(this.table).where(eq(this.keyCol, key)).all() as V[];
    return res.length > 0 ? res : undefined;
  }

  set(key: K, values: V[]): this {
    dbClient.transaction((tx) => {
      tx.delete(this.table).where(eq(this.keyCol, key)).run();
      if (values.length > 0) {
        tx.insert(this.table).values(values as any).run();
      }
    });
    return this;
  }

  has(key: K): boolean {
    return (this.get(key)?.length ?? 0) > 0;
  }
}

class IdempotencySet {
  has(key: string): boolean {
    const res = dbClient.select({ key: schema.idempotencyKeys.key }).from(schema.idempotencyKeys).where(eq(schema.idempotencyKeys.key, key)).get();
    return !!res;
  }
  add(key: string): this {
    dbClient.insert(schema.idempotencyKeys).values({ key, createdAt: new Date().toISOString() }).onConflictDoNothing().run();
    return this;
  }
}

export class DatabaseStore {
  public users = new DbMap<string, User>(schema.users, schema.users.id);
  public spaces = new DbMap<string, Space>(schema.spaces, schema.spaces.id);
  public projects = new DbMap<string, Project>(schema.projects, schema.projects.id);
  public documents = new DbMap<string, MaterialDocument>(schema.documents, schema.documents.id);
  public chunks = new DbMap<string, KnowledgeChunk>(schema.chunks, schema.chunks.id);
  public tutorMessages = new ArrayDbMap<string, TutorMessage>(schema.tutorMessages, schema.tutorMessages.sessionId);
  public quizQuestions = new ArrayDbMap<string, QuizQuestion>(schema.quizQuestions, schema.quizQuestions.projectId);
  public learnerModels = new DbMap<string, LearnerModel>(schema.learnerModels, schema.learnerModels.id);
  public backgroundJobs = new DbMap<string, BackgroundJob>(schema.backgroundJobs, schema.backgroundJobs.id);
  public concepts = new DbMap<string, Concept>(schema.concepts, schema.concepts.id);
  public conceptRelationships = new DbMap<string, ConceptRelationship>(schema.conceptRelationships, schema.conceptRelationships.id);
  public learnerConceptStates = new DbMap<string, LearnerConceptState>(schema.learnerConceptStates, schema.learnerConceptStates.id);
  public mistakeRecords = new DbMap<string, MistakeRecord>(schema.mistakeRecords, schema.mistakeRecords.mistakeId);
  public learningEvents = new DbMap<string, LearningEvent>(schema.learningEvents, schema.learningEvents.eventId);
  
  public socraticInteractions = new DbMap<string, any>(schema.socraticInteractions, schema.socraticInteractions.id);
  public dailyStudyPlans = new DbMap<string, any>(schema.dailyStudyPlans, schema.dailyStudyPlans.id);
  public examSessions = new DbMap<string, any>(schema.examSessions, schema.examSessions.id);
  public examResults = new DbMap<string, any>(schema.examResults, schema.examResults.examId);

  public eventDeduplicationKeys = new IdempotencySet();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Only seed if the database is empty
    if (this.users.has('usr_default_learner')) {
      // Re-index vectors for in-memory vector store on restart
      const localEmbedder = new DeterministicLocalEmbeddingProvider();
      for (const chunk of this.chunks.values()) {
        const vec = (localEmbedder as any).computeVector(chunk.content);
        globalVectorStore.upsert(chunk.id, chunk.projectId, chunk.docId, vec);
      }
      return;
    }
${seedDefaultsFn ? seedDefaultsFn[1] : "    console.log('Seed defaults not found in script logic, continuing.');"}
  }
}

export const db = new DatabaseStore();
`;

fs.writeFileSync('server/db.ts', newCode);
console.log('Successfully rewrote server/db.ts');
