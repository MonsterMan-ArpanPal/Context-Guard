import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { QueryResult } from "@/lib/types";
import { StageCard } from "./StageCard";
import { RetrievedChunks } from "./RetrievedChunks";
import { VdsAnalysis } from "./VdsAnalysis";
import { SanitizationDiff } from "./SanitizationDiff";

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-3 animate-pulse rounded bg-white/[0.05]" />
      ))}
    </div>
  );
}

function useTypewriter(text: string, animate: boolean) {
  const [shown, setShown] = useState(animate ? "" : text);

  useEffect(() => {
    if (!animate) {
      setShown(text);
      return;
    }
    let index = 0;
    const step = Math.max(1, Math.ceil(text.length / 44));
    setShown("");
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + step);
      setShown(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 16);
    return () => window.clearInterval(timer);
  }, [text, animate]);

  return shown;
}

function Answer({ result }: { result: QueryResult }) {
  const answer = result.contextguard.response;
  const shown = useTypewriter(answer, true);

  return (
    <div>
      <p className="text-[13.5px] leading-relaxed text-zinc-200">
        {shown}
        {shown.length < answer.length && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-brand-400/70" />
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.05] pt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-zinc-600">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          {result.engine.llm}
        </span>
        <span>·</span>
        <span>
          {result.contextguard.stages.llm < 1
            ? "<1"
            : result.contextguard.stages.llm.toFixed(0)}{" "}
          ms generation
        </span>
        <span>·</span>
        <span>{result.engine.mode} mode</span>
      </div>
    </div>
  );
}

export function PipelineFlow({
  result,
  revealed,
  pending,
  draft,
}: {
  result: QueryResult | null;
  revealed: number;
  pending: boolean;
  draft: string;
}) {
  const statusOf = (step: number) => {
    if (revealed >= step) return "done" as const;
    if (revealed + 1 === step) return "active" as const;
    return "idle" as const;
  };

  const threshold = result?.threshold ?? 0.25;
  const flagged = result?.contextguard.chunks_flagged ?? 0;
  const sentences =
    result?.contextguard.sentences_removed ??
    result?.chunks.reduce((total, chunk) => total + chunk.removed.length, 0) ??
    0;

  return (
    <ol className="space-y-3">
      <StageCard
        step={1}
        title="Query received"
        status={statusOf(1)}
        summary={result ? `${result.query.length} chars` : pending ? "sending" : undefined}
      >
        <p className="font-mono text-[12px] leading-relaxed text-zinc-300">
          {result?.query || draft || "Type a query above to begin."}
        </p>
      </StageCard>

      <StageCard
        step={2}
        title="Chunks retrieved"
        status={statusOf(2)}
        summary={result ? `${result.chunks.length} chunks · top-k ${result.top_k}` : undefined}
      >
        {result ? (<RetrievedChunks chunks={result.chunks} />) : (<Skeleton rows={3} />)}
      </StageCard>

      <StageCard
        step={3}
        title="VDS analysis"
        status={statusOf(3)}
        summary={
          result ? (
            <span className={flagged > 0 ? "text-amber-300/90" : "text-brand-300/80"}>
              {flagged > 0 ? `${flagged} flagged` : "all clean"}
            </span>
          ) : undefined
        }
      >
        {result && revealed >= 3 ? (
          <VdsAnalysis chunks={result.chunks} threshold={threshold} />
        ) : (
          <Skeleton rows={4} />
        )}
      </StageCard>

      <StageCard
        step={4}
        title="Sanitization"
        status={statusOf(4)}
        summary={result ? `${sentences} sentence${sentences === 1 ? "" : "s"} removed` : undefined}
      >
        {result && revealed >= 4 ? <SanitizationDiff chunks={result.chunks} /> : <Skeleton rows={4} />}
      </StageCard>

      <StageCard
        step={5}
        title="Answer"
        status={statusOf(5)}
        last
        summary={result ? `${result.contextguard.latency_ms.toFixed(0)} ms` : undefined}
      >
        {result && revealed >= 5 ? (
          <Answer result={result} />
        ) : (
          <p className="text-[12px] text-zinc-600">The model answers from the cleaned context only.</p>
        )}
      </StageCard>
    </ol>
  );
}
