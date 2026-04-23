import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { CheckCheck } from "lucide-react";
import { weekStartingMonday } from "@/lib/week";

import AdminProjectsCrossOrg from "@/pages/admin/AdminProjectsCrossOrg";
import { formatCurrency } from "@/lib/format";
import {
  Building2, DollarSign, ListChecks, Trophy, LayoutGrid, Rows3, Square,
  CheckCircle2, AlertCircle, Clock, Sparkles, FileText, Plus, AlertTriangle, ShieldAlert, FileWarning, FolderKanban,
  ChevronDown, ChevronUp, X, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<string, string> = {
  Foundational: "bg-secondary text-foreground border-border",
  Emerging: "bg-info-soft text-info border-info/30",
  Growth: "bg-accent-soft text-accent border-accent/30",
  Advanced: "bg-health-soft text-health border-health/30",
  Elite: "bg-warning-soft text-warning border-warning/30",
};

type OrgRow = {
  id: string;
  name: string;
  tier: string | null;
  total_engine_score: number | null;
  revenue_per_player: number | null;
  priority_engine: string | null;
  total_revenue: number | null;
  opp_low: number | null;
  opp_high: number | null;
  revenue_needs_review: boolean | null;
  submitted_at: string | null;
  plan_activated_at: string | null;
  task_total: number;
  task_complete: number;
  task_due_week: number;
  task_overdue: number;
  last_activity_at: string | null;
  overall_health_score: number | null;
  engagement_complexity: string | null;
  admin_alerts: any[] | null;
  active_project_count: number;
  draft_project_count: number;
  completed_project_count: number;
  awaiting_project_name: string | null;
  next_tier: string | null;
  points_to_next_tier: number | null;
  platform_score: number | null;
  marketing_score: number | null;
  retention_risk: string | null;
  market_risk: string | null;
  execution_risk: string | null;
  strategic_clarity_score: number | null;
  engagement_approach_recommendation: string | null;
  revenue_verification: string | null;
};

type DrillKey = "complex" | "high-alert" | "review" | null;

type Density = "compact" | "standard" | "detailed";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [density, setDensity] = useState<Density>("standard");
  const [awaitingTotal, setAwaitingTotal] = useState(0);
  const [reviewed, setReviewed] = useState<Record<string, Partial<Record<"high_alert" | "revenue_review", { reviewed_at: string; reviewed_by: string }>>>>({});
  const [orgsMissingFocus, setOrgsMissingFocus] = useState<{ id: string; name: string }[]>([]);
  const [focusReminderOpen, setFocusReminderOpen] = useState(true);
  const [activationReminderOpen, setActivationReminderOpen] = useState(true);

  const [drill, setDrill] = useState<DrillKey>(null);

  useEffect(() => {
    (async () => {
      const oneWeekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);

      const week = weekStartingMonday();
      const [orgsRes, tasksRes, activityRes, awaitingProjectsRes, reviewsRes, focusRes] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, plan_activated_at, active_project_count, draft_project_count, completed_project_count, organization_intake(submitted_at, revenue_needs_review, revenue_verification), derived_metrics(monetization_tier, total_engine_score, revenue_per_player, priority_engine, calculated_total_revenue, total_opportunity_low, total_opportunity_high, overall_health_score, engagement_complexity, admin_alerts, next_tier, points_to_next_tier, platform_score, marketing_score, retention_risk, market_risk, execution_risk, strategic_clarity_score, engagement_approach_recommendation)"),
        supabase.from("org_tasks").select("org_id, status, due_date, completed_at, last_activity_at"),
        supabase.from("task_activity_log").select("id, action, created_at, task_id, org_id, org_tasks(title), organizations(name)").order("created_at", { ascending: false }).limit(10),
        supabase.from("org_projects").select("id, org_id, name").eq("awaiting_completion_approval", true),
        supabase.from("admin_org_reviews").select("org_id, kind, reviewed_at, reviewed_by"),
        supabase.from("org_weekly_focus" as any).select("org_id, week_starting, focus_task_ids"),
      ]);

      const focusedOrgIds = new Set<string>();
      for (const f of ((focusRes.data as any[]) ?? [])) {
        if (f.week_starting === week && (f.focus_task_ids?.length ?? 0) > 0) focusedOrgIds.add(f.org_id);
      }

      const reviewedMap: Record<string, any> = {};
      for (const r of (reviewsRes.data ?? []) as any[]) {
        (reviewedMap[r.org_id] ??= {})[r.kind] = { reviewed_at: r.reviewed_at, reviewed_by: r.reviewed_by };
      }
      setReviewed(reviewedMap);

      const tasksByOrg: Record<string, any> = {};
      for (const t of (tasksRes.data ?? []) as any[]) {
        const o = (tasksByOrg[t.org_id] ??= { total: 0, complete: 0, due_week: 0, overdue: 0, last: null });
        o.total++;
        if (t.status === "completed") o.complete++;
        if (t.status === "overdue" || (t.due_date && t.due_date < today && t.status !== "completed")) o.overdue++;
        if (t.due_date && t.due_date >= today && t.due_date <= oneWeekAhead && t.status !== "completed") o.due_week++;
        if (t.last_activity_at && (!o.last || t.last_activity_at > o.last)) o.last = t.last_activity_at;
      }

      const awaitingByOrg = new Map<string, string>();
      for (const p of (awaitingProjectsRes.data ?? []) as any[]) {
        awaitingByOrg.set(p.org_id, p.name);
      }
      setAwaitingTotal((awaitingProjectsRes.data ?? []).length);

      const r: OrgRow[] = ((orgsRes.data ?? []) as any[]).map((o) => {
        const intake = Array.isArray(o.organization_intake) ? o.organization_intake[0] : o.organization_intake;
        const metrics = Array.isArray(o.derived_metrics) ? o.derived_metrics[0] : o.derived_metrics;
        const tk = tasksByOrg[o.id] ?? { total: 0, complete: 0, due_week: 0, overdue: 0, last: null };
        return {
          id: o.id,
          name: o.name,
          tier: metrics?.monetization_tier ?? null,
          total_engine_score: metrics?.total_engine_score ?? null,
          revenue_per_player: metrics?.revenue_per_player ?? null,
          priority_engine: metrics?.priority_engine ?? null,
          total_revenue: metrics?.calculated_total_revenue ?? null,
          opp_low: metrics?.total_opportunity_low ?? null,
          opp_high: metrics?.total_opportunity_high ?? null,
          revenue_needs_review: intake?.revenue_needs_review ?? null,
          submitted_at: intake?.submitted_at ?? null,
          plan_activated_at: o.plan_activated_at,
          task_total: tk.total, task_complete: tk.complete, task_due_week: tk.due_week, task_overdue: tk.overdue,
          last_activity_at: tk.last,
          overall_health_score: metrics?.overall_health_score ?? null,
          engagement_complexity: metrics?.engagement_complexity ?? null,
          admin_alerts: Array.isArray(metrics?.admin_alerts) ? metrics.admin_alerts : [],
          active_project_count: o.active_project_count ?? 0,
          draft_project_count: o.draft_project_count ?? 0,
          completed_project_count: o.completed_project_count ?? 0,
          awaiting_project_name: awaitingByOrg.get(o.id) ?? null,
          next_tier: metrics?.next_tier ?? null,
          points_to_next_tier: metrics?.points_to_next_tier ?? null,
          platform_score: metrics?.platform_score ?? null,
          marketing_score: metrics?.marketing_score ?? null,
          retention_risk: metrics?.retention_risk ?? null,
          market_risk: metrics?.market_risk ?? null,
          execution_risk: metrics?.execution_risk ?? null,
          strategic_clarity_score: metrics?.strategic_clarity_score ?? null,
          engagement_approach_recommendation: metrics?.engagement_approach_recommendation ?? null,
          revenue_verification: intake?.revenue_verification ?? null,
        };
      });
      setOrgs(r);
      setOrgsMissingFocus(r.filter(o => !!o.plan_activated_at && !focusedOrgIds.has(o.id)).map(o => ({ id: o.id, name: o.name })));
      setActivity(activityRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const active = orgs.filter(o => !!o.plan_activated_at).length;
    const opp_low = orgs.reduce((a, o) => a + (o.opp_low ?? 0), 0);
    const opp_high = orgs.reduce((a, o) => a + (o.opp_high ?? 0), 0);
    const due = orgs.reduce((a, o) => a + o.task_due_week, 0);
    const overdue = orgs.reduce((a, o) => a + o.task_overdue, 0);
    const completed = orgs.reduce((a, o) => a + o.task_complete, 0);
    const tierCounts: Record<string, number> = {};
    orgs.forEach(o => { if (o.tier) tierCounts[o.tier] = (tierCounts[o.tier] ?? 0) + 1; });
    const topTier = Object.entries(tierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const complexCount = orgs.filter(o => o.engagement_complexity === "Complex").length;
    const highAlertCount = orgs.filter(o => (o.admin_alerts ?? []).some((a: any) => a?.severity === "high") && !reviewed[o.id]?.high_alert).length;
    const reviewCount = orgs.filter(o => o.revenue_needs_review === true && !reviewed[o.id]?.revenue_review).length;
    return { total: orgs.length, active, opp_low, opp_high, due, overdue, completed, topTier, complexCount, highAlertCount, reviewCount };
  }, [orgs, reviewed]);

  async function toggleReviewed(orgId: string, kind: "high_alert" | "revenue_review") {
    if (!user) return;
    const isCurrentlyReviewed = !!reviewed[orgId]?.[kind];
    if (isCurrentlyReviewed) {
      const { error } = await supabase.from("admin_org_reviews").delete().eq("org_id", orgId).eq("kind", kind);
      if (error) { toast({ title: "Could not undo", description: error.message, variant: "destructive" }); return; }
      setReviewed(prev => {
        const next = { ...prev };
        if (next[orgId]) { const { [kind]: _, ...rest } = next[orgId] as any; next[orgId] = rest; }
        return next;
      });
      toast({ title: "Marked as not reviewed" });
    } else {
      const { error } = await supabase.from("admin_org_reviews").upsert({ org_id: orgId, kind, reviewed_by: user.id, reviewed_at: new Date().toISOString() }, { onConflict: "org_id,kind" });
      if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
      setReviewed(prev => ({ ...prev, [orgId]: { ...(prev[orgId] ?? {}), [kind]: { reviewed_at: new Date().toISOString(), reviewed_by: user.id } } }));
      toast({ title: "Marked as reviewed" });
    }
  }

  return (
    <AppShell title="Command Center">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">Curve OS</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Portfolio overview across all client organizations</p>
        </div>
        <Link
          to="/admin/invite"
          className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New organization
        </Link>
      </div>

      {/* Awaiting plan activation reminder */}
      {(() => {
        const awaitingActivation = orgs.filter(o => !!o.submitted_at && !o.plan_activated_at);
        if (loading || awaitingActivation.length === 0) return null;
        return (
          <div className="curve-card border-l-4 border-l-info bg-info-soft/30 mb-6 p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setActivationReminderOpen(o => !o)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-info-soft/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="h-5 w-5 text-info flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {awaitingActivation.length} org{awaitingActivation.length === 1 ? "" : "s"} awaiting plan activation
                  </p>
                  <p className="text-xs text-muted-foreground">Intake submitted — review the report and activate the action plan.</p>
                </div>
              </div>
              {activationReminderOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            </button>
            {activationReminderOpen && (
              <div className="px-4 pb-4 pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {awaitingActivation.map(o => (
                    <Link
                      key={o.id}
                      to={`/admin/org/${o.id}`}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-background border border-border hover:border-foreground/40 hover:bg-secondary/50 transition-colors"
                    >
                      {o.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Weekly focus reminder */}
      {!loading && orgsMissingFocus.length > 0 && (
        <div className="curve-card border-l-4 border-l-warning bg-warning-soft/30 mb-6 p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setFocusReminderOpen(o => !o)}
            className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-warning-soft/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Target className="h-5 w-5 text-warning flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {orgsMissingFocus.length} org{orgsMissingFocus.length === 1 ? "" : "s"} need this week's focus set
                </p>
                <p className="text-xs text-muted-foreground">Clients won't see a focus card until you set one.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to="/admin/weekly-focus"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-foreground hover:underline"
              >
                Set all →
              </Link>
              {focusReminderOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>
          {focusReminderOpen && (
            <div className="px-4 pb-4 pt-0">
              <div className="flex flex-wrap gap-1.5">
                {orgsMissingFocus.map(o => (
                  <Link
                    key={o.id}
                    to={`/admin/org/${o.id}`}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-background border border-border hover:border-foreground/40 hover:bg-secondary/50 transition-colors"
                  >
                    {o.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Building2 className="h-4 w-4 text-info" />}
          label="Active Organizations"
          value={loading ? "—" : stats.total}
          subtitle={`${stats.active} with active plans`}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4 text-accent" />}
          label="Total Revenue Opportunity"
          value={loading ? "—" : `${formatCurrency(stats.opp_low)} – ${formatCurrency(stats.opp_high)}`}
          valueClass="text-base lg:text-lg"
          subtitle="Across all client orgs"
        />
        <Link to="/admin/tasks-this-week" className="block">
          <StatCard
            icon={<ListChecks className={cn("h-4 w-4", stats.overdue > 0 ? "text-destructive" : "text-warning")} />}
            label="Tasks This Week"
            value={loading ? "—" : `${stats.due} due`}
            subtitle={`${stats.completed} completed${stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ""}`}
            valueClass={stats.overdue > 0 ? "text-destructive" : ""}
            extra={awaitingTotal > 0 ? (
              <p className="text-xs text-accent font-semibold mt-1.5">{awaitingTotal} project{awaitingTotal === 1 ? "" : "s"} awaiting completion approval</p>
            ) : undefined}
          />
        </Link>
        <StatCard
          icon={<Trophy className="h-4 w-4 text-health" />}
          label="Avg Monetization Tier"
          value={loading ? "—" : stats.topTier}
          subtitle="Most common across portfolio"
        />
      </div>

      {/* Engagement Health Overview */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <InteractiveStatCard
          icon={<AlertTriangle className={cn("h-4 w-4", stats.complexCount > 0 ? "text-destructive" : "text-accent")} />}
          label="Complex Engagements"
          value={loading ? "—" : stats.complexCount}
          valueClass={stats.complexCount > 0 ? "text-destructive" : "text-accent"}
          subtitle="Require foundational work before revenue activation"
          active={drill === "complex"}
          disabled={stats.complexCount === 0}
          onClick={() => setDrill(drill === "complex" ? null : "complex")}
        />
        <InteractiveStatCard
          icon={<ShieldAlert className={cn("h-4 w-4", stats.highAlertCount > 0 ? "text-destructive" : "text-accent")} />}
          label="High Risk Alerts"
          value={loading ? "—" : stats.highAlertCount}
          valueClass={stats.highAlertCount > 0 ? "text-destructive" : "text-accent"}
          subtitle="Orgs needing immediate attention"
          active={drill === "high-alert"}
          disabled={stats.highAlertCount === 0}
          onClick={() => setDrill(drill === "high-alert" ? null : "high-alert")}
        />
        <InteractiveStatCard
          icon={<FileWarning className={cn("h-4 w-4", stats.reviewCount > 0 ? "text-warning" : "text-accent")} />}
          label="Revenue Review Needed"
          value={loading ? "—" : stats.reviewCount}
          valueClass={stats.reviewCount > 0 ? "text-warning" : "text-accent"}
          subtitle="Intake data flagged for verification"
          active={drill === "review"}
          disabled={stats.reviewCount === 0}
          onClick={() => setDrill(drill === "review" ? null : "review")}
        />
      </div>

      {drill && (
        <DrillPanel kind={drill} orgs={orgs} reviewed={reviewed} onToggleReviewed={toggleReviewed} onClose={() => setDrill(null)} />
      )}

      <div className="mb-8" />

      <Tabs defaultValue="orgs">
        <TabsList className="mb-6">
          <TabsTrigger value="orgs">Organizations</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">All Organizations <span className="text-muted-foreground font-normal text-sm">({orgs.length})</span></h2>
            <DensityToggle density={density} onChange={setDensity} />
          </div>

          {loading ? (
            <CardGridSkeleton density={density} />
          ) : orgs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className={cn(
              "grid gap-4",
              density === "compact" && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
              density === "standard" && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              density === "detailed" && "grid-cols-1 lg:grid-cols-2",
            )}>
              {orgs.map((o) => <OrgCard key={o.id} org={o} density={density} />)}
            </div>
          )}

          <details className="mt-12 group">
            <summary className="flex items-center justify-between cursor-pointer list-none mb-4">
              <h2 className="font-display text-lg font-semibold">Recent Activity</h2>
              <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
              <span className="text-xs text-muted-foreground hidden group-open:inline">Hide</span>
            </summary>
            <div className="curve-card divide-y divide-border p-0 overflow-hidden">
              {activity.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No recent activity.</p>
              ) : activity.map((a) => <ActivityRow key={a.id} a={a} />)}
            </div>
          </details>
        </TabsContent>

        <TabsContent value="projects"><AdminProjectsCrossOrg /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function StatCard({ icon, label, value, subtitle, valueClass = "", extra }: { icon: React.ReactNode; label: string; value: any; subtitle?: string; valueClass?: string; extra?: React.ReactNode }) {
  return (
    <div className="curve-card">
      <div className="flex items-center gap-2 mb-3">{icon}<p className="curve-eyebrow">{label}</p></div>
      <p className={cn("curve-stat", valueClass)}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1.5 truncate">{subtitle}</p>}
      {extra}
    </div>
  );
}

function InteractiveStatCard({
  icon, label, value, subtitle, valueClass = "", active, disabled, onClick,
}: {
  icon: React.ReactNode; label: string; value: any; subtitle?: string; valueClass?: string;
  active: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "curve-card text-left w-full transition-all",
        !disabled && "hover:border-foreground/30 hover:shadow-md cursor-pointer",
        active && "ring-2 ring-foreground border-foreground/40",
        disabled && "opacity-60 cursor-default",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">{icon}<p className="curve-eyebrow truncate">{label}</p></div>
        {!disabled && (
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {active ? "Hide" : "View"}
          </span>
        )}
      </div>
      <p className={cn("curve-stat", valueClass)}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1.5 truncate">{subtitle}</p>}
    </button>
  );
}

function complexReasons(o: OrgRow): string[] {
  const reasons: string[] = [];
  if (o.strategic_clarity_score !== null && o.strategic_clarity_score < 5) {
    reasons.push(`Low strategic clarity (${o.strategic_clarity_score}/10)`);
  }
  if (o.retention_risk === "High") reasons.push("High retention risk");
  if (o.market_risk === "High") reasons.push("High market risk");
  if (o.execution_risk === "High") reasons.push("High execution risk");
  if (o.overall_health_score !== null && o.overall_health_score < 50) {
    reasons.push(`Low overall health (${o.overall_health_score}/100)`);
  }
  return reasons;
}

type ReviewKind = "high_alert" | "revenue_review";
type ReviewedMap = Record<string, Partial<Record<ReviewKind, { reviewed_at: string; reviewed_by: string }>>>;

function DrillPanel({ kind, orgs, reviewed, onToggleReviewed, onClose }: {
  kind: Exclude<DrillKey, null>;
  orgs: OrgRow[];
  reviewed: ReviewedMap;
  onToggleReviewed: (orgId: string, kind: ReviewKind) => void;
  onClose: () => void;
}) {
  const [showReviewed, setShowReviewed] = useState(false);
  const reviewKind: ReviewKind | null = kind === "high-alert" ? "high_alert" : kind === "review" ? "revenue_review" : null;

  const config = {
    "complex": {
      title: "Complex Engagements",
      description: "These orgs need foundational work — strategy, retention, or execution gaps — before revenue activation efforts will land.",
      icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
      filter: (o: OrgRow) => o.engagement_complexity === "Complex",
    },
    "high-alert": {
      title: "High Risk Alerts",
      description: "Orgs with one or more high-severity admin alerts that need immediate attention.",
      icon: <ShieldAlert className="h-4 w-4 text-destructive" />,
      filter: (o: OrgRow) => (o.admin_alerts ?? []).some((a: any) => a?.severity === "high"),
    },
    "review": {
      title: "Revenue Review Needed",
      description: "Intake data was flagged for verification — totals didn't reconcile or the client wasn't sure of a figure.",
      icon: <FileWarning className="h-4 w-4 text-warning" />,
      filter: (o: OrgRow) => o.revenue_needs_review === true,
    },
  }[kind];

  const allMatched = orgs.filter(config.filter);
  const open = reviewKind ? allMatched.filter(o => !reviewed[o.id]?.[reviewKind]) : allMatched;
  const done = reviewKind ? allMatched.filter(o => !!reviewed[o.id]?.[reviewKind]) : [];

  return (
    <div className="curve-card mb-8 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-border">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5">{config.icon}</div>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-base">{config.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Close drill-down"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {open.length === 0 && done.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No matching organizations.</p>
      ) : (
        <>
          <div className="divide-y divide-border -mx-6">
            {open.length === 0 ? (
              <p className="px-6 py-4 text-sm text-muted-foreground text-center">All matching orgs have been reviewed. 🎉</p>
            ) : open.map((o) => (
              <DrillRow
                key={o.id}
                org={o}
                kind={kind}
                reviewKind={reviewKind}
                reviewedInfo={reviewKind ? reviewed[o.id]?.[reviewKind] ?? null : null}
                onToggleReviewed={onToggleReviewed}
              />
            ))}
          </div>

          {reviewKind && done.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowReviewed(s => !s)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                {showReviewed ? "Hide" : "Show"} {done.length} reviewed
              </button>
              {showReviewed && (
                <div className="divide-y divide-border -mx-6 mt-3">
                  {done.map((o) => (
                    <DrillRow
                      key={o.id}
                      org={o}
                      kind={kind}
                      reviewKind={reviewKind}
                      reviewedInfo={reviewed[o.id]?.[reviewKind] ?? null}
                      onToggleReviewed={onToggleReviewed}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DrillRow({ org, kind, reviewKind, reviewedInfo, onToggleReviewed }: {
  org: OrgRow;
  kind: Exclude<DrillKey, null>;
  reviewKind: ReviewKind | null;
  reviewedInfo: { reviewed_at: string; reviewed_by: string } | null;
  onToggleReviewed: (orgId: string, kind: ReviewKind) => void;
}) {
  const reasons = kind === "complex" ? complexReasons(org)
    : kind === "high-alert" ? (org.admin_alerts ?? []).filter((a: any) => a?.severity === "high").map((a: any) => a?.message ?? a?.title ?? "High-severity alert")
    : kind === "review" ? [org.revenue_verification ?? "Client did not confirm revenue totals during intake"]
    : [];

  const isReviewed = !!reviewedInfo;

  return (
    <div className={cn("flex items-start justify-between gap-4 px-6 py-3 hover:bg-secondary/40 transition-colors group", isReviewed && "opacity-60")}>
      <Link to={`/admin/org/${org.id}`} className="min-w-0 flex-1 block">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("font-display font-semibold text-sm group-hover:text-accent transition-colors", isReviewed && "line-through")}>{org.name}</span>
          {org.tier && (
            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border", TIER_STYLES[org.tier] ?? "bg-secondary")}>
              {org.tier}
            </span>
          )}
          {isReviewed && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-accent-soft text-accent border border-accent/30">
              <CheckCheck className="h-3 w-3" /> Reviewed
            </span>
          )}
        </div>
        {reasons.length > 0 ? (
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-destructive mt-1">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No specific detail available.</p>
        )}
        {isReviewed && reviewedInfo && (
          <p className="text-[10px] text-muted-foreground mt-1">Reviewed {timeAgo(reviewedInfo.reviewed_at)}</p>
        )}
      </Link>
      <div className="flex items-center gap-2 flex-shrink-0">
        {reviewKind && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleReviewed(org.id, reviewKind); }}
            className={cn(
              "text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-colors",
              isReviewed
                ? "border-border text-muted-foreground hover:bg-secondary"
                : "border-accent/40 text-accent bg-accent-soft hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {isReviewed ? "Undo" : "Mark reviewed"}
          </button>
        )}
        <Link to={`/admin/org/${org.id}`} className="text-xs font-semibold text-accent hover:underline">View →</Link>
      </div>
    </div>
  );
}

function DensityToggle({ density, onChange }: { density: Density; onChange: (d: Density) => void }) {
  const Btn = ({ d, icon }: { d: Density; icon: React.ReactNode }) => (
    <button
      onClick={() => onChange(d)}
      title={d}
      className={cn(
        "h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors",
        density === d ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary",
      )}
    >{icon}</button>
  );
  return (
    <div className="inline-flex items-center gap-1 p-1 border border-border rounded-lg bg-card">
      <Btn d="compact" icon={<LayoutGrid className="h-4 w-4" />} />
      <Btn d="standard" icon={<Rows3 className="h-4 w-4" />} />
      <Btn d="detailed" icon={<Square className="h-4 w-4" />} />
    </div>
  );
}

function OrgCard({ org, density }: { org: OrgRow; density: Density }) {
  const noIntake = !org.submitted_at;
  const planStatus = org.plan_activated_at ? "Active" : noIntake ? "No Intake" : "Draft";
  const planClass =
    planStatus === "Active" ? "bg-accent-soft text-accent border-accent/30" :
    planStatus === "Draft" ? "bg-secondary text-foreground border-border" :
    "bg-muted text-muted-foreground border-border";

  const pct = org.task_total > 0 ? Math.round((org.task_complete / org.task_total) * 100) : 0;
  const daysAgo = org.last_activity_at
    ? Math.floor((Date.now() - new Date(org.last_activity_at).getTime()) / 86400000)
    : null;

  const highAlerts = (org.admin_alerts ?? []).filter((a: any) => a?.severity === "high");
  const complexity = org.engagement_complexity;
  const complexityClass =
    complexity === "Straightforward" ? "bg-accent-soft text-accent border-accent/30" :
    complexity === "Moderate" ? "bg-warning-soft text-warning border-warning/30" :
    complexity === "Complex" ? "bg-destructive/10 text-destructive border-destructive/30" :
    "bg-secondary text-muted-foreground border-border";

  const hasProjects = org.active_project_count + org.draft_project_count + org.completed_project_count > 0;

  return (
    <Link to={`/admin/org/${org.id}`} className="block curve-card-interactive group relative">
      {highAlerts.length > 0 && (
        <span
          title={`This org has ${highAlerts.length} high-priority alert${highAlerts.length === 1 ? "" : "s"}`}
          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center shadow-md ring-2 ring-background z-10"
        >
          !
        </span>
      )}
      <div className="flex items-start justify-between gap-2 mb-4">
        <h3 className="font-display font-semibold text-[18px] leading-tight group-hover:text-accent transition-colors">{org.name}</h3>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {org.tier && (
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", TIER_STYLES[org.tier] ?? "bg-secondary")}>
              {org.tier}
            </span>
          )}
          {org.next_tier && org.points_to_next_tier !== null && (
            <span className="text-[10px] text-warning font-semibold tabular-nums">
              {org.points_to_next_tier} pts to {org.next_tier}
            </span>
          )}
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", planClass)}>
            {planStatus}
          </span>
        </div>
      </div>

      {noIntake ? (
        <div className="py-8 text-center">
          <Clock className="h-6 w-6 mx-auto text-neutral mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Intake Pending</p>
          <p className="text-xs text-muted-foreground mt-1">Awaiting submission</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-border">
            <Metric label="Revenue" value={org.total_revenue !== null ? formatCurrency(org.total_revenue) : "—"} />
            <Metric label="Opp High" value={org.opp_high !== null ? formatCurrency(org.opp_high) : "—"} accent />
            <Metric label="Rev/Player" value={org.revenue_per_player !== null ? formatCurrency(org.revenue_per_player) : "—"} />
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="curve-eyebrow mb-1">Engine Score</p>
              <p className="font-display text-2xl font-bold tabular-nums">{org.total_engine_score ?? "—"}<span className="text-sm font-normal text-muted-foreground">/60</span></p>
            </div>
            {org.priority_engine && (
              <div className="text-right">
                <p className="curve-eyebrow mb-1">Priority</p>
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-warning-soft text-warning border border-warning/30">
                  {org.priority_engine}
                </span>
              </div>
            )}
          </div>

          {org.task_total > 0 && (
            <>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <TaskPill icon={<CheckCircle2 className="h-3 w-3" />} count={org.task_complete} kind="complete" />
                {org.task_due_week > 0 && <TaskPill icon={<Clock className="h-3 w-3" />} count={org.task_due_week} kind="week" />}
                {org.task_overdue > 0 && <TaskPill icon={<AlertCircle className="h-3 w-3" />} count={org.task_overdue} kind="overdue" />}
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}

          {hasProjects && (
            <div className="flex items-center gap-2 text-xs mb-2 text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5" />
              <span>
                <strong className="text-foreground">{org.active_project_count}</strong> active ·{" "}
                <strong className="text-foreground">{org.draft_project_count}</strong> draft ·{" "}
                <strong className="text-foreground">{org.completed_project_count}</strong> complete
              </span>
              {org.awaiting_project_name && (
                <span
                  title={`${org.awaiting_project_name} is complete and awaiting your approval`}
                  className="inline-block h-2 w-2 rounded-full bg-warning ring-2 ring-warning/30"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#8B5CF6" }} />
              Health: <span className="font-semibold" style={{ color: "#8B5CF6" }}>{org.overall_health_score ?? "—"}/40</span>
            </span>
            <span>{daysAgo !== null ? `Active ${daysAgo}d ago` : "No activity"}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
            <span className="inline-flex items-center gap-1">
              <ScoreDot score={org.platform_score} /> Platform: <span className="font-semibold tabular-nums text-foreground">{org.platform_score ?? "—"}/10</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <ScoreDot score={org.marketing_score} /> Marketing: <span className="font-semibold tabular-nums text-foreground">{org.marketing_score ?? "—"}/10</span>
            </span>
          </div>
          {complexity && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Complexity:</span>
              <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", complexityClass)}>
                {complexity}
              </span>
            </div>
          )}
          {org.revenue_needs_review && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-warning bg-warning-soft px-2 py-1 rounded">
              <Sparkles className="h-3 w-3" /> Revenue review flagged
            </div>
          )}
        </>
      )}
    </Link>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="curve-eyebrow mb-1 text-[9px]">{label}</p>
      <p className={cn("font-display text-sm font-semibold tabular-nums truncate", accent && "text-accent")}>{value}</p>
    </div>
  );
}

function ScoreDot({ score }: { score: number | null }) {
  const cls = score === null ? "bg-neutral" : score >= 7 ? "bg-accent" : score >= 4 ? "bg-warning" : "bg-destructive";
  return <span className={cn("h-1.5 w-1.5 rounded-full", cls)} />;
}

function TaskPill({ icon, count, kind }: { icon: React.ReactNode; count: number; kind: "complete" | "week" | "overdue" }) {
  const cls =
    kind === "complete" ? "bg-accent-soft text-accent" :
    kind === "week" ? "bg-warning-soft text-warning" :
    "bg-destructive/10 text-destructive";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold", cls)}>
      {icon} {count}
    </span>
  );
}

function ActivityRow({ a }: { a: any }) {
  const orgName = a.organizations?.name ?? "Org";
  const taskTitle = a.org_tasks?.title ?? "task";
  const ago = timeAgo(a.created_at);
  const dotColor =
    a.action === "completed" ? "bg-accent" :
    a.action === "note_added" ? "bg-info" :
    a.action === "created" ? "bg-health" :
    "bg-neutral";
  const verb =
    a.action === "completed" ? "completed task" :
    a.action === "note_added" ? "added note on" :
    a.action === "created" ? "created task" :
    a.action === "status_changed" ? "updated" :
    a.action.replace(/_/g, " ");
  return (
    <div className="flex items-center gap-3 px-5 py-3 text-sm">
      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", dotColor)} />
      <span className="flex-1 truncate">
        <span className="font-semibold">{orgName}</span>
        <span className="text-muted-foreground"> — {verb}: </span>
        <span>{taskTitle}</span>
      </span>
      <span className="text-xs text-muted-foreground flex-shrink-0">{ago}</span>
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function CardGridSkeleton({ density }: { density: Density }) {
  const cols = density === "compact" ? 4 : density === "standard" ? 3 : 2;
  return (
    <div className={cn("grid gap-4", `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols}`)}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="curve-card">
          <div className="curve-shimmer h-5 w-2/3 rounded mb-4" />
          <div className="curve-shimmer h-4 w-1/3 rounded mb-2" />
          <div className="curve-shimmer h-4 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="curve-card text-center py-16">
      <Building2 className="h-12 w-12 mx-auto text-neutral mb-4" />
      <h3 className="font-display text-lg font-semibold mb-1">No organizations yet</h3>
      <p className="text-sm text-muted-foreground mb-5">Add your first organization to get started.</p>
      <Link to="/admin/invite" className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-foreground text-background text-sm font-semibold">
        <Plus className="h-4 w-4" /> Add organization
      </Link>
    </div>
  );
}
