import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Clock,
  Gauge,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchMetrics, resetDemo, runBenchmark } from "@/lib/api";
import type { Metrics } from "@/lib/types";
import { cn, ms, pct, shortTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const LG = "#fb7185";
const CG = "#34d399";

const axis = {
  tick: { fill: "#71717a", fontSize: 10, fontFamily: "ui-monospace, monospace" },
  axisLine: { stroke: "rgba(255,255,255,0.08)" },
  tickLine: false,
};

const tooltipStyle = {
  contentStyle: {
    background: "rgba(8,12,20,0.96)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 11,
    color: "#e4e4e7",
    boxShadow: "0 20px 45px -25px rgba(0,0,0,0.9)",
  },
  labelStyle: { color: "#a1a1aa", fontSize: 10, fontFamily: "ui-monospace, monospace" },
  itemStyle: { color: "#e4e4e7" },
};

function ChartCard({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass p-5", className)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-100">{title}</h3>
        {hint && <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Kpi({
  label,
  lg,
  cg,
  format,
  lowerIsBetter,
  icon: Icon,
}: {
  label: string;
  lg: number;
  cg: number;
  format: (value: number) => string;
  lowerIsBetter?: boolean;
  icon: typeof Target;
}) {
  const max = Math.max(lg, cg, 0.0001);
  const cgBetter = lowerIsBetter ? cg < lg : cg > lg;

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
          <Icon className="h-2.5 w-2.5" />
          {label}
        </span>
        <Badge tone={cgBetter ? "brand" : "danger"} className="px-1.5 text-[8.5px]">
          {cgBetter ? "cg" : "lg"}
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        {[
          { name: "Llama Guard", value: lg, color: "bg-danger-400", text: "text-danger-300" },
          { name: "ContextGuard", value: cg, color: "bg-brand-400", text: "text-brand-300" },
        ].map((row) => (
          <div key={row.name}>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-zinc-600">
                {row.name}
              </span>
              <span className={cn("font-mono text-[13px]", row.text)}>{format(row.value)}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className={cn("h-full rounded-full", row.color)}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((row.value / max) * 100, 100)}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyDashboard({ onRun, pending }: { onRun: () => void; pending: boolean }) {
  return (
    <div className="glass flex flex-col items-center gap-4 p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <BarChart3 className="h-6 w-6 text-zinc-500" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-zinc-200">No runs recorded yet</h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-zinc-500">
          Run the full benchmark to evaluate both defences across all nine prompts — benign, overt
          overrides, an exfiltration attempt and an obfuscated payload.
        </p>
      </div>
      <Button onClick={onRun} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-emerald-950" />}
        Run full benchmark
      </Button>
    </div>
  );
}

export function DashboardView() {
  const queryClient = useQueryClient();
  const { data: metrics } = useQuery({ queryKey: ["metrics"], queryFn: fetchMetrics });

  const benchmark = useMutation({
    mutationFn: runBenchmark,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metrics"] }),
  });
  const reset = useMutation({
    mutationFn: resetDemo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metrics"] }),
  });

  const empty = !metrics || metrics.totals.runs === 0;

  if (empty) {
    return (
      <div>
        <div className="mb-7">
          <p className="eyebrow">03 · performance dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[38px]">
            Quantify the trade-off.
          </h1>
        </div>
        <EmptyDashboard onRun={() => benchmark.mutate()} pending={benchmark.isPending} />
      </div>
    );
  }

  const m: Metrics = metrics;
  const comparison = [
    { metric: "ASR", lg: m.llama_guard.asr, cg: m.contextguard.asr },
    { metric: "Utility", lg: m.llama_guard.utility, cg: m.contextguard.utility },
    { metric: "FPR", lg: m.llama_guard.fpr, cg: m.contextguard.fpr },
  ];

  const breakdown = [
    {
      system: "Llama Guard",
      retrieval: m.llama_guard.latency_breakdown.retrieval,
      guard: m.llama_guard.latency_breakdown.guard,
      vds: 0,
      sanitize: 0,
      llm: m.llama_guard.latency_breakdown.llm,
    },
    {
      system: "ContextGuard",
      retrieval: m.contextguard.latency_breakdown.retrieval,
      guard: 0,
      vds: m.contextguard.latency_breakdown.vds,
      sanitize: m.contextguard.latency_breakdown.sanitize,
      llm: m.contextguard.latency_breakdown.llm,
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">03 · performance dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[38px]">
            Quantify the trade-off.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {m.totals.runs} runs · {m.totals.attack_runs} adversarial · {m.totals.benign_runs} benign.
            ContextGuard leads {m.totals.wins.contextguard}–{m.totals.wins.llama_guard}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => reset.mutate()} disabled={reset.isPending}>
            <RotateCcw className={cn("h-3.5 w-3.5", reset.isPending && "animate-spin")} />
            Clear
          </Button>
          <Button size="sm" onClick={() => benchmark.mutate()} disabled={benchmark.isPending}>
            {benchmark.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3 w-3 fill-emerald-950" />
            )}
            {benchmark.isPending ? "Running 9 prompts…" : "Run full benchmark"}
          </Button>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="attack success rate" lg={m.llama_guard.asr} cg={m.contextguard.asr} format={pct} lowerIsBetter icon={Target} />
        <Kpi label="utility preserved" lg={m.llama_guard.utility} cg={m.contextguard.utility} format={pct} icon={ShieldCheck} />
        <Kpi label="false positive rate" lg={m.llama_guard.fpr} cg={m.contextguard.fpr} format={pct} lowerIsBetter icon={Gauge} />
        <Kpi label="mean latency" lg={m.llama_guard.avg_latency_ms} cg={m.contextguard.avg_latency_ms} format={ms} lowerIsBetter icon={Clock} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard title="Security vs. utility" hint="per run · ideal is top-left / top-right">
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                dataKey="security"
                name="security"
                domain={[0, 1]}
                ticks={[0, 0.5, 1]}
                tickFormatter={(value) => pct(value as number)}
                {...axis}
              />
              <YAxis
                type="number"
                dataKey="utility"
                name="utility"
                domain={[0, 1]}
                ticks={[0, 0.5, 1]}
                tickFormatter={(value) => pct(value as number)}
                {...axis}
              />
              <RechartsTooltip {...tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "ui-monospace, monospace" }} />
              <Scatter
                name="Llama Guard"
                data={m.scatter.map((point) => ({ ...point.llama_guard, label: point.label }))}
                fill={LG}
                fillOpacity={0.55}
                stroke={LG}
              />
              <Scatter
                name="ContextGuard"
                data={m.scatter.map((point) => ({ ...point.contextguard, label: point.label }))}
                fill={CG}
                fillOpacity={0.55}
                stroke={CG}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Benchmark metrics" hint="aggregate">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={comparison} margin={{ top: 8, right: 8, bottom: 4, left: -18 }} barGap={4}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="metric" {...axis} />
              <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} tickFormatter={(value) => pct(value as number)} {...axis} />
              <RechartsTooltip {...tooltipStyle} formatter={(value) => pct(value as number)} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "ui-monospace, monospace" }} />
              <Bar name="Llama Guard" dataKey="lg" fill={LG} radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar name="ContextGuard" dataKey="cg" fill={CG} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Latency per run" hint="ms">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={m.timeline} margin={{ top: 8, right: 8, bottom: 4, left: -22 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="run" {...axis} />
              <YAxis {...axis} />
              <RechartsTooltip {...tooltipStyle} formatter={(value) => ms(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "ui-monospace, monospace" }} />
              <Line name="Llama Guard" type="monotone" dataKey="llama_guard" stroke={LG} strokeWidth={1.75} dot={{ r: 2 }} />
              <Line name="ContextGuard" type="monotone" dataKey="contextguard" stroke={CG} strokeWidth={1.75} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <ChartCard title="Latency breakdown" hint="mean per stage" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={breakdown} layout="vertical" margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" {...axis} />
              <YAxis type="category" dataKey="system" width={90} {...axis} />
              <RechartsTooltip {...tooltipStyle} formatter={(value) => ms(Number(value))} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "ui-monospace, monospace" }} />
              <Bar dataKey="retrieval" name="retrieval" stackId="a" fill="#3f3f46" radius={[3, 0, 0, 3]} />
              <Bar dataKey="guard" name="llama guard" stackId="a" fill={LG} />
              <Bar dataKey="vds" name="vds" stackId="a" fill={CG} />
              <Bar dataKey="sanitize" name="sanitize" stackId="a" fill="#22d3ee" />
              <Bar dataKey="llm" name="llm" stackId="a" fill="#818cf8" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="glass overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-zinc-500" />
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100">Recent runs</h3>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
              last {m.runs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.05] font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                  <th className="px-5 py-2.5 font-normal">query</th>
                  <th className="px-3 py-2.5 font-normal">type</th>
                  <th className="px-3 py-2.5 font-normal">lg</th>
                  <th className="px-3 py-2.5 font-normal">cg</th>
                  <th className="px-5 py-2.5 text-right font-normal">winner</th>
                </tr>
              </thead>
              <tbody>
                {m.runs.map((run) => (
                  <tr key={run.run_id + run.timestamp} className="border-b border-white/[0.03] text-[11px] last:border-0">
                    <td className="max-w-[240px] px-5 py-2.5">
                      <div className="truncate text-zinc-300">{run.label ?? run.query}</div>
                      <div className="font-mono text-[9px] text-zinc-600">{shortTime(run.timestamp)}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={run.category === "attack" ? "danger" : "brand"} className="text-[8.5px]">
                        {run.category}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px]">
                      <span className={run.llama_guard.attack_success ? "text-danger-300" : "text-zinc-400"}>
                        {run.llama_guard.attack_success ? "hijacked" : "held"}
                      </span>
                      <span className="ml-1.5 text-zinc-600">{pct(run.llama_guard.utility_score)}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px]">
                      <span className={run.contextguard.attack_success ? "text-danger-300" : "text-zinc-400"}>
                        {run.contextguard.attack_success ? "hijacked" : "held"}
                      </span>
                      <span className="ml-1.5 text-zinc-600">{pct(run.contextguard.utility_score)}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span
                        className={cn(
                          "font-mono text-[9.5px] uppercase tracking-[0.1em]",
                          run.winner.system === "contextguard"
                            ? "text-brand-300"
                            : run.winner.system === "llama_guard"
                              ? "text-danger-300"
                              : "text-amber-300",
                        )}
                      >
                        {run.winner.system === "contextguard" ? "cg" : run.winner.system === "llama_guard" ? "lg" : "tie"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Attack success rate",
            body: `${pct(m.llama_guard.asr)} vs ${pct(m.contextguard.asr)}`,
            note: "share of adversarial runs where the payload survived into the model context",
          },
          {
            title: "Utility preservation",
            body: `${pct(m.llama_guard.utility_attack_runs)} vs ${pct(m.contextguard.utility_attack_runs)}`,
            note: "expected-answer coverage on adversarial runs — the chunk-dropping tax",
          },
          {
            title: "p95 latency",
            body: `${ms(m.llama_guard.p95_latency_ms)} vs ${ms(m.contextguard.p95_latency_ms)}`,
            note: "measured end-to-end, retrieval included, on the demo machine",
          },
        ].map((item) => (
          <div key={item.title} className="glass-soft p-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">{item.title}</div>
            <div className="mt-1.5 font-mono text-sm text-zinc-100">{item.body}</div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-zinc-500">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: LG }} /> llama guard 3
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: CG }} /> contextguard
        </span>
        <span className="ml-auto text-zinc-600">
          asr · utility · fpr computed over {m.totals.attack_runs} adversarial and {m.totals.benign_runs} benign runs
        </span>
      </div>

      <p className="mt-3 px-1 text-[10px] leading-relaxed text-zinc-600">
        Measurement note: in demo mode the Llama Guard path is a keyword classifier, so its latency is a
        lower bound — a real Llama Guard 3 call is a full LLM round-trip per chunk. ContextGuard's
        numbers include real spaCy parsing on flagged chunks (cached after first sight of a chunk).
      </p>
    </div>
  );
}
