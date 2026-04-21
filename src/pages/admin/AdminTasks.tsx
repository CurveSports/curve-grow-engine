import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { ENGINES } from "@/lib/tasks";
import { formatDate } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  tier: string | null;
  total: number;
  completed: number;
  overdue: number;
  draft: number;
  last_activity: string | null;
  by_engine: Record<string, { total: number; completed: number }>;
  plan_activated_at: string | null;
  revenue_needs_review: boolean;
};

const ENGINE_COLORS = (pct: number | null): string => {
  if (pct === null) return "bg-secondary text-muted-foreground border-border";
  if (pct >= 80) return "bg-accent-soft text-accent border-accent/30";
  if (pct >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
};

export default function AdminTasks() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: orgs }, { data: tasks }, { data: metrics }, { data: intakes }] = await Promise.all([
        supabase.from("organizations").select("id, name, plan_activated_at"),
        supabase.from("org_tasks").select("org_id, engine, status, last_activity_at, plan_status"),
        supabase.from("derived_metrics").select("org_id, monetization_tier"),
        supabase.from("organization_intake").select("org_id, revenue_needs_review"),
      ]);

      const tierByOrg = new Map<string, string | null>();
      for (const m of metrics ?? []) tierByOrg.set((m as any).org_id, (m as any).monetization_tier);
      const reviewByOrg = new Map<string, boolean>();
      for (const i of intakes ?? []) reviewByOrg.set((i as any).org_id, !!(i as any).revenue_needs_review);

      const r: Row[] = (orgs ?? []).map((o: any) => {
        const list = (tasks ?? []).filter((t: any) => t.org_id === o.id);
        const by_engine: Record<string, { total: number; completed: number }> = {};
        for (const e of ENGINES) by_engine[e] = { total: 0, completed: 0 };
        for (const t of list) {
          if (!by_engine[t.engine]) by_engine[t.engine] = { total: 0, completed: 0 };
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

  if (loading) return <AppShell><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  return (
    <div>
      <div className="curve-card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Organization</th>
              <th className="px-5 py-3 font-medium">Tier</th>
              <th className="px-5 py-3 font-medium">Progress</th>
              <th className="px-5 py-3 font-medium">By engine</th>
              <th className="px-5 py-3 font-medium text-right">Overdue</th>
              <th className="px-5 py-3 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(o => {
              const pct = o.total > 0 ? Math.round((o.completed / o.total) * 100) : 0;
              const needsReview = !o.plan_activated_at && o.draft > 0;
              return (
                <tr key={o.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/admin/org/${o.id}/tasks`} className="font-medium hover:text-accent transition-colors">{o.name}</Link>
                      {o.revenue_needs_review && (
                        <span
                          title="Org indicated their calculated revenue total may not be accurate. Verify before activating plan."
                          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-warning/30 bg-warning-soft text-warning font-medium cursor-help"
                        >
                          Revenue Review
                        </span>
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
                      {!o.plan_activated_at && o.draft === 0 && (
                        <span className="text-xs text-muted-foreground">(awaiting intake)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs">{o.tier ?? "—"}</td>
                  <td className="px-5 py-4 min-w-[180px]">
                    {o.total > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">{o.completed}/{o.total}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">No tasks</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {ENGINES.filter(e => o.by_engine[e]?.total > 0).map(e => {
                        const eng = o.by_engine[e];
                        const ePct = Math.round((eng.completed / eng.total) * 100);
                        return (
                          <span key={e} className={`text-[10px] px-1.5 py-0.5 rounded border tabular-nums ${ENGINE_COLORS(ePct)}`} title={`${e}: ${eng.completed}/${eng.total}`}>
                            {e.slice(0, 3)} {ePct}%
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    {o.overdue > 0 ? <span className="text-red-600 font-medium">{o.overdue}</span> : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">{o.last_activity ? formatDate(o.last_activity) : "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">No organizations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
