import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { formatCurrency, formatPct, formatDate } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Check } from "lucide-react";

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

function EngineCard({ name, score, low, high }: { name: string; score: number; low: number; high: number }) {
  return (
    <div className="curve-card">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display font-semibold text-base">{name}</h3>
        <span className="font-display text-2xl font-semibold tabular-nums">
          {score}<span className="text-muted-foreground text-base font-normal"> / 10</span>
        </span>
      </div>
      <ScoreBar score={score} />
      <p className="text-xs text-muted-foreground mt-3">
        Opportunity: <span className="text-foreground font-medium">{formatCurrency(low)} – {formatCurrency(high)}</span>
      </p>
    </div>
  );
}

export default function Report() {
  const { orgId: paramOrgId } = useParams<{ orgId?: string }>();
  const { profile, role } = useAuth();
  const [data, setData] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [intake, setIntake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const orgId = paramOrgId ?? profile?.org_id;

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

  if (loading) return <AppShell><p className="text-muted-foreground text-sm">Loading…</p></AppShell>;
  if (!orgId) return <AppShell><p className="text-muted-foreground text-sm">No organization linked.</p></AppShell>;
  if (err || !data) return <AppShell><p className="text-muted-foreground text-sm">{err ?? "No data."}</p></AppShell>;

  const isFacilityOrg = org?.org_type === "Facility + Teams" || org?.org_type === "Facility Only" ||
    intake?.org_type === "Facility + Teams" || intake?.org_type === "Facility Only";

  const totalRevenue = Number(intake?.total_annual_revenue ?? 0);
  const tier = data.monetization_tier as string;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="curve-eyebrow mb-2">Revenue Leak Report</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              {org?.name ?? intake?.organization_name ?? "Organization"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generated {formatDate(data.calculated_at)}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${TIER_STYLES[tier] ?? "bg-secondary"}`}>
            {tier} Tier
          </span>
        </header>

        {/* Revenue Snapshot */}
        <section>
          <h2 className="curve-eyebrow mb-4">Revenue Snapshot</h2>
          <div className={`grid gap-4 ${isFacilityOrg ? "md:grid-cols-5" : "md:grid-cols-4"} grid-cols-1 sm:grid-cols-2`}>
            <div className="curve-card">
              <p className="text-xs text-muted-foreground">Total Annual Revenue</p>
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
                        Based on average family spend of $400/month on private instruction. A facility serving your player base should capture a minimum of $1,200 per player annually in facility and instruction revenue.
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
          </div>
        </section>

        {/* Concentration alert */}
        {(data.high_dues_concentration || data.high_sponsorship_dependency) && (
          <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm space-y-1">
            {data.high_dues_concentration && (
              <p><span className="font-semibold">Revenue Concentration Alert:</span> 85%+ of revenue is from player fees. Diversification is a priority.</p>
            )}
            {data.high_sponsorship_dependency && (
              <p><span className="font-semibold">Sponsorship Dependency Alert:</span> Sponsorships represent 30%+ of total revenue. Multi-year agreements are recommended.</p>
            )}
          </div>
        )}

        {/* Revenue Opportunity */}
        <section className="text-center py-8 border-y border-border">
          <p className="curve-eyebrow mb-3">Revenue Opportunity</p>
          <p className="font-display text-5xl sm:text-6xl font-semibold tracking-tight">
            {formatCurrency(data.total_opportunity_low)} – {formatCurrency(data.total_opportunity_high)}
          </p>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto">
            Estimated additional annual revenue available based on your current structure and market.
          </p>
        </section>

        {/* Assessment Summary */}
        <section>
          <div className="curve-card border-l-4 border-l-accent">
            <p className="curve-eyebrow mb-2">Assessment Summary</p>
            <p className="text-base leading-relaxed text-foreground/90">{data.diagnosis_text}</p>
            {Number(data.apparel_profit) > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                Current estimated apparel profit: {formatCurrency(data.apparel_profit)} based on reported margin.
              </p>
            )}
          </div>
        </section>

        {/* Engine Score Cards */}
        <section>
          <h2 className="curve-eyebrow mb-4">Engine Scores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <EngineCard name="Pricing" score={data.pricing_score} low={data.pricing_opportunity_low} high={data.pricing_opportunity_high} />
            <EngineCard name="Sponsorship" score={data.sponsorship_score} low={data.sponsorship_opportunity_low} high={data.sponsorship_opportunity_high} />
            <EngineCard name="Apparel" score={data.apparel_score} low={data.apparel_opportunity_low} high={data.apparel_opportunity_high} />
            <EngineCard name="Events" score={data.event_score} low={data.event_opportunity_low} high={data.event_opportunity_high} />
            <EngineCard name="Add-Ons" score={data.addon_score} low={data.addon_opportunity_low} high={data.addon_opportunity_high} />
            <EngineCard name="Retention" score={data.retention_score} low={data.retention_opportunity_low} high={data.retention_opportunity_high} />
          </div>
        </section>

        {/* Opportunity Breakdown */}
        <section>
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
              <tbody className="divide-y divide-border">
                {[
                  ["Pricing", data.pricing_opportunity_low, data.pricing_opportunity_high, data.pricing_score],
                  ["Sponsorship", data.sponsorship_opportunity_low, data.sponsorship_opportunity_high, data.sponsorship_score],
                  ["Apparel", data.apparel_opportunity_low, data.apparel_opportunity_high, data.apparel_score],
                  ["Events", data.event_opportunity_low, data.event_opportunity_high, data.event_score],
                  ["Add-Ons", data.addon_opportunity_low, data.addon_opportunity_high, data.addon_score],
                  ["Retention", data.retention_opportunity_low, data.retention_opportunity_high, data.retention_score],
                ].map(([n, lo, hi, s]) => (
                  <tr key={n as string}>
                    <td className="px-5 py-3 font-medium">{n}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(lo as number)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(hi as number)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{s as number} / 10</td>
                  </tr>
                ))}
                <tr className="bg-secondary/50 font-semibold">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(data.total_opportunity_low)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(data.total_opportunity_high)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{data.total_engine_score} / 60</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Recommended First Moves */}
        <section>
          <div className="curve-card border-l-4 border-l-accent">
            <p className="curve-eyebrow mb-2">Recommended First Moves</p>
            <h3 className="font-display text-xl font-semibold mb-4">{data.priority_engine}</h3>
            <ol className="space-y-3">
              {(Array.isArray(data.next_steps) ? data.next_steps : []).map((s: string, i: number) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
