import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  RiskAssessmentSection,
  AdminAlertsBanner,
  MonetizationTierGuide,
  type AdminAlert,
} from "@/components/admin/RiskAssessment";
import { Activity, Search, ExternalLink, AlertTriangle, ShieldAlert } from "lucide-react";

type Severity = "Low" | "Medium" | "High";
type Complexity = "Straightforward" | "Moderate" | "Complex";

type Row = {
  org_id: string;
  org_name: string;
  overall_health_score: number | null;
  operations_health_score: number | null;
  market_position_health_score: number | null;
  program_health_score: number | null;
  strategic_clarity_score: number | null;
  execution_risk: Severity | null;
  market_risk: Severity | null;
  retention_risk: Severity | null;
  engagement_complexity: Complexity | null;
  engagement_approach_recommendation: string | null;
  pricing_strategy_note: string | null;
  monetization_tier: string | null;
  priority_engine: string | null;
  admin_alerts: AdminAlert[];
  calculated_at: string | null;
  submitted_at: string | null;
};

const RISK_OPTIONS: ("All" | Severity)[] = ["All", "Low", "Medium", "High"];
const COMPLEXITY_OPTIONS: ("All" | Complexity)[] = ["All", "Straightforward", "Moderate", "Complex"];
const TIER_OPTIONS = ["All", "Foundational", "Emerging", "Growth", "Advanced", "Elite"];
const SORT_OPTIONS = [
  { value: "alerts", label: "High alerts first" },
  { value: "health_asc", label: "Health (low → high)" },
  { value: "health_desc", label: "Health (high → low)" },
  { value: "name", label: "Org name (A→Z)" },
  { value: "recent", label: "Most recently calculated" },
];

