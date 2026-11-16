import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, Play, Sparkles, Target } from "lucide-react";
import { Badge } from "../ui/badge";
import { fetchPrompts, runQuery } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { Slider } from "../ui/slider";
import { Tooltip } from "../ui/tooltip";

export function QueryConsole() {
  const {
    promptId,
    query,
    threshold,
    topK,
    setPrompt,
    setQuery,
    setThreshold,
    setTopK,
    setResult,
    setWizardStep,
    stepData,
    setStepData,
  } = useStore();
  const queryClient = useQueryClient();

  const { data: prompts } = useQuery({ queryKey: ["prompts"], queryFn: fetchPrompts });
  const selected = prompts?.find((prompt) => prompt.id === promptId);

  const mutation = useMutation({
    mutationFn: runQuery,
    onSuccess: (result) => {
      setResult(result);
      setWizardStep("processing");
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
  });

  const submit = () => {
    if (!query.trim() || mutation.isPending) return;
    mutation.mutate({
      query: query.trim(),
      prompt_id: promptId || null,
      top_k: topK,
      vds_threshold: threshold,
    });
  };

  const benign = prompts?.filter((prompt) => prompt.category === "benign") ?? [];
  const attacks = prompts?.filter((prompt) => prompt.category === "attack") ?? [];

  return (
    <div className="glass overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-brand-300" />
          <span className="text-xs font-semibold tracking-tight text-zinc-100">Attack console</span>
        </div>
        <Badge>cascade</Badge>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <label className="eyebrow">sample prompt</label>
          <div className="mt-2">
            <Select
              value={promptId || "custom"}
              onValueChange={(value) => {
                if (value === "custom") {
                  setPrompt("", query);
                  return;
                }
                const prompt = prompts?.find((item) => item.id === value);
                setPrompt(value, prompt?.query ?? query);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a sample prompt" />
              </SelectTrigger>
              <SelectContent>
                <SelectLabel>benign queries</SelectLabel>
                {benign.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.label}
                  </SelectItem>
                ))}
                <SelectLabel>poisoned documents</SelectLabel>
                {attacks.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.label}
                  </SelectItem>
                ))}
                <SelectLabel>custom</SelectLabel>
                <SelectItem value="custom">Custom query (no grading)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <div className="flex items-baseline justify-between">
            <label className="eyebrow">query</label>
            <span className="font-mono text-[10px] text-zinc-600">{query.length}/2000</span>
          </div>
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit();
            }}
            rows={4}
            maxLength={2000}
            spellCheck={false}
            placeholder="Ask something answerable from the corpus…"
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-brand-400/40 focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          />

          <Button
            size="lg"
            className="mt-3 w-full"
            onClick={submit}
            disabled={!query.trim() || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {mutation.isPending ? "Running…" : "Run comparison"}
          </Button>

          {mutation.isError && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-danger-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {mutation.error instanceof Error ? mutation.error.message : "Query failed"}
            </p>
          )}

          <p className="mt-2 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
            <Sparkles className="h-3 w-3" /> ⌘ + enter to run
          </p>
        </div>
      </div>

      {selected && (
        <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={selected.category === "attack" ? "danger" : "brand"}>
              {selected.category === "attack" ? "attack" : "benign"}
            </Badge>
            <Badge tone="muted" className="lowercase tracking-normal">
              {selected.attack_type.replaceAll("_", " ")}
            </Badge>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-100">
              expected ·{" "}
            </span>
            {selected.expected_answer}
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
        <div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="eyebrow">vds threshold</span>
              <Tooltip
                content="Chunks scoring at or above this value are flagged as hijacked and sanitized. Lower catches more attacks; higher preserves more raw text."
              >
                <span className="cursor-help text-[10px] text-zinc-600">?</span>
              </Tooltip>
            </span>
            <span className="font-mono text-xs text-brand-300">{threshold.toFixed(2)}</span>
          </div>

          <div className="h-px bg-white/[0.06]" />

          <div>
            <div className="flex items-center justify-between">
              <span className="eyebrow">retrieved chunks · top-k</span>
              <span className="font-mono text-xs text-brand-300">{topK}</span>
            </div>
            <Slider
              className="mt-3"
              min={1}
              max={6}
              step={1}
              value={[topK]}
              onValueChange={(value) => setTopK(value[0])}
            />
          </div>
        </div>
      </div>
    </div>
  );
}