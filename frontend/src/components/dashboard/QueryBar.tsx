import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CornerDownLeft, Loader2, ShieldCheck } from "lucide-react";
import { fetchPrompts } from "@/lib/api";
import { useStore } from "@/store/useStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function QueryBar({ onRun, pending }: { onRun: () => void; pending: boolean }) {
  const { query, setQuery, promptId, setPrompt } = useStore();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: prompts } = useQuery({
    queryKey: ["prompts"],
    queryFn: fetchPrompts,
    retry: 0,
    staleTime: Infinity,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const attacks = prompts?.filter((prompt) => prompt.category === "attack") ?? [];
  const benign = prompts?.filter((prompt) => prompt.category === "benign") ?? [];
  const isCustom = promptId == null || promptId === "custom";

  return (
    <section className="card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor="query" className="eyebrow">
            query
          </label>
          <textarea
            id="query"
            ref={inputRef}
            rows={2}
            value={query}
            maxLength={2000}
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onRun();
              }
            }}
            placeholder={isCustom
              ? "Type your custom query…"
              : "Ask something answerable from the corpus…"
            }
            className="mt-1.5 w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:w-[248px]">
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
            disabled={isCustom}
          >
            <SelectTrigger>
              <SelectValue placeholder={prompts ? "Sample prompts" : "Loading prompts…"} />
            </SelectTrigger>
            <SelectContent>
              <SelectLabel>clean queries</SelectLabel>
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
              <SelectItem value="custom" disabled={isCustom}>
                {isCustom ? "Custom query" : "Write my own query"}
              </SelectItem>
            </SelectContent>
          </Select>

          {isCustom && (
            <div className="mt-2 p-2 bg-white/[0.02] rounded border border-white/[0.06]">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-500">
                Custom query mode
              </span>
              <span className="ml-2 font-mono text-[9px] text-zinc-400">
                Enter your own query above · Enter to run
              </span>
            </div>
          )}

          <Button onClick={onRun} disabled={!query.trim() || pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {pending ? "Inspecting…" : "Run ContextGuard"}
            {!pending && <ArrowRight className="h-3.5 w-3.5 opacity-60" />}
          </Button>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2 border-t border-white/[0.05] pt-2.5">
        <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
          <CornerDownLeft className="h-3 w-3" />
          enter to run · shift + enter for a new line
        </span>
      </div>
    </section>
  );
}