import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Library, RotateCcw, ShieldHalf, Swords, Radar } from "lucide-react";
import { fetchHealth, resetDemo } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useStore, type View } from "@/store/useStore";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const TABS: { id: View; label: string; icon: typeof Swords }[] = [
  { id: "library", label: "Library", icon: Library },
  { id: "compare", label: "Compare", icon: Swords },
  { id: "dashboard", label: "Dashboard", icon: Activity },
];

export function Nav() {
  const { view, setView } = useStore();
  const queryClient = useQueryClient();
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: 0 });

  const reset = useMutation({
    mutationFn: resetDemo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      useStore.getState().setResult(null);
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-6 px-5 lg:px-8">
        <button
          onClick={() => setView("compare")}
          className="group flex items-center gap-3 text-left"
          aria-label="ContextGuard home"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400/90 to-emerald-600/80 shadow-glow">
            <ShieldHalf className="h-[18px] w-[18px] text-emerald-950" strokeWidth={2.4} />
            <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" />
          </span>
          <span className="hidden sm:block">
            <span className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-white">
                ContextGuard
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-brand-400/80">
                v0.1
              </span>
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              inference-time RAG defence
            </span>
          </span>
        </button>

        <nav className="ml-2 flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "text-white" : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg border border-white/10 bg-white/[0.08]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="relative h-3.5 w-3.5" />
                <span className="relative hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 md:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
              {health ? (health.real_mode ? "live · groq" : "demo · offline") : "connecting"}
            </span>
          </div>
          <Badge tone="muted" className="hidden lg:inline-flex">
            <Radar className="h-3 w-3" />
            {health ? `${health.chunks} chunks` : "…"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reset.mutate()}
            disabled={reset.isPending}
            title="Reset metrics and tuning"
          >
            <RotateCcw className={cn("h-3.5 w-3.5", reset.isPending && "animate-spin")} />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
