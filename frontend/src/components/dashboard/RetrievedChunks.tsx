import { FileText } from "lucide-react";
import type { ChunkTrace } from "@/lib/types";
import { useState } from "react";

export function RetrievedChunks({ chunks }: { chunks: ChunkTrace[] }) {
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {chunks.map((chunk) => (
        <div
          key={chunk.chunk_id}
          className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2"
          onClick={() => setExpandedIndex(expandedIndex === chunk.chunk_id ? null : chunk.chunk_id)}
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-300">
            {chunk.text ?
              chunk.text.split(' ').slice(0, 30).join(' ') + (chunk.text.split(' ').length > 30 ? '...' : '')
              : '—'}
          </span>
          <span className="shrink-0 font-mono text-[9.5px] text-zinc-600">#{chunk.index}</span>
          <span className="w-12 shrink-0 text-right font-mono text-[10px] tabular text-zinc-500">
            {chunk.retrieval_score.toFixed(2)}
          </span>
          {expandedIndex === chunk.chunk_id && (
            <span className="absolute left-0 right-0 mt-2 bg-white/[0.9] text-zinc-900 text-[11px] text-center rounded-lg px-3 max-h-0 overflow-hidden transition-height duration-200 ease-out whitespace-pre-wrap" style={{ maxHeight: expandedIndex === chunk.chunk_id ? "40ch" : 0 } }>
              {chunk.text}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
