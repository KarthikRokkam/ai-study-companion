import crypto from 'crypto';
import { db } from './db.js';
import { BackgroundJob, JobType, MaterialDocument } from '../src/types.js';
import { sanitizeUntrustedDocument, chunkDocument } from './grounding.js';
import { globalVectorStore } from './vector-store.js';
import { defaultEmbeddingProvider } from './embeddings.js';
import { ConceptGraphEngine } from './concepts.js';

export class BackgroundJobManager {
  private static idempotencyRegistry: Map<string, string> = new Map(); // idempotencyKey -> jobId
  private static activeWorkers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Enqueues an idempotent background job.
   */
  public static enqueueJob(params: {
    type: JobType;
    projectId: string;
    userId: string;
    idempotencyKey: string;
    payload?: any;
  }): { job: BackgroundJob; isExisting: boolean } {
    const existingJobId = this.idempotencyRegistry.get(params.idempotencyKey);
    if (existingJobId) {
      const existingJob = db.backgroundJobs.get(existingJobId);
      if (existingJob && (existingJob.status === 'queued' || existingJob.status === 'processing' || existingJob.status === 'completed')) {
        return { job: existingJob, isExisting: true };
      }
    }

    const jobId = `job_${crypto.randomUUID()}`;
    const newJob: BackgroundJob = {
      id: jobId,
      type: params.type,
      status: 'queued',
      projectId: params.projectId,
      userId: params.userId,
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      error: null,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.backgroundJobs.set(jobId, newJob);
    this.idempotencyRegistry.set(params.idempotencyKey, jobId);

    // Trigger async worker in background (independent of client connection)
    this.scheduleExecution(jobId, params.payload);

    return { job: newJob, isExisting: false };
  }

  private static scheduleExecution(jobId: string, payload?: any) {
    const timer = setTimeout(async () => {
      await this.processJob(jobId, payload);
    }, 100);
    this.activeWorkers.set(jobId, timer);
  }

  private static async processJob(jobId: string, payload?: any) {
    const job = db.backgroundJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.progress = 10;
    job.updatedAt = new Date().toISOString();
    db.backgroundJobs.set(jobId, job);

    try {
      if (job.type === 'document_processing' || job.type === 'knowledge_indexing') {
        const docId = payload?.docId;
        const doc = db.documents.get(docId);
        if (!doc) {
          throw new Error(`Target document '${docId}' not found for background indexing.`);
        }

        // STAGE 1: Parse & Sanitize Untrusted Content (progress: 20%)
        job.progress = 20;
        job.updatedAt = new Date().toISOString();
        const { sanitizedText, injectionDetected, patternsFound, anomaliesDetected } =
          sanitizeUntrustedDocument(doc.rawContent);
        doc.sanitizedContent = sanitizedText;

        // STAGE 2: Chunk sanitized document (progress: 40%)
        job.progress = 40;
        job.updatedAt = new Date().toISOString();
        const chunks = chunkDocument(doc.id, doc.title, doc.projectId, doc.spaceId, sanitizedText);

        // STAGE 3: Index Lexical Chunks into storage (progress: 55%)
        job.progress = 55;
        job.updatedAt = new Date().toISOString();
        for (const chunk of chunks) {
          chunk.securityFlags.promptInjectionDetected = injectionDetected;
          chunk.securityFlags.suspiciousPatternsFound = [...patternsFound, ...anomaliesDetected];
          db.chunks.set(chunk.id, chunk);
        }

        // STAGE 4: Generate Dense Vector Embeddings (progress: 70%)
        job.progress = 70;
        job.updatedAt = new Date().toISOString();
        const chunkTexts = chunks.map((c) => `${c.sectionTitle}: ${c.content}`);
        const embeddings = await defaultEmbeddingProvider.embedTexts(chunkTexts);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const vector = embeddings[i];
          if (vector && vector.length > 0) {
            globalVectorStore.upsert(chunk.id, chunk.projectId, chunk.docId, vector);
          }
        }

        // STAGE 5 & 6: Extract Concepts & Build Relationships (progress: 85%)
        job.progress = 85;
        job.updatedAt = new Date().toISOString();
        const conceptGraph = await ConceptGraphEngine.extractFromChunks(doc.projectId, chunks);

        // STAGE 7: Finalize & Mark Ready (progress: 100%)
        doc.chunkCount = chunks.length;
        doc.status = 'indexed';
        db.documents.set(doc.id, doc);

        job.status = 'completed';
        job.progress = 100;
        job.resultSummary = `Indexed ${chunks.length} chunks, ${embeddings.length} vectors, and ${conceptGraph.concepts.length} concepts. ${injectionDetected ? 'Security notice: Prompt injection patterns neutralized.' : 'Zero security anomalies detected.'}`;
        job.updatedAt = new Date().toISOString();
      } else {
        job.status = 'completed';
        job.progress = 100;
        job.resultSummary = 'Job completed successfully.';
        job.updatedAt = new Date().toISOString();
      }
    } catch (error: any) {
      job.retryCount += 1;
      if (job.retryCount <= job.maxRetries) {
        job.status = 'queued';
        job.error = `Transient error: ${error.message}. Scheduled retry ${job.retryCount}/${job.maxRetries}`;
        job.updatedAt = new Date().toISOString();
        db.backgroundJobs.set(jobId, job);

        // Exponential backoff
        const backoffMs = Math.pow(2, job.retryCount) * 500;
        setTimeout(() => this.processJob(jobId, payload), backoffMs);
        return;
      } else {
        job.status = 'failed';
        job.progress = 0;
        job.error = `Fatal job failure after ${job.maxRetries} attempts: ${error.message}`;
        job.updatedAt = new Date().toISOString();
      }
    }

    db.backgroundJobs.set(jobId, job);
    this.activeWorkers.delete(jobId);
  }

  public static getJob(jobId: string): BackgroundJob | undefined {
    return db.backgroundJobs.get(jobId);
  }

  public static listJobsForProject(projectId: string): BackgroundJob[] {
    const list: BackgroundJob[] = [];
    for (const job of db.backgroundJobs.values()) {
      if (job.projectId === projectId) {
        list.push(job);
      }
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }
}
