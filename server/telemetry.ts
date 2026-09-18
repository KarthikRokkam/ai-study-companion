import crypto from 'crypto';
import { AIInteractionTelemetry } from '../src/types.js';

export class ObservabilityTracer {
  private static traces: AIInteractionTelemetry[] = [];
  private static maxTraces = 200;

  public static startTrace(
    feature: AIInteractionTelemetry['feature'],
    workflowId: string,
    model: string = 'gemini-3.8-flash'
  ): {
    traceId: string;
    requestId: string;
    workflowId: string;
    feature: AIInteractionTelemetry['feature'];
    model: string;
    startTime: number;
    retrievalStartTime?: number;
    retrievalDurationMs: number;
    recordRetrievalLatency: (durationMs: number) => void;
    finishTrace: (params: {
      promptTokens: number;
      completionTokens: number;
      success: boolean;
      error?: string | null;
      embeddingLatencyMs?: number;
      lexicalCandidateCount?: number;
      semanticCandidateCount?: number;
      mergedCandidateCount?: number;
      finalEvidenceCount?: number;
      evidenceClassification?: AIInteractionTelemetry['evidenceClassification'];
    }) => AIInteractionTelemetry;
  } {
    const traceId = `trc_${crypto.randomUUID()}`;
    const requestId = `req_${crypto.randomUUID()}`;
    const startTime = Date.now();
    let retrievalDurationMs = 0;

    return {
      traceId,
      requestId,
      workflowId,
      feature,
      model,
      startTime,
      retrievalDurationMs,
      recordRetrievalLatency(ms: number) {
        retrievalDurationMs = ms;
      },
      finishTrace({
        promptTokens,
        completionTokens,
        success,
        error,
        embeddingLatencyMs,
        lexicalCandidateCount,
        semanticCandidateCount,
        mergedCandidateCount,
        finalEvidenceCount,
        evidenceClassification,
      }: {
        promptTokens: number;
        completionTokens: number;
        success: boolean;
        error?: string | null;
        embeddingLatencyMs?: number;
        lexicalCandidateCount?: number;
        semanticCandidateCount?: number;
        mergedCandidateCount?: number;
        finalEvidenceCount?: number;
        evidenceClassification?: AIInteractionTelemetry['evidenceClassification'];
      }) {
        const latencyMs = Date.now() - startTime;
        const totalTokens = promptTokens + completionTokens;
        
        // Gemini 2.5/3.8 Flash approximate pricing: $0.075 / 1M prompt tokens, $0.30 / 1M completion tokens
        const estimatedCostUsd = Number(
          ((promptTokens * 0.000000075) + (completionTokens * 0.00000030)).toFixed(6)
        );

        const telemetryRecord: AIInteractionTelemetry = {
          traceId,
          requestId,
          workflowId,
          feature,
          model,
          latencyMs,
          retrievalLatencyMs: retrievalDurationMs,
          embeddingLatencyMs,
          lexicalCandidateCount,
          semanticCandidateCount,
          mergedCandidateCount,
          finalEvidenceCount,
          evidenceClassification,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd,
          success,
          error: error || null,
          timestamp: new Date().toISOString(),
        };

        ObservabilityTracer.traces.unshift(telemetryRecord);
        if (ObservabilityTracer.traces.length > ObservabilityTracer.maxTraces) {
          ObservabilityTracer.traces.pop();
        }

        return telemetryRecord;
      },
    };
  }

  public static getRecentTraces(limit: number = 50): AIInteractionTelemetry[] {
    return ObservabilityTracer.traces.slice(0, limit);
  }

  public static getStats() {
    const totalRequests = ObservabilityTracer.traces.length;
    const successfulRequests = ObservabilityTracer.traces.filter((t) => t.success).length;
    const totalTokens = ObservabilityTracer.traces.reduce((sum, t) => sum + t.totalTokens, 0);
    const totalCost = ObservabilityTracer.traces.reduce((sum, t) => sum + t.estimatedCostUsd, 0);
    const avgLatency = totalRequests > 0
      ? Math.round(ObservabilityTracer.traces.reduce((sum, t) => sum + t.latencyMs, 0) / totalRequests)
      : 0;

    return {
      totalRequests,
      successfulRequests,
      successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100,
      totalTokens,
      totalCostUsd: Number(totalCost.toFixed(6)),
      avgLatencyMs: avgLatency,
    };
  }
}
