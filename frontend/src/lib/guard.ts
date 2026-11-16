import type { ChunkTrace, QueryResult } from "./types";

/** Groq list price for llama-3.3-70b-versatile, USD per 1M tokens (2026). */
const PRICE_INPUT_PER_M = 0.59;
const PRICE_OUTPUT_PER_M = 0.79;

export type Risk = "safe" | "suspicious" | "hijacked";

/**
 * Three bands instead of two: below the threshold a chunk is clean, near it the
 * score is ambiguous, above it the payload is unambiguous. The UI needs that
 * middle state to explain *why* a chunk was flagged.
 */
export function riskOf(chunk: ChunkTrace, threshold: number): Risk {
  if (chunk.hijacked || chunk.vds.score >= Math.max(threshold * 2, 0.6)) return "hijacked";
  if (chunk.vds.score >= threshold) return "suspicious";
  return "safe";
}

export const riskColor: Record<Risk, string> = {
  safe: "#34d399",
  suspicious: "#fbbf24",
  hijacked: "#e07a7a",
};

export const riskLabel: Record<Risk, string> = {
  safe: "safe",
  suspicious: "suspicious",
  hijacked: "hijacked",
};

/** Split chunk text into kept / removed runs so the diff can strike removed ones. */
export function splitRemovals(text: string, removed: { text: string }[]) {
  const ranges: { start: number; end: number }[] = [];

  for (const item of removed) {
    const needle = item.text.trim();
    if (!needle) continue;
    const at = text.indexOf(needle);
    if (at === -1) continue;
    ranges.push({ start: at, end: at + needle.length });
  }

  ranges.sort((a, b) => a.start - b.start);

  const segments: { text: string; removed: boolean }[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), removed: false });
    }
    segments.push({ text: text.slice(range.start, range.end), removed: true });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), removed: false });

  return segments.filter((segment) => segment.text.length > 0);
}

function tokens(chars: number) {
  return Math.max(1, Math.ceil(chars / 4));
}

/**
 * What this query would cost at list price: prompt tokens (question + the
 * context the model actually saw) plus completion tokens. Rough by design —
 * it is a cost-order-of-magnitude indicator, not a billing figure.
 */
export function estimateCost(result: QueryResult) {
  const context = result.chunks.map((chunk) => chunk.sanitized_text || chunk.text).join(" ");

  const inputTokens = tokens(result.query.length + context.length);
  const outputTokens = tokens(result.contextguard.response.length);
  const usd =
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_M + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;

  return { usd, inputTokens, outputTokens };
}

export function formatUsd(usd: number) {
  if (usd <= 0) return "$0";
  if (usd < 0.00001) return "<$0.00001";
  if (usd < 0.001) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}

export type Verdict = {
  /** null means the run was benign, so "blocked" is not applicable. */
  blocked: boolean | null;
  sentences: number;
  flagged: number;
  retrieved: number;
};

export function verdictOf(result: QueryResult): Verdict {
  const flagged = result.contextguard.chunks_flagged;
  const sentences =
    result.contextguard.sentences_removed ??
    result.chunks.reduce((total, chunk) => total + chunk.removed.length, 0);

  return {
    blocked: result.attack ? !result.contextguard.attack_success : null,
    sentences,
    flagged,
    retrieved: result.chunks.length,
  };
}
