import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FileText, Upload, Link2, Mic } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";

type Transcript = any;

export default function MeetingsPanel({ acquisition }: { acquisition: any }) {
  const [items, setItems] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingByT, setPendingByT] = useState<Record<string, number>>({});
  const [addOpen, setAddOpen] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("acquisition_meeting_transcripts")
      .select("*").eq("acquisition_id", acquisition.id).order("meeting_date", { ascending: false });
    setItems(data ?? []);
    if (data?.length) {
      const ids = data.map((d: any) => d.id);
      const { data: sugs } = await supabase.from("acquisition_task_suggestions")
        .select("transcript_id").in("transcript_id", ids).eq("resolution", "pending");
      const map: Record<string, number> = {};
      (sugs ?? []).forEach((s: any) => { map[s.transcript_id] = (map[s.transcript_id] ?? 0) + 1; });
      setPendingByT(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [acquisition.id]);

  const reprocess = async (id: string) => {
    toast.info("Reprocessing transcript…");
    await supabase.functions.invoke("process-meeting-transcript", { body: { transcript_id: id } });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Meeting Transcripts</h2>
        <Button onClick={() => setAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1.5" /> Add Transcript
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="curve-card text-center py-12 text-muted-foreground">
          <Mic className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No meeting transcripts yet. Add one to get AI-extracted action items and task suggestions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="curve-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{t.meeting_title || t.zoom_meeting_topic || "Meeting"}</p>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                    {t.meeting_date && <span>{new Date(t.meeting_date).toLocaleDateString()}</span>}
                    {t.zoom_duration_minutes && <span>{t.zoom_duration_minutes} min</span>}
                    <SourceBadge src={t.source_type} />
                    <StatusBadge s={t.ai_status} />
                    {pendingByT[t.id] > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">{pendingByT[t.id]} pending suggestions</span>}
                  </div>
                  {t.ai_status === "complete" && t.meeting_summary && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.meeting_summary}</p>
                  )}
                  {t.ai_status === "failed" && t.ai_error && (
                    <p className="text-sm text-rose-600 mt-2">Error: {t.ai_error}</p>
                  )}
                  {t.ai_status === "complete" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(t.action_items?.length ?? 0)} action items · {(t.key_decisions?.length ?? 0)} decisions
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => nav(`/admin/acquisitions/${acquisition.id}/transcript/${t.id}`)}>View</Button>
                  {(t.ai_status === "failed" || t.ai_status === "complete") && (
                    <Button size="sm" variant="ghost" onClick={() => reprocess(t.id)}>Reprocess</Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTranscriptModal open={addOpen} onOpenChange={setAddOpen} acquisitionId={acquisition.id} onAdded={(id) => { setAddOpen(false); nav(`/admin/acquisitions/${acquisition.id}/transcript/${id}`); }} />
    </div>
  );
}

function SourceBadge({ src }: { src: string }) {
  const map: Record<string, string> = {
    zoom_webhook: "Zoom (auto)", zoom_manual: "Zoom (manual)", manual_paste: "Pasted", upload: "Uploaded",
  };
  return <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">{map[src] ?? src}</span>;
}
function StatusBadge({ s }: { s: string }) {
  const cfg: Record<string, { c: string; l: string }> = {
    pending: { c: "bg-muted text-muted-foreground", l: "⏳ Pending" },
    processing: { c: "bg-amber-100 text-amber-800", l: "🔄 Processing" },
    complete: { c: "bg-emerald-100 text-emerald-800", l: "✅ Processed" },
    failed: { c: "bg-rose-100 text-rose-800", l: "❌ Failed" },
  };
  const x = cfg[s] ?? cfg.pending;
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${x.c}`}>{x.l}</span>;
}

function AddTranscriptModal({ open, onOpenChange, acquisitionId, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; acquisitionId: string; onAdded: (id: string) => void }) {
  const [tab, setTab] = useState<"paste" | "upload" | "zoom">("paste");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [zoomUrl, setZoomUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setDate(""); setText(""); setZoomUrl(""); };

  const onFile = async (f: File) => {
    const t = await f.text();
    setText(t);
    if (!title) setTitle(f.name.replace(/\.(vtt|srt|txt)$/i, ""));
  };

  const submit = async () => {
    if (tab === "paste" && (!title || !text)) { toast.error("Title and transcript text required"); return; }
    if (tab === "upload" && (!title || !text)) { toast.error("Title and uploaded file required"); return; }
    if (tab === "zoom" && !zoomUrl) { toast.error("Zoom recording URL required"); return; }
    setBusy(true);
    const { data, error } = await supabase.from("acquisition_meeting_transcripts").insert({
      acquisition_id: acquisitionId,
      source_type: tab === "paste" ? "manual_paste" : tab === "upload" ? "upload" : "zoom_manual",
      meeting_title: title || "Meeting",
      meeting_date: date ? new Date(date).toISOString() : new Date().toISOString(),
      raw_transcript: text || `Zoom recording: ${zoomUrl}`,
      zoom_recording_url: tab === "zoom" ? zoomUrl : null,
      is_tagged: true,
      ai_status: "pending",
    }).select().single();
    if (error) { toast.error(error.message); setBusy(false); return; }
    supabase.functions.invoke("process-meeting-transcript", { body: { transcript_id: data.id } }).catch(() => {});
    toast.success("Transcript added — AI processing in progress");
    setBusy(false); reset(); onAdded(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Add Meeting Transcript</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <TabBtn icon={Link2} label="Zoom Link" active={tab === "zoom"} onClick={() => setTab("zoom")} />
          <TabBtn icon={FileText} label="Paste Text" active={tab === "paste"} onClick={() => setTab("paste")} />
          <TabBtn icon={Upload} label="Upload File" active={tab === "upload"} onClick={() => setTab("upload")} />
        </div>
        <div className="space-y-3 mt-3">
          {tab === "zoom" && (
            <div className="space-y-2">
              <Label>Zoom recording URL *</Label>
              <Input value={zoomUrl} onChange={(e) => setZoomUrl(e.target.value)} placeholder="https://zoom.us/rec/share/..." />
              <p className="text-xs text-muted-foreground">Note: automatic Zoom transcript fetching requires Zoom OAuth credentials in Settings. For now, the URL is stored and you can paste the transcript text below.</p>
              <Label>Transcript text (optional, but recommended)</Label>
              <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste transcript text here…" />
            </div>
          )}
          {tab === "paste" && (
            <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste full meeting transcript or notes…" />
          )}
          {tab === "upload" && (
            <Input type="file" accept=".vtt,.txt,.srt" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Meeting title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>Meeting date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Adding…" : "Add & Process"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function TabBtn({ icon: Icon, label, active, onClick }: any) {
  return <button onClick={onClick} className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 ${active ? "border-emerald-600 bg-emerald-50" : "border-border hover:border-muted-foreground"}`}>
    <Icon className="h-5 w-5" /><span className="text-sm font-medium">{label}</span>
  </button>;
}
