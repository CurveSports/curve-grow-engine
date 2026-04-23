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
import { ArrowLeft, FileText, ListChecks, Activity, StickyNote, LayoutDashboard, Sparkles, CheckCircle2, AlertCircle, Clock, Mail, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import CommunicationsLogTab from "@/components/admin/CommunicationsLogTab";
import { cn } from "@/lib/utils";
import NotesTab from "@/components/admin/NotesTab";
import { PresentationsTab } from "@/components/presentations/PresentationsTab";
import { WeeklyFocusCard } from "@/components/admin/WeeklyFocusCard";
import { RiskAssessmentSection, AdminAlertsBanner, type AdminAlert } from "@/components/admin/RiskAssessment";
import { ExplainProvider, ExplainButton } from "@/components/admin/ExplainDrawer";
import ProjectsTab from "@/components/admin/ProjectsTab";
import { ProjectCompletionBanner } from "@/components/admin/ProjectsTab";
import { FolderKanban } from "lucide-react";
import {
  operationsHealthExplain, marketPositionExplain, programHealthExplain, strategicClarityExplain,
  executionRiskExplain, marketRiskExplain, retentionRiskExplain, engagementComplexityExplain,
  engineScoreExplain,
} from "@/components/admin/explainContent";
import { TierLadder } from "@/components/TierLadder";

const TIER_STYLES: Record<string, string> = {
  Foundational: "bg-secondary text-foreground border-border",
  Emerging: "bg-info-soft text-info border-info/30",
  Growth: "bg-accent-soft text-accent border-accent/30",
  Advanced: "bg-health-soft text-health border-health/30",
  Elite: "bg-warning-soft text-warning border-warning/30",
};

type Tab = "overview" | "report" | "presentations" | "plan" | "projects" | "communications" | "notes";

export default function OrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [orgName, setOrgName] = useState("Organization");
  const [bannerKey, setBannerKey] = useState(0);

  const setTab = (t: Tab, engine?: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    if (engine) next.set("engine", engine);
    else next.delete("engine");
    setParams(next, { replace: true });
  };

  useEffect(() => {
    (async () => {
      const [{ data }, { data: o }] = await Promise.all([
        supabase.from("derived_metrics").select("admin_alerts").eq("org_id", orgId!).maybeSingle(),
        supabase.from("organizations").select("name").eq("id", orgId!).maybeSingle(),
      ]);
      const raw = (data?.admin_alerts as any) ?? [];
      setAlerts(Array.isArray(raw) ? raw : []);
      setOrgName((o as any)?.name ?? "Organization");
    })();
  }, [orgId]);

  return (
    <ExplainProvider>
      <AppShell title="Organization">
        <div className="mb-4">
          <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Organizations
          </Link>
        </div>

        <AdminAlertsBanner alerts={alerts} orgId={orgId!} />
        <ProjectCompletionBanner key={bannerKey} orgId={orgId!} orgName={orgName} onApproved={() => setBannerKey((k) => k + 1)} />

        <OrgHeader orgId={orgId!} onActivate={() => setTab("plan")} onAddNote={() => setTab("notes")} onAddTask={() => setTab("plan")} />

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mt-6">
          <TabsList className="bg-card border border-border h-auto p-1 flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="report" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Report
            </TabsTrigger>
            <TabsTrigger value="presentations" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Presentations
            </TabsTrigger>
            <TabsTrigger value="plan" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> Action Plan
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" /> Projects
            </TabsTrigger>
            <TabsTrigger value="communications" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Communications
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab orgId={orgId!} onJumpToPlan={(engine?: string) => setTab("plan", engine)} onJumpToReport={() => setTab("report")} />
          </TabsContent>
          <TabsContent value="report" className="mt-6">
            <Report bare orgIdProp={orgId} />
          </TabsContent>
          <TabsContent value="presentations" className="mt-6">
            <PresentationsTab orgId={orgId!} />
          </TabsContent>
          <TabsContent value="plan" className="mt-6">
            <AdminOrgTasks bare orgIdProp={orgId} />
          </TabsContent>
          <TabsContent value="projects" className="mt-6">
            <ProjectsTab orgId={orgId!} orgName={orgName} />
          </TabsContent>
          <TabsContent value="communications" className="mt-6">
            <CommunicationsLogTab orgId={orgId!} />
          </TabsContent>
          <TabsContent value="notes" className="mt-6">
            <NotesTab orgId={orgId!} />
          </TabsContent>
        </Tabs>
      </AppShell>
    </ExplainProvider>
  );
}

/* ─────────────────────────  HEADER  ───────────────────────── */

