import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function VersionHistoryModal({ doc, onClose, onChanged }: { doc: any; onClose: () => void; onChanged: () => void }) {
  const [versions, setVersions] = useState<any[]>([]);

  const load = async () => {
    // Walk previous_version_id chain by name + acquisition (simpler: filter by document_name)
    const { data } = await supabase.from("acquisition_documents")
      .select("*").eq("acquisition_id", doc.acquisition_id).eq("document_name", doc.document_name)
      .order("version", { ascending: false });
    setVersions(data ?? []);
  };
  useEffect(() => { load(); }, [doc.id]);

  const download = async (v: any) => {
    if (v.storage_type !== "uploaded") return;
    const { data } = await supabase.storage.from("acquisition-documents").createSignedUrl(v.file_path, 600, { download: true });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const restore = async (v: any) => {
    await supabase.from("acquisition_documents").update({ is_current_version: false }).eq("acquisition_id", doc.acquisition_id).eq("document_name", doc.document_name);
    await supabase.from("acquisition_documents").update({ is_current_version: true }).eq("id", v.id);
    toast.success(`Restored v${v.version}`);
    onChanged(); onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Version history — {doc.document_name}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="border rounded-md p-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-sm">v{v.version}{v.is_current_version && <span className="ml-2 text-xs text-emerald-700">(current)</span>}</p>
                  <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</p>
                  {v.version_notes && <p className="text-xs italic mt-1">"{v.version_notes}"</p>}
                </div>
                <div className="flex gap-1">
                  {v.storage_type === "uploaded" && <Button size="sm" variant="outline" onClick={() => download(v)}>Download</Button>}
                  {!v.is_current_version && <Button size="sm" variant="outline" onClick={() => restore(v)}>Restore</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
