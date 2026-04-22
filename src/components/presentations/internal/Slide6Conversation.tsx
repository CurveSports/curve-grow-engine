import { CurveBadge } from "../shared";
import { EditableText } from "../EditableField";
import { formatCurrency } from "@/lib/format";

function growthCopy(direction: string | null, intake: any, metrics: any): string {
  const hs = intake?.hs_players ?? 0;
  const youth = intake?.youth_players ?? 0;
  const annualHs = Number(metrics?.annual_hs_equivalent ?? 0);
  const ret = intake?.retention_pct ?? null;
  if (direction === "Youth Feeder Development") {
    return `You have ${hs} HS players and ${youth} youth players. Building a stronger youth pipeline creates families that stay in your ecosystem 6–8 years instead of 2–3. Every youth family retained through HS is worth ${formatCurrency(annualHs * 4)} in additional lifetime value.`;
  }
  if (direction === "HS Program Expansion") {
    return `You have a strong youth base with ${youth} players. The natural next move is building an HS program that keeps those families as their athletes develop. You're already doing the hard work of building loyalty — let's monetize it.`;
  }
  if (direction === "Pipeline Optimization") {
    const stay = ret ?? "—";
    const leave = ret ? Math.max(0, 100 - ret) : "—";
    return `You have a healthy mix of ${hs} HS and ${youth} Youth players. The opportunity is converting more youth families into long-term HS participants — your retention data shows ${stay}% stay, which means ${leave}% are leaving before HS.`;
  }
  return "Growth direction not yet calculated.";
}

const OPENING_BY_TIER: Record<string, string> = {
  Foundational: "You're early — that's actually good news. The infrastructure isn't built yet, which means we're not undoing anything. We can put the right systems in place from the start.",
  Emerging: "You've got real momentum. The program is taking shape and there's a clear path to scaling the business side alongside it.",
  Growth: "You've built something real here. The program is strong. What we found in the assessment is that the business infrastructure hasn't kept pace with the program quality. That's actually good news — it means the opportunity is right in front of you.",
  Advanced: "You're operating at a high level. The opportunity isn't fixing what's broken — it's optimizing what's already working and unlocking the next tier of revenue.",
  Elite: "You're best-in-class. The work here is precision tuning and protecting your position. We're talking about marginal gains that compound.",
};

