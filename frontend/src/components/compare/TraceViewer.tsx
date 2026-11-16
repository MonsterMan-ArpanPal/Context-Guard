import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, CornerDownRight, Gauge, Scissors, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ChunkTrace, QueryResult } from "@/lib/types";
import { cn, ms } from "@/lib/utils";
import { Badge } from "../ui/badge";

function ComponentBar({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div title={hint}>
      <div className="flex items-baseline justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
        <span>{label}</span>
        <span className="text-zinc-400">{value.toFixed(3)}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-300"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 1) * 100}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

function TraceRow({ chunk, index }: { chunk: ChunkTrace; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const action = chunk.hijacked ? "sanitized" : "preserved";

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="font-mono text-[10px] text-zinc-600">#{index + 1}</span>
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-zinc-300">{chunk.document_title}</span>
        <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.12em] text-zinc-600 sm:inline">
          sim {chunk.retrieval_score.toFixed(3)}
        </span>
        <span
          className={cn(
            "rounded-md border px-1.5 py-0.5 font-mono text-[9.5px]",
            chunk.hijacked
              ? "border-danger-400/30 bg-danger-500/10 text-danger-300"
              : "border-white/[0.08] bg-white/[0.04] text-zinc-400",
          )}
        >
          {chunk.vds.score.toFixed(3)}
        </span>
        <Badge
          tone={chunk.hijacked ? "amber" : "muted"}
          className="hidden tracking-normal sm:inline-flex"
        >
          {action}
        </Badge>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-zinc-600 transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                  <ShieldAlert className="h-2.5 w-2.5" /> original chunk
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{chunk.text}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone={chunk.guard.verdict === "unsafe" ? "danger" : "brand"}>
                    lg · {chunk.guard.verdict}
                  </Badge>
                  <span className="font-mono text-[9.5px] text-zinc-600">
                    guard {ms(chunk.stage_ms.guard)} · vds {ms(chunk.stage_ms.vds)} · sanitize{" "}
                    {ms(chunk.stage_ms.sanitize)}
                  </span>
                </div>
                {chunk.injections.length > 0 && (
                  <div className="mt-2.5 space-y-1 rounded-lg border border-danger-400/15 bg-danger-500/[0.05] p-2">
                    {chunk.injections.map((injection) => (
                      <p key={injection.trigger} className="font-mono text-[9.5px] leading-relaxed text-danger-300/80">
                        canary · {injection.canary} · {injection.attack_type}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    <Gauge className="h-2.5 w-2.5" /> vds components
                  </div>
                  <ComponentBar
                    label="instruction displacement"
                    value={chunk.vds.displacement_norm}
                    hint="Signed displacement of the worst sentence along the instruction axis, normalised to the calibrated 0.10–0.42 window."
                  />
                  <ComponentBar
                    label="anchor affinity"
                    value={chunk.vds.affinity}
                    hint="Cosine similarity between the suspect sentence and the injection-anchor centroid."
                  />
                  <ComponentBar
                    label="content affinity"
                    value={chunk.vds.neutrality}
                    hint="Cosine similarity to the neutral declarative centroid. Negative values mean the sentence reads as factual prose."
                  />
                  <ComponentBar
                    label="lexical directive"
                    value={chunk.vds.lexical}
                    hint="Marker-based directive density prior, evaluated over the whole chunk."
                  />
                  <div className="flex items-center justify-between pt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                    <span>query drift (diagnostic)</span>
                    <span className="text-zinc-500">{chunk.vds.query_drift.toFixed(3)}</span>
                  </div>
                  {chunk.vds.lexical_hits.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {chunk.vds.lexical_hits.map((hit) => (
                        <span
                          key={hit}
                          className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-zinc-400"
                        >
                          {hit}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    <Scissors className="h-2.5 w-2.5" /> sanitized output
                  </div>
                  <p className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 p-2 text-[10.5px] italic leading-relaxed text-zinc-500">
                    suspect sentence · "{chunk.vds.suspect_sentence}"
                  </p>
                  {chunk.removed.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {chunk.removed.map((sentence, i) => (
                        <div key={i} className="rounded-lg border border-danger-400/15 bg-danger-500/[0.05] p-2">
                          <p className="text-[10.5px] leading-relaxed text-danger-300/70 line-through decoration-danger-400/50">
                            {sentence.text}
                          </p>
                          <p className="mt-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">
                            <CornerDownRight className="h-2.5 w-2.5" />
                            {sentence.rule} · {sentence.reason}
                          </p>
                        </div>
                      ))}
                      <p className="flex items-start gap-1.5 rounded-lg border border-brand-400/15 bg-brand-500/[0.05] p-2 text-[10.5px] leading-relaxed text-zinc-300">
                        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-brand-400" />
                        {chunk.sanitized_text}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 p-2 text-[10.5px] leading-relaxed text-zinc-500">
                      untouched — chunk passed the VDS screen
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TraceViewer({ result }: { result: QueryResult }) {
  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <span className="text-xs font-semibold tracking-tight text-zinc-100">Security trace</span>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
          {result.chunks.length} chunks · run {result.run_id}
        </span>
      </div>
      <div className="space-y-2 p-4">
        {result.chunks.map((chunk, index) => (
          <TraceRow key={chunk.chunk_id} chunk={chunk} index={index} />
        ))}
      </div>
    </div>
  );
}