function OrgHeader({ orgId, onActivate, onAddNote, onAddTask }: { orgId: string; onActivate: () => void; onAddNote: () => void; onAddTask: () => void }) {
  const navigate = useNavigate();
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
          <RecalcMetricsButton orgId={orgId} />
          <Button size="sm" variant="outline" onClick={onAddNote}>Add Note</Button>
          <Button size="sm" variant="outline" onClick={onAddTask}>Add Task</Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/calculators/${orgId}`)}>Calculators</Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/communications/${orgId}`)}>Draft Communication</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── TEMP: Recalculate Metrics (DELETE BEFORE GO-LIVE) ─── */
function RecalcMetricsButton({ orgId }: { orgId: string }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    if (!confirm("DEV RESET: This will delete ALL tasks, projects, weekly focus, and activity for this org, then regenerate the draft action plan from intake. Continue?")) return;
    setBusy(true);
    try {
      const { data: intake, error: iErr } = await supabase
        .from("organization_intake").select("*").eq("org_id", orgId).maybeSingle();
      if (iErr || !intake) throw new Error(iErr?.message ?? "No intake on file for this org.");
      const { error } = await supabase.functions.invoke("calc-metrics", {
        body: { org_id: orgId, intake, reset: true },
      });
      if (error) throw error;
      toast({ title: "Org reset & metrics recalculated", description: "Tasks and projects wiped; fresh draft plan generated." });
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast({ title: "Recalculation failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handle}
      disabled={busy}
      title="DEV ONLY — wipes tasks/projects and regenerates plan from intake. Remove before launch."
      className="border-warning/40 text-warning hover:bg-warning-soft"
    >
      <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", busy && "animate-spin")} />
      {busy ? "Resetting…" : "Reset & Recalc (dev)"}
    </Button>
  );
}

/* ─────────────────────────  OVERVIEW  ───────────────────────── */

function OverviewTab({ orgId, onJumpToPlan, onJumpToReport }: { orgId: string; onJumpToPlan: (engine?: string) => void; onJumpToReport: () => void }) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [intake, setIntake] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: i }, { data: t }] = await Promise.all([
        supabase.from("derived_metrics").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("organization_intake").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("org_tasks").select("*").eq("org_id", orgId).eq("plan_status", "active"),
      ]);
      setMetrics(m); setIntake(i); setTasks(t ?? []); setLoading(false);
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
  const completionPct = total ? Math.round((completed / total) * 100) : 0;

  const allEngineNames = ["Pricing", "Sponsorship", "Apparel", "Events", "Add-Ons", "Retention", "Facility", "Affiliate"];
  const engineFieldMap: Record<string, string> = {
    Pricing: "pricing_score", Sponsorship: "sponsorship_score", Apparel: "apparel_score",
    Events: "event_score", "Add-Ons": "addon_score", Retention: "retention_score",
    Facility: "facility_score", Affiliate: "affiliate_score",
  };
  const engineScores = allEngineNames
    .map((eng) => ({ name: eng, score: Number((metrics as any)[engineFieldMap[eng]] ?? 0) }))
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score);

  const fallbackHealth = engineScores.slice(0, 4).reduce((s, e) => s + e.score, 0);
  const overallHealth = (metrics as any).overall_health_score ?? fallbackHealth;
  const platformScore = (metrics as any).platform_score ?? null;
  const platformDone = (metrics as any).platform_tasks_complete ?? 0;
  const platformTotal = (metrics as any).platform_tasks_total ?? 0;
  const marketingScore = (metrics as any).marketing_score ?? null;
  const marketingDone = (metrics as any).marketing_tasks_complete ?? 0;
  const marketingTotal = (metrics as any).marketing_tasks_total ?? 0;
  const opsHealth = (metrics as any).operations_health_score ?? null;
  const marketHealth = (metrics as any).market_position_health_score ?? null;
  const programHealth = (metrics as any).program_health_score ?? null;
  const strategicHealth = (metrics as any).strategic_clarity_score ?? null;
  const hasDimensions = opsHealth !== null || marketHealth !== null || programHealth !== null || strategicHealth !== null;

  const oppLow = Number(metrics.total_opportunity_low ?? 0);
  const oppHigh = Number(metrics.total_opportunity_high ?? 0);
  const totalScore = Number(metrics.total_engine_score ?? 0);

  return (
    <div className="space-y-6">
      {/* Row 1: 4 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Revenue Opportunity" value={`${formatCurrency(oppLow)} – ${formatCurrency(oppHigh)}`} />
        <MetricCard label="Total Engine Score" value={`${totalScore}`} suffix="/60" />
        <MetricCard label="Health Score" value={`${overallHealth}`} suffix="/40" accent="health" />
        <MetricCard label="Task Completion" value={`${completionPct}%`}>
          <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </MetricCard>
      </div>

      {/* This week's focus (admin-editable) */}
      <WeeklyFocusCard orgId={orgId} tasks={tasks as any} editable />

      {/* Risk Assessment + Engagement Complexity + Pricing context */}
      <RiskAssessmentSection
        executionRisk={(metrics as any).execution_risk ?? null}
        marketRisk={(metrics as any).market_risk ?? null}
        retentionRisk={(metrics as any).retention_risk ?? null}
        engagementComplexity={(metrics as any).engagement_complexity ?? null}
        engagementRecommendation={(metrics as any).engagement_approach_recommendation ?? null}
        pricingStrategyNote={(metrics as any).pricing_strategy_note ?? null}
        explains={{
          execution: executionRiskExplain(intake ?? {}, metrics),
          market: marketRiskExplain(intake ?? {}, metrics),
          retention: retentionRiskExplain(intake ?? {}, metrics),
          complexity: engagementComplexityExplain(intake ?? {}, metrics),
        }}
      />

      {/* Health dimensions 2x2 (collapses to 1 col on mobile, 4 on lg) */}
      {hasDimensions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DimensionCard label="Operations Health" score={opsHealth} explain={operationsHealthExplain(intake ?? {}, metrics)} />
          <DimensionCard label="Market Position" score={marketHealth} explain={marketPositionExplain(intake ?? {}, metrics)} />
          <DimensionCard label="Program Health" score={programHealth} explain={programHealthExplain(intake ?? {}, metrics)} />
          <DimensionCard label="Strategic Clarity" score={strategicHealth} explain={strategicClarityExplain(intake ?? {}, metrics)} />
        </div>
      )}

      {/* Platform & Marketing universal engines */}
      <div>
        <p className="curve-eyebrow mb-3">Platform & Marketing</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UniversalEngineCard
            label="Curve Sports Platform"
            subtitle="Platform setup and partner activation"
            score={platformScore}
            done={platformDone}
            total={platformTotal}
            onJump={() => navigate(`/admin/org/${orgId}/engine/Platform`)}
          />
          <UniversalEngineCard
            label="Marketing Foundation"
            subtitle="Brand, website, and content systems"
            score={marketingScore}
            done={marketingDone}
            total={marketingTotal}
            onJump={() => navigate(`/admin/org/${orgId}/engine/Marketing`)}
          />
        </div>
      </div>

      {/* Tier ladder */}
      {(metrics as any)?.monetization_tier && (
        <div className="curve-card">
          <p className="curve-eyebrow mb-4">Tier Progression</p>
          <TierLadder metrics={metrics} orgId={orgId} variant="admin" />
        </div>
      )}

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

