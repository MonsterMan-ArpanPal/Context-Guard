import { motion } from "framer-motion";
import { Crown, ShieldCheck, ShieldAlert } from "lucide-react";
import type { QueryResult } from "@/lib/types";
import { ms, pct } from "@/lib/utils";
import { Badge } from "../ui/badge";

export function WinnerBanner({ result }: { result: QueryResult }) {
  const winner = result.winner.system;
  const isContextGuard = winner === "contextguard";
  const tie = winner === "tie";

  const accent = tie
    ? "from-amber-400/70 via-amber-300/40 to-transparent"
    : isContextGuard
      ? "from-brand-400/80 via-emerald-300/40 to-transparent"
      : "from-danger-400/80 via-rose-300/40 to-transparent";

  const title = tie
    ? "Draw on this query"
    : isContextGuard
      ? "ContextGuard wins"
      : "Llama Guard wins";

  const titleClass = tie ? "text-amber-200" : isContextGuard ? "text-gradient-brand" : "text-gradient-rose";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl border " +
            (tie
              ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
              : isContextGuard
                ? "border-brand-400/30 bg-brand-500/10 text-brand-300 shadow-glow"
                : "border-danger-400/30 bg-danger-500/10 text-danger-300 shadow-glow-rose")
          }
        >
          {tie ? (
            <Crown className="h-5 w-5" />
          ) : isContextGuard ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <ShieldAlert className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-lg font-semibold tracking-tight ${titleClass}`}>{title}</h2>
            <Badge tone={result.attack ? "danger" : "muted"}>
              {result.attack ? `attack · ${result.attack_type.replaceAll("_", " ")}` : "benign query"}
            </Badge>
          </div>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-zinc-400">{result.winner.reason}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
            <span>
              injected payload reached model ·{" "}
              <span className={result.llama_guard.attack_success ? "text-danger-300" : "text-brand-300"}>
                lg {result.llama_guard.attack_success ? "yes" : "no"}
              </span>{" "}
              <span className={result.contextguard.attack_success ? "text-danger-300" : "text-brand-300"}>
                cg {result.contextguard.attack_success ? "yes" : "no"}
              </span>
            </span>
            <span>
              utility · <span className="text-zinc-300">{pct(result.llama_guard.utility_score)}</span> vs{" "}
              <span className="text-zinc-300">{pct(result.contextguard.utility_score)}</span>
            </span>
            <span>
              latency · <span className="text-zinc-300">{ms(result.llama_guard.latency_ms)}</span> vs{" "}
              <span className="text-zinc-300">{ms(result.contextguard.latency_ms)}</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
