import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { CalculatorShell } from "./CalculatorShell";
import { AnimatedNumber } from "./AnimatedNumber";
import { ImpactStat } from "./ImpactStat";
import { ShareModal } from "./ShareModal";
import { calcGrowth, num, type GrowthAssumption, type GrowthContext, type GrowthInputs } from "@/lib/calculators";
import { saveScenario, type ScenarioLabel } from "./scenarioStore";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

interface Props {
  orgId: string;
  intake: any;
  metrics: any;
  isAdminContext: boolean;
  isImpersonating: boolean;
  initialInputs?: GrowthInputs;
  onSaved: () => void;
  defaultOpen?: boolean;
}

function buildContext(intake: any, metrics: any): GrowthContext {
  const events = num(intake?.camps_revenue) + num(intake?.clinics_revenue) + num(intake?.tournaments_revenue) +
    num(intake?.showcase_revenue) + num(intake?.recruiting_events_revenue) + num(intake?.data_days_revenue) +
    num(intake?.other_events_revenue);
  const apparel = num(metrics?.apparel_opportunity_low) * 0.4;
  return {
    currentPlayers: num(intake?.total_players),
    revPerPlayer: num(metrics?.revenue_per_player),
    totalRevenue: num(metrics?.calculated_total_revenue),
    duesRevenue: num(metrics?.dues_revenue),
    eventRevenue: events,
    sponsorshipRevenue: num(intake?.total_sponsorship_revenue),
    apparelMargin: apparel,
  };
}

