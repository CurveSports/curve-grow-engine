import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FileText, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { workstreamLabel } from "@/lib/acquisitions";

export default function AgendaPanel({ acquisition }: { acquisition: any }) {
  const [agendas, setAgendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("acquisition_meeting_agendas")
      .select("*").eq("acquisition_id", acquisition.id).order("created_at", { ascending: false });
    setAgendas(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [acquisition.id]);

  const generate = async () => {
    if (!confirm(`Generate agenda based on current task data for ${acquisition.club_name}?`)) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("generate-meeting-agenda", { body: { acquisition_id: acquisition.id } });
    setBusy(false);
    if (error || data?.error) { toast.error(data?.error ?? error?.message ?? "Failed"); return; }
    toast.success("Agenda generated");
    await load();
    setActive(data.agenda);
  };

  if (active) return <AgendaView agenda={active} onBack={() => { setActive(null); load(); }} acquisition={acquisition} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Meeting Agendas</h2>
        <Button onClick={generate} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
          {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />} Generate Agenda
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : agendas.length === 0 ? (
        <div className="curve-card text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No agendas yet. Generate one based on current task data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agendas.map((a) => (
            <div key={a.id} className="curve-card flex items-center justify-between">
              <div>
                <p className="font-semibold">Week {a.week_number ?? "—"} · {a.meeting_date}</p>
                <p className="text-xs text-muted-foreground capitalize">{a.status}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActive(a)}>View</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgendaView({ agenda, onBack, acquisition }: { agenda: any; onBack: () => void; acquisition: any }) {
  const ws = agenda.workstream_status ?? {};
  const markFinal = async () => {
    await supabase.from("acquisition_meeting_agendas").update({ status: "final" }).eq("id", agenda.id);
    toast.success("Marked as final");
    onBack();
  };
  const copyAll = async () => {
    const text = renderAsText(agenda, acquisition);
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← Back to agendas</button>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">{acquisition.club_name} — Week {agenda.week_number ?? "—"}</h2>
          <p className="text-sm text-muted-foreground">{agenda.meeting_date} · <span className="capitalize px-2 py-0.5 rounded bg-muted text-xs">{agenda.status}</span></p>
        </div>
        <div className="flex gap-2">
          {agenda.status === "draft" && <Button onClick={markFinal} variant="outline" size="sm">Mark as Final</Button>}
          <Button onClick={copyAll} size="sm" variant="outline"><Download className="h-4 w-4 mr-1.5" />Copy</Button>
        </div>
      </div>

      <Section title="This Week's Updates">
        {(agenda.status_updates ?? []).length === 0
          ? <Empty>No task updates this week.</Empty>
          : <ul className="space-y-1 text-sm">{agenda.status_updates.map((s: any, i: number) => (
              <li key={i}>• <strong>{s.task_title}</strong> — {workstreamLabel(s.workstream)} — {s.action} {s.old_value && s.new_value && <span className="text-muted-foreground">({s.old_value} → {s.new_value})</span>}</li>
            ))}</ul>}
      </Section>

      <Section title="Items Needing Discussion">
        {(agenda.items_needing_discussion ?? []).length === 0 ? <Empty>None.</Empty> :
          <ul className="space-y-1 text-sm">{agenda.items_needing_discussion.map((i: any, k: number) => (
            <li key={k}>• <strong>{i.task_title}</strong> — {workstreamLabel(i.workstream)} — <span className="text-rose-600">{i.reason}</span> — Lead: {i.lead ?? "—"}</li>
          ))}</ul>}
      </Section>

      <Section title="Decisions Needed">
        {(agenda.decisions_needed ?? []).length === 0 ? <Empty>None.</Empty> :
          <ul className="space-y-1 text-sm">{agenda.decisions_needed.map((d: any, i: number) => <li key={i}>• {d.task_title} — Lead: {d.lead ?? "—"}</li>)}</ul>}
      </Section>

      <Section title="Workstream Status">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {Object.entries(ws).map(([k, v]: any) => (
            <div key={k} className="p-2 rounded border">
              <p className="font-semibold text-xs">{workstreamLabel(k)}</p>
              <p className="text-xs text-muted-foreground">{v.done}/{v.total} ({v.pct}%) · {v.in_progress} active · {v.overdue} overdue</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Compliance">
        {agenda.compliance_status ? <p className="text-sm">{agenda.compliance_status.compliant} of {agenda.compliance_status.total} staff compliant. <span className="text-rose-600">{agenda.compliance_status.overdue} overdue.</span></p> : <Empty>—</Empty>}
      </Section>

      <Section title="Pending Follow-Ups">
        {(agenda.pending_follow_ups ?? []).length === 0 ? <Empty>None.</Empty> :
          <ul className="space-y-1 text-sm">{agenda.pending_follow_ups.map((f: any, i: number) => (
            <li key={i}>• {f.subject ?? "Follow-up"} — {f.contact_name} — by {f.follow_up_date}</li>
          ))}</ul>}
      </Section>

      <Section title="Documents for Review">
        {(agenda.documents_for_review ?? []).length === 0 ? <Empty>None.</Empty> :
          <ul className="space-y-1 text-sm">{agenda.documents_for_review.map((d: any, i: number) => <li key={i}>• {d.document_name} — {workstreamLabel(d.workstream)}</li>)}</ul>}
      </Section>

      <Section title="Next Week Priorities">
        {(agenda.next_week_priorities ?? []).length === 0 ? <Empty>None.</Empty> :
          <ol className="space-y-1 text-sm list-decimal pl-5">{agenda.next_week_priorities.map((t: any, i: number) => (
            <li key={i}>{t.task_title} — {workstreamLabel(t.workstream)} — due {t.target_date} — {t.lead ?? "—"}</li>
          ))}</ol>}
      </Section>

      {agenda.ai_talking_points && (
        <Section title={<><Sparkles className="h-4 w-4 inline mr-1 text-amber-600" />AI Talking Points</>}>
          <pre className="whitespace-pre-wrap text-sm font-sans">{agenda.ai_talking_points}</pre>
        </Section>
      )}

      {agenda.previous_action_items && agenda.previous_action_items.length > 0 && (
        <Section title="Carryover from Last Meeting">
          <ul className="space-y-1 text-sm">{agenda.previous_action_items.map((a: any, i: number) => (
            <li key={i}>• {a.action} — {a.owner ?? "—"}{a.deadline ? ` (by ${a.deadline})` : ""}</li>
          ))}</ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: any) {
  return <div className="curve-card"><h3 className="font-semibold mb-2">{title}</h3>{children}</div>;
}
function Empty({ children }: any) { return <p className="text-sm text-muted-foreground italic">{children}</p>; }

function renderAsText(a: any, acq: any): string {
  const ws = a.workstream_status ?? {};
  const lines: string[] = [];
  lines.push(`MEETING AGENDA — ${acq.club_name} — Week ${a.week_number ?? "—"} (${a.meeting_date})`);
  lines.push("");
  lines.push("THIS WEEK'S UPDATES:");
  (a.status_updates ?? []).forEach((s: any) => lines.push(`- ${s.task_title} (${s.workstream}) ${s.action}${s.old_value ? ` ${s.old_value}→${s.new_value}` : ""}`));
  lines.push("\nITEMS NEEDING DISCUSSION:");
  (a.items_needing_discussion ?? []).forEach((i: any) => lines.push(`- ${i.task_title} (${i.workstream}) — ${i.reason} — ${i.lead ?? "—"}`));
  lines.push("\nDECISIONS NEEDED:");
  (a.decisions_needed ?? []).forEach((d: any) => lines.push(`- ${d.task_title}`));
  lines.push("\nWORKSTREAM STATUS:");
  Object.entries(ws).forEach(([k, v]: any) => lines.push(`- ${k}: ${v.done}/${v.total} (${v.pct}%)`));
  lines.push(`\nCOMPLIANCE: ${a.compliance_status?.compliant ?? 0}/${a.compliance_status?.total ?? 0} compliant, ${a.compliance_status?.overdue ?? 0} overdue`);
  lines.push("\nNEXT WEEK PRIORITIES:");
  (a.next_week_priorities ?? []).forEach((t: any, i: number) => lines.push(`${i + 1}. ${t.task_title} (${t.workstream}) due ${t.target_date}`));
  if (a.ai_talking_points) lines.push("\nTALKING POINTS:\n" + a.ai_talking_points);
  return lines.join("\n");
}
