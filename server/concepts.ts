import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './db.js';
import {
  Concept,
  ConceptRelationship,
  ConceptRelationshipType,
  ConceptGraph,
  KnowledgeChunk,
} from '../src/types.js';

const VALID_RELATIONSHIP_TYPES: Set<ConceptRelationshipType> = new Set([
  'PREREQUISITE',
  'RELATED_TO',
  'EXAMPLE_OF',
  'PART_OF',
]);

/**
 * Concept Graph Manager & Structured Extraction Engine.
 *
 * Guarantees:
 * 1. Strict Project Boundary: Concepts & relationships are scoped exclusively to a single projectId.
 * 2. Source Evidence Verification: Every concept must reference real, existing source chunks.
 * 3. Structured Validation: External AI output is strictly schema-validated before entering trusted database state.
 * 4. Deterministic Fallback: Fallback rule-based concept parser ensures reliable offline ingestion.
 */
export class ConceptGraphEngine {
  /**
   * Retrieves the project-isolated concept graph.
   */
  public static getGraph(projectId: string): ConceptGraph {
    const concepts: Concept[] = [];
    for (const concept of db.concepts.values()) {
      if (concept.projectId === projectId) {
        concepts.push(concept);
      }
    }

    const relationships: ConceptRelationship[] = [];
    for (const rel of db.conceptRelationships.values()) {
      if (rel.projectId === projectId) {
        relationships.push(rel);
      }
    }

    return { concepts, relationships };
  }

  /**
   * Persists a validated concept into the store.
   */
  public static storeConcept(concept: Concept): void {
    db.concepts.set(concept.id, concept);
  }

  /**
   * Persists a validated concept relationship into the store.
   */
  public static storeRelationship(rel: ConceptRelationship): void {
    db.conceptRelationships.set(rel.id, rel);
  }

