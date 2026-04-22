import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { CalculatorShell } from "./CalculatorShell";
import { AnimatedNumber } from "./AnimatedNumber";
import { ImpactStat } from "./ImpactStat";
import { ShareModal } from "./ShareModal";
import {
  calcWallet, num,
  APPAREL_PACKAGE_DEFAULT, ADDON_PACKAGE_DEFAULT, TRAVEL_SPEND_DEFAULT,
  type WalletContext, type WalletInputs,
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
  initialInputs?: WalletInputs;
  onSaved: () => void;
  defaultOpen?: boolean;
}

function buildContext(intake: any, metrics: any): WalletContext {
  const totalPlayers = num(intake?.total_players);
  const currentSponsors = num(intake?.number_of_sponsors);
  const currentSponsorship = num(intake?.total_sponsorship_revenue);
  const events = num(intake?.camps_revenue) + num(intake?.clinics_revenue) + num(intake?.tournaments_revenue) +
    num(intake?.showcase_revenue) + num(intake?.recruiting_events_revenue) + num(intake?.data_days_revenue) +
    num(intake?.other_events_revenue) + num(intake?.tryouts_revenue);
  const apparelMargin = num(metrics?.apparel_score) > 0 ? num(metrics?.apparel_opportunity_low) * 0.4 : 0;
  const addOns = num(metrics?.add_on_revenue);
  const facility = num(intake?.annual_facility_rental_revenue);
  const facilityBenchmark = num(metrics?.facility_revenue_benchmark);
  const hasFacility = facility > 0 || facilityBenchmark > 0;

  // FMV mid for sponsorship row — use derived FMV midpoint, fallback to current per sponsor
  const fmvMid = (num(metrics?.fmv_per_sponsor_low) + num(metrics?.fmv_per_sponsor_high)) / 2 ||
    (currentSponsors > 0 ? currentSponsorship / currentSponsors : 2000);

  return {
    totalPlayers,
    currentDues: num(metrics?.dues_revenue),
    currentSponsorship,
    currentSponsors,
    currentEvents: events,
    currentApparelMargin: apparelMargin,
    currentAddOns: addOns,
    currentFacility: facility,
    hasFacility,
    fmvPerSponsorMid: fmvMid,
  };
}

function defaultsFrom(ctx: WalletContext): WalletInputs {
  // Compute current capture % per stream as default
  const HIGH = 20000;
  const APPAREL = 600;
  const ADDON = 1200;
  const FACILITY = 2400;
  return {
    duesCapturePct: ctx.totalPlayers > 0
      ? Math.min(100, (ctx.currentDues / (HIGH * ctx.totalPlayers)) * 100)
      : 0,
    numSponsors: ctx.currentSponsors,
    eventRevPerPlayer: ctx.totalPlayers > 0 ? ctx.currentEvents / ctx.totalPlayers : 0,
    apparelCapturePct: ctx.totalPlayers > 0
      ? Math.min(60, (ctx.currentApparelMargin / (APPAREL * ctx.totalPlayers)) * 100)
      : 0,
    addonAdoptionPct: ctx.totalPlayers > 0
      ? Math.min(30, (ctx.currentAddOns / (ADDON * ctx.totalPlayers)) * 100)
      : 0,
    facilityCapturePct: ctx.totalPlayers > 0 && ctx.hasFacility
      ? Math.min(100, (ctx.currentFacility / (FACILITY * ctx.totalPlayers)) * 100)
      : 0,
  };
}

