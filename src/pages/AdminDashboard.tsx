import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminTasks from "@/pages/admin/AdminTasks";
import AdminTemplates from "@/pages/admin/AdminTemplates";
import AdminUsers from "@/pages/admin/AdminUsers";
import { formatCurrency } from "@/lib/format";
import {
  Building2, DollarSign, ListChecks, Trophy, LayoutGrid, Rows3, Square,
  CheckCircle2, AlertCircle, Clock, Sparkles, FileText, Plus,
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
};

type Density = "compact" | "standard" | "detailed";

export default function AdminDashboard() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [density, setDensity] = useState<Density>("standard");

  useEffect(() => {
    (async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const oneWeekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);

      const [orgsRes, tasksRes, activityRes] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, plan_activated_at, organization_intake(submitted_at, revenue_needs_review), derived_metrics(monetization_tier, total_engine_score, revenue_per_player, priority_engine, calculated_total_revenue, total_opportunity_low, total_opportunity_high)"),
        supabase.from("org_tasks").select("org_id, status, due_date, completed_at, last_activity_at"),
        supabase.from("task_activity_log").select("id, action, created_at, task_id, org_id, org_tasks(title), organizations(name)").order("created_at", { ascending: false }).limit(10),
      ]);

      const tasksByOrg: Record<string, OrgRow["task_total"] extends number ? any : never> = {};
      for (const t of (tasksRes.data ?? []) as any[]) {
        const o = (tasksByOrg[t.org_id] ??= { total: 0, complete: 0, due_week: 0, overdue: 0, last: null });
        o.total++;
        if (t.status === "completed") o.complete++;
        if (t.status === "overdue" || (t.due_date && t.due_date < today && t.status !== "completed")) o.overdue++;
        if (t.due_date && t.due_date >= today && t.due_date <= oneWeekAhead && t.status !== "completed") o.due_week++;
        if (t.last_activity_at && (!o.last || t.last_activity_at > o.last)) o.last = t.last_activity_at;
      }

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
        };
      });
      setOrgs(r);
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
    return { total: orgs.length, active, opp_low, opp_high, due, overdue, completed, topTier };
  }, [orgs]);

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
        <StatCard
          icon={<ListChecks className={cn("h-4 w-4", stats.overdue > 0 ? "text-destructive" : "text-warning")} />}
          label="Tasks This Week"
          value={loading ? "—" : `${stats.due} due`}
          subtitle={`${stats.completed} completed${stats.overdue > 0 ? ` · ${stats.overdue} overdue` : ""}`}
          valueClass={stats.overdue > 0 ? "text-destructive" : ""}
        />
        <StatCard
          icon={<Trophy className="h-4 w-4 text-health" />}
          label="Avg Monetization Tier"
          value={loading ? "—" : stats.topTier}
          subtitle="Most common across portfolio"
        />
      </div>

      <Tabs defaultValue="orgs">
        <TabsList className="mb-6">
          <TabsTrigger value="orgs">Organizations</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
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

          <div className="mt-12">
            <h2 className="font-display text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="curve-card divide-y divide-border p-0 overflow-hidden">
              {activity.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No recent activity.</p>
              ) : activity.map((a) => <ActivityRow key={a.id} a={a} />)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks"><AdminTasks /></TabsContent>
        <TabsContent value="templates"><AdminTemplates /></TabsContent>
        <TabsContent value="users"><AdminUsers /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function StatCard({ icon, label, value, subtitle, valueClass = "" }: { icon: React.ReactNode; label: string; value: any; subtitle?: string; valueClass?: string; }) {
  return (
    <div className="curve-card">
      <div className="flex items-center gap-2 mb-3">{icon}<p className="curve-eyebrow">{label}</p></div>
      <p className={cn("curve-stat", valueClass)}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1.5 truncate">{subtitle}</p>}
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

  return (
    <Link to={`/admin/org/${org.id}`} className="block curve-card-interactive group">
      <div className="flex items-start justify-between gap-2 mb-4">
        <h3 className="font-display font-semibold text-[18px] leading-tight group-hover:text-accent transition-colors">{org.name}</h3>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {org.tier && (
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", TIER_STYLES[org.tier] ?? "bg-secondary")}>
              {org.tier}
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

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-health" />
              Health: {org.total_engine_score ?? "—"}/60
            </span>
            <span>{daysAgo !== null ? `Active ${daysAgo}d ago` : "No activity"}</span>
          </div>
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
