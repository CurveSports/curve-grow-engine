import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { ENGINES } from "@/lib/tasks";
import { formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Lightbulb } from "lucide-react";

// Map engine -> derived_metrics opportunity_high field
const ENGINE_OPPORTUNITY_FIELD: Record<string, string> = {
  Pricing: "pricing_opportunity_high",
  Sponsorship: "sponsorship_opportunity_high",
  Apparel: "apparel_opportunity_high",
  Events: "event_opportunity_high",
  "Add-Ons": "addon_opportunity_high",
  Retention: "retention_opportunity_high",
  Facility: "facility_opportunity_high",
  Affiliate: "affiliate_fee_opportunity_high",
};

type EngineStat = { total: number; completed: number; opportunity: number };
type Row = {
  id: string;
  name: string;
  tier: string | null;
  total: number;
  completed: number;
  overdue: number;
  draft: number;
  last_activity: string | null;
  by_engine: Record<string, EngineStat>;
  plan_activated_at: string | null;
  revenue_needs_review: boolean;
};

type SortKey = "name" | "completion" | "overdue" | "last_activity" | "tier";
type SortDir = "asc" | "desc";

const TIER_ORDER: Record<string, number> = {
  Foundational: 1, Emerging: 2, Growth: 3, Advanced: 4, Elite: 5,
};

