import { motion } from "framer-motion";
import type { ChunkTrace } from "@/lib/types";
import { riskColor, riskLabel, riskOf } from "@/lib/guard";
import { cn } from "@/lib/utils";

export function VdsAnalysis({
  chunks,
  threshold,
}: {
  chunks: ChunkTrace[];
  threshold: number;
}) {
  return (
    <div className="space-y-2.5">
      {chunks.map((chunk) => {
        const risk = riskOf(chunk, threshold);
        const color = riskColor[risk];
        const width = Math.max(2, Math.min(100, chunk.vds.score * 100));

        return (
          <div key={chunk.chunk_id}>
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-zinc-400">
                {chunk.document_title}
                <span className="ml-1.5 font-mono text-[9.5px] text-zinc-600">
                  #{chunk.index}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]",
                  risk === "safe" && "text-brand-300/90",
                  risk === "suspicious" && "text-amber-300/90",
                  risk === "hijacked" && "text-danger-300",
                )}
                style={{ backgroundColor: `${color}14` }}
              >
                {riskLabel[risk]}
              </span>
              <span
                className="w-9 shrink-0 text-right font-mono text-[11px] tabular"
                style={{ color }}
              >
                {chunk.vds.score.toFixed(2)}
              </span>
            </div>

            <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              {/* threshold marker */}
              <span
                aria-hidden
                className="absolute top-0 h-full w-px bg-white/25"
                style={{ left: `${Math.min(99, threshold * 100)}%` }}
              />
            </div>
          </div>
        );
      })}

      <p className="pt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-600">
        marker · threshold {threshold.toFixed(2)}
      </p>
    </div>
  );
}
