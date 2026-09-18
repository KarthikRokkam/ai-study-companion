export interface QueryAnalysis {
  originalQuery: string;
  cleanedQuery: string;
  tokens: string[];
  stems: string[];
  expandedKeywords: string[];
  hasAnomalousEncoding: boolean;
  detectedAnomalies: string[];
}

const QUERY_STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'could',
  'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'how', 'i', 'in',
  'is', 'it', 'me', 'my', 'of', 'on', 'or', 'our', 'that', 'the', 'their',
  'them', 'there', 'this', 'to', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your'
]);

/**
 * Lightweight deterministic Query Understanding and Normalization Engine.
 *
 * Capabilities:
 * 1. Unicode Normalization (NFKC) & whitespace collapsing.
 * 2. Casing & punctuation decoupling.
 * 3. Stop word elimination without semantic alteration.
 * 4. Safe morphological stem extraction (e.g., "elections" -> "elect", "replicated" -> "replicat").
 * 5. Security check: identifies Base64 / Hex payloads or control characters embedded in query strings.
 */
export class QueryAnalyzer {
  public static analyze(rawQuery: string): QueryAnalysis {
    const originalQuery = String(rawQuery || '');

    // 1. Check for encoded payload anomalies (Base64 / Hex / Script triggers)
    const anomalies: string[] = [];
    let hasAnomalousEncoding = false;

    // Detect base64 patterns of length > 24
    const base64Regex = /(?:[A-Za-z0-9+/]{4}){6,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
    const base64Matches = originalQuery.match(base64Regex);
    if (base64Matches) {
      for (const m of base64Matches) {
        try {
          const decoded = Buffer.from(m, 'base64').toString('utf8');
          if (/[\x20-\x7E]{6,}/.test(decoded) && /system|ignore|bypass|prompt|admin/i.test(decoded)) {
            hasAnomalousEncoding = true;
            anomalies.push(`Base64 encoded instruction detected: "${m.slice(0, 16)}..."`);
          }
        } catch {
          // Ignore invalid decode
        }
      }
    }

    // Detect Hex encoded payloads (e.g., \x73\x79\x73\x74\x65\x6d)
    if (/(?:\\x[0-9a-fA-F]{2}){4,}/.test(originalQuery)) {
      hasAnomalousEncoding = true;
      anomalies.push('Hex encoded byte sequence detected');
    }

    // 2. Unicode normalization and strip control characters
    const normalized = originalQuery
      .normalize('NFKC')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .trim();

    // 3. Clean and extract tokens
    const cleaned = normalized
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const rawTokens = cleaned
      .split(/\s+/)
      .map((t) => t.replace(/^-+|-+$/g, ''))
      .filter((t) => t.length > 1);

    const filteredTokens = rawTokens.filter((t) => !QUERY_STOP_WORDS.has(t));
    // Cap to 30 tokens defensively
    const safeTokens = filteredTokens.slice(0, 30);

    // 4. Extract simple morphological stems and variations safely
    const stems: string[] = [];
    const expandedKeywordsSet = new Set<string>();

    for (const token of safeTokens) {
      expandedKeywordsSet.add(token);

      // Safe English stem rules
      let stem = token;
      if (token.endsWith('ies') && token.length > 4) {
        stem = token.slice(0, -3) + 'y';
      } else if (token.endsWith('es') && token.length > 4) {
        stem = token.slice(0, -2);
      } else if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
        stem = token.slice(0, -1);
      } else if (token.endsWith('ing') && token.length > 5) {
        stem = token.slice(0, -3);
      } else if (token.endsWith('tion') && token.length > 6) {
        stem = token.slice(0, -4);
      } else if (token.endsWith('ed') && token.length > 4) {
        stem = token.slice(0, -2);
      }

      stems.push(stem);
      expandedKeywordsSet.add(stem);
    }

    return {
      originalQuery,
      cleanedQuery: cleaned,
      tokens: safeTokens,
      stems,
      expandedKeywords: Array.from(expandedKeywordsSet),
      hasAnomalousEncoding,
      detectedAnomalies: anomalies,
    };
  }
}