export function Slide6Conversation({
  intake, metrics, get, save, editing,
}: {
  intake: any; metrics: any;
  get: (slide: number, field: string, fallback: string) => string;
  save: (slide: number, field: string, value: string) => Promise<void>;
  editing: boolean;
}) {
  const tier = metrics?.monetization_tier as string | null;
  const priorityEngine = metrics?.priority_engine as string | null;
  const oppLow = Number(metrics?.total_opportunity_low ?? 0);
  const oppHigh = Number(metrics?.total_opportunity_high ?? 0);
  const totalPlayers = intake?.total_players ?? 0;
  const totalTeams = intake?.total_teams ?? 0;
  const yearsInOp = intake?.years_in_operation ?? "—";
  const marketType = intake?.market_type ?? "your";
  const hsStatus = metrics?.hs_fee_vs_market as string | null;
  const annualHs = Number(metrics?.annual_hs_equivalent ?? 0);
  const hsLow = Number(metrics?.pricing_benchmark_hs_low ?? 0);
  const hsHigh = Number(metrics?.pricing_benchmark_hs_high ?? 0);
  const fmvLow = Number(metrics?.fmv_per_sponsor_low ?? 0);
  const fmvHigh = Number(metrics?.fmv_per_sponsor_high ?? 0);
  const complexity = metrics?.engagement_complexity as string | null;
  const direction = metrics?.growth_opportunity_direction as string | null;

  const openingDefault = `You've built something real here — ${totalPlayers} players, ${totalTeams} teams, ${yearsInOp} in the market. ${tier ? OPENING_BY_TIER[tier] ?? "" : ""} ${priorityEngine ? `The priority is ${priorityEngine}.` : ""}`.trim();

  const roiDefault = `Based on your specific profile — ${totalPlayers} players, ${marketType} market, your current engine scores — we're looking at ${formatCurrency(oppLow)}–${formatCurrency(oppHigh)} in additional annual revenue. That's not a generic number. That's calculated from your actual dues structure, your market's FMV for sponsorships, and your current gaps.`;

  const pricingDefault = hsStatus === "Below Market"
    ? `Your fees are below market for ${marketType}. The average HS program in your area charges ${formatCurrency(hsLow)}–${formatCurrency(hsHigh)}. You're at ${formatCurrency(annualHs)}. That gap is ${formatCurrency(Math.max(0, hsLow - annualHs))} per player — multiply by ${totalPlayers} players and you're leaving real money on the table every year.`
    : `You're priced at market right now. The opportunity isn't just raising rates — it's packaging. A tiered structure lets you capture more from families who want premium without losing the ones who are price sensitive.`;

  const sponsorshipDefault = `Local businesses in ${marketType} markets are spending money to reach exactly your demographic — sports families with disposable income and high community engagement. Based on your audience of ${totalPlayers * 4} people, the FMV for a sponsorship package in your market is ${formatCurrency(fmvLow)}–${formatCurrency(fmvHigh)}. That's what the market will bear — not what you think you can get.`;

  const overwhelmedDefault = complexity === "Complex"
    ? "We're not going to try to fix everything at once. The first 30 days is about two things: getting your communication systems consistent and landing your first sponsorship. Everything else comes after we build those wins."
    : complexity === "Moderate"
    ? `We start with the highest leverage move — ${priorityEngine ?? "your priority engine"}. That's where your biggest gap is and where we'll see results fastest. Everything else is sequenced behind that.`
    : "You're in a great position to move fast. We can activate two engines simultaneously because your foundation is strong. Expect to see real numbers within 30 days.";

  const sensitivities: { flag: boolean; text: string }[] = [
    { flag: metrics?.execution_risk === "High", text: "⚠️ Coach alignment is weak — avoid recommendations requiring heavy coach behavior change early. Build trust with quick operational wins first." },
    { flag: metrics?.market_risk === "High", text: "⚠️ Difficult market conditions — frame all revenue strategies around value and differentiation, not just rate increases." },
    { flag: metrics?.retention_risk === "High", text: "⚠️ Retention is critical — do not let the client deprioritize retention work in favor of new revenue. Churn will offset gains." },
    { flag: metrics?.selection_leakage_flag === true, text: "⚠️ Players are being cut with no alternative program. Bring up developmental programming in the first conversation — frame it as revenue opportunity, not charity." },
    { flag: intake?.revenue_needs_review === true, text: "⚠️ Revenue data was flagged as potentially inaccurate during intake. Verify financials before presenting opportunity numbers." },
  ].filter((s) => s.flag);

  // Success at 90 days
  const successMetrics: string[] = [];
  if (priorityEngine === "Sponsorship") successMetrics.push(`First sponsorship deal closed at ${formatCurrency(fmvLow)}+ (target: build pipeline of qualified prospects)`);
  if (priorityEngine === "Pricing") successMetrics.push(`Revenue per player increased toward ${formatCurrency(metrics?.revenue_benchmark ?? 0)} through fee restructure and tiered packaging`);
  if ((metrics?.retention_score ?? 10) <= 4 && intake?.retention_pct) successMetrics.push(`Re-enrollment process implemented across all teams — target ${Math.min(95, Number(intake.retention_pct) + 5)}% retention`);
  if (priorityEngine && !["Sponsorship", "Pricing"].includes(priorityEngine)) successMetrics.push(`${priorityEngine} engine activated with first measurable revenue win`);
  while (successMetrics.length < 3) successMetrics.push("Curve OS adoption complete — all communication, tracking, and check-in cadences live.");

  const Block = ({ label, fieldKey, defaultText }: { label: string; fieldKey: string; defaultText: string }) => (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{label}</p>
      <p className="text-sm text-white/85 mt-1 leading-relaxed">
        <EditableText value={get(6, fieldKey, defaultText)} editing={editing} multiline onSave={(v) => save(6, fieldKey, v)} />
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold">Conversation Guide</p>
        <CurveBadge />
      </div>

      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
        <p className="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">Growth Direction: {direction ?? "—"}</p>
        <p className="text-sm text-white/85 mt-2 leading-relaxed">
          <EditableText value={get(6, "growth_framing", growthCopy(direction, intake, metrics))} editing={editing} multiline onSave={(v) => save(6, "growth_framing", v)} />
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-4">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Conversation Starters</p>
        <Block label="Opening conversation" fieldKey="opening" defaultText={openingDefault} />
        <Block label="When they ask about ROI" fieldKey="roi" defaultText={roiDefault} />
        <Block label="When they push back on pricing" fieldKey="pricing_pushback" defaultText={pricingDefault} />
        <Block label="When they're skeptical about sponsorships" fieldKey="sponsorship_skeptic" defaultText={sponsorshipDefault} />
        <Block label="When they're overwhelmed" fieldKey="overwhelmed" defaultText={overwhelmedDefault} />
      </div>

      {sensitivities.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-[11px] uppercase tracking-wider text-amber-200 font-semibold mb-2">Key Sensitivities</p>
          <ul className="space-y-1.5 text-sm text-white/85">
            {sensitivities.map((s, i) => <li key={i}>{s.text}</li>)}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <p className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold mb-2">What success looks like at 90 days</p>
        <ol className="space-y-1.5 text-sm text-white/85 list-decimal list-inside">
          {successMetrics.slice(0, 3).map((m, i) => <li key={i}>{m}</li>)}
        </ol>
      </div>
    </div>
  );
}
