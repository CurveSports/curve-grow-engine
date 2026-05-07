import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { workstreamLabel } from "@/lib/acquisitions";
import AddTaskModal, { type AddTaskPrefill } from "@/components/acquisitions/AddTaskModal";

type Tab = "summary" | "suggestions" | "transcript";

export default function TranscriptDetail() {
  const { id, transcriptId } = useParams();
  const nav = useNavigate();
  const [t, setT] = useState<any>(null);
  const [acq, setAcq] = useState<any>(null);
  const [sugs, setSugs] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("summary");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addPrefill, setAddPrefill] = useState<AddTaskPrefill | undefined>(undefined);
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: tr }, { data: a }, { data: s }] = await Promise.all([
      supabase.from("acquisition_meeting_transcripts").select("*").eq("id", transcriptId).maybeSingle(),
      supabase.from("acquisition_projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("acquisition_task_suggestions").select("*").eq("transcript_id", transcriptId).order("created_at"),
    ]);
    setT(tr); setAcq(a); setSugs(s ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [transcriptId]);

  // Auto-poll if processing
  useEffect(() => {
    if (t?.ai_status === "processing" || t?.ai_status === "pending") {
      const x = setInterval(load, 4000);
      return () => clearInterval(x);
    }
  }, [t?.ai_status]);

  if (loading || !t) return <AppShell title="Transcript"><div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div></AppShell>;

  const apply = async (s: any) => {
    if (!s.existing_task_id && s.suggestion_type !== "new_task") {
      toast.error("No matched task — modify or dismiss");
      return;
    }
    let update: any = null;
    switch (s.suggestion_type) {
      case "status_update": update = { status: "started" }; break;
      case "mark_complete": update = { status: "done", completed_date: new Date().toISOString().slice(0, 10) }; break;
      case "mark_blocked": update = { status: "blocked" }; break;
      case "update_date": {
        const d = prompt("New target date (YYYY-MM-DD):");
        if (!d) return;
        update = { target_date: d };
        break;
      }
      case "add_note": {
        const { data: u } = await supabase.auth.getUser();
        await supabase.from("acquisition_task_notes").insert({
          task_id: s.existing_task_id,
          acquisition_id: id!,
          note_text: s.suggested_action + (s.context_from_transcript ? `\n\nFrom transcript: ${s.context_from_transcript}` : ""),
          created_by: u.user!.id,
        });
        break;
      }
      case "new_task": {
        const guessPhase = (() => {
          const days = acq?.close_date ? Math.floor((Date.now() - new Date(acq.close_date).getTime()) / 86400000) : 0;
          if (days <= 30) return "first_30"; if (days <= 60) return "first_60"; if (days <= 100) return "first_100"; return "post_100";
        })();
        setAddPrefill({
          title: s.existing_task_title || s.suggested_action?.slice(0, 80) || "",
          description: [s.suggested_action, s.context_from_transcript ? `From transcript: ${s.context_from_transcript}` : ""].filter(Boolean).join("\n\n"),
          workstream: "integration",
          phase: guessPhase,
          priority: s.confidence === "high" ? "high" : "medium",
        });
        setPendingSuggestionId(s.id);
        setAddOpen(true);
        return;
      }
    }
    if (update && s.existing_task_id) {
      const { error } = await supabase.from("acquisition_tasks").update(update).eq("id", s.existing_task_id);
      if (error) { toast.error(error.message); return; }
    }
    await supabase.from("acquisition_task_suggestions").update({ resolution: "accepted", resolved_at: new Date().toISOString() }).eq("id", s.id);
    await supabase.from("acquisition_meeting_transcripts").update({ suggestions_applied_count: (t.suggestions_applied_count ?? 0) + 1 }).eq("id", t.id);
    toast.success("Suggestion applied");
    load();
  };

  const dismiss = async (s: any) => {
    await supabase.from("acquisition_task_suggestions").update({ resolution: "dismissed", resolved_at: new Date().toISOString() }).eq("id", s.id);
    await supabase.from("acquisition_meeting_transcripts").update({ suggestions_dismissed_count: (t.suggestions_dismissed_count ?? 0) + 1 }).eq("id", t.id);
    load();
  };

  const pending = sugs.filter((s) => s.resolution === "pending");
  const accepted = sugs.filter((s) => s.resolution === "accepted").length;
  const dismissed = sugs.filter((s) => s.resolution === "dismissed").length;

  return (
    <AppShell title={t.meeting_title}>
      <div className="max-w-5xl mx-auto space-y-4">
        <button onClick={() => nav(`/admin/acquisitions/${id}?tab=meetings`)} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Meetings
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold">{t.meeting_title}</h1>
          <p className="text-sm text-muted-foreground">
            {t.meeting_date && new Date(t.meeting_date).toLocaleString()}
            {t.zoom_duration_minutes && ` · ${t.zoom_duration_minutes} min`}
            {" · "}AI: {t.ai_status}
          </p>
        </div>

        {(t.ai_status === "pending" || t.ai_status === "processing") && (
          <div className="curve-card flex items-center gap-3 bg-amber-50 border-amber-200">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            <p className="text-sm">AI is processing this transcript… results will appear shortly.</p>
          </div>
        )}
        {t.ai_status === "failed" && (
          <div className="curve-card bg-rose-50 border-rose-200">
            <p className="text-sm text-rose-700">AI processing failed: {t.ai_error}</p>
            <Button size="sm" className="mt-2" onClick={async () => { await supabase.functions.invoke("process-meeting-transcript", { body: { transcript_id: t.id } }); toast.info("Reprocessing…"); load(); }}>Retry</Button>
          </div>
        )}

        <div className="flex gap-2 border-b">
          <TabBtn active={tab === "summary"} onClick={() => setTab("summary")}>Summary</TabBtn>
          <TabBtn active={tab === "suggestions"} onClick={() => setTab("suggestions")}>Suggestions ({pending.length})</TabBtn>
          <TabBtn active={tab === "transcript"} onClick={() => setTab("transcript")}>Full Transcript</TabBtn>
        </div>

        {tab === "summary" && (
          <div className="space-y-4">
            {t.meeting_summary && (
              <div className="curve-card border-l-4 border-emerald-500"><h3 className="font-semibold mb-2">Meeting Summary</h3><p className="text-sm">{t.meeting_summary}</p></div>
            )}
            {t.key_decisions?.length > 0 && (
              <div className="curve-card"><h3 className="font-semibold mb-2">Key Decisions</h3>
                <ul className="space-y-2 text-sm">{t.key_decisions.map((d: any, i: number) => (
                  <li key={i}><strong>{d.decision}</strong>{d.context && <p className="text-xs text-muted-foreground">{d.context}</p>}</li>
                ))}</ul>
              </div>
            )}
            {t.action_items?.length > 0 && (
              <div className="curve-card"><h3 className="font-semibold mb-2">Action Items</h3>
                <table className="w-full text-sm"><thead><tr className="text-xs text-muted-foreground"><th className="text-left py-1">Action</th><th className="text-left">Owner</th><th className="text-left">Deadline</th><th className="text-left">Mapped</th></tr></thead>
                  <tbody>{t.action_items.map((a: any, i: number) => (
                    <tr key={i} className="border-t"><td className="py-1.5">{a.action}</td><td>{a.owner ?? "—"}</td><td>{a.deadline ?? "—"}</td><td>{a.suggested_task_id ? <span className="text-emerald-600">🔗 Matched</span> : <span className="text-muted-foreground">⬜ Unmatched</span>}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {t.open_issues?.length > 0 && (
              <div className="curve-card"><h3 className="font-semibold mb-2">Open Issues</h3>
                <ul className="space-y-1 text-sm">{t.open_issues.map((i: any, k: number) => (
                  <li key={k}><span className={`px-1.5 py-0.5 rounded text-[10px] mr-2 ${i.severity === "high" ? "bg-rose-100 text-rose-800" : i.severity === "medium" ? "bg-amber-100 text-amber-800" : "bg-muted"}`}>{i.severity}</span>{i.issue} <span className="text-xs text-muted-foreground">({workstreamLabel(i.workstream)})</span></li>
                ))}</ul>
              </div>
            )}
            {t.risk_flags?.length > 0 && (
              <div className="curve-card border-l-4 border-rose-500"><h3 className="font-semibold mb-2">Risk Flags</h3>
                <ul className="space-y-1 text-sm">{t.risk_flags.map((r: any, i: number) => (<li key={i}>⚠ {r.risk} <span className="text-xs text-muted-foreground">({workstreamLabel(r.workstream)})</span></li>))}</ul>
              </div>
            )}
            {t.follow_ups?.length > 0 && (
              <div className="curve-card"><h3 className="font-semibold mb-2">Follow-Ups</h3>
                <ul className="space-y-1 text-sm">{t.follow_ups.map((f: any, i: number) => (<li key={i}>• {f.item} — {f.owner ?? "—"}{f.date ? ` (by ${f.date})` : ""}</li>))}</ul>
              </div>
            )}
          </div>
        )}

        {tab === "suggestions" && (
          <div className="space-y-3">
            {pending.length === 0 && (
              <div className="curve-card text-center py-8 text-muted-foreground">
                <p>All suggestions reviewed ✓</p>
                <p className="text-xs mt-1">{accepted} accepted · {dismissed} dismissed</p>
              </div>
            )}
            {pending.map((s) => (
              <div key={s.id} className="curve-card">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{iconFor(s.suggestion_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold uppercase">{s.suggestion_type.replace(/_/g, " ")}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${s.confidence === "high" ? "bg-emerald-100 text-emerald-800" : s.confidence === "medium" ? "bg-amber-100 text-amber-800" : "bg-muted"}`}>{s.confidence}</span>
                    </div>
                    <p className="text-sm"><strong>Task:</strong> {s.existing_task_title ?? "(new task)"}</p>
                    <p className="text-sm font-semibold mt-1">{s.suggested_action}</p>
                    {s.context_from_transcript && <p className="text-xs italic text-muted-foreground mt-1.5">"{s.context_from_transcript}"</p>}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => apply(s)}><Check className="h-3.5 w-3.5 mr-1" />Accept</Button>
                      <Button size="sm" variant="outline" onClick={async () => { if (s.existing_task_id) nav(`/admin/acquisitions/${id}`); await supabase.from("acquisition_task_suggestions").update({ resolution: "modified", resolved_at: new Date().toISOString() }).eq("id", s.id); load(); }}><Pencil className="h-3.5 w-3.5 mr-1" />Modify</Button>
                      <Button size="sm" variant="ghost" onClick={() => dismiss(s)}><X className="h-3.5 w-3.5 mr-1" />Dismiss</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "transcript" && (
          <div>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transcript…" className="w-full px-3 py-2 rounded border mb-3 text-sm" />
            <pre className="curve-card whitespace-pre-wrap text-sm font-sans max-h-[600px] overflow-auto">{highlight(t.raw_transcript ?? "(empty)", search)}</pre>
          </div>
        )}
      </div>
      <AddTaskModal
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) { setAddPrefill(undefined); setPendingSuggestionId(null); } }}
        acquisitionId={id!}
        prefill={addPrefill}
        onAdded={() => {}}
        onCreated={async () => {
          if (pendingSuggestionId) {
            await supabase.from("acquisition_task_suggestions").update({ resolution: "accepted", resolved_at: new Date().toISOString() }).eq("id", pendingSuggestionId);
            await supabase.from("acquisition_meeting_transcripts").update({ suggestions_applied_count: (t.suggestions_applied_count ?? 0) + 1 }).eq("id", t.id);
            setPendingSuggestionId(null);
          }
          load();
        }}
      />
    </AppShell>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`px-3 py-2 text-sm font-semibold border-b-2 ${active ? "border-emerald-600 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{children}</button>;
}
function iconFor(t: string) {
  return ({ status_update: "📝", new_task: "➕", add_note: "📌", update_date: "📅", mark_blocked: "🚫", mark_complete: "✅" } as any)[t] ?? "•";
}
function highlight(text: string, q: string) {
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) => p.toLowerCase() === q.toLowerCase() ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>);
}
