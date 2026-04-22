import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { CalculatorShell } from "./CalculatorShell";
import { AnimatedNumber } from "./AnimatedNumber";
import { ShareModal } from "./ShareModal";
import {
  calcSponsorship,
  num,
  type SponsorshipContext,
  type SponsorshipInputs,
} from "@/lib/calculators";
import { saveScenario, type ScenarioLabel } from "./scenarioStore";
import { cn } from "@/lib/utils";
import { ChevronDown, ArrowUp } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

interface Props {
  orgId: string;
  intake: any;
  metrics: any;
  isAdminContext: boolean;
  isImpersonating: boolean;
  initialInputs?: SponsorshipInputs;
  onSaved: () => void;
  defaultOpen?: boolean;
}

const MARKETS: Array<{ label: string; value: number }> = [
  { label: "Rural", value: 0.7 },
  { label: "Suburban", value: 1.0 },
  { label: "Mid-size Metro", value: 1.15 },
  { label: "Major Metro", value: 1.45 },
  { label: "High-income Suburban", value: 1.6 },
];

const ASSET_OPTIONS: Array<{ label: string; value: number; desc: string }> = [
  { label: "Basic", value: 0.7, desc: "Jerseys and social media only. Limited visibility and frequency." },
  { label: "Standard", value: 1.0, desc: "Jerseys, tournaments, and digital assets. Good visibility across multiple touchpoints." },
  { label: "Premium", value: 1.3, desc: "Jerseys, facility signage, tournaments, events, and digital. Maximum visibility and exclusivity." },
];

const BASE_VALUES = [1500, 2000, 2500];

function defaultsFrom(intake: any, metrics: any): SponsorshipInputs {
  // Map intake market_type to multiplier
  const mt = (intake?.market_type ?? "").toLowerCase();
  let mm = num(metrics?.market_multiplier, 1.0);
  if (!mm) {
    if (mt.includes("rural")) mm = 0.7;
    else if (mt.includes("major")) mm = 1.45;
    else if (mt.includes("high")) mm = 1.6;
    else if (mt.includes("mid")) mm = 1.15;
    else mm = 1.0;
  }
  // Snap to nearest market option
  mm = MARKETS.reduce((best, m) => (Math.abs(m.value - mm) < Math.abs(best - mm) ? m.value : best), 1.0);

  let asset = num(metrics?.asset_score, 1.0);
  asset = ASSET_OPTIONS.reduce((best, a) => (Math.abs(a.value - asset) < Math.abs(best - asset) ? a.value : best), 1.0);

  return {
    marketMultiplier: mm,
    audienceMultiplier: 4,
    assetScore: asset,
    numberOfSponsors: Math.max(1, num(intake?.number_of_sponsors, 12)),
    baseValue: 2000,
  };
}