export function FamilyWalletShareCalculator({
  orgId, intake, metrics, isAdminContext, isImpersonating, initialInputs, onSaved, defaultOpen = false,
}: Props) {
  const ctx = useMemo(() => buildContext(intake, metrics), [intake, metrics]);
  const seeded = useMemo(() => initialInputs ?? defaultsFrom(ctx), [initialInputs, ctx]);
  const [inputs, setInputs] = useState<WalletInputs>(seeded);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => { if (initialInputs) setInputs(initialInputs); }, [initialInputs]);

  const out = useMemo(() => calcWallet(ctx, inputs), [ctx, inputs]);

  const handleSave = async (label: ScenarioLabel) => {
    await saveScenario(orgId, "family_wallet_share", label, inputs, out);
    onSaved();
  };
  const handleReset = () => setInputs(defaultsFrom(ctx));

  const ringPct = Math.max(0, Math.min(100, out.projectedCapturePct));
  // Donut SVG geometry
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (ringPct / 100) * c;

  return (
    <>
      <CalculatorShell
        type="family_wallet_share"
        title="Family Wallet Share"
        subtitle="How much of your families' spend are you capturing?"
        defaultOpen={defaultOpen}
        isAdminContext={isAdminContext}
        isImpersonating={isImpersonating}
        onSaveBest={() => handleSave("best_case")}
        onSaveWorst={() => handleSave("worst_case")}
        onReset={handleReset}
        onShare={() => setShareOpen(true)}
      >
        <div className="rounded-lg border-l-4 border-accent bg-accent-soft p-4 mb-6">
          <p className="text-sm text-foreground">
            Travel baseball families spend <strong>$15,000–$20,000</strong> per year on their athlete.
            The question is: how much of that flows through your organization?
          </p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
            <div>
              <p className="curve-eyebrow">Wallet (low)</p>
              <p className="font-display font-semibold tabular-nums">{fmt(out.lowWallet)}</p>
            </div>
            <div>
              <p className="curve-eyebrow">Wallet (high)</p>
              <p className="font-display font-semibold tabular-nums">{fmt(out.highWallet)}</p>
            </div>
            <div>
              <p className="curve-eyebrow">You currently capture</p>
              <p className="font-display font-semibold tabular-nums">
                {fmt(out.currentTotal)}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  ({out.currentCapturePct.toFixed(1)}% of high)
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* SLIDERS */}
          <div className="space-y-5">
            <StreamRow
              label="Player Dues"
              current={fmt(ctx.currentDues)}
              currentSub={`${fmt(out.lowWallet > 0 ? ctx.currentDues / Math.max(1, ctx.totalPlayers) : 0)} per player`}
              value={inputs.duesCapturePct}
              min={0} max={100} step={1} suffix="%"
              sliderLabel="Capture rate"
              onChange={(v) => setInputs({ ...inputs, duesCapturePct: v })}
              projected={fmt(out.newDues)}
            />
            <StreamRow
              label="Sponsorship"
              current={fmt(ctx.currentSponsorship)}
              currentSub={`${ctx.currentSponsors} sponsors`}
              value={inputs.numSponsors}
              min={0} max={30} step={1} suffix=""
              sliderLabel="Number of sponsors"
              onChange={(v) => setInputs({ ...inputs, numSponsors: v })}
              projected={fmt(out.newSponsorship)}
            />
            <StreamRow
              label="Events"
              current={fmt(ctx.currentEvents)}
              currentSub={`${fmt(ctx.totalPlayers > 0 ? ctx.currentEvents / ctx.totalPlayers : 0)} per player`}
              value={inputs.eventRevPerPlayer}
              min={0} max={800} step={25} suffix="$"
              sliderLabel="Revenue per player"
              onChange={(v) => setInputs({ ...inputs, eventRevPerPlayer: v })}
              projected={fmt(out.newEvents)}
              prefixValue
            />
            <StreamRow
              label="Apparel Margin"
              current={fmt(ctx.currentApparelMargin)}
              currentSub="of $600 family spend"
              value={inputs.apparelCapturePct}
              min={0} max={60} step={1} suffix="%"
              sliderLabel="Capture rate"
              onChange={(v) => setInputs({ ...inputs, apparelCapturePct: v })}
              projected={fmt(out.newApparel)}
            />
            <StreamRow
              label="Training / Add-Ons"
              current={fmt(ctx.currentAddOns)}
              currentSub="monthly package adoption"
              value={inputs.addonAdoptionPct}
              min={0} max={30} step={1} suffix="%"
              sliderLabel="Adoption"
              onChange={(v) => setInputs({ ...inputs, addonAdoptionPct: v })}
              projected={fmt(out.newAddOns)}
            />
            {ctx.hasFacility && (
              <StreamRow
                label="Facility"
                current={fmt(ctx.currentFacility)}
                currentSub="of $2,400 per player benchmark"
                value={inputs.facilityCapturePct}
                min={0} max={100} step={1} suffix="%"
                sliderLabel="Benchmark capture"
                onChange={(v) => setInputs({ ...inputs, facilityCapturePct: v })}
                projected={fmt(out.newFacility)}
              />
            )}
          </div>

          {/* STICKY OUTPUT */}
          <div className="lg:sticky lg:top-4 self-start space-y-4 rounded-xl border border-accent/30 bg-accent-soft/40 p-5">
            <p className="curve-eyebrow text-accent">Total Wallet Capture</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="font-display text-lg font-semibold tabular-nums">{fmt(out.currentTotal)}</p>
                <p className="text-xs text-muted-foreground">{out.currentCapturePct.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projected</p>
                <p className="font-display text-lg font-semibold text-accent tabular-nums">
                  <AnimatedNumber value={out.projectedTotal} format={fmt} />
                </p>
                <p className="text-xs text-accent">
                  <AnimatedNumber value={out.projectedCapturePct} format={(n) => `${n.toFixed(1)}%`} />
                </p>
              </div>
            </div>

            <ImpactStat value={out.netGain} label="Net Gain" size="lg" />

            <div className="flex justify-center">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={r} stroke="hsl(var(--muted))" strokeWidth="14" fill="none" />
                <circle
                  cx="70" cy="70" r={r}
                  stroke="hsl(var(--accent))"
                  strokeWidth="14"
                  fill="none"
                  strokeDasharray={`${dash} ${c}`}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                  className="transition-all duration-500"
                />
                <text x="70" y="68" textAnchor="middle" className="font-display font-semibold fill-foreground" fontSize="22">
                  {ringPct.toFixed(0)}%
                </text>
                <text x="70" y="86" textAnchor="middle" className="fill-muted-foreground" fontSize="9">
                  of family wallet
                </text>
              </svg>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              <span className="font-semibold text-foreground">{fmt(out.uncaptured)}</span> still flowing outside your organization.
            </p>
          </div>
        </div>
      </CalculatorShell>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        orgId={orgId}
        calculatorType="family_wallet_share"
        outputValues={out as any}
      />
    </>
  );
}

interface StreamRowProps {
  label: string;
  current: string;
  currentSub: string;
  value: number;
  min: number; max: number; step: number;
  suffix?: string;
  prefixValue?: boolean;
  sliderLabel: string;
  onChange: (v: number) => void;
  projected: string;
}
function StreamRow({ label, current, currentSub, value, min, max, step, suffix, prefixValue, sliderLabel, onChange, projected }: StreamRowProps) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">Current: {current} <span className="text-muted-foreground/70">· {currentSub}</span></p>
        </div>
        <p className="text-sm font-semibold text-accent tabular-nums">→ {projected}</p>
      </div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{sliderLabel}</span>
        <span className="text-sm font-semibold text-accent tabular-nums">
          {prefixValue && suffix === "$" ? "$" : ""}{value}{suffix && suffix !== "$" ? suffix : ""}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
