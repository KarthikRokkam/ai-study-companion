import Database from 'better-sqlite3';
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
  public transaction<T>(cb: () => T): T {
    return sqlite.transaction(cb)();
  }

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

    // Default Authenticated User
    const primaryUser: User = {
      id: 'usr_default_learner',
      name: 'Dr. Alex Vance',
      email: 'alex.vance@learn.ai',
    };
    this.users.set(primaryUser.id, primaryUser);

    // Alternate User for Project Isolation Security Testing
    const rivalUser: User = {
      id: 'usr_secondary_attacker',
      name: 'Unauthorized User',
      email: 'attacker@untrusted.org',
    };
    this.users.set(rivalUser.id, rivalUser);

    // Space 1: Distributed Systems Engineering
    const space1: Space = {
      id: 'spc_distributed_systems',
      ownerUserId: primaryUser.id,
      name: 'Distributed Systems & Cloud Architecture',
      description: 'Foundations of distributed consensus, fault tolerance, replication, and Paxos/Raft architectures.',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    };
    this.spaces.set(space1.id, space1);

    // Space 2: Cognitive Neuroscience & AI
    const space2: Space = {
      id: 'spc_ai_neuroscience',
      ownerUserId: primaryUser.id,
      name: 'Cognitive Modeling & Transformer Architectures',
      description: 'Exploration of biological neural networks, attention mechanisms, and gradient descent dynamics.',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    };
    this.spaces.set(space2.id, space2);

    // Rival Space owned by rivalUser (used to verify authorization boundaries)
    const rivalSpace: Space = {
      id: 'spc_restricted_sandbox',
      ownerUserId: rivalUser.id,
      name: 'Restricted Enterprise Data Space',
      description: 'Private research vault belonging to another organizational tenant.',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    };
    this.spaces.set(rivalSpace.id, rivalSpace);

    // Rival Project owned by rivalUser under rivalSpace
    const rivalProject: Project = {
      id: 'prj_restricted_intel',
      spaceId: rivalSpace.id,
      ownerUserId: rivalUser.id,
      name: 'Confidential Proprietary Research',
      description: 'Restricted materials belonging to secondary organization.',
      learningGoals: ['Internal proprietary specs'],
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    };
    this.projects.set(rivalProject.id, rivalProject);

    // Project 1.1: Raft Consensus Protocol
    const project1: Project = {
      id: 'prj_raft_consensus',
      spaceId: space1.id,
      ownerUserId: primaryUser.id,
      name: 'Raft Consensus Protocol & State Machine Replication',
      description: 'Deep dive into leader election, log replication, safety invariants, and joint consensus in Raft.',
      learningGoals: [
        'Understand leader election randomized timeouts and split-vote mitigation',
        'Analyze log matching property and safety invariants',
        'Evaluate network partition behavior and quorum guarantees',
      ],
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    };
    this.projects.set(project1.id, project1);

    // Project 1.2: Paxos and Byzantine Fault Tolerance
    const project2: Project = {
      id: 'prj_paxos_bft',
      spaceId: space1.id,
      ownerUserId: primaryUser.id,
      name: 'Paxos & Byzantine Fault Tolerance',
      description: 'Comparison of classical Paxos, Multi-Paxos, and PBFT 3-phase commit schemes under adversary conditions.',
      learningGoals: [
        'Differentiate crash fault tolerance from Byzantine malicious faults',
        'Derive quorum requirements (3f + 1 vs 2f + 1)',
      ],
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    };
    this.projects.set(project2.id, project2);

    // Project 2.1: Transformer Multi-Head Attention
    const project3: Project = {
      id: 'prj_transformers_attention',
      spaceId: space2.id,
      ownerUserId: primaryUser.id,
      name: 'Attention Mechanisms & Self-Attention Complexity',
      description: 'Mathematical derivation of Scaled Dot-Product Attention, Query-Key-Value projection, and Rotary Embeddings (RoPE).',
      learningGoals: [
        'Derive scaled dot-product attention formulation and softmax variance stabilization',
        'Contrast self-attention O(N^2) complexity with FlashAttention memory tiling',
      ],
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    };
    this.projects.set(project3.id, project3);

    // Seed Material Document for Project 1 (Raft)
    const doc1: MaterialDocument = {
      id: 'doc_raft_paper_summary',
      projectId: project1.id,
      spaceId: space1.id,
      ownerUserId: primaryUser.id,
      title: 'In Search of an Understandable Consensus Algorithm (Ongaro & Ousterhout)',
      sourceType: 'pdf',
      rawContent: `Raft decomposes consensus into three independent subproblems: leader election, log replication, and safety.
A Raft cluster typically contains 5 servers to tolerate 2 crash failures. Servers exist in one of three states: Leader, Follower, or Candidate.
In normal operation, there is exactly one leader and all other servers are followers.
Followers are passive: they issue no requests on their own but simply respond to requests from leaders and candidates.
The leader handles all client requests. If a client contacts a follower, the follower redirects it to the leader.
Candidate state is used during elections when servers choose a new leader.
Raft divides time into terms of arbitrary length, numbered with consecutive integers. Each term begins with an election.
Leader Election: Raft uses a heartbeat mechanism to trigger leader elections. Leaders send periodic heartbeats (AppendEntries RPCs with no entries) to all followers. If a follower receives no communication over election timeout (randomized between 150ms and 300ms), it transitions to candidate, increments its currentTerm, votes for itself, and issues RequestVote RPCs to other servers in the cluster.
A candidate wins an election if it receives votes from a majority of servers in the full cluster for that term.
Log Replication: Once a leader is elected, it services client requests. The leader appends each command to its log as a new entry, then issues AppendEntries RPCs in parallel to each other server. An entry is considered committed once it has been replicated on a majority of servers. Once committed, the leader applies the entry to its state machine and returns execution result to client.
Safety: Raft guarantees that if a server applies an entry at a given index to its state machine, no other server will ever apply a different entry for that index. Leaders never overwrite or truncate their own logs; they only append new entries. The Election Safety ensures that a candidate must contain all committed entries in order to be elected, enforced by RequestVote voting restrictions (up-to-date log check).`,
      sanitizedContent: `Raft decomposes consensus into three independent subproblems: leader election, log replication, and safety.
A Raft cluster typically contains 5 servers to tolerate 2 crash failures. Servers exist in one of three states: Leader, Follower, or Candidate.
In normal operation, there is exactly one leader and all other servers are followers.
Followers are passive: they issue no requests on their own but simply respond to requests from leaders and candidates.
The leader handles all client requests. If a client contacts a follower, the follower redirects it to the leader.
Candidate state is used during elections when servers choose a new leader.
Raft divides time into terms of arbitrary length, numbered with consecutive integers. Each term begins with an election.
Leader Election: Raft uses a heartbeat mechanism to trigger leader elections. Leaders send periodic heartbeats (AppendEntries RPCs with no entries) to all followers. If a follower receives no communication over election timeout (randomized between 150ms and 300ms), it transitions to candidate, increments its currentTerm, votes for itself, and issues RequestVote RPCs to other servers in the cluster.
A candidate wins an election if it receives votes from a majority of servers in the full cluster for that term.
Log Replication: Once a leader is elected, it services client requests. The leader appends each command to its log as a new entry, then issues AppendEntries RPCs in parallel to each other server. An entry is considered committed once it has been replicated on a majority of servers. Once committed, the leader applies the entry to its state machine and returns execution result to client.
Safety: Raft guarantees that if a server applies an entry at a given index to its state machine, no other server will ever apply a different entry for that index. Leaders never overwrite or truncate their own logs; they only append new entries. The Election Safety ensures that a candidate must contain all committed entries in order to be elected, enforced by RequestVote voting restrictions (up-to-date log check).`,
      contentHash: 'hash_raft_paper_v1',
      status: 'indexed',
      chunkCount: 3,
      uploadedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    };
    this.documents.set(doc1.id, doc1);

    // Knowledge chunks for Doc 1
    const chunk1: KnowledgeChunk = {
      id: 'chk_raft_election_01',
      docId: doc1.id,
      docTitle: doc1.title,
      projectId: project1.id,
      spaceId: space1.id,
      chunkIndex: 0,
      sectionTitle: 'Leader Election & Heartbeat Timers',
      content: `Leader Election in Raft uses randomized election timeouts (typically 150ms to 300ms) to prevent split votes. Leaders maintain authority by sending periodic empty AppendEntries heartbeats. If a follower misses heartbeats past its randomized timeout, it increments currentTerm, becomes Candidate, votes for itself, and requests votes. Election requires an absolute majority (N/2 + 1) of cluster servers.`,
      tokenCount: 68,
      securityFlags: {
        promptInjectionDetected: false,
        sanitized: true,
        suspiciousPatternsFound: [],
      },
    };
    const chunk2: KnowledgeChunk = {
      id: 'chk_raft_log_replication_02',
      docId: doc1.id,
      docTitle: doc1.title,
      projectId: project1.id,
      spaceId: space1.id,
      chunkIndex: 1,
      sectionTitle: 'Log Replication & Commitment Quorum',
      content: `Log Replication occurs when the leader receives client commands, appends entries to its local log, and broadcasts AppendEntries RPCs. An entry is committed when it is acknowledged by a majority of servers. Leaders never overwrite their logs. Leaders track nextIndex and matchIndex for each peer. Followers overwrite conflicting uncommitted entries when commanded by an authorized leader.`,
      tokenCount: 65,
      securityFlags: {
        promptInjectionDetected: false,
        sanitized: true,
        suspiciousPatternsFound: [],
      },
    };
    const chunk3: KnowledgeChunk = {
      id: 'chk_raft_safety_03',
      docId: doc1.id,
      docTitle: doc1.title,
      projectId: project1.id,
      spaceId: space1.id,
      chunkIndex: 2,
      sectionTitle: 'Leader Completeness & Safety Invariant',
      content: `Raft Safety ensures Leader Completeness: if a log entry is committed in a given term, that entry will be present in the logs of the leaders for all higher-numbered terms. Candidates cannot be elected unless their log is at least as up-to-date as the voting follower's log (comparing last log term first, then last log index). This eliminates the need for leaders to fetch missing entries from followers.`,
      tokenCount: 75,
      securityFlags: {
        promptInjectionDetected: false,
        sanitized: true,
        suspiciousPatternsFound: [],
      },
    };
    this.chunks.set(chunk1.id, chunk1);
    this.chunks.set(chunk2.id, chunk2);
    this.chunks.set(chunk3.id, chunk3);

    // Rival Document & Chunk for rivalProject
    const rivalDoc: MaterialDocument = {
      id: 'doc_restricted_vault_spec',
      projectId: rivalProject.id,
      spaceId: rivalSpace.id,
      ownerUserId: rivalUser.id,
      title: 'Restricted Vault Architecture & Cryptographic Keys',
      sourceType: 'text',
      rawContent: 'Proprietary enterprise key derivation functions and internal zero-knowledge proofs.',
      sanitizedContent: 'Proprietary enterprise key derivation functions and internal zero-knowledge proofs.',
      contentHash: 'hash_restricted_vault_v1',
      status: 'indexed',
      chunkCount: 1,
      uploadedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    };
    this.documents.set(rivalDoc.id, rivalDoc);

    const rivalChunk: KnowledgeChunk = {
      id: 'chk_restricted_vault_01',
      docId: rivalDoc.id,
      docTitle: rivalDoc.title,
      projectId: rivalProject.id,
      spaceId: rivalSpace.id,
      chunkIndex: 0,
      sectionTitle: 'Key Derivation Protocol',
      content: 'Confidential key derivation requires multi-party threshold signatures across air-gapped hardware enclaves.',
      tokenCount: 22,
      securityFlags: {
        promptInjectionDetected: false,
        sanitized: true,
        suspiciousPatternsFound: [],
      },
    };
    this.chunks.set(rivalChunk.id, rivalChunk);

    // Initial Learner Model for Alex on Raft Project
    const initialLearnerModel: LearnerModel = {
      id: `${primaryUser.id}:${project1.id}`,
      userId: primaryUser.id,
      projectId: project1.id,
      spaceId: space1.id,
      conceptMastery: {
        'Leader Election': {
          topic: 'Leader Election',
          masteryScore: 78,
          confidenceScore: 82,
          attemptsCount: 5,
          successCount: 4,
          mistakes: ['Confused follower election timeout bounds with heartbeat frequency'],
          lastPracticedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        'Log Replication & Quorum': {
          topic: 'Log Replication & Quorum',
          masteryScore: 65,
          confidenceScore: 70,
          attemptsCount: 4,
          successCount: 3,
          mistakes: ['Thought 2 of 5 was enough for commitment during partial network partition'],
          lastPracticedAt: new Date(Date.now() - 43200000).toISOString(),
        },
        'Safety & Leader Completeness': {
          topic: 'Safety & Leader Completeness',
          masteryScore: 42,
          confidenceScore: 55,
          attemptsCount: 3,
          successCount: 1,
          mistakes: ['Did not recall why candidate log comparison checks both term and index'],
          lastPracticedAt: new Date(Date.now() - 10800000).toISOString(),
        },
      },
      overallMastery: 62,
      learningVelocity: 1.4,
      recommendations: [
        {
          id: 'rec_01',
          recommendedTopic: 'Safety & Leader Completeness',
          reason: 'Mastery estimate is currently at 42%. Review how candidate log freshness enforces leader completeness without retroactive catchup.',
          priority: 'high',
          action: 'review_concept',
        },
        {
          id: 'rec_02',
          recommendedTopic: 'Log Replication & Quorum',
          reason: 'Solid foundation (65%), but requires practice with asymmetric network partition scenarios.',
          priority: 'medium',
          action: 'attempt_quiz',
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    this.learnerModels.set(`${primaryUser.id}:${project1.id}`, initialLearnerModel);

    // Seed Quiz Questions for Project 1
    const seedQuestions: QuizQuestion[] = [
      {
        id: 'q_raft_01',
        projectId: project1.id,
        topic: 'Leader Election',
        bloomLevel: 'comprehension',
        difficulty: 'intermediate',
        prompt: 'In Raft, what is the primary architectural purpose of utilizing randomized election timeouts (e.g., 150ms – 300ms) across follower nodes?',
        options: [
          'To ensure followers synchronize their wall-clock time with UTC',
          'To prevent split votes where multiple candidates simultaneously trigger an election and divide votes',
          'To minimize network bandwidth usage during normal non-election states',
          'To allow slower disk write operations to complete before electing a leader',
        ],
        correctOptionIndex: 1,
        explanation: 'Randomized timeouts desynchronize follower expirations. When the leader heartbeats stop, typically one single server times out first, transitions to candidate, and collects majority votes before other servers trigger elections, dramatically mitigating split votes.',
        groundingChunkId: chunk1.id,
        sourceCitation: {
          chunkId: chunk1.id,
          docId: doc1.id,
          docTitle: doc1.title,
          section: chunk1.sectionTitle,
          snippet: chunk1.content.slice(0, 140) + '...',
          relevanceScore: 0.95,
        },
      },
      {
        id: 'q_raft_02',
        projectId: project1.id,
        topic: 'Safety & Leader Completeness',
        bloomLevel: 'analysis',
        difficulty: 'advanced',
        prompt: 'How does Raft enforce the Leader Completeness property during candidate voting without requiring the new leader to fetch missing committed entries from followers?',
        options: [
          'The leader queries every follower upon election and merges all logs by highest timestamp',
          'Followers deny votes to any candidate whose log is less up-to-date than the follower’s own log',
          'Committed entries are permanently written to an external zookeeper metadata store',
          'Followers automatically overwrite their committed entries with the candidate’s log',
        ],
        correctOptionIndex: 1,
        explanation: 'Raft implements RequestVote voting restrictions: a voter denies its vote if the candidate’s log is less up-to-date than its own. Because committed entries exist on a majority, any winning candidate must receive votes from at least one server containing the latest committed entry, ensuring the winner already possesses all committed entries.',
        groundingChunkId: chunk3.id,
        sourceCitation: {
          chunkId: chunk3.id,
          docId: doc1.id,
          docTitle: doc1.title,
          section: chunk3.sectionTitle,
          snippet: chunk3.content.slice(0, 140) + '...',
          relevanceScore: 0.98,
        },
      },
    ];
    this.quizQuestions.set(project1.id, seedQuestions);

    // Seed Concepts for Raft Project
    const concept1: Concept = {
      id: 'cpt_leader_election',
      projectId: project1.id,
      name: 'Leader Election & Split-Vote Mitigation',
      description: 'The heartbeat and randomized election timeout mechanism through which Raft servers elect an authoritative leader.',
      sourceChunkIds: [chunk1.id],
      prerequisiteConceptIds: [],
      relatedConceptIds: ['cpt_log_replication'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const concept2: Concept = {
      id: 'cpt_log_replication',
      projectId: project1.id,
      name: 'Log Replication & Quorum Commitment',
      description: 'The mechanism of appending uncommitted entries to follower logs and declaring them committed upon majority agreement.',
      sourceChunkIds: [chunk2.id],
      prerequisiteConceptIds: ['cpt_leader_election'],
      relatedConceptIds: ['cpt_safety_invariants'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const concept3: Concept = {
      id: 'cpt_safety_invariants',
      projectId: project1.id,
      name: 'Leader Completeness & Safety Invariants',
      description: 'The fundamental invariant guaranteeing that committed entries persist across all future leader terms through RequestVote restrictions.',
      sourceChunkIds: [chunk3.id],
      prerequisiteConceptIds: ['cpt_log_replication'],
      relatedConceptIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.concepts.set(concept1.id, concept1);
    this.concepts.set(concept2.id, concept2);
    this.concepts.set(concept3.id, concept3);

    // Seed Concept Relationships
    const rel1: ConceptRelationship = {
      id: 'rel_cpt_1_2',
      projectId: project1.id,
      sourceConceptId: concept1.id,
      targetConceptId: concept2.id,
      type: 'PREREQUISITE',
      confidence: 0.95,
      sourceEvidenceIds: [chunk1.id],
    };

    const rel2: ConceptRelationship = {
      id: 'rel_cpt_2_3',
      projectId: project1.id,
      sourceConceptId: concept2.id,
      targetConceptId: concept3.id,
      type: 'PREREQUISITE',
      confidence: 0.92,
      sourceEvidenceIds: [chunk2.id],
    };

    this.conceptRelationships.set(rel1.id, rel1);
    this.conceptRelationships.set(rel2.id, rel2);

    // Pre-index dense vectors in VectorStore for fast semantic retrieval
    const localEmbedder = new DeterministicLocalEmbeddingProvider();
    for (const chunk of [chunk1, chunk2, chunk3, rivalChunk]) {
      // Synchronously compute and store vectors
      const vec = (localEmbedder as any).computeVector(chunk.content);
      globalVectorStore.upsert(chunk.id, chunk.projectId, chunk.docId, vec);
    }
  }
}

export const db = new DatabaseStore();
