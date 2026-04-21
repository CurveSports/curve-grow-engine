import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminTasks from "@/pages/admin/AdminTasks";
import AdminTemplates from "@/pages/admin/AdminTemplates";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowUpDown } from "lucide-react";

const TIER_STYLES: Record<string, string> = {
  Foundational: "bg-secondary text-foreground border-border",
  Emerging: "bg-blue-50 text-blue-700 border-blue-200",
  Growth: "bg-accent-soft text-accent border-accent/30",
  Advanced: "bg-teal-50 text-teal-700 border-teal-200",
  Elite: "bg-amber-50 text-amber-700 border-amber-200",
};

type Row = {
  id: string;
  name: string;
  tier: string | null;
  total_engine_score: number | null;
  revenue_per_player: number | null;
  priority_engine: string | null;
  submitted_at: string | null;
  plan_activated_at: string | null;
};

type SortKey = "name" | "tier" | "total_engine_score" | "revenue_per_player" | "submitted_at";

export default function AdminDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("submitted_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    (async () => {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, plan_activated_at, organization_intake(submitted_at), derived_metrics(monetization_tier, total_engine_score, revenue_per_player, priority_engine)");
      const r: Row[] = (orgs ?? []).map((o: any) => {
        const intake = Array.isArray(o.organization_intake) ? o.organization_intake[0] : o.organization_intake;
        const metrics = Array.isArray(o.derived_metrics) ? o.derived_metrics[0] : o.derived_metrics;
        return {
          id: o.id,
          name: o.name,
          tier: metrics?.monetization_tier ?? null,
          total_engine_score: metrics?.total_engine_score ?? null,
          revenue_per_player: metrics?.revenue_per_player ?? null,
          priority_engine: metrics?.priority_engine ?? null,
          submitted_at: intake?.submitted_at ?? null,
          plan_activated_at: o.plan_activated_at,
        };
      });
      setRows(r);
      setLoading(false);
    })();
  }, []);

  const tierOrder = ["Foundational", "Emerging", "Growth", "Advanced", "Elite"];

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (sortKey === "tier") { va = va ? tierOrder.indexOf(va) : -1; vb = vb ? tierOrder.indexOf(vb) : -1; }
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "name" ? "asc" : "desc"); }
  };

  const Th = ({ k, children, align = "left" }: { k: SortKey; children: React.ReactNode; align?: "left" | "right" }) => (
    <th className={`px-5 py-3 font-medium text-${align}`}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
        {children} <ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </th>
  );

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="curve-eyebrow mb-2">Curve Admin</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Admin</h1>
        </div>
        <Link
          to="/admin/invite"
          className="inline-flex items-center px-4 h-10 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          New organization
        </Link>
      </div>

      <Tabs defaultValue="orgs">
        <TabsList className="mb-6">
          <TabsTrigger value="orgs">Organizations</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="orgs">
          <div className="curve-card p-0 overflow-hidden">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <Th k="name">Organization</Th>
                    <Th k="tier">Monetization Tier</Th>
                    <Th k="total_engine_score" align="right">Engine Score</Th>
                    <Th k="revenue_per_player" align="right">Revenue / Player</Th>
                    <th className="px-5 py-3 font-medium">Priority Engine</th>
                    <Th k="submitted_at">Submitted</Th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((o) => (
                    <tr key={o.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-5 py-4">
                        <Link to={`/admin/org/${o.id}`} className="font-medium hover:text-accent transition-colors">{o.name}</Link>
                      </td>
                      <td className="px-5 py-4">
                        {o.tier ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${TIER_STYLES[o.tier] ?? "bg-secondary"}`}>
                            {o.tier}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">No assessment</span>}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">{o.total_engine_score ?? "—"}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{o.revenue_per_player !== null ? formatCurrency(o.revenue_per_player) : "—"}</td>
                      <td className="px-5 py-4">{o.priority_engine ?? "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{o.submitted_at ? formatDate(o.submitted_at) : "—"}</td>
                      <td className="px-5 py-4">
                        {o.plan_activated_at ? (
                          <Link to={`/admin/org/${o.id}/tasks`} className="text-xs text-accent hover:underline">View tasks</Link>
                        ) : o.submitted_at ? (
                          <Link to={`/admin/org/${o.id}/tasks`} className="text-xs text-muted-foreground hover:text-foreground">Activate</Link>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">No organizations yet. Create one to get started.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks"><AdminTasks /></TabsContent>
        <TabsContent value="templates"><AdminTemplates /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
