import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPct, formatDate } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Check, Download, ChevronDown, ChevronUp } from "lucide-react";
import { TierLadder, TierAdvancementBanner, useTierAdvancement } from "@/components/TierLadder";
import { formatDate as fmtDate } from "@/lib/format";

function TierProgressionSection({ orgId, metrics }: { orgId: string; metrics: any }) {
  const storageKey = `tier-ladder-collapsed:${orgId}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(storageKey) === "1");
  const advanced = useTierAdvancement(orgId);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(storageKey, next ? "1" : "0");
  };
  return (
    <section id="tier-progression" className="scroll-mt-24">
      {advanced && <TierAdvancementBanner orgId={orgId} currentTier={advanced.to} />}
      <button onClick={toggle} className="w-full flex items-center justify-between mb-4 group">
        <div className="text-left">
          <h2 className="curve-eyebrow">Your Tier Progression</h2>
          <p className="text-sm text-muted-foreground mt-1">Track your progress and see exactly what it takes to reach the next level.</p>
        </div>
        {collapsed ? <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground" /> : <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />}
      </button>
      {!collapsed && (
        <>
          <TierLadder metrics={metrics} orgId={orgId} variant="org" />
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Last updated: {fmtDate(metrics.calculated_at)} · Complete a new assessment to update your scores.
          </p>
        </>
      )}
    </section>
  );
}

const TIER_STYLES: Record<string, string> = {
  Foundational: "bg-secondary text-foreground border-border",
  Emerging: "bg-blue-50 text-blue-700 border-blue-200",
  Growth: "bg-accent-soft text-accent border-accent/30",
  Advanced: "bg-teal-50 text-teal-700 border-teal-200",
  Elite: "bg-amber-50 text-amber-700 border-amber-200",
};

function ScoreBar({ score }: { score: number }) {
  const color =
    score <= 3 ? "bg-destructive" :
    score <= 6 ? "bg-warning" :
    score <= 8 ? "bg-blue-500" : "bg-accent";
  return (
    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${(score / 10) * 100}%` }} />
    </div>
  );
}

function EngineCard({
  name, score, low, high, opportunityLabel, subtext,
}: {
  name: string; score: number; low: number; high: number;
  opportunityLabel?: string; subtext?: string;
}) {
  return (
    <div className="curve-card min-h-[180px] flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display font-semibold text-base">{name}</h3>
        <span className="font-display tabular-nums leading-none">
          <span className="text-4xl font-bold">{score}</span>
          <span className="text-muted-foreground text-sm font-normal ml-0.5">/10</span>
        </span>
      </div>
      <ScoreBar score={score} />
      <div className="mt-auto pt-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{opportunityLabel ?? "Opportunity"}</p>
        <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">
          {formatCurrency(low)} – {formatCurrency(high)}
        </p>
        {subtext && <p className="text-xs text-muted-foreground mt-2 leading-snug">{subtext}</p>}
      </div>
    </div>
  );
}