function UniversalEngineCard({
  label, subtitle, score, done, total, onJump,
}: {
  label: string; subtitle: string; score: number | null; done: number; total: number; onJump: () => void;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const tone =
    score === null || total === 0 ? "muted" :
    score >= 7 ? "accent" :
    score >= 4 ? "warning" : "destructive";
  const toneText =
    tone === "accent" ? "text-accent" :
    tone === "warning" ? "text-warning" :
    tone === "destructive" ? "text-destructive" : "text-muted-foreground";
  const toneBar =
    tone === "accent" ? "bg-accent" :
    tone === "warning" ? "bg-warning" :
    tone === "destructive" ? "bg-destructive" : "bg-muted-foreground/40";
  return (
    <div className="curve-card flex flex-col">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <p className="font-display text-base font-semibold">{label}</p>
        <span className={cn("text-sm font-semibold tabular-nums", toneText)}>
          {score ?? "—"}<span className="text-muted-foreground font-normal">/10</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm tabular-nums">
          <span className="font-semibold">{done}</span>
          <span className="text-muted-foreground"> / {total} tasks complete</span>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div className={cn("h-full transition-all", toneBar)} style={{ width: `${pct}%` }} />
      </div>
      <button
        onClick={onJump}
        className="text-xs text-accent hover:underline mt-3 self-start"
      >
        View tasks →
      </button>
    </div>
  );
}

function DimensionCard({ label, score, explain }: { label: string; score: number | null; explain?: import("@/components/admin/ExplainDrawer").ExplainContent }) {
  const pct = score ? (score / 10) * 100 : 0;
  return (
    <div className="curve-card">
      <div className="flex items-center gap-1.5">
        <p className="curve-eyebrow">{label}</p>
        {explain && <ExplainButton content={explain} />}
      </div>
      <p className="font-display text-2xl font-semibold mt-2 tabular-nums" style={{ color: "#8B5CF6" }}>
        {score ?? "—"}<span className="text-muted-foreground text-base font-normal">/10</span>
      </p>
      <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#8B5CF6" }} />
      </div>
    </div>
  );
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

