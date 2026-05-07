import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { DOC_TYPES, DOC_WORKSTREAMS } from "@/lib/dealRoom";
import { workstreamLabel } from "@/lib/acquisitions";
import { toast } from "sonner";

export default function UploadDocumentModal({ open, onOpenChange, acquisitionId, onUploaded, defaultWorkstream }: any) {
  const [files, setFiles] = useState<File[]>([]);
  const [meta, setMeta] = useState<Record<number, any>>({});
  const [busy, setBusy] = useState(false);

  const reset = () => { setFiles([]); setMeta({}); };

  const updateMeta = (i: number, k: string, v: any) => setMeta((m) => ({ ...m, [i]: { ...m[i], [k]: v } }));

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles(arr);
    const m: Record<number, any> = {};
    arr.forEach((f, i) => {
      m[i] = { document_name: f.name.replace(/\.[^.]+$/, ""), document_type: "other", workstream: defaultWorkstream && defaultWorkstream !== "all" ? defaultWorkstream : "general", requires_review: false, is_seller_visible: false, document_description: "" };
    });
    setMeta(m);
  };

  const upload = async () => {
    if (!files.length) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i]; const m = meta[i];
      const path = `${acquisitionId}/${m.workstream}/${Date.now()}_${f.name}`;
      const { error: upErr } = await supabase.storage.from("acquisition-documents").upload(path, f, { upsert: false });
      if (upErr) { toast.error(`Upload failed: ${f.name}`); continue; }
      const { error } = await supabase.from("acquisition_documents").insert({
        acquisition_id: acquisitionId, document_name: m.document_name, document_description: m.document_description || null,
        document_type: m.document_type, workstream: m.workstream, storage_type: "uploaded",
        file_path: path, file_size: f.size, file_type: f.type,
        requires_review: m.requires_review, is_seller_visible: m.is_seller_visible, uploaded_by: user?.id,
      });
      if (!error) ok++;
    }
    setBusy(false);
    toast.success(`${ok} document(s) uploaded`);
    reset(); onOpenChange(false); onUploaded?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Upload Documents</DialogTitle></DialogHeader>
        {files.length === 0 ? (
          <label className="block border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:bg-muted/30">
            <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <p className="font-semibold">Drop files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Up to 50 MB per file</p>
          </label>
        ) : (
          <div className="space-y-4">
            {files.map((f, i) => (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <p className="text-xs text-muted-foreground">{f.name} · {(f.size / 1024).toFixed(1)} KB</p>
                <Input placeholder="Document name" value={meta[i]?.document_name ?? ""} onChange={(e) => updateMeta(i, "document_name", e.target.value)} />
                <Textarea placeholder="Description (optional)" value={meta[i]?.document_description ?? ""} onChange={(e) => updateMeta(i, "document_description", e.target.value)} rows={2} />
                <div className="grid grid-cols-2 gap-2">
                  <select className="text-sm rounded-md border bg-background px-2 py-2" value={meta[i]?.document_type} onChange={(e) => updateMeta(i, "document_type", e.target.value)}>
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="text-sm rounded-md border bg-background px-2 py-2" value={meta[i]?.workstream} onChange={(e) => updateMeta(i, "workstream", e.target.value)}>
                    {DOC_WORKSTREAMS.map((w) => <option key={w} value={w}>{workstreamLabel(w)}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Label className="flex items-center gap-2"><Switch checked={meta[i]?.requires_review} onCheckedChange={(v) => updateMeta(i, "requires_review", v)} /> Requires review</Label>
                  <Label className="flex items-center gap-2"><Switch checked={meta[i]?.is_seller_visible} onCheckedChange={(v) => updateMeta(i, "is_seller_visible", v)} /> Seller visible</Label>
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={upload} disabled={!files.length || busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Uploading…" : "Upload"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