function RetentionCard({
  score, health, retentionPct, revenueProtectedPerPct, referralLow, referralHigh,
}: {
  score: number; health: string; retentionPct: number;
  revenueProtectedPerPct: number; referralLow: number; referralHigh: number;
}) {
  const healthStyles =
    health === "Healthy"
      ? "bg-accent-soft text-accent border-accent/30"
      : health === "Needs Attention"
      ? "bg-warning-soft text-warning border-warning/30"
      : "bg-destructive/10 text-destructive border-destructive/30";
  return (
    <div className="curve-card min-h-[180px] flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-display font-semibold text-base">Retention</h3>
        <span className="font-display tabular-nums leading-none">
          <span className="text-4xl font-bold">{score}</span>
          <span className="text-muted-foreground text-sm font-normal ml-0.5">/10</span>
        </span>
      </div>
      <ScoreBar score={score} />
      <div className="mt-4 space-y-2">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${healthStyles}`}>
          {health}
        </span>
        <p className="text-xs text-muted-foreground">Retention rate: {Math.round(retentionPct)}%</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Every 1% improvement protects approximately {formatCurrency(revenueProtectedPerPct)} in annual revenue
        </p>
        <p className="text-xs text-foreground/80 tabular-nums">
          Referral opportunity: {formatCurrency(referralLow)} – {formatCurrency(referralHigh)}
        </p>
      </div>
    </div>
  );
}

function AddOnsFacilityNote() {
  return (
    <div className="curve-card min-h-[180px] flex flex-col justify-center items-center text-center p-6">
      <h3 className="font-display font-semibold text-base mb-3">Add-Ons</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Add-on programming is captured in your Facility engine
      </p>
    </div>
  );
}

const NEXT_STEPS_FALLBACK: Record<string, string[]> = {
  Pricing: [
    "Audit your current fee structure against the top 3 competitors in your market.",
    "Build a tiered package option that bundles high-value services at a premium price point.",
    "Define a clear pricing strategy document that all staff can reference and communicate.",
  ],
  Sponsorship: [
    "Identify 10–15 local businesses with natural alignment to youth sports and families.",
    "Build a sponsorship package with three tiers: presenting, supporting, and community.",
    "Assign one person as the sponsorship point of contact and set a 30-day outreach goal.",
  ],
  Apparel: [
    "Audit your current apparel process and calculate your actual margin per player.",
    "Explore moving to an in-house or direct vendor model to capture full margin.",
    "Create a required gear package bundled into registration to guarantee baseline revenue.",
  ],
  Events: [
    "Identify one showcase or tournament format you can own and run annually.",
    "Build a simple event P&L template to understand your true revenue per event.",
    "Survey current families on interest in a showcase or recruiting-focused event.",
  ],
  "Add-Ons": [
    "Survey current families on interest in private lessons, small group training, and camps.",
    "Launch one structured off-season camp as a low-risk test of add-on demand.",
    "Create a simple program menu families can reference year-round.",
  ],
  Retention: [
    "Implement a weekly communication standard for all coaches immediately.",
    "Build a formal re-enrollment process with early commitment incentives.",
    "Conduct brief exit interviews with any family that does not re-enroll this cycle.",
  ],
  Facility: [
    "Build a structured private instruction program that runs through your organization rather than through individual coaches independently.",
    "Audit your current facility schedule and identify unused blocks — mornings, weekday afternoons, and off-season windows are typically the highest opportunity.",
    "Build a rental rate card for cage time, field time, and full facility use and begin outreach to local high schools, rec leagues, and other travel clubs.",
  ],
};

function SectionDivider() {
  return <div className="py-4"><div className="h-px bg-border" /></div>;
}

export default function Report({ bare = false, orgIdProp }: { bare?: boolean; orgIdProp?: string } = {}) {
  const { orgId: paramOrgId } = useParams<{ orgId?: string }>();
  const { profile, role } = useAuth();
  const { mark } = useOnboarding();
  const [data, setData] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [intake, setIntake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const orgId = orgIdProp ?? paramOrgId ?? profile?.org_id;

  useEffect(() => {
    if (!paramOrgId && role === "org_user") mark("report_viewed_at");
  }, [paramOrgId, role, mark]);

  useEffect(() => {
    (async () => {
      if (!orgId) { setLoading(false); return; }
      const [{ data: m }, { data: o }, { data: i }] = await Promise.all([
        supabase.from("derived_metrics").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
        supabase.from("organization_intake").select("*").eq("org_id", orgId).maybeSingle(),
      ]);
      if (!m) setErr("No assessment has been submitted yet.");
      setData(m);
      setOrg(o);
      setIntake(i);
      setLoading(false);
    })();
  }, [orgId]);

  const Wrap = ({ children }: { children: any }) => bare ? <>{children}</> : <AppShell>{children}</AppShell>;
  if (loading) return <Wrap><p className="text-muted-foreground text-sm">Loading…</p></Wrap>;
  if (!orgId) return <Wrap><p className="text-muted-foreground text-sm">No organization linked.</p></Wrap>;
  if (err || !data) return <Wrap><p className="text-muted-foreground text-sm">{err ?? "No data."}</p></Wrap>;

  const isFacilityOrg = org?.org_type === "Facility + Teams" || org?.org_type === "Facility Only" ||
    intake?.org_type === "Facility + Teams" || intake?.org_type === "Facility Only";

  const totalRevenue = Number(data.calculated_total_revenue ?? intake?.total_annual_revenue ?? 0);
  const tier = data.monetization_tier as string;

  // Build top 3 lowest-scoring engines
  const engines: { name: string; score: number }[] = [
    { name: "Pricing", score: Number(data.pricing_score) },
    { name: "Sponsorship", score: Number(data.sponsorship_score) },
    { name: "Apparel", score: Number(data.apparel_score) },
    { name: "Events", score: Number(data.event_score) },
    { name: "Add-Ons", score: Number(data.addon_score) },
    { name: "Retention", score: Number(data.retention_score) },
  ];
  if (isFacilityOrg && data.facility_score !== null && data.facility_score !== undefined) {
    engines.push({ name: "Facility", score: Number(data.facility_score) });
  }
  const hasAffiliates = intake?.has_affiliates === "Yes" || intake?.has_affiliates === true;
  if (hasAffiliates && data.affiliate_score !== null && data.affiliate_score !== undefined) {
    engines.push({ name: "Affiliate Program", score: Number(data.affiliate_score) });
  }
  const top3 = [...engines].sort((a, b) => a.score - b.score).slice(0, 3);

  // Opportunity components for breakdown line (use Apparel Margin / Add-Ons rename, hide based on org type)
  const opportunityComponents: { name: string; low: number; high: number }[] = [
    { name: "Pricing", low: Number(data.pricing_opportunity_low ?? 0), high: Number(data.pricing_opportunity_high ?? 0) },
    { name: "Sponsorship", low: Number(data.sponsorship_opportunity_low ?? 0), high: Number(data.sponsorship_opportunity_high ?? 0) },
    { name: "Events", low: Number(data.event_opportunity_low ?? 0), high: Number(data.event_opportunity_high ?? 0) },
    { name: "Apparel Margin", low: Number(data.apparel_opportunity_low ?? 0), high: Number(data.apparel_opportunity_high ?? 0) },
    { name: "Retention", low: Number(data.retention_referral_opportunity_low ?? data.retention_opportunity_low ?? 0), high: Number(data.retention_referral_opportunity_high ?? data.retention_opportunity_high ?? 0) },
  ];
  if (!isFacilityOrg) {
    opportunityComponents.push({ name: "Add-Ons (Remote Training)", low: Number(data.addon_opportunity_low ?? 0), high: Number(data.addon_opportunity_high ?? 0) });
  }
  if (isFacilityOrg) {
    opportunityComponents.push({ name: "Facility", low: Number(data.facility_opportunity_low ?? 0), high: Number(data.facility_opportunity_high ?? 0) });
  }
  if (hasAffiliates) {
    opportunityComponents.push({ name: "Affiliate", low: Number(data.affiliate_fee_opportunity_low ?? 0), high: Number(data.affiliate_fee_opportunity_high ?? 0) });
  }

  const sectionNav: { id: string; label: string }[] = [
    { id: "snapshot", label: "Snapshot" },
    ...(data.pricing_benchmark_hs_low || data.pricing_benchmark_youth_low
      ? [{ id: "pricing-benchmark", label: "Pricing" }]
      : []),
    { id: "opportunity", label: "Opportunity" },
    { id: "summary", label: "Summary" },
    { id: "engines", label: "Engines" },
    { id: "breakdown", label: "Breakdown" },
    { id: "plan", label: "90-Day Plan" },
  ];

  return (
    <Wrap>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in print:max-w-full print:space-y-3">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-border">
          <div>
            <p className="curve-eyebrow mb-2">Revenue Leak Report</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight inline-block border-b-2 border-accent pb-1 print:text-3xl print:border-b-0">
              {org?.name ?? intake?.organization_name ?? "Organization"}
            </h1>
            {intake?.operates_multiple_brands && (intake?.operates_multiple_brands === "Yes" || intake?.operates_multiple_brands === true) && intake?.number_of_brands && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-secondary text-foreground border-border align-middle cursor-help">
                      {intake.number_of_brands} Brands
                    </span>
                  </TooltipTrigger>
                  {intake?.brand_descriptions && (
                    <TooltipContent className="max-w-xs text-xs">{intake.brand_descriptions}</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Generated {formatDate(data.calculated_at)}
            </p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-background"
            >
              <Download className="h-4 w-4" />
              Print / Save PDF
            </Button>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${TIER_STYLES[tier] ?? "bg-secondary"}`}>
              {tier} Tier
            </span>
          </div>
        </header>

        {/* Sticky section navigation */}
        <nav
          aria-label="Report sections"
          className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border print:hidden"
          data-print-hide="true"
        >
          <div className="flex gap-1 overflow-x-auto">
            {sectionNav.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Revenue Snapshot */}
        <section id="snapshot" className="scroll-mt-24">
          <h2 className="curve-eyebrow mb-4">Revenue Snapshot</h2>
          <div className={`grid gap-4 ${isFacilityOrg ? "md:grid-cols-3 lg:grid-cols-6" : "md:grid-cols-4"} grid-cols-1 sm:grid-cols-2`}>
            <div className="curve-card">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">Total Annual Revenue</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="info"><Info className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Calculated from all revenue streams entered above.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="font-display text-2xl font-semibold mt-2">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="curve-card">
              <p className="text-xs text-muted-foreground">Revenue Per Player</p>
              <p className="font-display text-2xl font-semibold mt-2">{formatCurrency(data.revenue_per_player)}</p>
            </div>
            <div className="curve-card">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">Curve OS Wallet Share Target</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="info"><Info className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Based on average family spend of $15,000–$20,000 annually on youth baseball.
                      The target represents approximately 50% wallet share — achievable when an org
                      centralizes development, showcasing, and reduces reliance on external travel tournaments.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="font-display text-2xl font-semibold mt-2">{formatCurrency(data.revenue_benchmark)}</p>
              {data.at_benchmark ? (
                <p className="text-xs text-accent mt-2 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> On track
                </p>
              ) : (
                <p className="text-xs text-destructive/80 mt-2">
                  Gap: {formatCurrency(Number(data.revenue_benchmark) - Number(data.revenue_per_player))} per player
                </p>
              )}
            </div>
            <div className="curve-card">
              <p className="text-xs text-muted-foreground">Non-Dues Revenue Per Player</p>
              <p className="font-display text-2xl font-semibold mt-2">{formatCurrency(data.non_dues_revenue_per_player)}</p>
            </div>
            {isFacilityOrg && (
              <div className="curve-card">
                <p className="text-xs text-muted-foreground">Facility Rental Revenue</p>
                <p className="font-display text-2xl font-semibold mt-2">{formatCurrency(intake?.annual_facility_rental_revenue ?? intake?.facility_rental_revenue ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {data.facility_revenue_pct !== null && data.facility_revenue_pct !== undefined ? formatPct(data.facility_revenue_pct, 1) : "—"} of total revenue
                </p>
              </div>
            )}
            {isFacilityOrg && (
              <div className="curve-card">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Facility Revenue Target</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="info"><Info className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Based on average family spend of $400/month on private instruction. A facility serving your player base should capture approximately 50% of that spend — $2,400 per player annually — through structured in-house instruction and programming. Geography and existing coach relationships are factored into this estimate.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="font-display text-2xl font-semibold mt-2">{formatCurrency(data.facility_revenue_benchmark ?? 0)}</p>
                {data.facility_at_benchmark ? (
                  <p className="text-xs text-accent mt-2 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> On track
                  </p>
                ) : (
                  <p className="text-xs text-destructive/80 mt-2">
                    Gap: {formatCurrency(Number(data.facility_revenue_gap ?? 0))}
                  </p>
                )}
              </div>
            )}
            {hasAffiliates && (
              <div className="curve-card">
                <p className="text-xs text-muted-foreground">Affiliate Revenue</p>
                <p className="font-display text-2xl font-semibold mt-2">{formatCurrency(Number(data.affiliate_total_revenue ?? 0))}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {Number(intake?.number_of_affiliates ?? 0)} affiliates / {Number(intake?.affiliate_players_charged ?? 0)} players
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fee revenue: {formatCurrency(Number(data.affiliate_fee_revenue ?? 0))} / Apparel: {formatCurrency(Number(intake?.affiliate_apparel_revenue ?? 0))}
                </p>
              </div>
            )}
          </div>
        </section>

        <SectionDivider />

        {/* Pricing Benchmark */}
        {(data.pricing_benchmark_hs_low || data.pricing_benchmark_youth_low) && (
          <section id="pricing-benchmark" className="scroll-mt-24">
            <h2 className="curve-eyebrow mb-4">Pricing Benchmark</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "HS Player Pricing", fee: data.annual_hs_equivalent, low: data.pricing_benchmark_hs_low, high: data.pricing_benchmark_hs_high, status: data.hs_fee_vs_market },
                { title: "Youth Player Pricing", fee: data.annual_youth_equivalent, low: data.pricing_benchmark_youth_low, high: data.pricing_benchmark_youth_high, status: data.youth_fee_vs_market },
              ].map((c) => {
                const badgeStyles =
                  c.status === "Below Market" ? "bg-destructive/10 text-destructive border-destructive/30"
                  : c.status === "Above Market" ? "bg-blue-50 text-blue-700 border-blue-200"
                  : c.status === "At Market" ? "bg-accent-soft text-accent border-accent/30"
                  : "bg-secondary text-muted-foreground border-border";
                return (
                  <div key={c.title} className="curve-card">
                    <div className="flex items-baseline justify-between mb-3">
                      <h3 className="font-display font-semibold text-base">{c.title}</h3>
                      {c.status && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyles}`}>{c.status}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Your blended annual fee</p>
                    <p className="font-display text-2xl font-semibold tabular-nums mt-1">{formatCurrency(Number(c.fee ?? 0))}</p>
                    <p className="text-xs text-muted-foreground mt-3">Market range for your area</p>
                    <p className="text-sm font-medium tabular-nums mt-1">{formatCurrency(Number(c.low ?? 0))} – {formatCurrency(Number(c.high ?? 0))}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">Benchmarks reflect full annual fees including all seasons, membership, and tournament participation for your market type.</p>
          </section>
        )}

        <SectionDivider />

        {/* Concentration alert */}
        {(data.high_dues_concentration || data.high_sponsorship_dependency) && (
          <>
            <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm space-y-1">
              {data.high_dues_concentration && (
                <p><span className="font-semibold">Revenue Concentration Alert:</span> 85%+ of revenue is from player fees. Diversification is a priority.</p>
              )}
              {data.high_sponsorship_dependency && (
                <p><span className="font-semibold">Sponsorship Dependency Alert:</span> Sponsorships represent 30%+ of total revenue. Multi-year agreements are recommended.</p>
              )}
            </div>
            <SectionDivider />
          </>
        )}

        {/* Revenue Opportunity */}
        <section id="opportunity" className="scroll-mt-24 text-center py-10 border-y border-border">
          <p className="curve-eyebrow mb-3">Revenue Opportunity</p>
          <p className="font-display text-5xl sm:text-6xl font-semibold tracking-tight">
            {formatCurrency(data.total_opportunity_low)} – {formatCurrency(data.total_opportunity_high)}
          </p>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto">
            Estimated additional annual revenue available based on your current structure and market.
          </p>
          <p className="text-xs text-muted-foreground mt-4 max-w-4xl mx-auto tabular-nums">
            {opportunityComponents.map((c, idx) => (
              <span key={c.name}>
                <span className="font-medium text-foreground/70">{c.name}:</span> {formatCurrency(c.low)}–{formatCurrency(c.high)}
                {idx < opportunityComponents.length - 1 && <span className="mx-2 text-border">|</span>}
              </span>
            ))}
          </p>
        </section>

        <SectionDivider />

        {/* Tier Progression Ladder */}
        <TierProgressionSection orgId={orgId!} metrics={data} />

        <SectionDivider />

        {/* Assessment Summary */}
        <section id="summary" className="scroll-mt-24">
          <div className="curve-card border-l-4 border-l-accent p-8">
            <p className="curve-eyebrow mb-3">Assessment Summary</p>
            <p className="text-base leading-relaxed text-foreground/90" style={{ fontSize: "16px" }}>{data.diagnosis_text}</p>
          </div>
        </section>

        <SectionDivider />

        {/* Engine Score Cards */}
        <section id="engines" className="scroll-mt-24" data-print-break="true">
          <h2 className="curve-eyebrow mb-4">Engine Scores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <EngineCard name="Pricing" score={data.pricing_score} low={data.pricing_opportunity_low} high={data.pricing_opportunity_high} />
            <EngineCard name="Sponsorship" score={data.sponsorship_score} low={data.sponsorship_opportunity_low} high={data.sponsorship_opportunity_high} />
            <EngineCard
              name="Apparel"
              score={data.apparel_score}
              low={data.apparel_opportunity_low}
              high={data.apparel_opportunity_high}
              opportunityLabel="Apparel Margin Opportunity"
              subtext="Estimated additional annual margin from uniform markup improvement and hard goods wallet recapture"
            />
            <EngineCard name="Events" score={data.event_score} low={data.event_opportunity_low} high={data.event_opportunity_high} />
            {isFacilityOrg ? (
              <AddOnsFacilityNote />
            ) : (
              <EngineCard
                name="Add-Ons — Remote Training"
                score={data.addon_score}
                low={data.addon_opportunity_low}
                high={data.addon_opportunity_high}
                subtext="Based on $100/month remote training package at 10% player adoption"
              />
            )}
            <RetentionCard
              score={Number(data.retention_score)}
              health={String(data.retention_health ?? "Healthy")}
              retentionPct={Number(intake?.retention_pct ?? 0)}
              revenueProtectedPerPct={Number(data.revenue_protected_per_pct ?? 0)}
              referralLow={Number(data.retention_referral_opportunity_low ?? 0)}
              referralHigh={Number(data.retention_referral_opportunity_high ?? 0)}
            />
            {isFacilityOrg && data.facility_score !== null && data.facility_score !== undefined && (
              <EngineCard name="Facility" score={data.facility_score} low={data.facility_opportunity_low ?? 0} high={data.facility_opportunity_high ?? 0} />
            )}
            {hasAffiliates && data.affiliate_score !== null && data.affiliate_score !== undefined && (
              <EngineCard
                name="Affiliate Program"
                score={Number(data.affiliate_score)}
                low={Number(data.affiliate_fee_opportunity_low ?? 0)}
                high={Number(data.affiliate_fee_opportunity_high ?? 0)}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">
            All organizations should have a formal retention and referral plan in place.
          </p>
        </section>

        <SectionDivider />

        {/* Opportunity Breakdown */}
        <section id="breakdown" className="scroll-mt-24">
          <h2 className="curve-eyebrow mb-4">Opportunity Breakdown</h2>
          <div className="curve-card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Engine</th>
                  <th className="px-5 py-3 font-medium text-right">Opportunity Low</th>
                  <th className="px-5 py-3 font-medium text-right">Opportunity High</th>
                  <th className="px-5 py-3 font-medium text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {(([
                  ["Pricing", data.pricing_opportunity_low, data.pricing_opportunity_high, data.pricing_score],
                  ["Sponsorship", data.sponsorship_opportunity_low, data.sponsorship_opportunity_high, data.sponsorship_score],
                  ["Apparel Margin", data.apparel_opportunity_low, data.apparel_opportunity_high, data.apparel_score],
                  ["Events", data.event_opportunity_low, data.event_opportunity_high, data.event_score],
                  ...(!isFacilityOrg
                    ? [["Add-Ons (Remote Training)", data.addon_opportunity_low, data.addon_opportunity_high, data.addon_score]]
                    : []),
                  ["Retention", data.retention_referral_opportunity_low ?? data.retention_opportunity_low, data.retention_referral_opportunity_high ?? data.retention_opportunity_high, data.retention_score],
                  ...(isFacilityOrg && data.facility_score !== null && data.facility_score !== undefined
                    ? [["Facility", data.facility_opportunity_low ?? 0, data.facility_opportunity_high ?? 0, data.facility_score]]
                    : []),
                  ...(hasAffiliates && data.affiliate_score !== null && data.affiliate_score !== undefined
                    ? [["Affiliate Program", data.affiliate_fee_opportunity_low ?? 0, data.affiliate_fee_opportunity_high ?? 0, data.affiliate_score]]
                    : []),
                ]) as Array<[string, number, number, number]>).map(([n, lo, hi, s], idx) => (
                  <tr key={n as string} className={idx % 2 === 1 ? "bg-muted/30" : ""}>
                    <td className="px-5 py-3 font-medium">{n}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(lo as number)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(hi as number)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{s as number} / 10</td>
                  </tr>
                ))}
                <tr className="bg-secondary/60 font-bold border-t-2 border-border">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(data.total_opportunity_low)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(data.total_opportunity_high)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{data.total_engine_score} / 60</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <SectionDivider />

        {/* 90-Day Priority Plan */}
        <section id="plan" className="scroll-mt-24" data-print-break="true">
          <h2 className="curve-eyebrow mb-4">Your 90-Day Priority Plan</h2>
          <div className="space-y-4">
            {top3.map((engine, idx) => {
              const steps = NEXT_STEPS_FALLBACK[engine.name] ?? NEXT_STEPS_FALLBACK["Pricing"];
              const isPrimary = idx === 0;
              return (
                <div
                  key={engine.name}
                  className={`curve-card ${isPrimary ? "border-l-[6px] border-l-accent" : "border-l-4 border-l-accent/40"} ${isPrimary ? "p-7" : "p-6"}`}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        Priority #{idx + 1}
                      </span>
                      <h3 className={`font-display font-semibold ${isPrimary ? "text-2xl" : "text-xl"}`}>
                        {engine.name}
                      </h3>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-soft text-accent border border-accent/30 tabular-nums">
                      {engine.score} / 10
                    </span>
                  </div>
                  <ol className="space-y-3">
                    {steps.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Wrap>
  );
}
