import { motion } from "framer-motion";
import type { QueryResult } from "@/lib/types";
import { estimateCost, formatUsd, verdictOf } from "@/lib/guard";
import { ms } from "@/lib/utils";
import { cn } from "@/lib/utils";

const SEGMENTS = [
  { key: "retrieval", label: "Retrieval", color: "#64748b" },
  { key: "vds", label: "VDS", color: "#34d399" },
  { key: "sanitize", label: "Sanitize", color: "#fbbf24" },
  { key: "llm", label: "LLM", color: "#60a5fa" },
] as const;

function Tile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "mt-1 text-[19px] font-semibold tabular leading-none tracking-tight",
          tone === "neutral" && "text-zinc-100",
          tone === "good" && "text-brand-300",
          tone === "warn" && "text-amber-300",
          tone === "bad" && "text-danger-300",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">{hint}</p>
      )}
    </div>
  );
}

export function StatsPanel({ result }: { result: QueryResult | null }) {
  const path = result?.contextguard;
  const verdict = result ? verdictOf(result) : null;
  const cost = result ? estimateCost(result) : null;

  const stages = path?.stages;
  const parts = SEGMENTS.map((segment) => ({
    ...segment,
    ms: stages ? stages[segment.key] : 0,
  }));
  const sum = parts.reduce((total, part) => total + part.ms, 0) || 1;

  return (
    <aside className="card p-4 lg:sticky lg:top-6">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">this run</p>
        {result && (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
            {result.engine.mode}
          </span>
        )}
      </div>

      <div className="mt-2">
        <p className="text-[34px] font-semibold leading-none tabular tracking-tight text-zinc-50">
          {path ? ms(path.latency_ms) : "—"}
        </p>
        <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
          total latency · end to end
        </p>
      </div>

      <div className="mt-4">
        <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          {parts.map((part) => (
            <motion.span
              key={part.key}
              className="h-full"
              style={{ backgroundColor: part.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(part.ms / sum) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          {parts.map((part) => (
            <div key={part.key} className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: part.color }}
              />
              <span className="text-[10px] text-zinc-500">{part.label}</span>
              <span className="ml-auto font-mono text-[10px] tabular text-zinc-400">
                {stages ? part.ms.toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Tile
          label="chunks"
          value={verdict ? verdict.retrieved : "—"}
          hint="retrieved"
        />
        <Tile
          label="flagged"
          value={verdict ? verdict.flagged : "—"}
          hint={verdict && verdict.flagged > 0 ? "needed cleaning" : "none found"}
          tone={!verdict ? "neutral" : verdict.flagged > 0 ? "warn" : "good"}
        />
        <Tile
          label="sanitized"
          value={verdict ? verdict.sentences : "—"}
          hint="sentences removed"
        />
        <Tile
          label="utility"
          value={path ? `${Math.round(path.utility_score * 100)}%` : "—"}
          hint="answer preserved"
          tone={path ? (path.utility_score >= 0.99 ? "good" : "warn") : "neutral"}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Tile
          label="attack"
          value={
            verdict?.blocked === null || !verdict ? (
              <span className="text-zinc-500">N/A</span>
            ) : verdict.blocked ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                Blocked
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-danger-400" />
                Passed
              </span>
            )
          }
          hint={result?.attack ? "canary reached LLM?" : "benign query"}
          tone={verdict?.blocked === null || !verdict ? "neutral" : verdict.blocked ? "good" : "bad"}
        />
        <Tile
          label="cost"
          value={cost ? formatUsd(cost.usd) : "—"}
          hint="est. per query"
        />
      </div>

      {result && (
        <p className="mt-3 border-t border-white/[0.05] pt-2 font-mono text-[9px] leading-relaxed tracking-[0.06em] text-zinc-600">
          {cost?.inputTokens.toLocaleString()} in / {cost?.outputTokens.toLocaleString()} out tokens
        </p>
      )}
    </aside>
  );
}
