# Phase 5 Persistence Decision

## Selected Technology
**SQLite + Drizzle ORM**

## Rejected Alternatives
* **In-Memory Maps**: Rejected due to lack of restart persistence (violates Phase 5 requirements).
* **PostgreSQL / MySQL (Dedicated RDBMS)**: Rejected for this iteration as it introduces external deployment dependencies and infrastructural complexity that is not strictly required for the current containerized, single-node preview environment.
* **NoSQL (MongoDB / Firebase)**: Rejected because the domain model (User -> Space -> Project -> Concept -> LearnerState) is highly relational. A relational database enforces strict referential integrity and allows complex JOINs when assembling the Concept Graph and Learner Model.

## Reasoning
SQLite offers a zero-configuration, serverless, transactional SQL database engine that perfectly matches the single-node deployment model of the current AI Studio preview architecture. 
Drizzle ORM provides type-safe SQL schema definitions and migrations, bridging the gap between TypeScript domain models and relational tables without the heavy abstraction overhead of traditional ORMs (like TypeORM).

## Transaction Model
SQLite natively supports ACID transactions and serializes writes, eliminating complex race conditions at the database level. Multi-row mutations (e.g., updating Learner Concept State, creating a Mistake Record, and logging a Learning Event) are wrapped in `db.transaction()` to guarantee atomicity.

## Local Development & Testing
Developers can inspect `local.db` using standard SQLite tooling. The test suite dynamically clears and recreates records, ensuring deterministic execution without requiring external database provisioning.