export function RosterGrowthCalculator({
  orgId, intake, metrics, isAdminContext, isImpersonating, initialInputs, onSaved, defaultOpen = false,
}: Props) {
  const ctx = useMemo(() => buildContext(intake, metrics), [intake, metrics]);
  const defaults: GrowthInputs = {
    targetPlayers: ctx.currentPlayers + 50,
    assumption: "same",
    timelineMonths: 12,
  };
  const [inputs, setInputs] = useState<GrowthInputs>(initialInputs ?? defaults);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => { if (initialInputs) setInputs(initialInputs); }, [initialInputs]);

  const out = useMemo(() => calcGrowth(ctx, inputs), [ctx, inputs]);

  const handleSave = async (label: ScenarioLabel) => {
    await saveScenario(orgId, "roster_growth", label, inputs, out);
    onSaved();
  };
  const handleReset = () => setInputs(defaults);

  const minPlayers = ctx.currentPlayers;
  const maxPlayers = Math.max(ctx.currentPlayers * 3, ctx.currentPlayers + 100);

  // simple sparkline data (linear) — base vs growth trajectory
  const points = Array.from({ length: inputs.timelineMonths + 1 }, (_, i) => i);
  const baseLine = points.map(() => ctx.totalRevenue);
  const growLine = points.map((m) => ctx.totalRevenue + (out.additional * m) / inputs.timelineMonths);
  const yMax = Math.max(...growLine, ...baseLine, 1);
  const yMin = Math.min(...baseLine, 0);
  const W = 280, H = 100;
  const xScale = (i: number) => (i / (points.length - 1)) * W;
  const yScale = (v: number) => H - ((v - yMin) / Math.max(1, yMax - yMin)) * H;
  const baseD = baseLine.map((v, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(v)}`).join(" ");
  const growD = growLine.map((v, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(v)}`).join(" ");

  return (
    <>
      <CalculatorShell
        type="roster_growth"
        title="Roster Growth"
        subtitle="What does adding players actually mean for revenue?"
        defaultOpen={defaultOpen}
        isAdminContext={isAdminContext}
        isImpersonating={isImpersonating}
        onSaveBest={() => handleSave("best_case")}
        onSaveWorst={() => handleSave("worst_case")}
        onReset={handleReset}
        onShare={() => setShareOpen(true)}
      >
        <div className="grid lg:grid-cols-2 gap-6">
          {/* INPUTS */}
          <div className="space-y-6">
            <div>
              <p className="curve-eyebrow mb-2">Growth Scenario</p>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Target Total Players</label>
                <span className="font-display text-lg font-semibold text-accent tabular-nums">
                  {inputs.targetPlayers}
                </span>
              </div>
              <Slider
                value={[inputs.targetPlayers]}
                min={minPlayers}
                max={maxPlayers}
                step={5}
                onValueChange={([v]) => setInputs({ ...inputs, targetPlayers: v })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Adding {Math.max(0, out.playersAdded)} players · Growth rate {out.growthRate.toFixed(0)}%
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Revenue per Player at New Size</p>
              <div className="grid grid-cols-3 gap-2">
                {(["conservative", "same", "improved"] as GrowthAssumption[]).map((a) => {
                  const labels: Record<GrowthAssumption, string> = {
                    conservative: "Conservative",
                    same: "Same",
                    improved: "Improved",
                  };
                  const descs: Record<GrowthAssumption, string> = {
                    conservative: "Slight dilution as you scale",
                    same: "Maintain current per-player value",
                    improved: "Better systems capture more",
                  };
                  const factors: Record<GrowthAssumption, number> = { conservative: 0.9, same: 1.0, improved: 1.1 };
                  const active = inputs.assumption === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setInputs({ ...inputs, assumption: a })}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-all",
                        active ? "border-accent bg-accent-soft" : "border-border hover:border-accent/40",
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{labels[a]}</p>
                      <p className="text-xs font-mono text-accent mt-0.5">{fmt(ctx.revPerPlayer * factors[a])}</p>
                      <p className="text-xs text-muted-foreground mt-1">{descs[a]}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="curve-eyebrow mb-2">Growth Timeline</p>
              <div className="flex gap-2">
                {[6, 12, 24].map((m) => {
                  const active = inputs.timelineMonths === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInputs({ ...inputs, timelineMonths: m })}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                        active
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-background text-foreground border-border hover:border-accent/40",
                      )}
                    >
                      {m} months
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* OUTPUT */}
          <div className="space-y-5">
            <p className="curve-eyebrow text-accent">Current vs Target State</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="curve-eyebrow mb-1">Current</p>
                <p className="text-sm font-semibold tabular-nums">{ctx.currentPlayers} players</p>
                <p className="font-display text-lg font-semibold tabular-nums">{fmt(ctx.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">{fmt(ctx.revPerPlayer)} per player</p>
              </div>
              <div className="rounded-lg border border-accent/40 bg-accent-soft p-3">
                <p className="curve-eyebrow mb-1">Target</p>
                <p className="text-sm font-semibold tabular-nums">{inputs.targetPlayers} players</p>
                <p className="font-display text-lg font-semibold tabular-nums">
                  <AnimatedNumber value={out.projectedTotal} format={fmt} />
                </p>
                <p className="text-xs text-muted-foreground">{fmt(out.newRevPerPlayer)} per player</p>
              </div>
            </div>

            <ImpactStat value={out.additional} label="Revenue Impact (annual)" />

            <div className="space-y-1.5 text-sm">
              <p className="curve-eyebrow mb-1">Breakdown</p>
              <BreakdownRow label="Dues increase" value={out.duesIncrease} />
              <BreakdownRow label="Event revenue increase" value={out.eventsIncrease} />
              <BreakdownRow label="Sponsorship increase" value={out.sponsorshipIncrease} />
              <BreakdownRow label="Apparel margin increase" value={out.apparelIncrease} />
              <p className="text-xs text-muted-foreground mt-2">
                Additional coaching, facility, and operational costs will vary based on your structure. Factor these into your final analysis.
              </p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground mb-2">
                At <strong>{inputs.timelineMonths}</strong> months to reach <strong>{inputs.targetPlayers}</strong> players,
                that's about <strong>{out.playersPerMonth.toFixed(1)}</strong> new players per month.
              </p>
              <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} className="overflow-visible">
                <path d={baseD} fill="none" stroke="hsl(var(--neutral))" strokeWidth="2" strokeDasharray="4 4" />
                <path d={growD} fill="none" stroke="hsl(var(--accent))" strokeWidth="2.5" className="transition-all duration-500" />
                <text x="0" y={H + 12} fontSize="9" className="fill-muted-foreground">Month 0</text>
                <text x={W - 30} y={H + 12} fontSize="9" className="fill-muted-foreground">Month {inputs.timelineMonths}</text>
              </svg>
            </div>
          </div>
        </div>
      </CalculatorShell>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        orgId={orgId}
        calculatorType="roster_growth"
        outputValues={out as any}
      />
    </>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  const positive = value > 0.5;
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", positive ? "text-accent" : value < -0.5 ? "text-destructive" : "text-muted-foreground")}>
        {positive ? "+" : ""}{fmt(value)}
      </span>
    </div>
  );
}
