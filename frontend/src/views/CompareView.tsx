import { useEffect } from "react";
import { ArrowRight, Binary, Radar, ShieldHalf } from "lucide-react";
import { ContextGuardPanel, LlamaGuardPanel } from "@/components/compare/ComparePanels";
import { PipelineDiagram } from "@/components/compare/PipelineDiagram";
import { Badge } from "@/components/ui/badge";
import { WinnerBanner } from "@/components/compare/WinnerBanner";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";

function EmptyState() {
  return (
    <div className="glass flex h-full min-h-[520px] flex-col items-center justify-center gap-5 p-10 text-center">
      <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <span className="absolute inset-0 animate-pulse-rounded-2xl border border-brand-400/30" />
        <ShieldHalf className="h-7 w-7 text-brand-300/80" />
      </div>
      <div className="max-w-md">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-200">Awaiting a query</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Pick a poisoned prompt on the left and run the comparison. Both systems see the same
          retrieved chunks; only the defence differs.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge tone="danger">
          <Binary className="h-4 w-4" /> llama guard · drops chunks
        </Badge>
        <Badge tone="brand">
          <Radar className="h-4 w-4" /> contextguard · removes sentences
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
        query <ArrowRight className="h-4 w-4" /> vector db <ArrowRight className="h-4 w-4" /> vds
        <ArrowRight className="h-4 w-4" /> sanitize <ArrowRight className="h-4 w-4" /> llm
      </div>
    </div>
  );
}

function MetricsStep() {
  const { result, setView, stepData } = useStore();
  if (!result) return null;

  const asrBefore = typeof stepData.asrBefore === "number" ? stepData.asrBefore : null;
  const asrAfter = typeof stepData.asrAfter === "number" ? stepData.asrAfter : null;
  const utilityBefore = typeof stepData.utilityBefore === "number" ? stepData.utilityBefore : null;
  const utilityAfter = typeof stepData.utilityAfter === "number" ? stepData.utilityAfter : null;

  const llamaLatency = result.llama_guard?.latency_ms;
  const cgLatency = result.contextguard?.latency_ms;

  return (
    <div className="min-h-[600px]">
      <div className="glass p-6">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-200">Performance metrics</h3>
        <p className="mt-1 text-xs text-zinc-500">Measured on this run of the engine.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="eyebrow">attack success rate</p>
            <p className="mt-2 text-2xl font-semibold text-brand-300">
              {asrBefore !== null && asrAfter !== null
                ? `${asrBefore.toFixed(1)}% → ${asrAfter.toFixed(1)}%`
                : result.llama_guard?.attack_success || result.contextguard?.attack_success
                  ? "attack succeeded"
                  : "0% · no attack succeeded"}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="eyebrow">utility preservation</p>
            <p className="mt-2 text-2xl font-semibold text-brand-300">
              {utilityBefore !== null && utilityAfter !== null
                ? `${utilityBefore.toFixed(0)}% → ${utilityAfter.toFixed(0)}%`
                : `${((result.contextguard?.preserved_ratio ?? 1) * 100).toFixed(0)}% context kept`}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="eyebrow">llama guard latency</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">
              {typeof llamaLatency === "number" ? `${llamaLatency.toFixed(1)} ms` : "n/a"}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="eyebrow">contextguard latency</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-100">
              {typeof cgLatency === "number" ? `${cgLatency.toFixed(1)} ms` : "n/a"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
          <span>total {result.total_ms.toFixed(0)} ms</span>
          <span>· mode {result.engine.mode}</span>
          <span>· guard {result.engine.guard}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setView("dashboard")}>
          Open dashboard
        </Button>
        <Button variant="ghost" onClick={() => useStore.getState().setResult(null)}>
          Run another query
        </Button>
      </div>
    </div>
  );
}

export function CompareView() {
  const { query, setQuery, result, wizardStep, setWizardStep, setStepData } = useStore();

  // Reset to the input step whenever the result is cleared.
  useEffect(() => {
    if (!result && wizardStep !== "input") setWizardStep("input");
  }, [result, wizardStep, setWizardStep]);

  // A fresh result always plays the processing animation before the comparison page.
  useEffect(() => {
    if (result && wizardStep === "input") setWizardStep("processing");
  }, [result, wizardStep, setWizardStep]);

  // Advance from processing to comparison, recording the score for later steps.
  useEffect(() => {
    if (wizardStep !== "processing" || !result) return;
    const timer = window.setTimeout(() => {
      setStepData("comparisonScore", result.winner.system);
      setWizardStep("comparison");
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [wizardStep, result, setStepData, setWizardStep]);

  return (
    <div>
      {wizardStep === "input" && (
        <div className="glass mx-auto max-w-2xl p-8">
          <div className="text-center">
            <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <ShieldHalf className="h-6 w-6 text-brand-300/80" />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-200">
              Run a comparison
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Both defences see the same retrieved chunks. Llama Guard drops whole chunks;
              ContextGuard removes only the injected sentences.
            </p>
          </div>

          <div className="mt-6">
            <label className="eyebrow">query</label>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={4}
              maxLength={2000}
              spellCheck={false}
              placeholder="Ask something answerable from the corpus…"
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-brand-400/40 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            />
            <p className="mt-2 text-[11px] text-zinc-600">
              Use the attack console on the left to pick a poisoned prompt, or run the query above
              as-is.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <Badge tone="danger">
              <Binary className="h-3 w-3" /> llama guard
            </Badge>
            <Badge tone="brand">
              <Radar className="h-3 w-3" /> contextguard
            </Badge>
          </div>
        </div>
      )}

      {wizardStep === "processing" && (
        <div className="glass flex min-h-[520px] flex-col items-center justify-center gap-5 p-10 text-center">
          <span className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-brand-400" />
          <div>
            <p className="text-sm font-semibold tracking-tight text-zinc-200">
              Running the pipeline
            </p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
              retrieve → VDS scoring → micro-sanitize → Llama Guard classify → compare
            </p>
          </div>
        </div>
      )}

      {wizardStep === "comparison" && result && (
        <div className="space-y-6">
          <WinnerBanner result={result} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <LlamaGuardPanel result={result} />
            <ContextGuardPanel result={result} />
          </div>

          <PipelineDiagram result={result} />

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setWizardStep("metrics")}>View metrics</Button>
            <Button variant="outline" onClick={() => useStore.getState().setResult(null)}>
              Run another query
            </Button>
          </div>
        </div>
      )}

      {wizardStep === "metrics" && <MetricsStep />}

      {!result && wizardStep !== "input" && <EmptyState />}
    </div>
  );
}