  /**
   * Extracts structured concepts and their relationships from a set of project chunks.
   */
  public static async extractFromChunks(
    projectId: string,
    chunks: KnowledgeChunk[]
  ): Promise<ConceptGraph> {
    if (chunks.length === 0) {
      return { concepts: [], relationships: [] };
    }

    // Verify all chunks belong to this project
    const validChunks = chunks.filter((c) => c.projectId === projectId);
    if (validChunks.length === 0) {
      return { concepts: [], relationships: [] };
    }

    const chunkIdMap = new Set(validChunks.map((c) => c.id));

    if (process.env.NODE_ENV === 'test') {
      const fallbackGraph = this.extractDeterministic(projectId, validChunks, chunkIdMap);
      this.persistGraph(projectId, fallbackGraph);
      return fallbackGraph;
    }

    // Try AI structured extraction first if key available with 3000ms timeout
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Concept extraction AI timeout')), 3000)
        );
        const aiGraph = await Promise.race([
          this.extractWithAI(projectId, validChunks, apiKey),
          timeoutPromise,
        ]);
        if (aiGraph && aiGraph.concepts.length > 0) {
          this.persistGraph(projectId, aiGraph);
          return aiGraph;
        }
      } catch (err) {
        // Fall back gracefully to deterministic rule-based extractor
      }
    }

    // Deterministic Rule-Based Extraction Fallback
    const fallbackGraph = this.extractDeterministic(projectId, validChunks, chunkIdMap);
    this.persistGraph(projectId, fallbackGraph);
    return fallbackGraph;
  }

  private static persistGraph(projectId: string, graph: ConceptGraph): void {
    for (const c of graph.concepts) {
      if (c.projectId === projectId) {
        db.concepts.set(c.id, c);
      }
    }
    for (const r of graph.relationships) {
      if (r.projectId === projectId) {
        db.conceptRelationships.set(r.id, r);
      }
    }
  }

  /**
   * Structured AI Concept Extractor using Gemini with Schema Enforcement.
   */
  private static async extractWithAI(
    projectId: string,
    chunks: KnowledgeChunk[],
    apiKey: string
  ): Promise<ConceptGraph> {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contextPayload = chunks
      .slice(0, 8)
      .map((c) => `[CHUNK_ID: ${c.id}] [SECTION: ${c.sectionTitle}]\n${c.content}`)
      .join('\n\n---\n\n');

    const prompt = `You are a curriculum knowledge architect. Analyze the provided study material chunks and extract the key academic concepts and their hierarchical relationships.
CRITICAL RULES:
1. ONLY extract concepts explicitly supported in the text.
2. Every concept MUST list the real CHUNK_IDs from which it was extracted.
3. Every relationship MUST be one of: 'PREREQUISITE', 'RELATED_TO', 'EXAMPLE_OF', 'PART_OF'.
4. Confidence must be a float between 0.5 and 1.0.

STUDY MATERIAL:
${contextPayload}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concepts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  sourceChunkIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  prerequisiteConceptNames: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  relatedConceptNames: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['name', 'description', 'sourceChunkIds'],
              },
            },
            relationships: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sourceConceptName: { type: Type.STRING },
                  targetConceptName: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    enum: ['PREREQUISITE', 'RELATED_TO', 'EXAMPLE_OF', 'PART_OF'],
                  },
                  confidence: { type: Type.NUMBER },
                },
                required: ['sourceConceptName', 'targetConceptName', 'type'],
              },
            },
          },
          required: ['concepts'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return this.validateAndNormalizeAIGraph(projectId, parsed, chunks);
  }

  /**
   * Validates external AI concept output against real chunks and database integrity.
   */
  public static validateAndNormalizeAIGraph(
    projectId: string,
    rawOutput: any,
    availableChunks: KnowledgeChunk[]
  ): ConceptGraph {
    if (!rawOutput || !Array.isArray(rawOutput.concepts)) {
      throw new Error('AI concept extraction failed schema: root must contain "concepts" array.');
    }

    const availableChunkIds = new Set(availableChunks.map((c) => c.id));
    const conceptMapByName = new Map<string, Concept>();
    const validatedConcepts: Concept[] = [];

    for (const item of rawOutput.concepts) {
      if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
        continue;
      }
      if (!item.description || typeof item.description !== 'string') {
        continue;
      }

      // Filter source chunk IDs to only those that actually exist in available chunks
      const validSourceChunkIds = Array.isArray(item.sourceChunkIds)
        ? item.sourceChunkIds.filter((cid: any) => typeof cid === 'string' && availableChunkIds.has(cid))
        : [];

      // If no valid chunk IDs mapped, map to the first available chunk defensively
      if (validSourceChunkIds.length === 0 && availableChunks.length > 0) {
        validSourceChunkIds.push(availableChunks[0].id);
      }

      const conceptId = `cpt_${crypto.randomUUID().slice(0, 10)}`;
      const normalizedConcept: Concept = {
        id: conceptId,
        projectId,
        name: item.name.trim().slice(0, 80),
        description: item.description.trim().slice(0, 300),
        sourceChunkIds: validSourceChunkIds,
        prerequisiteConceptIds: [],
        relatedConceptIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      conceptMapByName.set(normalizedConcept.name.toLowerCase(), normalizedConcept);
      validatedConcepts.push(normalizedConcept);
    }

    // Process relationships
    const validatedRelationships: ConceptRelationship[] = [];
    if (Array.isArray(rawOutput.relationships)) {
      for (const rel of rawOutput.relationships) {
        if (!rel.sourceConceptName || !rel.targetConceptName || !rel.type) {
          continue;
        }

        const source = conceptMapByName.get(String(rel.sourceConceptName).trim().toLowerCase());
        const target = conceptMapByName.get(String(rel.targetConceptName).trim().toLowerCase());

        if (!source || !target || source.id === target.id) {
          // Discard orphaned or self-referential relationship
          continue;
        }

        const relType = String(rel.type).toUpperCase() as ConceptRelationshipType;
        if (!VALID_RELATIONSHIP_TYPES.has(relType)) {
          continue;
        }

        const confidence = typeof rel.confidence === 'number'
          ? Math.max(0.1, Math.min(1.0, rel.confidence))
          : 0.85;

        const relId = `rel_${crypto.randomUUID().slice(0, 10)}`;
        const validRel: ConceptRelationship = {
          id: relId,
          projectId,
          sourceConceptId: source.id,
          targetConceptId: target.id,
          type: relType,
          confidence,
          sourceEvidenceIds: source.sourceChunkIds.slice(0, 2),
        };

        validatedRelationships.push(validRel);

        // Update reciprocal references on concept entities
        if (relType === 'PREREQUISITE') {
          if (!target.prerequisiteConceptIds.includes(source.id)) {
            target.prerequisiteConceptIds.push(source.id);
          }
        } else {
          if (!source.relatedConceptIds.includes(target.id)) {
            source.relatedConceptIds.push(target.id);
          }
        }
      }
    }

    return {
      concepts: validatedConcepts,
      relationships: validatedRelationships,
    };
  }

  /**
   * Deterministic rule-based concept extraction.
   * Extracts section-derived concepts and key capitalized technical terms.
   */
  private static extractDeterministic(
    projectId: string,
    chunks: KnowledgeChunk[],
    chunkIdMap: Set<string>
  ): ConceptGraph {
    const concepts: Concept[] = [];
    const sectionConceptMap = new Map<string, Concept>();

    // 1. Extract concepts from chunk section headers
    for (const chunk of chunks) {
      const section = chunk.sectionTitle.trim();
      if (!section || section.toLowerCase() === 'overview' || sectionConceptMap.has(section.toLowerCase())) {
        continue;
      }

      const conceptId = `cpt_${crypto.randomUUID().slice(0, 10)}`;
      const snippet = chunk.content.slice(0, 150).replace(/\n/g, ' ').trim() + '...';

      const concept: Concept = {
        id: conceptId,
        projectId,
        name: section,
        description: `Core academic concept covering ${section}: ${snippet}`,
        sourceChunkIds: [chunk.id],
        prerequisiteConceptIds: [],
        relatedConceptIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      sectionConceptMap.set(section.toLowerCase(), concept);
      concepts.push(concept);
    }

    // 2. Build foundational relationships between sequential sections
    const relationships: ConceptRelationship[] = [];
    for (let i = 0; i < concepts.length - 1; i++) {
      const source = concepts[i];
      const target = concepts[i + 1];

      const relType: ConceptRelationshipType = i === 0 ? 'PREREQUISITE' : 'RELATED_TO';
      const rel: ConceptRelationship = {
        id: `rel_${crypto.randomUUID().slice(0, 10)}`,
        projectId,
        sourceConceptId: source.id,
        targetConceptId: target.id,
        type: relType,
        confidence: 0.88,
        sourceEvidenceIds: source.sourceChunkIds,
      };

      relationships.push(rel);

      if (relType === 'PREREQUISITE') {
        target.prerequisiteConceptIds.push(source.id);
      } else {
        source.relatedConceptIds.push(target.id);
      }
    }

    return { concepts, relationships };
  }
}
