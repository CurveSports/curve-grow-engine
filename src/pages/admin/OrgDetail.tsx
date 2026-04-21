import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import Report from "@/pages/Report";
import AdminOrgTasks from "@/pages/admin/AdminOrgTasks";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { ENGINE_SCORE_FIELD } from "@/lib/tasks";
import { ArrowLeft, FileText, ListChecks, Activity, StickyNote, LayoutDashboard, Sparkles, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<string, string> = {
  Foundational: "bg-secondary text-foreground border-border",
  Emerging: "bg-info-soft text-info border-info/30",
  Growth: "bg-accent-soft text-accent border-accent/30",
  Advanced: "bg-health-soft text-health border-health/30",
  Elite: "bg-warning-soft text-warning border-warning/30",
};

type Tab = "overview" | "report" | "brief" | "plan" | "notes";

export default function OrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  };

  return (
    <AppShell title="Organization">
      <div className="mb-4">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Organizations
        </Link>
      </div>

      <OrgHeader orgId={orgId!} onActivate={() => setTab("plan")} onAddNote={() => setTab("notes")} onAddTask={() => setTab("plan")} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mt-6">
        <TabsList className="bg-card border border-border h-auto p-1 flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="report" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Report
          </TabsTrigger>
          <TabsTrigger value="brief" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Internal Brief
          </TabsTrigger>
          <TabsTrigger value="plan" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
            <ListChecks className="h-3.5 w-3.5" /> Action Plan
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
            <StickyNote className="h-3.5 w-3.5" /> Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab orgId={orgId!} onJumpToPlan={() => setTab("plan")} onJumpToReport={() => setTab("report")} />
        </TabsContent>
        <TabsContent value="report" className="mt-6">
          <Report bare orgIdProp={orgId} />
        </TabsContent>
        <TabsContent value="brief" className="mt-6">
          <BriefTab />
        </TabsContent>
        <TabsContent value="plan" className="mt-6">
          <AdminOrgTasks bare orgIdProp={orgId} />
        </TabsContent>
        <TabsContent value="notes" className="mt-6">
          <NotesTab orgId={orgId!} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ─────────────────────────  HEADER  ───────────────────────── */

function OrgHeader({ orgId, onActivate, onAddNote, onAddTask }: { orgId: string; onActivate: () => void; onAddNote: () => void; onAddTask: () => void }) {
  const [org, setOrg] = useState<any>(null);
  const [intake, setIntake] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: i }, { data: m }] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
        supabase.from("organization_intake").select("organization_name, city_state, operates_multiple_brands, number_of_brands, has_affiliates").eq("org_id", orgId).maybeSingle(),
        supabase.from("derived_metrics").select("monetization_tier").eq("org_id", orgId).maybeSingle(),
      ]);
      setOrg(o); setIntake(i); setMetrics(m);
    })();
  }, [orgId]);

  const name = org?.name ?? intake?.organization_name ?? "Organization";
  const tier = (metrics?.monetization_tier as string) ?? null;
  const isActive = !!org?.plan_activated_at;
  const multiBrand = intake?.operates_multiple_brands === true || intake?.operates_multiple_brands === "Yes";
  const hasAffiliates = intake?.has_affiliates === true || intake?.has_affiliates === "Yes";

  return (
    <div className="curve-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {org?.city_state && <span className="text-sm text-muted-foreground">{org.city_state}</span>}
            {tier && (
              <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", TIER_STYLES[tier] ?? "bg-secondary")}>
                {tier} Tier
              </span>
            )}
            {multiBrand && intake?.number_of_brands && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-secondary text-foreground border-border">
                {intake.number_of_brands} Brands
              </span>
            )}
            {hasAffiliates && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-info-soft text-info border-info/30">
                Affiliates
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-accent/30 text-accent bg-accent-soft">
              <CheckCircle2 className="h-3.5 w-3.5" /> Plan Active
            </span>
          ) : (
            <Button size="sm" onClick={onActivate} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Activate Plan
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onAddNote}>Add Note</Button>
          <Button size="sm" variant="outline" onClick={onAddTask}>Add Task</Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  OVERVIEW  ───────────────────────── */

