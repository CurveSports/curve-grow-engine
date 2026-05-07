import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { workstreamLabel } from "@/lib/acquisitions";
import { toast } from "sonner";

export default function RollUpPanel({ acquisition }: { acquisition: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("acquisition_weekly_rollups").select("*").eq("acquisition_id", acquisition.id).order("week_number", { ascending: false });
    setItems(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, [acquisition.id]);

  const generate = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-weekly-rollup", { body: { acquisition_id: acquisition.id } });
    setGenerating(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Failed");
    toast.success("Roll-up generated");
    load();
    if (data?.rollup) setViewing(data.rollup);
  };

  if (viewing) return <RollupView rollup={viewing} acquisition={acquisition} onBack={() => { setViewing(null); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Weekly Roll-Up — {acquisition.club_name}</h2>
        <Button onClick={generate} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700">
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
          Generate This Week's Report
        </Button>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="curve-card text-center py-10 text-sm text-muted-foreground">No roll-ups yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="curve-card flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Week {r.week_number} — {r.week_start_date} → {r.week_end_date}</p>
                <p className="text-xs text-muted-foreground">Status: {r.status} · {r.completed_tasks}/{r.total_tasks} tasks ({Number(r.completion_pct).toFixed(0)}%)</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setViewing(r)}>View</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RollupView({ rollup, acquisition, onBack }: { rollup: any; acquisition: any; onBack: () => void }) {
  const [r, setR] = useState(rollup);

  const markReviewed = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("acquisition_weekly_rollups").update({ status: "reviewed", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", r.id).select().maybeSingle();
    if (data) { setR(data); toast.success("Marked as reviewed"); }
  };

  const wsData = r.workstream_data ?? {};
  const risks = (r.risk_flags ?? []) as any[];
  const priorities = (r.next_week_priorities ?? []) as any[];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Roll-Ups</button>

      <div className="rounded-lg overflow-hidden border bg-white">
        <div className="bg-slate-900 text-white p-6">
          <p className="text-xs uppercase tracking-widest text-emerald-400">Curve Co — Weekly Integration Report</p>
          <h2 className="font-display text-2xl font-bold mt-1">{acquisition.club_name}</h2>
          <p className="text-sm text-slate-300 mt-1">Week {r.week_number} — {r.week_start_date} → {r.week_end_date}{r.days_since_close != null && ` · Day ${r.days_since_close} of 100`}</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="border-l-4 border-emerald-500 pl-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Executive Summary</p>
            <p className="text-sm whitespace-pre-wrap">{r.executive_summary}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Tasks Completed This Week" value={r.tasks_completed_this_week} tone="good" />
            <Stat label="Overall Completion" value={`${Number(r.completion_pct).toFixed(0)}%`} />
            <Stat label="Overdue" value={r.overdue_tasks} tone={r.overdue_tasks > 0 ? "danger" : "good"} />
            <Stat label="Blocked" value={r.blocked_tasks} tone={r.blocked_tasks > 0 ? "warn" : undefined} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Workstream Status</p>
            <div className="space-y-1 text-sm">
              {Object.entries(wsData).filter(([_, d]: any) => d.total > 0).map(([ws, d]: any) => (
                <div key={ws} className="flex items-center gap-2">
                  <span className="w-32 text-xs">{workstreamLabel(ws)}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${d.pct >= 80 ? "bg-emerald-500" : d.pct >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums">{d.pct}%</span>
                  <span className="w-20 text-xs text-muted-foreground">+{d.completed_this_week.length} done</span>
                  <span className="w-16 text-xs text-rose-600">{d.overdue.length > 0 && `${d.overdue.length} overdue`}</span>
                </div>
              ))}
            </div>
          </div>

          {r.total_staff > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Compliance</p>
              <p className="text-sm">Staff Compliant: <strong>{r.compliant_staff}</strong> / {r.total_staff} ({Number(r.compliance_pct).toFixed(0)}%)</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
                <div className="h-full bg-emerald-500" style={{ width: `${r.compliance_pct}%` }} />
              </div>
            </div>
          )}

          {risks.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Risk Flags</p>
              <div className="space-y-1.5">
                {risks.map((rf, i) => (
                  <div key={i} className={`p-2 rounded text-sm ${rf.level === "high" ? "bg-rose-50 text-rose-800" : rf.level === "medium" ? "bg-amber-50 text-amber-800" : "bg-muted text-foreground"}`}>{rf.message}</div>
                ))}
              </div>
            </div>
          )}

          {priorities.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Next Week Priorities</p>
              <ol className="text-sm list-decimal pl-5 space-y-1">
                {priorities.map((p, i) => (
                  <li key={i}>{p.title} — {workstreamLabel(p.workstream)} — due {p.target_date}{p.lead_person_name && ` — ${p.lead_person_name}`}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t pt-3">
            Generated {new Date(r.created_at).toLocaleString()} · Status: {r.status}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {r.status === "draft" && <Button onClick={markReviewed} variant="outline"><CheckCircle2 className="h-4 w-4 mr-1" /> Mark as Reviewed</Button>}
        <Button variant="outline" onClick={() => window.print()}>Download / Print</Button>
        <Button variant="outline" disabled><Send className="h-4 w-4 mr-1" /> Send to Team (coming soon)</Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "danger" | "good" | "warn" }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 tabular-nums ${tone === "danger" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : ""}`}>{value}</p>
    </div>
  );
}
