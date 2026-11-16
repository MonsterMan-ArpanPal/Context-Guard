import { motion } from "framer-motion";
import { Database, Gauge, MessageSquareText, Scissors, Search, Sparkles } from "lucide-react";
import type { QueryResult } from "@/lib/types";
import { ms } from "@/lib/utils";

const ICONS = {
  query: Search,
  retrieval: Database,
  vds: Gauge,
  sanitize: Scissors,
  llm: Sparkles,
  response: MessageSquareText,
};

export function PipelineDiagram({ result }: { result: QueryResult }) {
  const stages = [
    { key: "query" as const, label: "Query", value: 0, note: "user intent" },
    {
      key: "retrieval" as const,
      label: "Vector DB",
      value: result.contextguard.stages.retrieval,
      note: `top-${result.top_k}`,
    },
    {
      key: "vds" as const,
      label: "VDS check",
      value: result.contextguard.stages.vds,
      note: `thr ${result.threshold}`,
    },
    {
      key: "sanitize" as const,
      label: "Sanitize",
      value: result.contextguard.stages.sanitize,
      note: `${result.contextguard.sentences_removed} removed`,
    },
    {
      key: "llm" as const,
      label: "Generate",
      value: result.contextguard.stages.llm,
      note: result.engine.llm.split(":")[0],
    },
    { key: "response" as const, label: "Response", value: 0, note: "grounded answer" },
  ];

  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          <span className="text-xs font-semibold tracking-tight text-zinc-100">
            ContextGuard pipeline
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
          <span>
            cascade total <span className="text-zinc-300">{ms(result.contextguard.latency_ms)}</span>
          </span>
          <span className="hidden sm:inline">
            llama guard <span className="text-danger-300">{ms(result.llama_guard.latency_ms)}</span>
          </span>
        </div>
      </div>

      <div className="relative overflow-x-auto px-5 py-7">
        <div className="absolute left-10 right-10 top-1/2 hidden h-px -translate-y-[38px] bg-gradient-to-r from-white/[0.04] via-white/[0.14] to-white/[0.04] md:block" />
        <motion.div
          className="absolute top-1/2 hidden h-px w-24 -translate-y-[38px] bg-gradient-to-r from-transparent via-brand-300 to-transparent md:block"
          animate={{ x: ["0%", "600%"] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
        />

        <div className="flex min-w-[720px] items-start justify-between gap-2">
          {stages.map((stage, index) => {
            const Icon = ICONS[stage.key];
            const isHot = stage.key === "vds" || stage.key === "sanitize";
            return (
              <div key={stage.key} className="relative flex flex-1 flex-col items-center gap-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.06 }}
                  className={
                    "relative grid h-10 w-10 place-items-center rounded-xl border " +
                    (isHot
                      ? "border-brand-400/40 bg-brand-500/10 text-brand-300"
                      : "border-white/[0.08] bg-white/[0.04] text-zinc-400")
                  }
                >
                  {isHot && (
                    <span className="absolute inset-0 animate-pulse-ring rounded-xl border border-brand-400/40" />
                  )}
                  <Icon className="h-4 w-4" />
                </motion.div>
                <div className="text-center">
                  <div className="text-[11px] font-medium text-zinc-300">{stage.label}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-zinc-500">
                    {stage.key === "query" || stage.key === "response" ? "—" : ms(stage.value)}
                  </div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">
                    {stage.note}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-white/[0.06] px-5 py-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-zinc-600">
        <span>
          vds per chunk <span className="text-zinc-400">{ms(result.contextguard.stages.vds / Math.max(result.chunks.length, 1))}</span>
        </span>
        <span>
          sanitize per flagged chunk{" "}
          <span className="text-zinc-400">
            {ms(result.contextguard.stages.sanitize / Math.max(result.contextguard.chunks_sanitized || 1, 1))}
          </span>
        </span>
        <span>
          budget <span className="text-zinc-400">150 ms</span>
        </span>
      </div>
    </div>
  );
}
