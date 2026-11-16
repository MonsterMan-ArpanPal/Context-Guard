import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  Clock,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { ChunkTrace, QueryResult } from "@/lib/types";
import { cn, ms, pct } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Tooltip } from "../ui/tooltip";
import { VdsGauge } from "./VdsGauge";

function UtilityMeter({ value, tone }: { value: number; tone: "brand" | "danger" }) {
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">utility</span>
        <span className={cn("font-mono text-[11px]", tone === "brand" ? "text-brand-300" : "text-danger-300")}>
          {pct(value)}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className={cn("h-full rounded-full", tone === "brand" ? "bg-brand-400" : "bg-danger-400")}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function PanelShell({
  tone,
  icon,
  title,
  subtitle,
  verdict,
  children,
}: {
  tone: "danger" | "brand";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  verdict: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-white/[0.025] backdrop-blur-xl",
        tone === "brand" ? "border-brand-400/20" : "border-danger-400/20",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px",
          tone === "brand"
            ? "bg-gradient-to-r from-transparent via-brand-400/70 to-transparent"
            : "bg-gradient-to-r from-transparent via-danger-400/70 to-transparent",
        )}
      />
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg border",
            tone === "brand"
              ? "border-brand-400/25 bg-brand-500/10 text-brand-300"
              : "border-danger-400/25 bg-danger-500/10 text-danger-300",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-zinc-100">{title}</h3>
            {verdict}
          </div>
          <p className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">{children}</div>
    </div>
  );
}

function ChunkAction({
  chunk,
  tone,
  status,
}: {
  chunk: ChunkTrace;
  tone: "danger" | "brand";
  status: string;
}) {
  const dropped = tone === "danger" && chunk.guard.verdict === "unsafe";
  const sanitized = tone === "brand" && chunk.hijacked;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
      <div className="flex items-center gap-2">
        <span className="truncate text-[11px] font-medium text-zinc-300">{chunk.document_title}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {tone === "brand" ? (
            <Tooltip content="Vector Displacement Score — 0.60 · instruction-axis displacement of the worst sentence + 0.40 · lexical directive density">
              <span
                className={cn(
                  "cursor-help rounded-md border px-1.5 py-0.5 font-mono text-[9.5px]",
                  chunk.hijacked
                    ? "border-danger-400/30 bg-danger-500/10 text-danger-300"
                    : "border-brand-400/25 bg-brand-500/10 text-brand-300",
                )}
              >
                vds {chunk.vds.score.toFixed(3)}
              </span>
            </Tooltip>
          ) : (
            <span
              className={cn(
                "rounded-md border px-1.5 py-0.5 font-mono text-[9.5px]",
                chunk.guard.verdict === "unsafe"
                  ? "border-danger-400/30 bg-danger-500/10 text-danger-300"
                  : "border-brand-400/25 bg-brand-500/10 text-brand-300",
              )}
            >
              {chunk.guard.verdict}
            </span>
          )}
          <Badge tone={dropped ? "danger" : sanitized ? "amber" : "muted"} className="tracking-normal">
            {status}
          </Badge>
        </span>
      </div>

      {dropped ? (
        <p className="relative mt-2 max-h-16 overflow-hidden text-[11px] leading-relaxed text-zinc-500">
          <span className="line-through decoration-danger-400/60">{chunk.text}</span>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/60 to-transparent" />
        </p>
      ) : sanitized ? (
        <div className="mt-2 space-y-1.5">
          {chunk.removed.map((sentence, index) => (
            <div key={index} className="relative">
              <motion.p
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.08 }}
                className="text-[11px] leading-relaxed text-danger-300/70"
              >
                <span className="line-through decoration-danger-400/70">{sentence.text}</span>
              </motion.p>
              <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                removed · {sentence.reason}
              </span>
            </div>
          ))}
          {chunk.sanitized_text && (
            <p className="text-[11px] leading-relaxed text-zinc-400">{chunk.sanitized_text}</p>
          )}
        </div>
      ) : (
        <p className="mt-2 max-h-16 overflow-hidden text-[11px] leading-relaxed text-zinc-500">
          {chunk.text}
        </p>
      )}
    </div>
  );
}

function ResponseBlock({
  response,
  tone,
  refused,
  attackSuccess,
}: {
  response: string;
  tone: "danger" | "brand";
  refused: boolean;
  attackSuccess: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        attackSuccess
          ? "border-danger-400/30 bg-danger-500/[0.08]"
          : refused
            ? "border-amber-400/25 bg-amber-500/[0.06]"
            : "border-white/[0.07] bg-white/[0.02]",
      )}
    >
      <div className="flex items-center gap-1.5">
        {attackSuccess ? (
          <AlertTriangle className="h-3 w-3 text-danger-300" />
        ) : refused ? (
          <Ban className="h-3 w-3 text-amber-300" />
        ) : (
          <Sparkles className={cn("h-3 w-3", tone === "brand" ? "text-brand-300" : "text-zinc-500")} />
        )}
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
          model response {attackSuccess && "· hijacked"}
        </span>
      </div>
      <p
        className={cn(
          "mt-2 text-[12.5px] leading-relaxed",
          attackSuccess ? "font-mono text-danger-200" : "text-zinc-300",
        )}
      >
        {response}
      </p>
    </div>
  );
}

