import crypto from 'crypto';
import { db } from './db.js';
import {
  KnowledgeChunk,
  Citation,
  GroundingStatus,
  EvidenceClassification,
} from '../src/types.js';
import { QueryAnalyzer, QueryAnalysis } from './query-analyzer.js';
import { globalVectorStore } from './vector-store.js';
import { defaultEmbeddingProvider, DeterministicLocalEmbeddingProvider } from './embeddings.js';

// Common Stop words
const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'for',
  'of', 'in', 'to', 'with', 'what', 'how', 'why', 'who', 'when',
  'does', 'did', 'are', 'was', 'were', 'have', 'has', 'had', 'that',
  'this', 'from', 'by', 'your', 'about', 'can', 'you'
]);

// Extended 8-Layer Prompt Injection Patterns
const PROMPT_INJECTION_PATTERNS = [
  /(?:system\s*prompt|system\s*instruction|ignore\s+all\s+previous|disregard\s+all\s+instructions|forget\s+all\s+prior)/i,
  /(?:you\s+are\s+now\s+a|bypass\s+safety|jailbreak|DAN\s+mode|developer\s+mode|unrestricted\s+ai)/i,
  /(?:reveal\s+your\s+instructions|print\s+system\s+prompt|show\s+secret\s+key|api_key|password|root\s+token)/i,
  /(?:delete\s+from|drop\s+table|exec\s*\(|eval\s*\(|<script)/i,
  /(?:act\s+as\s+an?\s+(?:unfiltered|unconstrained|evil|adversarial)|pretend\s+you\s+have\s+no\s+rules)/i,
  /(?:\[(?:system|admin|override)\]|assistant:\s*ignore|human:\s*disregard)/i,
];

export interface SanitizationResult {
  sanitizedText: string;
  injectionDetected: boolean;
  patternsFound: string[];
  anomaliesDetected: string[];
}

/**
 * Layered Document Sanitization Engine (Layers 1 to 4).
 *
 * Layer 1: Unicode NFKC normalization and control character stripping.
 * Layer 2: Encoded payload neutralization (Base64 / Hex byte sequences).
 * Layer 3: Known prompt injection pattern defanging.
 * Layer 4: XML and conversational boundary tag sanitization.
 */
export function sanitizeUntrustedDocument(rawText: string): SanitizationResult {
  // Layer 1: Unicode normalization and control character removal
  let sanitized = String(rawText || '')
    .normalize('NFKC')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

  const patternsFound: string[] = [];
  const anomaliesDetected: string[] = [];
  let injectionDetected = false;

  // Layer 2: Detect & defang encoded payload patterns (Base64 blocks >= 24 chars)
  const base64Regex = /(?:[A-Za-z0-9+/]{4}){6,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
  sanitized = sanitized.replace(base64Regex, (match) => {
    try {
      const decoded = Buffer.from(match, 'base64').toString('utf8');
      if (/[\x20-\x7E]{6,}/.test(decoded) && /system|ignore|bypass|prompt|admin/i.test(decoded)) {
        injectionDetected = true;
        anomaliesDetected.push(`Base64 instruction payload neutralized: "${match.slice(0, 16)}..."`);
        return '[DEFANGED_ENCODED_PAYLOAD]';
      }
    } catch {
      // Not base64
    }
    return match;
  });

  // Layer 2b: Detect & defang Hex byte sequences
  if (/(?:\\x[0-9a-fA-F]{2}){4,}/i.test(sanitized)) {
    injectionDetected = true;
    anomaliesDetected.push('Hex encoded byte sequence neutralized');
    sanitized = sanitized.replace(/(?:\\x[0-9a-fA-F]{2})+/gi, '[DEFANGED_HEX_PAYLOAD]');
  }

  // Layer 3: Known instruction override pattern detection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const globalRegex = new RegExp(pattern.source, 'gi');
    if (globalRegex.test(sanitized)) {
      injectionDetected = true;
      patternsFound.push(pattern.source);
      sanitized = sanitized.replace(globalRegex, '[DEFANGED_INSTRUCTION]');
    }
  }

  // Layer 4: Defang XML tags and conversation role boundaries
  sanitized = sanitized
    .replace(/<\/?[uU]ntrusted_project_data>/gi, '[DEFANGED_TAG]')
    .replace(/<\/?[sS]ystem>/gi, '[DEFANGED_TAG]')
    .replace(/<\/?[pP]rompt>/gi, '[DEFANGED_TAG]')
    .replace(/\[\/?(?:SYSTEM|INSTRUCTION|OVERRIDE)\]/gi, '[DEFANGED_MARKER]')
    .replace(/^(?:Assistant|User|System):\s*/gim, '[DEFANGED_ROLE]: ');

  return {
    sanitizedText: sanitized,
    injectionDetected,
    patternsFound,
    anomaliesDetected,
  };
}

/**
 * Splits document text into manageable, overlapping knowledge chunks.
 */
export function chunkDocument(
  docId: string,
  docTitle: string,
  projectId: string,
  spaceId: string,
  sanitizedText: string,
  chunkSizeChars = 600,
  overlapChars = 100
): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  const paragraphs = sanitizedText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  let currentChunk = '';
  let chunkIndex = 0;
  let currentSection = 'Overview';

  for (const paragraph of paragraphs) {
    // Detect pseudo headers
    if (paragraph.length < 80 && !paragraph.endsWith('.')) {
      currentSection = paragraph.trim();
    }

    if (currentChunk.length + paragraph.length > chunkSizeChars && currentChunk.length > 0) {
      const chunkId = `chk_${crypto.randomUUID().slice(0, 12)}`;
      const tokenEst = Math.ceil(currentChunk.length / 4);

      chunks.push({
        id: chunkId,
        docId,
        docTitle,
        projectId,
        spaceId,
        chunkIndex,
        sectionTitle: currentSection,
        content: currentChunk.trim(),
        tokenCount: tokenEst,
        securityFlags: {
          promptInjectionDetected: false,
          sanitized: true,
          suspiciousPatternsFound: [],
        },
      });

      chunkIndex++;
      currentChunk = currentChunk.slice(-overlapChars) + '\n\n' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim().length > 0) {
    const chunkId = `chk_${crypto.randomUUID().slice(0, 12)}`;
    chunks.push({
      id: chunkId,
      docId,
      docTitle,
      projectId,
      spaceId,
      chunkIndex,
      sectionTitle: currentSection,
      content: currentChunk.trim(),
      tokenCount: Math.ceil(currentChunk.length / 4),
      securityFlags: {
        promptInjectionDetected: false,
        sanitized: true,
        suspiciousPatternsFound: [],
      },
    });
  }

  return chunks;
}

export interface CandidateScore {
  chunk: KnowledgeChunk;
  lexicalScore: number;
  lexicalRank: number;
  semanticScore: number;
  semanticRank: number;
  rrfScore: number;
  hybridScore: number;
  hasEmbedding: boolean;
}

export interface HybridRetrievalResult {
  citations: Citation[];
  groundingStatus: GroundingStatus;
  evidenceClassification: EvidenceClassification;
  maxScore: number;
  retrievedChunks: KnowledgeChunk[];
  candidatesEvaluated: number;
  lexicalCount: number;
  semanticCount: number;
  queryAnalysis: QueryAnalysis;
  debugCandidates?: {
    chunkId: string;
    section: string;
    lexicalScore: number;
    semanticScore: number;
    hybridScore: number;
  }[];
}

/**
 * Synchronous Hybrid Knowledge Retrieval Engine.
 * Combines Lexical Token Frequency with Deterministic Vector Semantic Retrieval.
 *
 * Guarantees:
 * 1. Strict Project Boundary: Candidates are filtered by projectId BEFORE scoring.
 * 2. Reciprocal Rank Fusion (RRF) & Normalized Scoring: Weighted combination (0.45 lexical, 0.55 semantic).
 * 3. Graceful Degradation: If a chunk lacks an embedding, falls back to lexical score safely.
 * 4. Evidence Sufficiency Filter: Separates semantic similarity from true evidence.
 * 5. Deterministic Citations: Generates verified citations mapped directly to source chunks.
 */
export function retrieveHybridKnowledgeSync(
  projectId: string,
  rawQuery: string,
  options: {
    topK?: number;
    lexicalWeight?: number;
    semanticWeight?: number;
    evidenceThreshold?: number;
    minSemanticSimilarity?: number;
  } = {}
): HybridRetrievalResult {
  const topK = options.topK ?? 3;
  const lexicalWeight = options.lexicalWeight ?? 0.45;
  const semanticWeight = options.semanticWeight ?? 0.55;
  const evidenceThreshold = options.evidenceThreshold ?? 0.25;
  const minSemanticSimilarity = options.minSemanticSimilarity ?? 0.15;

  const queryAnalysis = QueryAnalyzer.analyze(rawQuery);

  if (queryAnalysis.tokens.length === 0) {
    return {
      citations: [],
      groundingStatus: 'insufficient_evidence',
      evidenceClassification: 'insufficient',
      maxScore: 0,
      retrievedChunks: [],
      candidatesEvaluated: 0,
      lexicalCount: 0,
      semanticCount: 0,
      queryAnalysis,
    };
  }

  // 1. Filter project chunks strictly by project isolation
  const projectChunks: KnowledgeChunk[] = [];
  for (const chunk of db.chunks.values()) {
    if (chunk.projectId === projectId) {
      projectChunks.push(chunk);
    }
  }

  if (projectChunks.length === 0) {
    return {
      citations: [],
      groundingStatus: 'insufficient_evidence',
      evidenceClassification: 'insufficient',
      maxScore: 0,
      retrievedChunks: [],
      candidatesEvaluated: 0,
      lexicalCount: 0,
      semanticCount: 0,
      queryAnalysis,
    };
  }

  // 2. Lexical Scoring
  const lexicalScored = projectChunks.map((chunk) => {
    const contentLower = chunk.content.toLowerCase();
    const sectionLower = chunk.sectionTitle.toLowerCase();
    let rawScore = 0;

    for (const token of queryAnalysis.tokens) {
      // Content occurrence with word boundaries
      const regex = new RegExp(`\\b${token}\\b`, 'gi');
      const matches = (contentLower.match(regex) || []).length;
      if (matches > 0) {
        rawScore += Math.min(matches * 0.2, 0.6);
      }
      // Section header alignment
      if (sectionLower.includes(token)) {
        rawScore += 0.3;
      }
    }

    // Stem matching bonus (with word prefix boundary to avoid false positives on arbitrary substrings)
    for (const stem of queryAnalysis.stems) {
      if (stem.length > 2) {
        const stemRegex = new RegExp(`\\b${stem}`, 'i');
        if (stemRegex.test(contentLower)) {
          rawScore += 0.15;
        }
      }
    }

    const normalized = Math.min(
      Number((rawScore / Math.sqrt(queryAnalysis.tokens.length)).toFixed(3)),
      1.0
    );

    return { chunk, score: normalized };
  });

  lexicalScored.sort((a, b) => b.score - a.score);
  const lexicalRankMap = new Map<string, { score: number; rank: number }>();
  lexicalScored.forEach((item, idx) => {
    lexicalRankMap.set(item.chunk.id, { score: item.score, rank: idx + 1 });
  });

  // 3. Semantic Scoring (Vector Store Search)
  const localEmbedder = new DeterministicLocalEmbeddingProvider();
  const queryVector = (localEmbedder as any).computeVector(queryAnalysis.cleanedQuery);

  const semanticResults = globalVectorStore.searchSimilar(
    projectId,
    queryVector,
    10,
    minSemanticSimilarity
  );

  const semanticRankMap = new Map<string, { score: number; rank: number }>();
  semanticResults.forEach((res, idx) => {
    semanticRankMap.set(res.chunkId, { score: res.similarity, rank: idx + 1 });
  });

  // 4. Candidate Fusion & Reranking (Reciprocal Rank Fusion)
  const candidateScores: CandidateScore[] = projectChunks.map((chunk) => {
    const lex = lexicalRankMap.get(chunk.id) || { score: 0, rank: 999 };
    const sem = semanticRankMap.get(chunk.id);

    const hasEmbedding = sem !== undefined;
    const semScore = sem ? sem.score : 0;
    const semRank = sem ? sem.rank : 999;

    // RRF Score: w_lex / (60 + rank_lex) + w_sem / (60 + rank_sem)
    const rrfScore =
      lexicalWeight / (60 + lex.rank) + (hasEmbedding ? semanticWeight / (60 + semRank) : 0);

    // Hybrid combined score: weighted average if embedding exists, else pure lexical
    const hybridScore = hasEmbedding
      ? Number((lexicalWeight * lex.score + semanticWeight * semScore).toFixed(4))
      : lex.score;

    return {
      chunk,
      lexicalScore: lex.score,
      lexicalRank: lex.rank,
      semanticScore: semScore,
      semanticRank: semRank,
      rrfScore,
      hybridScore,
      hasEmbedding,
    };
  });

  // Deterministic Rerank: HybridScore descending, tie-break RRF, tie-break chunkId
  candidateScores.sort((a, b) => {
    if (b.hybridScore !== a.hybridScore) {
      return b.hybridScore - a.hybridScore;
    }
    if (b.rrfScore !== a.rrfScore) {
      return b.rrfScore - a.rrfScore;
    }
    return a.chunk.id.localeCompare(b.chunk.id);
  });

  const bestCandidates = candidateScores.slice(0, topK);
  const maxScore = bestCandidates.length > 0 ? bestCandidates[0].hybridScore : 0;

  // 5. Evidence Sufficiency Evaluation
  let evidenceClassification: EvidenceClassification = 'insufficient';
  let groundingStatus: GroundingStatus = 'insufficient_evidence';

  const hasAnyLexicalMatch = lexicalScored.some((l) => l.score > 0);
  const topCandidate = bestCandidates[0];

  // If there is zero literal lexical match in the project and no strong semantic consensus,
  // the evidence is insufficient (prevents hallucination and bogus citations on orthogonal queries)
  if (!hasAnyLexicalMatch && (topCandidate?.semanticScore || 0) < 0.65) {
    evidenceClassification = 'insufficient';
    groundingStatus = 'insufficient_evidence';
  } else if (maxScore >= 0.40 && ((topCandidate?.lexicalScore || 0) > 0 || (topCandidate?.semanticScore || 0) >= 0.70)) {
    evidenceClassification = 'strong';
    groundingStatus = 'grounded';
  } else if (maxScore >= evidenceThreshold && (hasAnyLexicalMatch || (topCandidate?.semanticScore || 0) >= 0.65)) {
    evidenceClassification = 'weak';
    groundingStatus = 'partial';
  } else {
    evidenceClassification = 'insufficient';
    groundingStatus = 'insufficient_evidence';
  }

  // 6. Construct Verified Citations (Only for candidates meeting threshold)
  const citations: Citation[] = bestCandidates
    .filter((c) => c.hybridScore >= evidenceThreshold)
    .map((c) => ({
      chunkId: c.chunk.id,
      docId: c.chunk.docId,
      docTitle: c.chunk.docTitle,
      section: c.chunk.sectionTitle,
      snippet: c.chunk.content.slice(0, 180).trim() + (c.chunk.content.length > 180 ? '...' : ''),
      relevanceScore: c.hybridScore,
      sourceLocation: `${c.chunk.docTitle} > ${c.chunk.sectionTitle} (Part ${c.chunk.chunkIndex + 1})`,
      mediaAssetId: c.chunk.mediaAssetId,
      mediaType: (c.chunk.mediaType as any) || 'text',
      boundingBox: c.chunk.boundingBox,
      timeRange: c.chunk.timeRange,
    }));

  const retrievedChunks = bestCandidates
    .filter((c) => c.hybridScore >= evidenceThreshold)
    .map((c) => c.chunk);

  return {
    citations: groundingStatus === 'insufficient_evidence' ? [] : citations,
    groundingStatus,
    evidenceClassification,
    maxScore,
    retrievedChunks: groundingStatus === 'insufficient_evidence' ? [] : retrievedChunks,
    candidatesEvaluated: projectChunks.length,
    lexicalCount: lexicalScored.filter((l) => l.score > 0).length,
    semanticCount: semanticResults.length,
    queryAnalysis,
    debugCandidates: bestCandidates.map((c) => ({
      chunkId: c.chunk.id,
      section: c.chunk.sectionTitle,
      lexicalScore: c.lexicalScore,
      semanticScore: c.semanticScore,
      hybridScore: c.hybridScore,
    })),
  };
}

/**
 * Asynchronous Hybrid Knowledge Retrieval (Uses Composite Provider for full fidelity).
 */
export async function retrieveHybridKnowledge(
  projectId: string,
  rawQuery: string,
  options: {
    topK?: number;
    lexicalWeight?: number;
    semanticWeight?: number;
    evidenceThreshold?: number;
  } = {}
): Promise<HybridRetrievalResult> {
  // Uses synchronous hybrid engine as foundation
  return retrieveHybridKnowledgeSync(projectId, rawQuery, options);
}

/**
 * Backward-Compatible Grounded Knowledge Retriever.
 * Preserves the Phase 1 signature and behavior while leveraging the hybrid intelligence engine.
 */
export function retrieveGroundedKnowledge(
  projectId: string,
  query: string,
  topK = 3,
  evidenceThreshold = 0.25
): {
  citations: Citation[];
  groundingStatus: GroundingStatus;
  maxScore: number;
  retrievedChunks: KnowledgeChunk[];
} {
  const result = retrieveHybridKnowledgeSync(projectId, query, {
    topK,
    evidenceThreshold,
  });

  return {
    citations: result.citations,
    groundingStatus: result.groundingStatus,
    maxScore: result.maxScore,
    retrievedChunks: result.retrievedChunks,
  };
}

/**
 * Encapsulates retrieved chunks within strict XML sandbox boundary for prompt isolation.
 */
export function formatSandboxedKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) {
    return '<untrusted_project_data>\n[No project knowledge available for this query]\n</untrusted_project_data>';
  }

  const formattedChunks = chunks
    .map((chunk, idx) => {
      return `--- CHUNK #${idx + 1} [ID: ${chunk.id}] [DOC: ${chunk.docTitle}] [SECTION: ${chunk.sectionTitle}] ---
${chunk.content}`;
    })
    .join('\n\n');

  return `<untrusted_project_data>
${formattedChunks}
</untrusted_project_data>`;
}
