import { CurveBadge, getEngineRows, fmtRange } from "../shared";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIER_COLOR: Record<string, string> = {
  Foundational: "#94a3b8", Emerging: "#3b82f6", Growth: "#10b981",
  Advanced: "#8b5cf6", Elite: "#f59e0b",
};
const COMPLEXITY_COLOR: Record<string, string> = {
  Straightforward: "#10b981", Moderate: "#f59e0b", Complex: "#ef4444",
};
const RISK_COLOR: Record<string, string> = {
  Low: "#10b981", Medium: "#f59e0b", High: "#ef4444",
};

function StatCard({ label, value, sub, hex }: { label: string; value: string; sub?: string; hex?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">{label}</p>
      <p className="font-display text-3xl md:text-4xl font-bold mt-2 tabular-nums" style={{ color: hex ?? "#fff" }}>{value}</p>
      {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
    </div>
  );
}

function Pill({ children, hex }: { children: React.ReactNode; hex: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border"
      style={{ borderColor: hex + "66", backgroundColor: hex + "22", color: hex }}
    >
      {children}
    </span>
  );
}

export function Slide1Snapshot({ orgName, metrics, intake }: { orgName: string; metrics: any; intake: any }) {
  const engines = getEngineRows(metrics);
  const totalEngineScore = Number(metrics?.total_engine_score ?? engines.reduce((s, e) => s + e.score, 0));
  const overall = Number(metrics?.overall_health_score ?? 0);
  const complexity = metrics?.engagement_complexity as string | null;
  const priorityEngine = metrics?.priority_engine as string | null;
  const tier = metrics?.monetization_tier as string | null;
  const totalRev = Number(metrics?.calculated_total_revenue ?? 0);
  const rpp = Number(metrics?.revenue_per_player ?? 0);
  const rppBench = Number(metrics?.revenue_benchmark ?? 0);
  const oppLow = Number(metrics?.total_opportunity_low ?? 0);
  const oppHigh = Number(metrics?.total_opportunity_high ?? 0);
  const alerts = (metrics?.admin_alerts as any[] | null) ?? [];

  const growth = metrics?.growth_opportunity_direction as string | null;
  const leakage = metrics?.selection_leakage_flag === true;
  const revReview = intake?.revenue_needs_review === true;
  const multiBrand = intake?.operates_multiple_brands === true;
  const hasAffiliates = intake?.has_affiliates === true;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold">Intelligence Snapshot</p>
          <h2 className="font-display text-3xl font-bold mt-1">{orgName}</h2>
        </div>
        <CurveBadge />
      </div>

      {/* Row 1 — 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Overall Health Score" value={`${overall}/40`} hex="#a78bfa" />
        <StatCard label="Total Engine Score" value={`${totalEngineScore}/60`} hex="#10b981" />
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Engagement Complexity</p>
          <div className="mt-3">
            {complexity ? <Pill hex={COMPLEXITY_COLOR[complexity] ?? "#94a3b8"}>{complexity}</Pill> : <span className="text-white/40">—</span>}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Priority Engine</p>
          <div className="mt-3">
            {priorityEngine ? <Pill hex="#f59e0b">{priorityEngine}</Pill> : <span className="text-white/40">—</span>}
          </div>
        </div>
      </div>

      {/* Row 2 — revenue overview */}
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-3">Revenue Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] uppercase text-white/50">Total Revenue</p>
            <p className="font-display text-2xl font-bold tabular-nums">{formatCurrency(totalRev)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/50">Revenue Per Player</p>
            <p className="font-display text-2xl font-bold tabular-nums">{formatCurrency(rpp)}</p>
            <p className="text-xs text-white/60">vs {formatCurrency(rppBench)} benchmark</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/50">Total Opportunity</p>
            <p className="font-display text-2xl font-bold tabular-nums" style={{ color: "#10b981" }}>{fmtRange(oppLow, oppHigh)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/50">Monetization Tier</p>
            <div className="mt-1">{tier ? <Pill hex={TIER_COLOR[tier] ?? "#94a3b8"}>{tier}</Pill> : <span className="text-white/40">—</span>}</div>
          </div>
        </div>
      </div>

      {/* Row 3 — risks */}
      <div className="grid grid-cols-3 gap-3">
        {(["execution_risk", "market_risk", "retention_risk"] as const).map((k) => {
          const v = metrics?.[k] as string | null;
          const label = k === "execution_risk" ? "Execution" : k === "market_risk" ? "Market" : "Retention";
          return (
            <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">{label} Risk</span>
              {v ? <Pill hex={RISK_COLOR[v] ?? "#94a3b8"}>{v}</Pill> : <span className="text-white/40 text-xs">—</span>}
            </div>
          );
        })}
      </div>

      {/* Row 4 — alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-[11px] uppercase tracking-wider text-amber-200 font-semibold mb-2">Alert Flags</p>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a: any, i: number) => {
              const sev = (a?.severity ?? a?.level ?? "medium").toString().toLowerCase();
              const hex = sev === "high" || sev === "critical" ? "#ef4444" : "#f59e0b";
              return <Pill key={i} hex={hex}>{a?.message ?? a?.title ?? String(a)}</Pill>;
            })}
          </div>
        </div>
      )}

      {/* Row 5 — key signals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <Signal label="Growth Direction" value={growth ?? "—"} />
        <Signal label="Selection Leakage" value={leakage ? "Yes" : "No"} flag={leakage} />
        <Signal label="Revenue Review Needed" value={revReview ? "Yes" : "No"} flag={revReview} />
        <Signal label="Multiple Brands" value={multiBrand ? `Yes (${intake?.number_of_brands ?? "?"})` : "No"} />
        <Signal label="Affiliates" value={hasAffiliates ? `Yes (${intake?.number_of_affiliates ?? "?"})` : "No"} />
      </div>

      {/* Row 5b — Platform & Marketing universal engines */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <UniversalEngineCard
          label="Platform Setup"
          score={metrics?.platform_score ?? null}
          done={Number(metrics?.platform_tasks_complete ?? 0)}
          total={Number(metrics?.platform_tasks_total ?? 0)}
        />
        <UniversalEngineCard
          label="Marketing Foundation"
          score={metrics?.marketing_score ?? null}
          done={Number(metrics?.marketing_tasks_complete ?? 0)}
          total={Number(metrics?.marketing_tasks_total ?? 0)}
        />
      </div>

      {/* Row 6 — tier progression */}
      {metrics?.next_tier && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-[10px] uppercase text-white/50">Current Tier</p>
            {tier && <Pill hex={TIER_COLOR[tier] ?? "#94a3b8"}>{tier}</Pill>}
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/50">Next Tier</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Pill hex={TIER_COLOR[metrics.next_tier] ?? "#f59e0b"}>{metrics.next_tier}</Pill>
              <span className="text-white/70 tabular-nums">{metrics.points_to_next_tier} pts away</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/50">Fastest Path</p>
            <p className="text-sm font-semibold mt-0.5">
              {((metrics.fastest_path_engines as any[] | null) ?? []).slice(0, 2).map((e: any) => e.engine).join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-white/50">Project Aligned</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: metrics.project_aligned_with_fastest_path ? "#10b981" : "#f59e0b" }}>
              {metrics.project_aligned_with_fastest_path ? "Yes ✓" : "No ✗"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Signal({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3", flag ? "border-amber-500/40 bg-amber-500/10" : "border-white/10 bg-white/[0.04]")}>
      <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}

function UniversalEngineCard({ label, score, done, total }: { label: string; score: number | null; done: number; total: number }) {
  const hex =
    score === null ? "#94a3b8" :
    score >= 7 ? "#10b981" :
    score >= 4 ? "#f59e0b" : "#ef4444";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{label}</p>
        <p className="text-sm font-semibold mt-1 tabular-nums">{done} of {total} task{total === 1 ? "" : "s"} complete</p>
      </div>
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border tabular-nums"
        style={{ borderColor: hex + "66", backgroundColor: hex + "22", color: hex }}
      >
        {score ?? "—"}/10
      </span>
    </div>
  );
}
