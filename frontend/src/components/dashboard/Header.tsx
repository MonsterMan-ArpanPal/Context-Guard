import { useQuery } from "@tanstack/react-query";
import { ShieldHalf } from "lucide-react";
import { fetchHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Header() {
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: 0 });

  const live = health?.real_mode ?? false;
  const status = health ? (live ? "live" : "demo") : "connecting";

  return (
    <header className="border-b border-white/[0.06]">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-3 px-6">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-brand-400/20 bg-brand-500/10">
          <ShieldHalf className="h-4 w-4 text-brand-300" strokeWidth={2.2} />
        </span>

        <div className="min-w-0">
          <h1 className="text-[13.5px] font-semibold tracking-tight text-zinc-100">
            ContextGuard
          </h1>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-zinc-600">
            inference-time RAG defence
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {health && (
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600 sm:inline">
              {health.chunks} chunks · {health.documents} docs
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] px-2.5 py-1">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                live ? "bg-brand-400" : health ? "bg-amber-400" : "bg-zinc-600",
              )}
            />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-400">
              {status}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