export function LlamaGuardPanel({ result }: { result: QueryResult }) {
  const path = result.llama_guard;
  const unsafe = path.chunks_flagged > 0;

  return (
    <PanelShell
      tone="danger"
      icon={<ShieldAlert className="h-4 w-4" />}
      title="Llama Guard 3"
      subtitle={result.engine.guard}
      verdict={
        <Badge tone={unsafe ? "danger" : "brand"}>
          {unsafe ? `${path.chunks_dropped} dropped` : "all safe"}
        </Badge>
      }
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">action</span>
          <span className={cn("font-mono text-lg", path.chunks_dropped ? "text-danger-300" : "text-brand-300")}>
            {path.chunks_dropped ? "DROP" : "PASS"}
          </span>
        </div>
        <p className="flex-1 text-[11px] leading-relaxed text-zinc-500">
          Binary classification. Any chunk marked unsafe is discarded whole — the factual sentences it
          carried never reach the model.
        </p>
      </div>

      <div className="space-y-2">
        {result.chunks.map((chunk) => (
          <ChunkAction
            key={`lg-${chunk.chunk_id}`}
            chunk={chunk}
            tone="danger"
            status={chunk.guard.verdict === "unsafe" ? "dropped" : "passed"}
          />
        ))}
      </div>

      <ResponseBlock
        response={path.response}
        tone="danger"
        refused={path.refused}
        attackSuccess={path.attack_success}
      />

      <div className="mt-auto flex items-end gap-4 border-t border-white/[0.06] pt-3.5">
        <div>
          <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
            <Clock className="h-2.5 w-2.5" /> latency
          </div>
          <div className="mt-0.5 font-mono text-sm text-zinc-200">{ms(path.latency_ms)}</div>
        </div>
        <div className="flex-1">
          <UtilityMeter value={path.utility_score} tone="danger" />
        </div>
      </div>
    </PanelShell>
  );
}

export function ContextGuardPanel({ result }: { result: QueryResult }) {
  const path = result.contextguard;
  const peak = result.chunks.reduce((max, chunk) => Math.max(max, chunk.vds.score), 0);
  const removed = result.chunks.reduce((total, chunk) => total + chunk.removed.length, 0);

  return (
    <PanelShell
      tone="brand"
      icon={<ShieldCheck className="h-4 w-4" />}
      title="ContextGuard"
      subtitle={`vds + ${result.engine.sanitizer}`}
      verdict={
        <Badge tone={path.chunks_flagged ? "amber" : "brand"}>
          {path.chunks_flagged ? `${path.chunks_flagged} sanitized` : "clean"}
        </Badge>
      }
    >
      <div className="flex items-center gap-4">
        <VdsGauge score={peak} threshold={result.threshold} size={118} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Scissors className="h-3 w-3 text-brand-300" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              {removed} sentence{removed === 1 ? "" : "s"} excised
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Only imperative and role-hijacking sentences are removed. Declarative facts survive, so
            the answer stays available.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.chunks
              .filter((chunk) => chunk.hijacked)
              .slice(0, 3)
              .map((chunk) => (
                <Badge key={chunk.chunk_id} tone="danger" className="font-mono lowercase tracking-normal">
                  {chunk.vds.lexical_hits[0] ?? "semantic"}
                </Badge>
              ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {result.chunks.map((chunk) => (
          <ChunkAction
            key={`cg-${chunk.chunk_id}`}
            chunk={chunk}
            tone="brand"
            status={chunk.hijacked ? "sanitized" : "clean"}
          />
        ))}
      </div>

      <ResponseBlock
        response={path.response}
        tone="brand"
        refused={path.refused}
        attackSuccess={path.attack_success}
      />

      <div className="mt-auto flex items-end gap-4 border-t border-white/[0.06] pt-3.5">
        <div>
          <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
            <Clock className="h-2.5 w-2.5" /> latency
          </div>
          <div className="mt-0.5 font-mono text-sm text-zinc-200">{ms(path.latency_ms)}</div>
        </div>
        <div className="flex-1">
          <UtilityMeter value={path.utility_score} tone="brand" />
        </div>
      </div>

      {path.preserved_ratio !== undefined && path.preserved_ratio < 1 && (
        <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-zinc-600">
          <Check className="h-2.5 w-2.5 text-brand-400" />
          {pct(path.preserved_ratio)} of source sentences preserved
          <ArrowRight className="h-2.5 w-2.5" />
        </div>
      )}
      {path.refused && !path.utility_preserved && (
        <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-amber-300/80">
          <X className="h-2.5 w-2.5" /> no supporting context survived
        </div>
      )}
    </PanelShell>
  );
}