export function SponsorshipValueCalculator({
  orgId,
  intake,
  metrics,
  isAdminContext,
  isImpersonating,
  initialInputs,
  onSaved,
  defaultOpen = false,
}: Props) {
  const seeded = useMemo(() => initialInputs ?? defaultsFrom(intake, metrics), [initialInputs, intake, metrics]);
  const [inputs, setInputs] = useState<SponsorshipInputs>(seeded);
  const [shareOpen, setShareOpen] = useState(false);
  const [formulaOpen, setFormulaOpen] = useState(false);

  useEffect(() => { if (initialInputs) setInputs(initialInputs); }, [initialInputs]);

  const ctx: SponsorshipContext = useMemo(() => ({
    totalPlayers: num(intake?.total_players),
    currentSponsorshipRevenue: num(intake?.total_sponsorship_revenue),
    currentSponsors: num(intake?.number_of_sponsors),
  }), [intake]);

  const out = useMemo(() => calcSponsorship(ctx, inputs), [ctx, inputs]);

  const handleSave = async (label: ScenarioLabel) => {
    await saveScenario(orgId, "sponsorship_value", label, inputs, out);
    onSaved();
  };
  const handleReset = () => setInputs(defaultsFrom(intake, metrics));

  const stackMax = Math.max(out.totalHigh, ctx.currentSponsorshipRevenue, 1);
  const currentBar = (ctx.currentSponsorshipRevenue / stackMax) * 100;
  const potentialBar = (out.totalLow / stackMax) * 100;

  return (
    <>
      <CalculatorShell
        type="sponsorship_value"
        title="Sponsorship Value"
        subtitle="What are your sponsorships actually worth?"
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
              <p className="curve-eyebrow mb-2">Market</p>
              <p className="text-sm font-medium text-foreground mb-2">Your Market</p>
              <PillGroup
                options={MARKETS.map(m => ({ label: m.label, value: m.value }))}
                value={inputs.marketMultiplier}
                onChange={(v) => setInputs({ ...inputs, marketMultiplier: v })}
              />
              <p className="text-xs text-muted-foreground mt-2">
                This reflects what local businesses can realistically spend on sponsorships.
              </p>
            </div>

            <div>
              <p className="curve-eyebrow mb-2">Audience</p>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Spectators per Player</label>
                <span className="font-display text-lg font-semibold text-accent tabular-nums">
                  {inputs.audienceMultiplier.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[inputs.audienceMultiplier]}
                min={2} max={6} step={0.5}
                onValueChange={([v]) => setInputs({ ...inputs, audienceMultiplier: v })}
              />
              <p className="text-xs text-accent font-semibold mt-1">
                Estimated total audience: {Math.round(out.totalAudience).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Adjust based on your typical game and event attendance.
              </p>
            </div>

            <div>
              <p className="curve-eyebrow mb-2">Asset Quality</p>
              <p className="text-sm font-medium text-foreground mb-2">What can you offer sponsors?</p>
              <div className="grid gap-2">
                {ASSET_OPTIONS.map((a) => {
                  const active = Math.abs(a.value - inputs.assetScore) < 0.01;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => setInputs({ ...inputs, assetScore: a.value })}
                      className={cn(
                        "text-left rounded-lg border p-3 transition-all",
                        active ? "border-accent bg-accent-soft" : "border-border hover:border-accent/40",
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{a.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="curve-eyebrow mb-2">Deal Structure</p>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Target Number of Sponsors</label>
                <span className="font-display text-lg font-semibold text-accent tabular-nums">
                  {inputs.numberOfSponsors}
                </span>
              </div>
              <Slider
                value={[inputs.numberOfSponsors]}
                min={1} max={30} step={1}
                onValueChange={([v]) => setInputs({ ...inputs, numberOfSponsors: v })}
                className="mb-4"
              />
              <p className="text-sm font-medium text-foreground mb-2">Starting Base Value</p>
              <PillGroup
                options={BASE_VALUES.map(v => ({ label: fmt(v), value: v }))}
                value={inputs.baseValue}
                onChange={(v) => setInputs({ ...inputs, baseValue: v })}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Our standard base — adjust for your program's prestige level.
              </p>
            </div>
          </div>

          {/* OUTPUT */}
          <div className="space-y-5">
            <div>
              <p className="curve-eyebrow text-accent">FMV per Sponsor</p>
              <div className="font-display text-4xl font-semibold text-foreground mt-1">
                <AnimatedNumber value={out.fmvLow} format={fmt} />
                <span className="text-muted-foreground mx-2 text-2xl">–</span>
                <AnimatedNumber value={out.fmvHigh} format={fmt} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">Recommended sponsorship range per partner</p>
            </div>

            <div>
              <p className="curve-eyebrow">Total Sponsorship Potential</p>
              <div className="font-display text-3xl font-semibold text-foreground mt-1">
                <AnimatedNumber value={out.totalLow} format={fmt} />
                <span className="text-muted-foreground mx-2 text-xl">–</span>
                <AnimatedNumber value={out.totalHigh} format={fmt} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">Based on {inputs.numberOfSponsors} sponsors at FMV range</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="curve-eyebrow mb-1">Your current sponsorship revenue</p>
              <div className="font-display text-xl font-semibold tabular-nums">{fmt(ctx.currentSponsorshipRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {ctx.currentSponsors} sponsors at {fmt(out.currentPerSponsor)} average
              </p>
            </div>

            <div>
              <p className="curve-eyebrow text-accent">Opportunity Gap</p>
              <div className="flex items-baseline gap-2 font-display text-3xl font-semibold text-accent mt-1">
                <span>+</span>
                <AnimatedNumber value={out.gapLow} format={fmt} />
                <span className="text-muted-foreground mx-1 text-xl">–</span>
                <AnimatedNumber value={out.gapHigh} format={fmt} />
                <ArrowUp className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">Additional annual sponsorship revenue available</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-20 text-xs text-muted-foreground">Current</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-neutral transition-all duration-500" style={{ width: `${currentBar}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 text-xs text-muted-foreground">Potential</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-500" style={{ width: `${potentialBar}%` }} />
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setFormulaOpen(o => !o)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", formulaOpen && "rotate-180")} />
                How we calculate this
              </button>
              {formulaOpen && (
                <p className="text-xs text-muted-foreground mt-2 font-mono leading-relaxed">
                  Base {fmt(inputs.baseValue)} × Market {inputs.marketMultiplier} × Audience{" "}
                  {(inputs.audienceMultiplier / 4).toFixed(2)} × Assets {inputs.assetScore} ={" "}
                  <span className="text-accent">{fmt(out.fmvLow)}–{fmt(out.fmvHigh)}</span> per sponsor
                </p>
              )}
            </div>
          </div>
        </div>
      </CalculatorShell>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        orgId={orgId}
        calculatorType="sponsorship_value"
        outputValues={out as any}
      />
    </>
  );
}

function PillGroup<T extends number>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = Math.abs(o.value - value) < 0.01;
        return (
          <button
            key={String(o.value) + o.label}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
              active
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background text-foreground border-border hover:border-accent/40",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
