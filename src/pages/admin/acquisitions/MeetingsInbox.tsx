import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import UploadTranscriptModal from "@/components/acquisitions/UploadTranscriptModal";

export default function MeetingsInbox() {
  const [tab, setTab] = useState<"untagged" | "all">("untagged");
  const [items, setItems] = useState<any[]>([]);
  const [acqs, setAcqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickByT, setPickByT] = useState<Record<string, string>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    const q = supabase.from("acquisition_meeting_transcripts").select("*").eq("is_archived", false).order("created_at", { ascending: false });
    const { data } = tab === "untagged" ? await q.eq("is_tagged", false) : await q;
    const { data: a } = await supabase.from("acquisition_projects").select("id, club_name").eq("status", "active").order("club_name");
    setItems(data ?? []); setAcqs(a ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, [tab]);

  const assign = async (id: string) => {
    const acqId = pickByT[id];
    if (!acqId) { toast.error("Select an acquisition"); return; }
    const { error } = await supabase.from("acquisition_meeting_transcripts").update({ acquisition_id: acqId, is_tagged: true }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    supabase.functions.invoke("process-meeting-transcript", { body: { transcript_id: id } }).catch(() => {});
    toast.success("Assigned. AI processing started.");
    load();
  };
  const dismiss = async (id: string) => {
    await supabase.from("acquisition_meeting_transcripts").update({ is_archived: true }).eq("id", id);
    load();
  };

  const untaggedCount = items.filter((i) => !i.is_tagged).length;
  const acqName = (id: string) => acqs.find((a) => a.id === id)?.club_name ?? "—";

  return (
    <AppShell title="Meeting Transcripts">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">Meeting Transcripts</h1>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Upload Transcript
          </Button>
        </div>
        <div className="flex gap-2 border-b">
          <Tab active={tab === "untagged"} onClick={() => setTab("untagged")}>Untagged ({tab === "untagged" ? untaggedCount : "—"})</Tab>
          <Tab active={tab === "all"} onClick={() => setTab("all")}>All Transcripts</Tab>
        </div>

        <UploadTranscriptModal
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          acquisitions={acqs}
          onUploaded={() => load()}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="curve-card text-center py-12 text-muted-foreground">{tab === "untagged" ? "No untagged transcripts." : "No transcripts yet."}</div>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <div key={t.id} className={`curve-card ${!t.is_tagged ? "border-l-4 border-amber-400" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{t.zoom_meeting_topic ?? t.meeting_title ?? "Meeting"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.meeting_date && new Date(t.meeting_date).toLocaleString()}
                      {t.zoom_duration_minutes && ` · ${t.zoom_duration_minutes} min`}
                      {t.zoom_host_email && ` · ${t.zoom_host_email}`}
                      {t.is_tagged && t.acquisition_id && ` · ${acqName(t.acquisition_id)}`}
                    </p>
                  </div>
                  {!t.is_tagged ? (
                    <div className="flex items-center gap-2">
                      <select value={pickByT[t.id] ?? ""} onChange={(e) => setPickByT({ ...pickByT, [t.id]: e.target.value })} className="px-2 py-1 text-sm rounded border">
                        <option value="">Assign to…</option>
                        {acqs.map((a) => <option key={a.id} value={a.id}>{a.club_name}</option>)}
                      </select>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => assign(t.id)}>Assign</Button>
                      <Button size="sm" variant="ghost" onClick={() => nav(`/admin/acquisitions/transcript/${t.id}`)}>Preview</Button>
                      <button onClick={() => dismiss(t.id)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => nav(`/admin/acquisitions/${t.acquisition_id}/transcript/${t.id}`)}>View</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Tab({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`px-3 py-2 text-sm font-semibold border-b-2 ${active ? "border-emerald-600 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{children}</button>;
}
