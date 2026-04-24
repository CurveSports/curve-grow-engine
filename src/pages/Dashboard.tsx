import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import TaskList from "@/components/tasks/TaskList";
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { OrgTask, ENGINE_SCORE_FIELD } from "@/lib/tasks";
import { formatDate } from "@/lib/format";
import { CheckCircle2, AlertCircle, Calendar, Clock, Palette, X, ArrowRight, ListChecks } from "lucide-react";
import { WeeklyFocusCard } from "@/components/admin/WeeklyFocusCard";
import SponsorshipSummaryCard from "@/components/sponsorship/SponsorshipSummaryCard";
import { OpportunityHero } from "@/components/dashboard/OpportunityHero";
import { MomentumStrip } from "@/components/dashboard/MomentumStrip";
import { CalculatorPreview } from "@/components/dashboard/CalculatorPreview";
import { ReportHighlights } from "@/components/dashboard/ReportHighlights";
import { UpcomingComms } from "@/components/dashboard/UpcomingComms";
import { StaggerList, StaggerItem } from "@/components/motion/PageTransition";

const TIER_THRESHOLDS: Record<string, [number, number]> = {
  Foundational: [0, 20],
  Emerging: [21, 32],
  Growth: [33, 44],
  Advanced: [45, 52],
  Elite: [53, 60],
};

