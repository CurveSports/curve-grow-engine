import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

type Acq = { id: string; club_name: string };

// Strip VTT/SRT timing/cue lines and Zoom speaker prefixes optionally — keep raw if .txt
function cleanTranscript(raw: string, filename: string): string {
  const isVtt = /\.vtt$/i.test(filename) || raw.startsWith("WEBVTT");
  const isSrt = /\.srt$/i.test(filename);
  if (!isVtt && !isSrt) return raw.trim();
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) continue;
    if (t === "WEBVTT") continue;
    if (/^\d+$/.test(t)) continue; // SRT cue index
    if (/-->/.test(t)) continue; // timestamp line
    if (/^NOTE\b/.test(t)) continue;
    out.push(t);
  }
  return out.join("\n");
}

export default function UploadTranscriptModal({
  open, onOpenChange, acquisitions, defaultAcquisitionId, onUploaded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  acquisitions: Acq[];
  defaultAcquisitionId?: string;
  onUploaded?: (transcriptId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [acqId, setAcqId] = useState<string>(defaultAcquisitionId ?? "");
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [saving, setSaving] = useState(false);

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("File too large (max 5 MB)"); return; }
    setFilename(f.name);
    const raw = await f.text();
    setText(raw);
    if (!title) setTitle(f.name.replace(/\.(vtt|srt|txt)$/i, ""));
  };

  const submit = async () => {
    const cleaned = cleanTranscript(text, filename || "paste.txt").trim();
    if (cleaned.length < 20) { toast.error("Transcript looks empty"); return; }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const payload: any = {
        meeting_title: title || "Uploaded transcript",
        meeting_date: date ? new Date(date).toISOString() : null,
        raw_transcript: cleaned,
        source_type: "manual_upload",
        acquisition_id: acqId || null,
        is_tagged: !!acqId,
        is_archived: false,
        ai_status: "pending",
        created_by: userRes.user?.id ?? null,
      };
      const { data: inserted, error } = await supabase
        .from("acquisition_meeting_transcripts").insert(payload).select("id").maybeSingle();
      if (error) throw error;
      const newId = inserted?.id;
      if (newId && acqId) {
        supabase.functions.invoke("process-meeting-transcript", { body: { transcript_id: newId } }).catch(() => {});
        toast.success("Uploaded. AI processing started.");
      } else {
        toast.success("Uploaded. Assign to an acquisition to start AI processing.");
      }
      onOpenChange(false);
      setTitle(""); setText(""); setFilename("");
      if (newId) onUploaded?.(newId);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Upload Zoom Transcript</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Transcript file (.vtt, .srt, or .txt)</Label>
            <Input type="file" accept=".vtt,.srt,.txt,text/plain" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            {filename && <p className="text-xs text-muted-foreground">Loaded: {filename}</p>}
          </div>
          <div className="text-xs text-muted-foreground text-center">— or paste below —</div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Transcript text</Label>
            <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste transcript content here…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Meeting title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Discovery call with FC United" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Meeting date</Label>
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Acquisition (optional — assign now to start AI)</Label>
            <Select value={acqId || "none"} onValueChange={(v) => setAcqId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Leave untagged" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Leave untagged —</SelectItem>
                {acquisitions.map((a) => <SelectItem key={a.id} value={a.id}>{a.club_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
