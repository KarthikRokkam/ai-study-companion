export interface VectorEntry {
  chunkId: string;
  projectId: string;
  docId: string;
  vector: Float32Array;
  dimensions: number;
  updatedAt: string;
}

export interface VectorSearchResult {
  chunkId: string;
  projectId: string;
  docId: string;
  similarity: number;
}

/**
 * In-Memory Vector Store with Strict Project-Level Partitioning.
 *
 * Design Invariants:
 * 1. Project Isolation: Queries filter candidate vectors by projectId BEFORE computing similarities.
 * 2. High-Performance Float32Array: Memory-efficient typed vector representations.
 * 3. Defensively Normalized Cosine Metric: Computes true cosine angle regardless of vector scale.
 * 4. Deterministic Tie-Breaking: Sorts by similarity descending, then chunkId ascending.
 */
export class VectorStore {
  private entries: Map<string, VectorEntry> = new Map(); // chunkId -> VectorEntry
  private projectIndex: Map<string, Set<string>> = new Map(); // projectId -> Set<chunkId>

  /**
   * Stores or updates a vector embedding for a specific chunk.
   */
  public upsert(
    chunkId: string,
    projectId: string,
    docId: string,
    vectorArray: number[]
  ): void {
    const floatArray = new Float32Array(vectorArray);

    const entry: VectorEntry = {
      chunkId,
      projectId,
      docId,
      vector: floatArray,
      dimensions: floatArray.length,
      updatedAt: new Date().toISOString(),
    };

    this.entries.set(chunkId, entry);

    if (!this.projectIndex.has(projectId)) {
      this.projectIndex.set(projectId, new Set());
    }
    this.projectIndex.get(projectId)!.add(chunkId);
  }

  /**
   * Retrieves vector entry for a specific chunk.
   */
  public get(chunkId: string): VectorEntry | undefined {
    return this.entries.get(chunkId);
  }

  /**
   * Removes a vector entry.
   */
  public delete(chunkId: string): boolean {
    const entry = this.entries.get(chunkId);
    if (!entry) return false;

    this.entries.delete(chunkId);
    const pSet = this.projectIndex.get(entry.projectId);
    if (pSet) {
      pSet.delete(chunkId);
      if (pSet.size === 0) {
        this.projectIndex.delete(entry.projectId);
      }
    }
    return true;
  }

  /**
   * Searches for most similar chunks strictly within the requested project.
   * NEVER evaluates or leaks vectors from other projects.
   */
  public searchSimilar(
    projectId: string,
    queryVector: number[],
    topK = 5,
    minSimilarity = 0.2
  ): VectorSearchResult[] {
    const chunkIdsInProject = this.projectIndex.get(projectId);
    if (!chunkIdsInProject || chunkIdsInProject.size === 0) {
      return [];
    }

    const qVec = new Float32Array(queryVector);
    const qNorm = this.computeL2Norm(qVec);
    if (qNorm === 0) {
      return [];
    }

    const scored: VectorSearchResult[] = [];

    for (const chunkId of chunkIdsInProject) {
      const entry = this.entries.get(chunkId);
      if (!entry || entry.projectId !== projectId) {
        // Enforce secondary defensive project invariant check
        continue;
      }

      const similarity = this.computeCosineSimilarity(qVec, qNorm, entry.vector);
      if (similarity >= minSimilarity) {
        scored.push({
          chunkId: entry.chunkId,
          projectId: entry.projectId,
          docId: entry.docId,
          similarity: Number(similarity.toFixed(4)),
        });
      }
    }

    // Deterministic sort: similarity descending, then chunkId ascending
    scored.sort((a, b) => {
      if (b.similarity !== a.similarity) {
        return b.similarity - a.similarity;
      }
      return a.chunkId.localeCompare(b.chunkId);
    });

    return scored.slice(0, topK);
  }

  /**
   * Computes Cosine Similarity: (A · B) / (||A|| * ||B||)
   */
  private computeCosineSimilarity(
    a: Float32Array,
    normA: number,
    b: Float32Array
  ): number {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0;

    let dot = 0;
    let sumSqB = 0;

    for (let i = 0; i < len; i++) {
      const valB = b[i];
      dot += a[i] * valB;
      sumSqB += valB * valB;
    }

    const normB = Math.sqrt(sumSqB);
    if (normA === 0 || normB === 0) return 0;

    const cos = dot / (normA * normB);
    // Clamp to [-1, 1] to prevent floating point drift
    return Math.max(-1.0, Math.min(1.0, cos));
  }

  private computeL2Norm(v: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
      sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
  }

  public getCountForProject(projectId: string): number {
    return this.projectIndex.get(projectId)?.size || 0;
  }

  public getTotalCount(): number {
    return this.entries.size;
  }

  public clear(): void {
    this.entries.clear();
    this.projectIndex.clear();
  }
}

// Global vector store instance
export const globalVectorStore = new VectorStore();