export default function Dashboard() {
  const { profile, isPrimary } = useAuth();
  const { logoUrl, primaryHsl, accentHsl } = useBranding();
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(
    typeof window !== "undefined" && sessionStorage.getItem("brandingBannerDismissed") === "1"
  );
  const showBrandingBanner = isPrimary && !logoUrl && !primaryHsl && !accentHsl && !bannerDismissed;
  const dismissBanner = () => {
    sessionStorage.setItem("brandingBannerDismissed", "1");
    setBannerDismissed(true);
  };

  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [metrics, setMetrics] = useState<any | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [planActivated, setPlanActivated] = useState<string | null>(null);
  const [hasMetrics, setHasMetrics] = useState(false);
  const [selected, setSelected] = useState<OrgTask | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!profile?.org_id) return;
    const [{ data: t }, { data: m }, { data: o }] = await Promise.all([
      supabase.from("org_tasks").select("*").eq("org_id", profile.org_id).order("priority").order("due_date"),
      supabase.from("derived_metrics").select("*").eq("org_id", profile.org_id).maybeSingle(),
      supabase.from("organizations").select("name, plan_activated_at").eq("id", profile.org_id).maybeSingle(),
    ]);
    setTasks((t as OrgTask[]) ?? []);
    if (m) {
      setHasMetrics(true);
      setMetrics(m);
      const s: Record<string, number | null> = {};
      for (const [eng, field] of Object.entries(ENGINE_SCORE_FIELD)) s[eng] = (m as any)[field];
      setScores(s);
    } else {
      setHasMetrics(false);
    }
    setOrgName((o as any)?.name ?? null);
    setPlanActivated(o?.plan_activated_at ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.org_id]);

  const stats = useMemo(() => {
    const sevenAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const completedThisWeek = tasks.filter(t => t.completed_at && new Date(t.completed_at).getTime() > sevenAgo).length;
    const totalCompleted = tasks.filter(t => t.status === "completed").length;
    const overdue = tasks.filter(t => t.status === "overdue").length;
    const upcoming = tasks
      .filter(t => t.status !== "completed" && t.due_date)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0] ?? null;

    // Weekly streak — count consecutive prior weeks (not including current) with ≥1 completion.
    const completedDates = tasks
      .map(t => t.completed_at)
      .filter(Boolean)
      .map(d => new Date(d as string));
    const weekKey = (d: Date) => {
      const day = (d.getDay() + 6) % 7; // Mon=0
      const monday = new Date(d);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - day);
      return monday.toISOString().slice(0, 10);
    };
    const completedWeeks = new Set(completedDates.map(weekKey));
    const today = new Date();
    let streak = 0;
    let cursor = new Date(today);
    while (true) {
      const k = weekKey(cursor);
      if (completedWeeks.has(k)) streak++;
      else if (streak > 0) break;
      else break;
      cursor.setDate(cursor.getDate() - 7);
    }

    return { completedThisWeek, totalCompleted, totalTasks: tasks.length, overdue, upcoming, streak };
  }, [tasks]);

  const tierProgress = useMemo(() => {
    if (!metrics?.monetization_tier) return null;
    const tier = metrics.monetization_tier as string;
    const score = Number(metrics.total_engine_score ?? 0);
    const nextThreshold = metrics.next_tier_threshold as number | null;
    const pointsToNext = metrics.points_to_next_tier as number | null;
    const range = TIER_THRESHOLDS[tier];
    let pct: number | null = null;
    if (nextThreshold && range) {
      const start = range[0];
      pct = Math.max(0, Math.min(100, ((score - start) / (nextThreshold - start)) * 100));
    } else if (range) {
      const [lo, hi] = range;
      pct = Math.max(0, Math.min(100, ((score - lo) / (hi - lo)) * 100));
    }
    return {
      currentTier: tier,
      nextTier: metrics.next_tier as string | null,
      pct,
      pointsToNext,
    };
  }, [metrics]);

  // Org user holding state: intake done, metrics calculated, but admin hasn't activated plan
  const showHoldingState = !loading && hasMetrics && !planActivated;

  return (
    <AppShell>
      {/* Greeting */}
      <div className="mb-6">
        <p className="curve-eyebrow mb-2">Action Plan</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {orgName ? `Welcome back, ${orgName}` : "Your dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {planActivated ? `Plan activated ${formatDate(planActivated)}` : "Your action plan hasn't been activated yet — your Curve consultant will activate it after reviewing your report."}
        </p>
      </div>

      {showBrandingBanner && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 flex items-center gap-3 animate-fade-in">
          <div className="h-9 w-9 rounded-md bg-accent/15 flex items-center justify-center flex-shrink-0">
            <Palette className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Personalize your workspace</p>
            <p className="text-xs text-muted-foreground">
              Add your logo and brand colors so the platform reflects your organization.
            </p>
          </div>
          <Link
            to="/settings"
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90"
          >
            Customize
          </Link>
          <button onClick={dismissBanner} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showHoldingState && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 flex items-center gap-3 animate-fade-in">
          <div className="h-9 w-9 rounded-md bg-accent/15 flex items-center justify-center flex-shrink-0">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Your 90-Day Action Plan is being prepared</p>
            <p className="text-xs text-muted-foreground">
              Your Curve consultant is reviewing your report. In the meantime, explore your opportunity below.
            </p>
          </div>
          <Link
            to="/report"
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 inline-flex items-center gap-1"
          >
            View report <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <StaggerList className="space-y-6">
          {/* HERO — Opportunity */}
          {hasMetrics && metrics && (
            <StaggerItem>
              <OpportunityHero
                oppLow={Number(metrics.total_opportunity_low ?? 0)}
                oppHigh={Number(metrics.total_opportunity_high ?? 0)}
                currentTier={tierProgress?.currentTier}
                nextTier={tierProgress?.nextTier}
                tierProgressPct={tierProgress?.pct ?? null}
                pointsToNext={tierProgress?.pointsToNext ?? null}
                orgName={orgName}
              />
            </StaggerItem>
          )}

          {/* MOMENTUM — wins */}
          {planActivated && (
            <StaggerItem>
              <MomentumStrip
                weeklyCompleted={stats.completedThisWeek}
                totalCompleted={stats.totalCompleted}
                totalTasks={stats.totalTasks}
                streakWeeks={stats.streak}
              />
            </StaggerItem>
          )}

          {/* ALERTS — overdue / next due */}
          {(stats.overdue > 0 || stats.upcoming) && (
            <StaggerItem>
              <div className="grid gap-4 md:grid-cols-2">
                {stats.overdue > 0 && (
                  <Link
                    to="/plan"
                    className="curve-card flex items-center gap-3 hover:border-destructive/40 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-md bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-2xl font-bold tabular-nums text-destructive">{stats.overdue}</p>
                      <p className="text-xs text-muted-foreground">{stats.overdue === 1 ? "task is overdue" : "tasks are overdue"}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )}
                {stats.upcoming && (
                  <Link
                    to="/plan"
                    className="curve-card flex items-center gap-3 hover:border-accent/40 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-md bg-accent-soft border border-accent/30 flex items-center justify-center text-accent">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="curve-eyebrow !text-[10px]">Next due {formatDate(stats.upcoming.due_date!)}</p>
                      <p className="text-sm font-medium truncate mt-0.5">{stats.upcoming.title}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                )}
              </div>
            </StaggerItem>
          )}

          {/* WEEKLY FOCUS */}
          {profile?.org_id && (
            <StaggerItem>
              <WeeklyFocusCard orgId={profile.org_id} tasks={tasks as any} editable={false} />
            </StaggerItem>
          )}

          {/* TWO-COL: Report highlights + Calculator preview */}
          {hasMetrics && metrics && (
            <StaggerItem>
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportHighlights
                  totalRevenue={Number(metrics.calculated_total_revenue ?? 0)}
                  revenuePerPlayer={Number(metrics.revenue_per_player ?? 0)}
                  revenueGap={Number(metrics.revenue_gap ?? 0)}
                  revenueBenchmark={Number(metrics.revenue_benchmark ?? 0)}
                />
                <CalculatorPreview
                  pricingOppMid={mid(metrics.pricing_opportunity_low, metrics.pricing_opportunity_high)}
                  sponsorshipOppMid={mid(metrics.sponsorship_opportunity_low, metrics.sponsorship_opportunity_high)}
                  retentionOppMid={mid(metrics.retention_referral_opportunity_low, metrics.retention_referral_opportunity_high)}
                />
              </div>
            </StaggerItem>
          )}

          {/* SPONSORSHIP + UPCOMING COMMS */}
          <StaggerItem>
            <div className="grid gap-4 lg:grid-cols-2">
              <SponsorshipSummaryCard />
              {profile?.org_id && <UpcomingComms orgId={profile.org_id} />}
            </div>
          </StaggerItem>

          {/* TASK LIST — only when plan is activated */}
          {planActivated && (
            <StaggerItem>
              <div className="flex items-center justify-between mb-3 mt-2">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-accent" />
                  <h2 className="curve-eyebrow">Your tasks</h2>
                </div>
                <Link to="/plan" className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1">
                  Full plan <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : tasks.length === 0 ? (
                <div className="curve-card text-center py-10">
                  <p className="text-sm text-muted-foreground">No tasks yet — your action plan will appear here when activated.</p>
                </div>
              ) : (
                <TaskList tasks={tasks} scores={scores} onSelect={setSelected} />
              )}
            </StaggerItem>
          )}

          <TaskDetailPanel task={selected} open={!!selected} onClose={() => setSelected(null)} isAdmin={false} onChanged={load} />
        </StaggerList>


      <div className="mt-10 pt-6 border-t border-border text-sm text-muted-foreground">
        Need to review your numbers? <Link to="/report" className="text-accent hover:underline">View Revenue Leak Report →</Link>
      </div>
    </AppShell>
  );
}

function mid(lo: any, hi: any): number {
  const a = Number(lo ?? 0);
  const b = Number(hi ?? 0);
  return Math.round((a + b) / 2);
}