function OverviewTab({ orgId, onJumpToPlan, onJumpToReport }: { orgId: string; onJumpToPlan: () => void; onJumpToReport: () => void }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: t }, { data: a }] = await Promise.all([
        supabase.from("derived_metrics").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("org_tasks").select("*").eq("org_id", orgId).eq("plan_status", "active"),
        supabase.from("task_activity_log").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(8),
      ]);
      setMetrics(m); setTasks(t ?? []); setActivity(a ?? []); setLoading(false);
    })();
  }, [orgId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!metrics) {
    return (
      <div className="curve-card text-center py-16">
        <p className="text-muted-foreground">No assessment data yet — intake pending.</p>
      </div>
    );
  }

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const overdue = tasks.filter(t => t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed")).length;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;

  // Derived "Health Score X/40" — sum of top 4 engine scores (gives a 4–40 range)
  const engineScores = Object.entries(ENGINE_SCORE_FIELD)
    .map(([eng, field]) => ({ name: eng, score: Number((metrics as any)[field] ?? 0) }))
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score);
  const healthScore = engineScores.slice(0, 4).reduce((s, e) => s + e.score, 0);

  // "This week's focus" derived: top 3-5 high-priority active tasks
  const focusTasks = [...tasks]
    .filter(t => t.status !== "completed")
    .sort((a, b) => {
      const pri = { high: 0, medium: 1, low: 2 } as any;
      return (pri[a.priority] ?? 9) - (pri[b.priority] ?? 9);
    })
    .slice(0, 4);

  const oppLow = Number(metrics.total_opportunity_low ?? 0);
  const oppHigh = Number(metrics.total_opportunity_high ?? 0);
  const totalScore = Number(metrics.total_engine_score ?? 0);

  return (
    <div className="space-y-6">
      {/* Row 1: 4 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Revenue Opportunity" value={`${formatCurrency(oppLow)} – ${formatCurrency(oppHigh)}`} />
        <MetricCard label="Total Engine Score" value={`${totalScore}`} suffix="/60" />
        <MetricCard label="Health Score" value={`${healthScore}`} suffix="/40" accent="health" />
        <MetricCard label="Task Completion" value={`${completionPct}%`}>
          <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </MetricCard>
      </div>

      {/* Row 2: This week's focus */}
      <div className="curve-card border-l-4 border-l-warning">
        <div className="flex items-center justify-between mb-4">
          <p className="curve-eyebrow text-warning">This Week's Focus</p>
          <span className="text-xs text-muted-foreground">Derived from highest-priority open tasks</span>
        </div>
        {focusTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks — plan not yet activated or all tasks complete.</p>
        ) : (
          <ul className="divide-y divide-border">
            {focusTasks.map(t => (
              <li key={t.id} className="py-3 flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-secondary text-foreground border-border uppercase tracking-wide">
                  {t.engine}
                </span>
                <span className="flex-1 text-sm font-medium text-foreground truncate">{t.title}</span>
                <StatusPill status={t.status} dueDate={t.due_date} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Row 3: two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="curve-card">
          <p className="curve-eyebrow mb-4">Engine Scores</p>
          {engineScores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scores yet.</p>
          ) : (
            <ul className="space-y-3">
              {engineScores.map(e => (
                <li key={e.name}>
                  <button
                    onClick={onJumpToPlan}
                    className="w-full text-left group"
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-medium group-hover:text-accent transition-colors">{e.name}</span>
                      <span className="text-sm font-semibold tabular-nums">{e.score}<span className="text-muted-foreground font-normal">/10</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          e.score <= 3 ? "bg-destructive" : e.score <= 6 ? "bg-warning" : e.score <= 8 ? "bg-info" : "bg-accent",
                        )}
                        style={{ width: `${(e.score / 10) * 100}%` }}
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="curve-card">
          <p className="curve-eyebrow mb-4">Recent Activity</p>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map(a => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <span className={cn(
                    "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
                    a.action === "completed" ? "bg-accent"
                      : a.action === "created" ? "bg-info"
                      : a.action === "note_added" ? "bg-health"
                      : "bg-muted-foreground/40",
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate"><span className="font-medium capitalize">{a.action.replace("_", " ")}</span>{a.new_value ? ` — ${a.new_value}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, suffix, children, accent }: { label: string; value: string; suffix?: string; children?: React.ReactNode; accent?: "health" }) {
  return (
    <div className="curve-card">
      <p className="curve-eyebrow">{label}</p>
      <p className={cn("font-display text-2xl font-semibold mt-2 tabular-nums", accent === "health" && "text-health")}>
        {value}{suffix && <span className="text-muted-foreground text-base font-normal">{suffix}</span>}
      </p>
      {children}
    </div>
  );
}

function StatusPill({ status, dueDate }: { status: string; dueDate: string | null }) {
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== "completed";
  if (status === "completed") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground"><CheckCircle2 className="h-3 w-3" /> Done</span>;
  }
  if (isOverdue) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive text-destructive-foreground"><AlertCircle className="h-3 w-3" /> Overdue</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-info text-info-foreground"><Clock className="h-3 w-3" /> Open</span>;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(ms / 3600000);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(ms / 60000);
  if (m > 0) return `${m}m ago`;
  return "just now";
}

/* ─────────────────────────  BRIEF (placeholder)  ───────────────────────── */

function BriefTab() {
  const slides = [
    "Executive summary — top 3 revenue leaks",
    "Monetization tier & peer benchmark",
    "Engine score breakdown",
    "90-day priority plan",
    "Sponsorship & apparel deep dive",
    "Recommended next conversation",
  ];
  return (
    <div className="curve-card">
      <div className="text-center py-10">
        <Sparkles className="h-10 w-10 text-accent mx-auto mb-3" />
        <h2 className="font-display text-2xl font-semibold mb-2">Internal Brief — Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          A presentation-style internal brief used by Curve admins for client kickoff and renewal conversations.
        </p>
      </div>
      <div className="border-t border-border pt-6 max-w-2xl mx-auto">
        <p className="curve-eyebrow mb-3">Planned slide structure</p>
        <ol className="space-y-2">
          {slides.map((s, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/50">
              <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-semibold">{i + 1}</span>
              <span className="text-sm text-foreground">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ─────────────────────────  NOTES (placeholder)  ───────────────────────── */

function NotesTab({ orgId }: { orgId: string }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-4">
      <div className="curve-card border-l-4 border-l-info">
        <div className="flex items-start gap-3">
          <StickyNote className="h-5 w-5 text-info mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Notes feed — Coming Soon</p>
            <p className="text-sm text-muted-foreground mt-1">
              Persistent chronological notes per org will live here. The backing <code className="text-xs bg-secondary px-1 py-0.5 rounded">org_notes</code> table will be added in the next phase along with author / timestamp / tag (Pre-sale, Kickoff, Check-in, Issue, Win, Renewal).
            </p>
          </div>
        </div>
      </div>
      <div className="curve-card opacity-60 pointer-events-none">
        <p className="curve-eyebrow mb-2">Add Note (preview)</p>
        <Textarea placeholder="Write a note about this organization…" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled>Save Note</Button>
        </div>
      </div>
      <div className="curve-card text-center py-12">
        <p className="text-muted-foreground text-sm">No notes yet — add the first one once the notes feature ships.</p>
      </div>
    </div>
  );
}
