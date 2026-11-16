import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { runQuery } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { DocumentSidebar } from "@/components/dashboard/DocumentSidebar";
import { QueryBar } from "@/components/dashboard/QueryBar";
import { PipelineFlow } from "@/components/dashboard/PipelineFlow";
import { StatsPanel } from "@/components/dashboard/StatsPanel";

export function GuardView() {
  const { query, promptId, result, setResult } = useStore();
  const [revealed, setRevealed] = useState(0);

  const mutation = useMutation({
    mutationFn: runQuery,
    onSuccess: (next) => setResult(next),
  });

  const run = () => {
    const trimmed = query.trim();
    if (!trimmed || mutation.isPending) return;
    setResult(null);
    setRevealed(0);
    mutation.mutate({
      query: trimmed,
      prompt_id: promptId || null,
      top_k: 3,
      vds_threshold: 0.25,
    });
  };

  const pending = mutation.isPending;

  // Reveal stages one at a time so the flow reads as a sequence, not a dump.
  useEffect(() => {
    if (!result) {
      setRevealed(pending ? 1 : 0);
      return;
    }
    const timers = [2, 3, 4, 5].map((step, index) =>
      window.setTimeout(() => setRevealed(step), 320 * (index + 1)),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [result, pending]);

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-6 lg:px-6">
      <div className="grid gap-5 lg:grid-cols-[208px_minmax(0,1fr)] lg:items-start xl:grid-cols-[232px_minmax(0,1fr)_318px]">
        <DocumentSidebar result={result} />

        <div className="space-y-5">
          <QueryBar onRun={run} pending={pending} />

          <section>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="text-[12.5px] font-semibold tracking-tight text-zinc-200">
                Query pipeline
              </h2>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
                retrieve → score → sanitize → answer
              </p>
            </div>

            {mutation.isError && (
              <div className="card mb-3 border-danger-400/20 px-3 py-2.5 text-[12px] text-danger-300">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "The request failed. Check that the API is running."}
              </div>
            )}

            <PipelineFlow
              result={result}
              revealed={revealed}
              pending={pending}
              draft={query}
            />
          </section>
        </div>

        <div className="lg:col-span-2 xl:col-span-1">
          <StatsPanel result={result} />
        </div>
      </div>
    </main>
  );
}
