const fs = require('fs');

let schema = fs.readFileSync('server/db/schema.ts', 'utf8');

schema = schema.replace(/export const documents = sqliteTable\('documents', \{[\s\S]*?\}\);/, `export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  spaceId: text('space_id').notNull(),
  ownerUserId: text('owner_user_id').notNull(),
  title: text('title').notNull(),
  sourceType: text('source_type').notNull(),
  rawContent: text('raw_content').notNull(),
  sanitizedContent: text('sanitized_content').notNull(),
  contentHash: text('content_hash').notNull(),
  status: text('status').notNull(),
  chunkCount: integer('chunk_count').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
});`);

schema = schema.replace(/export const chunks = sqliteTable\('chunks', \{[\s\S]*?\}\);/, `export const chunks = sqliteTable('chunks', {
  id: text('id').primaryKey(),
  docId: text('doc_id').notNull().references(() => documents.id),
  docTitle: text('doc_title').notNull(),
  projectId: text('project_id').notNull().references(() => projects.id),
  spaceId: text('space_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  sectionTitle: text('section_title'),
  content: text('content').notNull(),
  tokenCount: integer('token_count').notNull(),
  securityFlags: text('security_flags', { mode: 'json' }).notNull(),
});`);

fs.writeFileSync('server/db/schema.ts', schema);