const RISK_BADGE: Record<Severity, string> = {
  Low: "bg-accent-soft text-accent border-accent/30",
  Medium: "bg-warning-soft text-warning border-warning/30",
  High: "bg-destructive/10 text-destructive border-destructive/30",
};
const COMPLEXITY_BADGE: Record<Complexity, string> = {
  Straightforward: "bg-accent-soft text-accent border-accent/30",
  Moderate: "bg-warning-soft text-warning border-warning/30",
  Complex: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function AdminHealthReports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<"All" | Severity>("All");
  const [complexity, setComplexity] = useState<"All" | Complexity>("All");
  const [tier, setTier] = useState("All");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [sort, setSort] = useState<string>("alerts");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select(`
          id, name,
          organization_intake(submitted_at),
          derived_metrics(
            overall_health_score, operations_health_score, market_position_health_score,
            program_health_score, strategic_clarity_score,
            execution_risk, market_risk, retention_risk,
            engagement_complexity, engagement_approach_recommendation,
            pricing_strategy_note, monetization_tier, priority_engine,
            admin_alerts, calculated_at
          )
        `);

      const mapped: Row[] = ((data ?? []) as any[]).map((o) => {
        const intake = Array.isArray(o.organization_intake) ? o.organization_intake[0] : o.organization_intake;
        const m = Array.isArray(o.derived_metrics) ? o.derived_metrics[0] : o.derived_metrics;
        return {
          org_id: o.id,
          org_name: o.name,
          overall_health_score: m?.overall_health_score ?? null,
          operations_health_score: m?.operations_health_score ?? null,
          market_position_health_score: m?.market_position_health_score ?? null,
          program_health_score: m?.program_health_score ?? null,
          strategic_clarity_score: m?.strategic_clarity_score ?? null,
          execution_risk: m?.execution_risk ?? null,
          market_risk: m?.market_risk ?? null,
          retention_risk: m?.retention_risk ?? null,
          engagement_complexity: m?.engagement_complexity ?? null,
          engagement_approach_recommendation: m?.engagement_approach_recommendation ?? null,
          pricing_strategy_note: m?.pricing_strategy_note ?? null,
          monetization_tier: m?.monetization_tier ?? null,
          priority_engine: m?.priority_engine ?? null,
          admin_alerts: Array.isArray(m?.admin_alerts) ? (m.admin_alerts as AdminAlert[]) : [],
          calculated_at: m?.calculated_at ?? null,
          submitted_at: intake?.submitted_at ?? null,
        };
      });
      setRows(mapped);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let r = rows.filter((row) => {
      if (!row.submitted_at) return false; // only orgs with intake submitted
      if (q && !row.org_name.toLowerCase().includes(q)) return false;
      if (risk !== "All") {
        const hasRisk =
          row.execution_risk === risk || row.market_risk === risk || row.retention_risk === risk;
        if (!hasRisk) return false;
      }
      if (complexity !== "All" && row.engagement_complexity !== complexity) return false;
      if (tier !== "All" && row.monetization_tier !== tier) return false;
      if (alertsOnly && !row.admin_alerts.some((a) => a.severity === "high")) return false;
      return true;
    });

    r = [...r].sort((a, b) => {
      switch (sort) {
        case "health_asc":
          return (a.overall_health_score ?? 999) - (b.overall_health_score ?? 999);
        case "health_desc":
          return (b.overall_health_score ?? -1) - (a.overall_health_score ?? -1);
        case "name":
          return a.org_name.localeCompare(b.org_name);
        case "recent":
          return (b.calculated_at ?? "").localeCompare(a.calculated_at ?? "");
        case "alerts":
        default: {
          const ah = a.admin_alerts.filter((x) => x.severity === "high").length;
          const bh = b.admin_alerts.filter((x) => x.severity === "high").length;
          if (bh !== ah) return bh - ah;
          return (a.overall_health_score ?? 999) - (b.overall_health_score ?? 999);
        }
      }
    });
    return r;
  }, [rows, search, risk, complexity, tier, alertsOnly, sort]);

  const summary = useMemo(() => {
    const highAlerts = rows.filter((r) => r.admin_alerts.some((a) => a.severity === "high")).length;
    const complex = rows.filter((r) => r.engagement_complexity === "Complex").length;
    const scored = rows.filter((r) => r.overall_health_score != null);
    const avg = scored.length
      ? Math.round(scored.reduce((s, r) => s + (r.overall_health_score ?? 0), 0) / scored.length)
      : 0;
    return { highAlerts, complex, avg, total: rows.filter((r) => r.submitted_at).length };
  }, [rows]);

  const active = openId ? rows.find((r) => r.org_id === openId) ?? null : null;

  return (
    <AppShell title="Health Reports">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">Internal · Curve Admins</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Health Reports</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Engagement intelligence and risk posture across the portfolio
          </p>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={<Activity className="h-4 w-4 text-info" />}
          label="Reports available"
          value={loading ? "—" : summary.total}
        />
        <SummaryCard
          icon={<Activity className="h-4 w-4" style={{ color: "#8B5CF6" }} />}
          label="Avg health score"
          value={loading ? "—" : `${summary.avg}/40`}
        />
        <SummaryCard
          icon={<AlertTriangle className={cn("h-4 w-4", summary.complex > 0 ? "text-destructive" : "text-accent")} />}
          label="Complex engagements"
          value={loading ? "—" : summary.complex}
          valueClass={summary.complex > 0 ? "text-destructive" : "text-accent"}
        />
        <SummaryCard
          icon={<ShieldAlert className={cn("h-4 w-4", summary.highAlerts > 0 ? "text-destructive" : "text-accent")} />}
          label="Orgs with high alerts"
          value={loading ? "—" : summary.highAlerts}
          valueClass={summary.highAlerts > 0 ? "text-destructive" : "text-accent"}
        />
      </div>

      {/* Filters */}
      <div className="curve-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations…"
              className="pl-9"
            />
          </div>
          <FilterSelect label="Risk" value={risk} onChange={(v) => setRisk(v as any)} options={RISK_OPTIONS} />
          <FilterSelect label="Complexity" value={complexity} onChange={(v) => setComplexity(v as any)} options={COMPLEXITY_OPTIONS} />
          <FilterSelect label="Tier" value={tier} onChange={setTier} options={TIER_OPTIONS} />
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS.map((o) => o.value)}
            displayMap={Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, o.label]))}
          />
        </div>
        <label className="inline-flex items-center gap-2 mt-4 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={alertsOnly}
            onChange={(e) => setAlertsOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-destructive"
          />
          <span className="text-foreground">Show only orgs with high-severity alerts</span>
        </label>
      </div>

      {/* Table */}
      <div className="curve-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 border-b border-border">
              <tr className="text-left">
                <Th>Organization</Th>
                <Th>Health</Th>
                <Th>Complexity</Th>
                <Th>Execution</Th>
                <Th>Market</Th>
                <Th>Retention</Th>
                <Th>Tier</Th>
                <Th>Alerts</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No organizations match the current filters.</td></tr>
              ) : (
                filtered.map((row) => {
                  const highCount = row.admin_alerts.filter((a) => a.severity === "high").length;
                  const medCount = row.admin_alerts.filter((a) => a.severity === "medium").length;
                  return (
                    <tr
                      key={row.org_id}
                      onClick={() => setOpenId(row.org_id)}
                      className="cursor-pointer hover:bg-secondary/30 transition-colors"
                    >
                      <Td>
                        <div className="font-display font-semibold text-foreground">{row.org_name}</div>
                        {row.priority_engine && (
                          <div className="text-xs text-muted-foreground mt-0.5">Priority: {row.priority_engine}</div>
                        )}
                      </Td>
                      <Td>
                        <span className="font-semibold tabular-nums" style={{ color: "#8B5CF6" }}>
                          {row.overall_health_score ?? "—"}<span className="text-muted-foreground font-normal">/40</span>
                        </span>
                      </Td>
                      <Td>
                        {row.engagement_complexity ? (
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", COMPLEXITY_BADGE[row.engagement_complexity])}>
                            {row.engagement_complexity}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </Td>
                      <Td><RiskCell value={row.execution_risk} /></Td>
                      <Td><RiskCell value={row.market_risk} /></Td>
                      <Td><RiskCell value={row.retention_risk} /></Td>
                      <Td><span className="text-muted-foreground">{row.monetization_tier ?? "—"}</span></Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          {highCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/30">
                              {highCount} high
                            </span>
                          )}
                          {medCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-warning-soft text-warning border border-warning/30">
                              {medCount} med
                            </span>
                          )}
                          {highCount === 0 && medCount === 0 && <span className="text-muted-foreground text-xs">None</span>}
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs text-muted-foreground">View →</span>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader className="text-left mb-6">
                <p className="curve-eyebrow mb-1">Health Report</p>
                <SheetTitle className="font-display text-2xl">{active.org_name}</SheetTitle>
                <SheetDescription>
                  Overall health{" "}
                  <span className="font-semibold" style={{ color: "#8B5CF6" }}>
                    {active.overall_health_score ?? "—"}/40
                  </span>
                  {active.calculated_at && (
                    <> · Calculated {new Date(active.calculated_at).toLocaleDateString()}</>
                  )}
                </SheetDescription>
                <Link
                  to={`/admin/org/${active.org_id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline mt-2"
                >
                  Open full org detail <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </SheetHeader>

              <AdminAlertsBanner alerts={active.admin_alerts ?? []} />

              <div className="space-y-6">
                <div>
                  <p className="curve-eyebrow mb-3">Health Dimensions</p>
                  <div className="grid grid-cols-2 gap-3">
                    <DimCard label="Operations" value={active.operations_health_score} />
                    <DimCard label="Market Position" value={active.market_position_health_score} />
                    <DimCard label="Program" value={active.program_health_score} />
                    <DimCard label="Strategic Clarity" value={active.strategic_clarity_score} />
                  </div>
                </div>

                <RiskAssessmentSection
                  executionRisk={active.execution_risk}
                  marketRisk={active.market_risk}
                  retentionRisk={active.retention_risk}
                  engagementComplexity={active.engagement_complexity}
                  engagementRecommendation={active.engagement_approach_recommendation}
                  pricingStrategyNote={active.pricing_strategy_note}
                />

                <MonetizationTierGuide currentTier={active.monetization_tier} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function SummaryCard({
  icon, label, value, valueClass = "",
}: { icon: React.ReactNode; label: string; value: any; valueClass?: string; }) {
  return (
    <div className="curve-card">
      <div className="flex items-center gap-2 mb-3">{icon}<p className="curve-eyebrow">{label}</p></div>
      <p className={cn("curve-stat", valueClass)}>{value}</p>
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options, displayMap,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  displayMap?: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="curve-eyebrow block mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>{displayMap?.[o] ?? o}</option>
        ))}
      </select>
    </label>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{children}</th>;
}
function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}

function RiskCell({ value }: { value: Severity | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", RISK_BADGE[value])}>
      {value}
    </span>
  );
}

function DimCard({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, (v / 10) * 100));
  return (
    <div className="curve-card">
      <p className="curve-eyebrow mb-2">{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums">
        {value ?? "—"}<span className="text-sm font-normal text-muted-foreground">/10</span>
      </p>
      <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#8B5CF6" }} />
      </div>
    </div>
  );
}
