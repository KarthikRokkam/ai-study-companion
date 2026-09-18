# Phase 5 Migration Strategy

## Schema Management
Database schema evolution is managed via Drizzle Kit. The schema is defined authoritatively in TypeScript (`server/db/schema.ts`). 

## Versioned Migrations
Migrations are generated as standard SQL files in `server/db/migrations/` using `npx drizzle-kit generate`.
This ensures a deterministic ordering and reproducible database state across environments.

## Development & Test Initialization
Upon application startup (in both dev and prod modes), the SQLite database (`local.db`) is initialized, and `migrate(db, { migrationsFolder: ... })` is automatically executed. 
This guarantees the database schema is strictly synchronized with the application codebase before any HTTP requests or background jobs are processed.

## Data Migration
The system currently implements a "clean slate" transition for test cases. Any previous in-memory state is discarded on server restart. For existing deployments, since previous state was in-memory only (and thus inherently transient), no complex ETL migration script is required from the Phase 4 data model to Phase 5.
