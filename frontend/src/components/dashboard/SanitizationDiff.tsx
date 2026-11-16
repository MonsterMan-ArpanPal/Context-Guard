import { ArrowDown, Check, Scissors } from "lucide-react";
import type { ChunkTrace } from "@/lib/types";
import { splitRemovals } from "@/lib/guard";

function DiffText({ chunk }: { chunk: ChunkTrace }) {
  const segments = splitRemovals(chunk.text, chunk.removed);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2.5">
        <p className="eyebrow">original</p>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-zinc-400">
          {segments.map((segment, index) =>
            segment.removed ? (
              <span key={index} className="text-danger-300/80 line-through decoration-danger-400/60">
                {segment.text}
              </span>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </p>
      </div>

      <div className="flex items-center gap-1.5 pl-1">
        <ArrowDown className="h-3 w-3 text-zinc-600" />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
          {chunk.removed.length} sentence{chunk.removed.length === 1 ? "" : "s"} removed ·{" "}
          {Math.round(chunk.preserved_ratio * 100)}% kept
        </span>
      </div>

      <div className="rounded-lg border border-brand-400/15 bg-brand-500/[0.04] p-2.5">
        <p className="eyebrow text-brand-300/70">clean context</p>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-zinc-300">
          {chunk.sanitized_text}
        </p>
      </div>
    </div>
  );
}

export function SanitizationDiff({ chunks }: { chunks: ChunkTrace[] }) {
  const flagged = chunks.filter((chunk) => chunk.hijacked || chunk.removed.length > 0);
  const clean = chunks.filter((chunk) => !chunk.hijacked && chunk.removed.length === 0);

  return (
    <div className="space-y-3">
      {flagged.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5">
          <Check className="h-3.5 w-3.5 text-brand-300" />
          <span className="text-[11.5px] text-zinc-400">
            Nothing to remove — every retrieved passage was declarative.
          </span>
        </div>
      )}

      {flagged.map((chunk) => (
        <div key={chunk.chunk_id}>
          <div className="mb-2 flex items-center gap-2">
            <Scissors className="h-3 w-3 text-danger-300/80" />
            <span className="truncate text-[11.5px] text-zinc-300">{chunk.document_title}</span>
            <span className="font-mono text-[9.5px] text-zinc-600">#{chunk.index}</span>
          </div>
          <DiffText chunk={chunk} />
        </div>
      ))}

      {clean.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.05] pt-2">
          {clean.map((chunk) => (
            <span
              key={chunk.chunk_id}
              className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-zinc-600"
            >
              <Check className="h-3 w-3 text-brand-400/60" />
              {chunk.document_title} #{chunk.index} · passed through
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
