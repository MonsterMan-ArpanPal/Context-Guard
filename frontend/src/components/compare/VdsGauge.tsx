import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function VdsGauge({
  score,
  threshold,
  size = 132,
  className,
}: {
  score: number;
  threshold: number;
  size?: number;
  className?: string;
}) {
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75;
  const value = Math.max(0, Math.min(score, 1));
  const flagged = value >= threshold;

  const stroke = flagged ? "#fb7185" : "#34d399";

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={8}
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: arc * (1 - value) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${stroke}66)` }}
        />
        {[threshold].map((mark) => {
          const angle = Math.PI * 1.5 * mark - Math.PI / 2;
          const inner = radius - 9;
          const outer = radius + 9;
          return (
            <line
              key="threshold"
              x1={size / 2 + Math.cos(angle) * inner}
              y1={size / 2 + Math.sin(angle) * inner}
              x2={size / 2 + Math.cos(angle) * outer}
              y2={size / 2 + Math.sin(angle) * outer}
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">peak vds</span>
        <span className={cn("mt-0.5 font-mono text-2xl", flagged ? "text-danger-300" : "text-brand-300")}>
          {value.toFixed(3)}
        </span>
        <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
          thr {threshold.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