const engineBarColor = (pct: number): string => {
  if (pct >= 80) return "bg-accent";
  if (pct >= 40) return "bg-amber-500";
  if (pct > 0) return "bg-red-500";
  return "bg-border";
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function AdminTasks() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // controls
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue" | "review" | "intake" | "stale">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [density, setDensity] = useState<"comfy" | "compact">("comfy");
  const [groupBy, setGroupBy] = useState<"org" | "engine">("org");

  useEffect(() => {
    (async () => {
      const metricsCols = "org_id, monetization_tier, " + Object.values(ENGINE_OPPORTUNITY_FIELD).join(", ");
      const [{ data: orgs }, { data: tasks }, { data: metrics }, { data: intakes }] = await Promise.all([
        supabase.from("organizations").select("id, name, plan_activated_at"),
        supabase.from("org_tasks").select("org_id, engine, status, last_activity_at, plan_status"),
        supabase.from("derived_metrics").select(metricsCols),
        supabase.from("organization_intake").select("org_id, revenue_needs_review"),
      ]);

      const tierByOrg = new Map<string, string | null>();
      const oppByOrg = new Map<string, Record<string, number>>();
      for (const m of metrics ?? []) {
        const mm = m as any;
        tierByOrg.set(mm.org_id, mm.monetization_tier);
        const opp: Record<string, number> = {};
        for (const [engine, field] of Object.entries(ENGINE_OPPORTUNITY_FIELD)) {
          opp[engine] = Number(mm[field]) || 0;
        }
        oppByOrg.set(mm.org_id, opp);
      }
      const reviewByOrg = new Map<string, boolean>();
      for (const i of intakes ?? []) reviewByOrg.set((i as any).org_id, !!(i as any).revenue_needs_review);

      const r: Row[] = (orgs ?? []).map((o: any) => {
        const list = (tasks ?? []).filter((t: any) => t.org_id === o.id);
        const opp = oppByOrg.get(o.id) ?? {};
        const by_engine: Record<string, EngineStat> = {};
        for (const e of ENGINES) by_engine[e] = { total: 0, completed: 0, opportunity: opp[e] ?? 0 };
        for (const t of list) {
          if (!by_engine[t.engine]) by_engine[t.engine] = { total: 0, completed: 0, opportunity: opp[t.engine] ?? 0 };
          by_engine[t.engine].total++;
          if (t.status === "completed") by_engine[t.engine].completed++;
        }
        const last = list.map((t: any) => t.last_activity_at).filter(Boolean).sort().reverse()[0] ?? null;
        return {
          id: o.id,
          name: o.name,
          tier: tierByOrg.get(o.id) ?? null,
          total: list.length,
          completed: list.filter((t: any) => t.status === "completed").length,
          overdue: list.filter((t: any) => t.status === "overdue").length,
          draft: list.filter((t: any) => t.plan_status === "draft").length,
          last_activity: last,
          by_engine,
          plan_activated_at: o.plan_activated_at,
          revenue_needs_review: reviewByOrg.get(o.id) ?? false,
        };
      });
      setRows(r);
      setLoading(false);
    })();
  }, []);

  // ---- KPIs ----
  const kpis = useMemo(() => {
    const totalOrgs = rows.length;
    const orgsWithTasks = rows.filter(r => r.total > 0);
    const avgPct = orgsWithTasks.length
      ? Math.round(orgsWithTasks.reduce((s, r) => s + (r.completed / r.total) * 100, 0) / orgsWithTasks.length)
      : 0;
    const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);
    const stale = rows.filter(r => {
      const d = daysSince(r.last_activity);
      return d === null || d >= 14;
    }).length;
    return { totalOrgs, avgPct, totalOverdue, stale };
  }, [rows]);

  // ---- Filter + sort ----
  const visibleRows = useMemo(() => {
    let out = rows.slice();
    const q = query.trim().toLowerCase();
    if (q) out = out.filter(r => r.name.toLowerCase().includes(q));
    if (tierFilter !== "all") out = out.filter(r => (r.tier ?? "—") === tierFilter);
    if (statusFilter === "overdue") out = out.filter(r => r.overdue > 0);
    if (statusFilter === "review") out = out.filter(r => r.revenue_needs_review || (!r.plan_activated_at && r.draft > 0));
    if (statusFilter === "intake") out = out.filter(r => !r.plan_activated_at && r.draft === 0);
    if (statusFilter === "stale") out = out.filter(r => {
      const d = daysSince(r.last_activity);
      return d === null || d >= 14;
    });

    out.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "tier") cmp = (TIER_ORDER[a.tier ?? ""] ?? 0) - (TIER_ORDER[b.tier ?? ""] ?? 0);
      else if (sortKey === "completion") {
        const ap = a.total > 0 ? a.completed / a.total : -1;
        const bp = b.total > 0 ? b.completed / b.total : -1;
        cmp = ap - bp;
      } else if (sortKey === "overdue") cmp = a.overdue - b.overdue;
      else if (sortKey === "last_activity") {
        const at = a.last_activity ? new Date(a.last_activity).getTime() : 0;
        const bt = b.last_activity ? new Date(b.last_activity).getTime() : 0;
        cmp = at - bt;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, query, tierFilter, statusFilter, sortKey, sortDir]);

  // ---- Engine pivot ----
  const engineStats = useMemo(() => {
    return ENGINES.map(e => {
      let total = 0, completed = 0, orgsWith = 0;
      for (const r of visibleRows) {
        const s = r.by_engine[e];
        if (s && s.total > 0) {
          total += s.total;
          completed += s.completed;
          orgsWith++;
        }
      }
      return { engine: e, total, completed, orgsWith, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
  }, [visibleRows]);

  const tiers = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.tier) set.add(r.tier);
    return Array.from(set).sort((a, b) => (TIER_ORDER[a] ?? 0) - (TIER_ORDER[b] ?? 0));
  }, [rows]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "name" || k === "tier" ? "asc" : "desc"); }
  }

  if (loading) return <AppShell><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  const cellPad = density === "compact" ? "px-3 py-2" : "px-5 py-4";

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Organizations" value={kpis.totalOrgs} />
        <KpiCard label="Avg completion" value={`${kpis.avgPct}%`} />
        <KpiCard label="Overdue tasks" value={kpis.totalOverdue} tone={kpis.totalOverdue > 0 ? "danger" : "default"} />
        <KpiCard label="Stale (14d+)" value={kpis.stale} tone={kpis.stale > 0 ? "warning" : "default"} />
      </div>

      {/* Controls */}
      <div className="curve-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search organizations…"
            className="pl-9 h-9"
          />
        </div>
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All tiers</option>
          {tiers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="overdue">Has overdue</option>
          <option value="review">Needs review</option>
          <option value="intake">Awaiting intake</option>
          <option value="stale">Stale (14d+)</option>
        </select>
        <div className="flex rounded-md border border-input overflow-hidden text-xs">
          <button
            onClick={() => setGroupBy("org")}
            className={`px-3 py-1.5 transition-colors ${groupBy === "org" ? "bg-accent text-accent-foreground" : "bg-background hover:bg-secondary"}`}
          >By org</button>
          <button
            onClick={() => setGroupBy("engine")}
            className={`px-3 py-1.5 transition-colors ${groupBy === "engine" ? "bg-accent text-accent-foreground" : "bg-background hover:bg-secondary"}`}
          >By engine</button>
        </div>
        <div className="flex rounded-md border border-input overflow-hidden text-xs">
          <button
            onClick={() => setDensity("comfy")}
            className={`px-3 py-1.5 transition-colors ${density === "comfy" ? "bg-secondary text-foreground" : "bg-background hover:bg-secondary"}`}
          >Comfy</button>
          <button
            onClick={() => setDensity("compact")}
            className={`px-3 py-1.5 transition-colors ${density === "compact" ? "bg-secondary text-foreground" : "bg-background hover:bg-secondary"}`}
          >Compact</button>
        </div>
      </div>

      {/* Body */}
      {groupBy === "org" ? (
        <div className="curve-card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <Th label="Organization" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} pad={cellPad} />
                <Th label="Tier" k="tier" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} pad={cellPad} />
                <Th label="Progress" k="completion" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} pad={cellPad} />
                <th className={`${cellPad} font-medium`}>By engine</th>
                <Th label="Overdue" k="overdue" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} pad={cellPad} align="right" />
                <Th label="Last activity" k="last_activity" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} pad={cellPad} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleRows.map(o => {
                const pct = o.total > 0 ? Math.round((o.completed / o.total) * 100) : 0;
                const needsReview = !o.plan_activated_at && o.draft > 0;
                const days = daysSince(o.last_activity);
                return (
                  <tr key={o.id} className="hover:bg-secondary/40 transition-colors">
                    <td className={cellPad}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/admin/org/${o.id}/tasks`} className="font-medium hover:text-accent transition-colors">{o.name}</Link>
                        {o.revenue_needs_review && (
                          <span
                            title="Org indicated their calculated revenue total may not be accurate."
                            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-warning/30 bg-warning-soft text-warning font-medium cursor-help"
                          >Revenue Review</span>
                        )}
                        {needsReview && (
                          <Link to={`/admin/org/${o.id}/tasks`} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors font-medium">
                            Review Plan · {o.draft}
                          </Link>
                        )}
                        {!o.plan_activated_at && o.draft === 0 && (
                          <span className="text-xs text-muted-foreground">(awaiting intake)</span>
                        )}
                      </div>
                    </td>
                    <td className={`${cellPad} text-xs`}>{o.tier ?? "—"}</td>
                    <td className={`${cellPad} min-w-[180px]`}>
                      {o.total > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">{o.completed}/{o.total}</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">No tasks</span>}
                    </td>
                    <td className={cellPad}>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 min-w-[260px]">
                        {ENGINES.map(e => {
                          const eng = o.by_engine[e] ?? { total: 0, completed: 0, opportunity: 0 };
                          const has = eng.total > 0;
                          const ePct = has ? Math.round((eng.completed / eng.total) * 100) : 0;
                          const showOpportunity = !has && eng.opportunity > 0;
                          const oppLabel = eng.opportunity >= 1000
                            ? `$${Math.round(eng.opportunity / 1000)}K`
                            : `$${Math.round(eng.opportunity)}`;
                          return (
                            <div
                              key={e}
                              className={`flex items-center gap-1.5 ${has ? "" : showOpportunity ? "opacity-70" : "opacity-30"}`}
                              title={has ? `${e}: ${eng.completed}/${eng.total} (${ePct}%)` : `${e}: no tasks`}
                            >
                              <span className="text-[10px] text-muted-foreground w-12 truncate">{e.slice(0, 4)}</span>
                              <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden min-w-[24px]">
                                <div className={`h-full ${engineBarColor(ePct)}`} style={{ width: has ? `${ePct}%` : "0%" }} />
                              </div>
                              {showOpportunity ? (
                                <Link
                                  to={`/admin/org/${o.id}?tab=tasks`}
                                  title={`Untapped opportunity per metrics: up to ${oppLabel}/yr — click to build ${e} tasks`}
                                  className="inline-flex items-center justify-center w-7 h-4 rounded text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                                  onClick={(ev) => ev.stopPropagation()}
                                >
                                  <Lightbulb className="h-3 w-3" />
                                </Link>
                              ) : (
                                <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right">{has ? `${ePct}%` : "—"}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className={`${cellPad} text-right tabular-nums`}>
                      {o.overdue > 0 ? <span className="text-red-600 font-medium">{o.overdue}</span> : <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className={`${cellPad} text-xs text-muted-foreground`}>
                      {o.last_activity ? (
                        <span title={formatDate(o.last_activity)}>
                          {days === 0 ? "Today" : days === 1 ? "1d ago" : `${days}d ago`}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">No organizations match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="curve-card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className={`${cellPad} font-medium`}>Engine</th>
                <th className={`${cellPad} font-medium`}>Portfolio progress</th>
                <th className={`${cellPad} font-medium text-right`}>Tasks</th>
                <th className={`${cellPad} font-medium text-right`}>Orgs with work</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {engineStats.map(s => (
                <tr key={s.engine} className={s.total === 0 ? "opacity-50" : ""}>
                  <td className={`${cellPad} font-medium`}>{s.engine}</td>
                  <td className={`${cellPad} min-w-[260px]`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full ${engineBarColor(s.pct)}`} style={{ width: `${s.pct}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">{s.pct}%</span>
                    </div>
                  </td>
                  <td className={`${cellPad} text-right tabular-nums text-xs text-muted-foreground`}>
                    {s.completed}/{s.total}
                  </td>
                  <td className={`${cellPad} text-right tabular-nums text-xs text-muted-foreground`}>
                    {s.orgsWith}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "danger" | "warning" }) {
  const toneCls =
    tone === "danger" ? "text-red-600" :
    tone === "warning" ? "text-warning" :
    "text-foreground";
  return (
    <div className="curve-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</p>
    </div>
  );
}

function Th({
  label, k, sortKey, sortDir, onClick, pad, align = "left",
}: {
  label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir;
  onClick: (k: SortKey) => void; pad: string; align?: "left" | "right";
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`${pad} font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground" : ""}`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}
