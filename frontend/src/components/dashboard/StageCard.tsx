import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StageStatus = "idle" | "active" | "done";

export function StageCard({
  step,
  title,
  summary,
  status,
  last,
  children,
}: {
  step: number;
  title: string;
  summary?: React.ReactNode;
  status: StageStatus;
  last?: boolean;
  children: React.ReactNode;
}) {
  const idle = status === "idle";

  return (
    <li className="relative pl-11">
      {!last && (
        <span
          aria-hidden
          className="absolute bottom-0 left-[13px] top-9 w-px bg-gradient-to-b from-white/[0.09] to-white/[0.02]"
        />
      )}

      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1.5 grid h-7 w-7 place-items-center rounded-full border font-mono text-[10px] transition-colors",
          status === "done" && "border-brand-400/30 bg-brand-500/10 text-brand-300",
          status === "active" && "border-white/25 bg-white/[0.06] text-zinc-100",
          idle && "border-white/[0.08] bg-ink-950 text-zinc-600",
        )}
      >
        {status === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step}
      </span>

      <div
        className={cn(
          "card transition-opacity duration-300",
          idle && "opacity-40",
          status === "active" && "border-white/[0.14]",
        )}
      >
        <div className="flex items-baseline gap-3 px-4 pt-3">
          <h2
            className={cn(
              "text-[12.5px] font-semibold tracking-tight",
              status === "active" ? "text-zinc-100" : "text-zinc-200",
            )}
          >
            {title}
          </h2>
          <div className="ml-auto flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
            {status === "active" && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-400" />
              </span>
            )}
            {summary}
          </div>
        </div>

        <div className="px-4 pb-4 pt-2.5">{children}</div>
      </div>
    </li>
  );
}
