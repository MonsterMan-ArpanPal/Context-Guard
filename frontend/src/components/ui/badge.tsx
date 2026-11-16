import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "danger" | "amber" | "cyan" | "muted";

const tones: Record<Tone, string> = {
  neutral: "border-white/10 bg-white/[0.06] text-zinc-300",
  brand: "border-brand-400/25 bg-brand-500/10 text-brand-300",
  danger: "border-danger-400/25 bg-danger-500/10 text-danger-300",
  amber: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
  muted: "border-white/5 bg-white/[0.03] text-zinc-500",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
