import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { CalculatorShell } from "./CalculatorShell";
import { AnimatedNumber } from "./AnimatedNumber";
import { ImpactStat } from "./ImpactStat";
import { ShareModal } from "./ShareModal";
import {
  calcPricing,
  num,
  type PricingContext,
  type PricingInputs,
} from "@/lib/calculators";
import { saveScenario, type ScenarioLabel } from "./scenarioStore";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

interface Props {
  orgId: string;
  intake: any;
  metrics: any;
  isAdminContext: boolean;
  isImpersonating: boolean;
  initialInputs?: PricingInputs;
  onSaved: () => void;
  defaultOpen?: boolean;
}

const DEFAULT_INPUTS: PricingInputs = {
  hsFeeIncreasePct: 0,
  youthFeeIncreasePct: 0,
  hsAttritionPct: 5,
  youthAttritionPct: 5,
};

export function PricingSensitivityCalculator({
  orgId,
  intake,
  metrics,
  isAdminContext,
  isImpersonating,
  initialInputs,
  onSaved,
  defaultOpen = true,
}: Props) {
  const [inputs, setInputs] = useState<PricingInputs>(initialInputs ?? DEFAULT_INPUTS);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (initialInputs) setInputs(initialInputs);
  }, [initialInputs]);

  const ctx: PricingContext = useMemo(
    () => ({
      currentHsFee: num(metrics?.annual_hs_equivalent),
      currentYouthFee: num(metrics?.annual_youth_equivalent),
      hsPlayers: num(intake?.hs_players),
      youthPlayers: num(intake?.youth_players),
      currentDuesRevenue: num(metrics?.dues_revenue),
    }),
    [metrics, intake],
  );

  const out = useMemo(() => calcPricing(ctx, inputs), [ctx, inputs]);

  const handleSave = async (label: ScenarioLabel) => {
    await saveScenario(orgId, "pricing_sensitivity", label, inputs, out);
    onSaved();
  };

  const handleReset = () => setInputs(DEFAULT_INPUTS);

  // Bar widths (max = larger of current/projected, capped)
  const barMax = Math.max(ctx.currentDuesRevenue, out.newDuesRevenue, 1);
  const currentBar = (ctx.currentDuesRevenue / barMax) * 100;
  const projectedBar = (out.newDuesRevenue / barMax) * 100;
  const projectedBarColor = out.netImpact >= 0 ? "bg-accent" : "bg-destructive";

  return (
    <>
      <CalculatorShell
        type="pricing_sensitivity"
        title="Pricing Sensitivity"
        subtitle="What does a fee increase really do?"
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
            <Section title="Fee Adjustment">
              <SliderRow
                label="HS Player Fee Increase"
                value={inputs.hsFeeIncreasePct}
                min={0} max={50} step={1} suffix="%"
                onChange={(v) => setInputs({ ...inputs, hsFeeIncreasePct: v })}
                meta={[
                  { label: "Current", value: fmt(ctx.currentHsFee) },
                  { label: "New fee", value: fmt(out.newHsFee), highlight: true },
                ]}
              />
              <SliderRow
                label="Youth Player Fee Increase"
                value={inputs.youthFeeIncreasePct}
                min={0} max={50} step={1} suffix="%"
                onChange={(v) => setInputs({ ...inputs, youthFeeIncreasePct: v })}
                meta={[
                  { label: "Current", value: fmt(ctx.currentYouthFee) },
                  { label: "New fee", value: fmt(out.newYouthFee), highlight: true },
                ]}
              />
            </Section>

            <Section title="Expected Attrition">
              <SliderRow
                label="HS Players You Might Lose"
                value={inputs.hsAttritionPct}
                min={0} max={40} step={1} suffix="%"
                onChange={(v) => setInputs({ ...inputs, hsAttritionPct: v })}
                meta={[
                  { label: "Players lost", value: `${out.hsLost}` },
                  { label: "Remaining", value: `${out.remainingHs} HS players`, highlight: true },
                ]}
              />
              <SliderRow
                label="Youth Players You Might Lose"
                value={inputs.youthAttritionPct}
                min={0} max={40} step={1} suffix="%"
                onChange={(v) => setInputs({ ...inputs, youthAttritionPct: v })}
                meta={[
                  { label: "Players lost", value: `${out.youthLost}` },
                  { label: "Remaining", value: `${out.remainingYouth} Youth players`, highlight: true },
                ]}
              />
            </Section>
          </div>

          {/* OUTPUT */}
          <div className="space-y-5">
            <p className="curve-eyebrow text-accent">Current vs After Change</p>
            <div className="grid grid-cols-2 gap-3">
              <StatBlock label="Current">
                <div className="font-display text-xl font-semibold tabular-nums">{fmt(ctx.currentDuesRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">{out.totalPlayers} players</div>
                <div className="text-xs text-muted-foreground">{fmt(out.currentRevPerPlayer)} per player</div>
              </StatBlock>
              <StatBlock label="After Change" highlight>
                <div className="font-display text-xl font-semibold tabular-nums">
                  <AnimatedNumber value={out.newDuesRevenue} format={fmt} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{out.remainingPlayers} players</div>
                <div className="text-xs text-muted-foreground">{fmt(out.newRevPerPlayer)} per player</div>
              </StatBlock>
            </div>

            <ImpactStat value={out.netImpact} label="Net Impact" />

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-20 text-xs text-muted-foreground">Current</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral transition-all duration-500"
                    style={{ width: `${currentBar}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 text-xs text-muted-foreground">Projected</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${projectedBarColor} transition-all duration-500`}
                    style={{ width: `${projectedBar}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning-soft p-4">
              <p className="curve-eyebrow text-warning mb-1">Break-Even Insight</p>
              <p className="text-sm text-foreground">
                You can lose up to <strong>{out.breakEvenHsPct.toFixed(0)}%</strong> of HS players and{" "}
                <strong>{out.breakEvenYouthPct.toFixed(0)}%</strong> of Youth players before this increase stops being worth it.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                The average travel baseball org sees 3–8% attrition after a fee increase. You have more room than you think.
              </p>
            </div>
          </div>
        </div>
      </CalculatorShell>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        orgId={orgId}
        calculatorType="pricing_sensitivity"
        outputValues={out as any}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="curve-eyebrow">{title}</p>
      {children}
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
  meta?: Array<{ label: string; value: string; highlight?: boolean }>;
}
function SliderRow({ label, value, min, max, step, suffix = "", onChange, meta = [] }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="font-display text-lg font-semibold text-accent tabular-nums">
          {value}{suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="my-2"
      />
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1">
          {meta.map((m) => (
            <span key={m.label} className={m.highlight ? "text-accent font-semibold" : "text-muted-foreground"}>
              {m.label}: {m.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, highlight, children }: { label: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-accent/40 bg-accent-soft" : "border-border bg-muted/30"}`}>
      <p className="curve-eyebrow mb-1">{label}</p>
      {children}
    </div>
  );
}
