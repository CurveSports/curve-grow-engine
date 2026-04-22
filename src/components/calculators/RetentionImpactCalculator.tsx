import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { CalculatorShell } from "./CalculatorShell";
import { AnimatedNumber } from "./AnimatedNumber";
import { ShareModal } from "./ShareModal";
import { calcRetention, num, type RetentionContext, type RetentionInputs } from "@/lib/calculators";
import { saveScenario, type ScenarioLabel } from "./scenarioStore";
import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

interface Props {
  orgId: string;
  intake: any;
  metrics: any;
  isAdminContext: boolean;
  isImpersonating: boolean;
  initialInputs?: RetentionInputs;
  onSaved: () => void;
  defaultOpen?: boolean;
}

function buildContext(intake: any, metrics: any): RetentionContext {
  return {
    currentRetentionPct: num(intake?.retention_pct),
    currentAvgYears: num(intake?.avg_player_years, 2.5),
    revPerPlayer: num(metrics?.revenue_per_player),
    totalPlayers: num(intake?.total_players),
  };
}

const HEALTH_BADGES: Record<string, string> = {
  Strong: "bg-accent-soft text-accent border-accent/30",
  Healthy: "bg-accent-soft text-accent border-accent/30",
  Average: "bg-warning-soft text-warning border-warning/30",
  Watch: "bg-warning-soft text-warning border-warning/30",
  "At Risk": "bg-destructive/10 text-destructive border-destructive/30",
  Weak: "bg-destructive/10 text-destructive border-destructive/30",
};

export function RetentionImpactCalculator({
  orgId, intake, metrics, isAdminContext, isImpersonating, initialInputs, onSaved, defaultOpen = false,
}: Props) {
  const ctx = useMemo(() => buildContext(intake, metrics), [intake, metrics]);
  const defaults: RetentionInputs = {
    targetRetentionPct: Math.min(95, ctx.currentRetentionPct + 10),
    targetAvgYears: ctx.currentAvgYears,
    referralAdoptionPct: 5,
  };
  const [inputs, setInputs] = useState<RetentionInputs>(initialInputs ?? defaults);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => { if (initialInputs) setInputs(initialInputs); }, [initialInputs]);

  const out = useMemo(() => calcRetention(ctx, inputs), [ctx, inputs]);

  const handleSave = async (label: ScenarioLabel) => {
    await saveScenario(orgId, "retention_impact", label, inputs, out);
    onSaved();
  };
  const handleReset = () => setInputs(defaults);

  const health = (metrics?.retention_health as string) ?? "Average";
  const healthBadge = HEALTH_BADGES[health] ?? HEALTH_BADGES.Average;

  // Stacked bars
  const max = Math.max(out.revenueProtected, out.ltvIncreaseTotal, out.referralRevenue, 1);

  return (
    <>
      <CalculatorShell
        type="retention_impact"
        title="Retention Impact"
        subtitle="What is every family worth over time?"
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
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="curve-eyebrow mb-2">Current State</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Current retention</p>
                  <p className="font-display text-lg font-semibold tabular-nums">{ctx.currentRetentionPct.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg years stay</p>
                  <p className="font-display text-lg font-semibold tabular-nums">{ctx.currentAvgYears.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue per player</p>
                  <p className="font-display text-lg font-semibold tabular-nums">{fmt(ctx.revPerPlayer)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Retention health</p>
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mt-1", healthBadge)}>
                    {health}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="curve-eyebrow mb-2">Target Scenario</p>

              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Target Retention Rate</label>
                  <span className="font-display text-lg font-semibold text-accent tabular-nums">{inputs.targetRetentionPct.toFixed(0)}%</span>
                </div>
                <Slider
                  value={[inputs.targetRetentionPct]}
                  min={Math.max(0, ctx.currentRetentionPct)}
                  max={95}
                  step={1}
                  onValueChange={([v]) => setInputs({ ...inputs, targetRetentionPct: v })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Additional players retained: <strong className="text-accent">{out.additionalRetained}</strong> · Revenue protected: <strong className="text-accent">{fmt(out.revenueProtected)}</strong>
                </p>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Avg Years in Program</label>
                  <span className="font-display text-lg font-semibold text-accent tabular-nums">{inputs.targetAvgYears.toFixed(1)}</span>
                </div>
                <Slider
                  value={[inputs.targetAvgYears]}
                  min={1} max={6} step={0.5}
                  onValueChange={([v]) => setInputs({ ...inputs, targetAvgYears: v })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lifetime value per player: <strong className="text-accent">{fmt(out.targetLtv)}</strong>
                </p>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Referral Program Adoption</label>
                  <span className="font-display text-lg font-semibold text-accent tabular-nums">{inputs.referralAdoptionPct}%</span>
                </div>
                <Slider
                  value={[inputs.referralAdoptionPct]}
                  min={0} max={20} step={1}
                  onValueChange={([v]) => setInputs({ ...inputs, referralAdoptionPct: v })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  % of families who refer one new player per year. New players from referrals: <strong className="text-accent">{out.referralPlayers}</strong> ({fmt(out.referralRevenue)})
                </p>
              </div>
            </div>
          </div>

          {/* OUTPUT */}
          <div className="space-y-5">
            <div>
              <p className="curve-eyebrow mb-1">Retention Health Status</p>
              <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border", healthBadge)}>
                {health} · {ctx.currentRetentionPct.toFixed(0)}%
              </span>
            </div>

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="curve-eyebrow text-destructive mb-1">Revenue at Risk (current churn)</p>
              <p className="font-display text-2xl font-semibold text-destructive tabular-nums">{fmt(out.revenueAtRisk)}</p>
              <p className="text-xs text-muted-foreground">{out.currentChurnedPlayers} players lost annually at current rate</p>
            </div>

            <div className="space-y-2">
              <ImpactRow label="Revenue protected by improvement" value={out.revenueProtected} color="bg-accent" max={max} />
              <ImpactRow label="LTV increase (total)" value={out.ltvIncreaseTotal} color="bg-info" max={max} />
              <ImpactRow label="Referral program upside" value={out.referralRevenue} color="bg-health" max={max} />
            </div>

            <div>
              <p className="curve-eyebrow text-accent">Total Combined Impact</p>
              <div className="flex items-baseline gap-2 font-display text-4xl font-semibold text-accent mt-1">
                <span>+</span>
                <AnimatedNumber value={out.totalImpact} format={fmt} />
                <ArrowUp className="h-7 w-7" strokeWidth={2.5} />
              </div>
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning-soft p-4">
              <p className="curve-eyebrow text-warning mb-1">Curve Benchmark</p>
              <p className="text-sm text-foreground">
                80% retention is the Curve benchmark. You are currently <strong>{ctx.currentRetentionPct.toFixed(0)}%</strong>{" "}
                {ctx.currentRetentionPct >= 80 ? "above" : "below"} that mark.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {ctx.currentRetentionPct < 80
                  ? `Every 1% improvement protects ${fmt(out.protectedPerPct)} annually.`
                  : "Strong retention. Focus on maximizing referral program adoption."}
              </p>
            </div>
          </div>
        </div>
      </CalculatorShell>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        orgId={orgId}
        calculatorType="retention_impact"
        outputValues={out as any}
      />
    </>
  );
}

function ImpactRow({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  const w = (value / max) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">+{fmt(value)}</span>
      </div>
      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}
