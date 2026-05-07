import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ReplaceDocumentModal({ doc, onClose, onReplaced }: { doc: any; onClose: () => void; onReplaced: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const newVer = (doc.version ?? 1) + 1;

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${doc.acquisition_id}/${doc.workstream || "general"}/${Date.now()}_v${newVer}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("acquisition-documents").upload(path, file);
    if (upErr) { setBusy(false); return toast.error(upErr.message); }
    // Mark previous as not-current
    await supabase.from("acquisition_documents").update({ is_current_version: false }).eq("id", doc.id);
    await supabase.from("acquisition_documents").insert({
      acquisition_id: doc.acquisition_id, document_name: doc.document_name, document_description: doc.document_description,
      document_type: doc.document_type, workstream: doc.workstream, storage_type: "uploaded",
      file_path: path, file_size: file.size, file_type: file.type,
      version: newVer, previous_version_id: doc.id, version_notes: notes || null,
      is_seller_visible: doc.is_seller_visible, uploaded_by: user?.id,
    });
    setBusy(false);
    toast.success(`Version ${newVer} uploaded`);
    onReplaced(); onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload New Version of {doc.document_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30">
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file ? <p className="text-sm">{file.name}</p> : <p className="text-sm text-muted-foreground">Click to select file</p>}
          </label>
          <Textarea placeholder="What changed in this version?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!file || busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Uploading…" : `Upload Version ${newVer}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
