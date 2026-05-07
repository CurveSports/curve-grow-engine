import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function ComplianceOverview() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: deals } = await supabase.from("acquisition_projects").select("id, club_name, status").eq("status", "active");
      const { data: staff } = await supabase.from("acquisition_staff").select("acquisition_id, compliance_status, compliance_pct").eq("is_active", true);
      const byDeal = new Map<string, any[]>();
      (staff ?? []).forEach((s) => {
        if (!byDeal.has(s.acquisition_id)) byDeal.set(s.acquisition_id, []);
        byDeal.get(s.acquisition_id)!.push(s);
      });
      const result = (deals ?? []).map((d) => {
        const ss = byDeal.get(d.id) ?? [];
        return {
          id: d.id, club_name: d.club_name,
          total: ss.length,
          compliant: ss.filter((s) => s.compliance_status === "compliant").length,
          inProgress: ss.filter((s) => s.compliance_status === "in_progress").length,
          overdue: ss.filter((s) => s.compliance_status === "overdue").length,
          pct: ss.length ? Math.round(ss.reduce((sum, s) => sum + Number(s.compliance_pct), 0) / ss.length) : 0,
        };
      }).sort((a, b) => a.pct - b.pct);
      setRows(result);
      setLoading(false);
    })();
  }, []);

  const totals = rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    compliant: acc.compliant + r.compliant,
    overdue: acc.overdue + r.overdue,
  }), { total: 0, compliant: 0, overdue: 0 });

  return (
    <AppShell title="Acquisitions — Compliance">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Compliance Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Per-employee compliance across all active acquisitions.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Total Staff" value={totals.total} />
          <Card label="Fully Compliant" value={`${totals.compliant}${totals.total ? ` (${Math.round(totals.compliant/totals.total*100)}%)` : ""}`} tone="ok" />
          <Card label="Overdue" value={totals.overdue} tone={totals.overdue > 0 ? "danger" : undefined} />
          <Card label="Active Deals" value={rows.length} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <div className="curve-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Club</th>
                  <th className="py-2 pr-3">Total Staff</th>
                  <th className="py-2 pr-3">Compliant</th>
                  <th className="py-2 pr-3">In Progress</th>
                  <th className="py-2 pr-3">Overdue</th>
                  <th className="py-2 pr-3 w-48">Compliance %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-muted/30 cursor-pointer" onClick={() => nav(`/admin/acquisitions/${r.id}?tab=compliance`)}>
                    <td className="py-2 pr-3 font-medium">{r.club_name}</td>
                    <td className="py-2 pr-3">{r.total}</td>
                    <td className="py-2 pr-3 text-emerald-700">{r.compliant}</td>
                    <td className="py-2 pr-3 text-amber-700">{r.inProgress}</td>
                    <td className={`py-2 pr-3 ${r.overdue > 0 ? "text-rose-600 font-semibold" : ""}`}>{r.overdue}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${r.pct >= 80 ? "bg-emerald-500" : r.pct >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="w-10 text-right tabular-nums text-xs">{r.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted-foreground italic">No active acquisitions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Card({ label, value, tone }: { label: string; value: any; tone?: "danger" | "ok" }) {
  return (
    <div className="curve-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 tabular-nums ${tone === "danger" ? "text-rose-600" : tone === "ok" ? "text-emerald-600" : ""}`}>{value}</p>
    </div>
  );
}
