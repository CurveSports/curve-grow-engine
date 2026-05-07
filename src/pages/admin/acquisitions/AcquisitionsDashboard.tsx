import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Settings } from "lucide-react";
import { PHASE_PCT_FIELDS, dayOf100 } from "@/lib/acquisitions";
import NewAcquisitionModal from "@/components/acquisitions/NewAcquisitionModal";

const PHASES = ["pre_close","closing_day","first_30","first_60","first_90","complete"];
const PHASE_LABEL: Record<string,string> = {
  pre_close:"Pre-Close", closing_day:"Close", first_30:"30", first_60:"60", first_90:"90", complete:"Done",
};

function barColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export default function AcquisitionsDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [staffByDeal, setStaffByDeal] = useState<Record<string, { total: number; compliant: number; overdue: number; pct: number }>>({});

  const load = async () => {
    setLoading(true);
    try { await (supabase as any).rpc("update_acquisition_phases"); } catch {}
    const { data } = await supabase.from("acquisition_projects").select("*").order("created_at", { ascending: false });
    setDeals(data ?? []);
    const { data: staff } = await supabase.from("acquisition_staff").select("acquisition_id, compliance_status, compliance_pct").eq("is_active", true);
    const tmp: Record<string, { total: number; compliant: number; overdue: number; sum: number }> = {};
    (staff ?? []).forEach((s: any) => {
      const t = tmp[s.acquisition_id] ?? (tmp[s.acquisition_id] = { total: 0, compliant: 0, overdue: 0, sum: 0 });
      t.total += 1; t.sum += Number(s.compliance_pct);
      if (s.compliance_status === "compliant") t.compliant += 1;
      if (s.compliance_status === "overdue") t.overdue += 1;
    });
    const out: Record<string, any> = {};
    Object.entries(tmp).forEach(([k, v]) => { out[k] = { total: v.total, compliant: v.compliant, overdue: v.overdue, pct: v.total ? Math.round(v.sum / v.total) : 0 }; });
    setStaffByDeal(out);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const active = deals.filter((d) => d.status === "active");
  const portfolio = active.length >= 2 ? {
    deals: active.length,
    pct: Math.round(active.reduce((s, d) => s + Number(d.completion_pct ?? 0), 0) / active.length),
    overdue: active.reduce((s, d) => s + Number(d.overdue_tasks ?? 0), 0),
    blocked: active.reduce((s, d) => s + Number(d.blocked_tasks ?? 0), 0),
  } : null;

  return (
    <AppShell title="Acquisitions">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Acquisitions</h1>
            <p className="text-sm text-muted-foreground mt-1">Post-acquisition integration management</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav("/admin/acquisitions/settings")}>
              <Settings className="h-4 w-4 mr-1.5" /> Templates
            </Button>
            <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1.5" /> New Acquisition
            </Button>
          </div>
        </div>

        {portfolio && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Active Deals" value={`${portfolio.deals}`} />
            <Stat label="Overall Completion" value={`${portfolio.pct}%`} />
            <Stat label="Overdue Tasks" value={`${portfolio.overdue}`} tone={portfolio.overdue > 0 ? "danger" : undefined} />
            <Stat label="Blocked Items" value={`${portfolio.blocked}`} tone={portfolio.blocked > 0 ? "warn" : undefined} />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : deals.length === 0 ? (
          <div className="curve-card text-center py-16">
            <p className="font-semibold">No acquisitions yet</p>
            <p className="text-sm text-muted-foreground mt-2">Click "New Acquisition" to start the 100-day integration playbook for an acquired club.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {deals.map((d) => {
              const day = dayOf100(d.close_date);
              const phaseIdx = PHASES.indexOf(d.phase);
              return (
                <button key={d.id} onClick={() => nav(`/admin/acquisitions/${d.id}`)} className="curve-card text-left hover:border-emerald-400 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold">
                        {d.club_name}
                        {d.codename && <span className="text-muted-foreground font-normal text-base ml-2">— {d.codename}</span>}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {[d.city, d.state, d.close_date].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                      d.status === "active" ? "bg-emerald-100 text-emerald-700" :
                      d.status === "paused" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                    }`}>{d.status}</span>
                  </div>

                  {/* Phase stepper */}
                  <div className="flex items-center gap-1 mb-4">
                    {PHASES.map((p, i) => (
                      <div key={p} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`h-1.5 w-full rounded-full ${i <= phaseIdx ? "bg-emerald-500" : "bg-muted"}`} />
                        <span className={`text-[10px] uppercase tracking-wider ${i === phaseIdx ? "text-emerald-700 font-bold" : "text-muted-foreground"}`}>{PHASE_LABEL[p]}</span>
                      </div>
                    ))}
                  </div>
                  {day != null && <p className="text-xs text-muted-foreground -mt-2 mb-3">Day {day} of 100</p>}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Overall</span>
                        <span className="font-display text-2xl font-bold">{Number(d.completion_pct).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${barColor(Number(d.completion_pct))}`} style={{ width: `${d.completion_pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {d.completed_tasks} / {d.total_tasks} tasks
                        {d.overdue_tasks > 0 && <span className="text-rose-600 font-medium"> · {d.overdue_tasks} overdue</span>}
                        {d.blocked_tasks > 0 && <span className="text-amber-600 font-medium"> · {d.blocked_tasks} blocked</span>}
                      </p>
                    </div>
                    <div className="space-y-1">
                      {PHASE_PCT_FIELDS.map(([field, label]) => {
                        const pct = Number(d[field] ?? 0);
                        return (
                          <div key={field} className="flex items-center gap-2 text-xs">
                            <span className="w-24 text-muted-foreground truncate">{label}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-10 text-right tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {staffByDeal[d.id] && (
                    <div className="mt-4 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Staff Compliance</span>
                        <span className="text-xs text-muted-foreground">{staffByDeal[d.id].compliant} / {staffByDeal[d.id].total} compliant {staffByDeal[d.id].overdue > 0 && <span className="text-rose-600 font-semibold">· {staffByDeal[d.id].overdue} overdue</span>}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${barColor(staffByDeal[d.id].pct)}`} style={{ width: `${staffByDeal[d.id].pct}%` }} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <NewAcquisitionModal open={open} onOpenChange={setOpen} onCreated={(id) => nav(`/admin/acquisitions/${id}`)} />
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warn" }) {
  return (
    <div className="curve-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`font-display text-3xl font-bold mt-1 tabular-nums ${tone === "danger" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : ""}`}>{value}</p>
    </div>
  );
}
