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

export default function LinkDocumentModal({ open, onOpenChange, acquisitionId, onAdded, defaultWorkstream }: any) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("other");
  const [ws, setWs] = useState(defaultWorkstream && defaultWorkstream !== "all" ? defaultWorkstream : "general");
  const [seller, setSeller] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!url || !name) return toast.error("URL and name required");
    if (!/^https?:\/\//i.test(url)) return toast.error("Invalid URL");
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const isGoogle = /docs\.google\.com|drive\.google\.com|sheets\.google\.com|slides\.google\.com/.test(url);
    const { error } = await supabase.from("acquisition_documents").insert({
      acquisition_id: acquisitionId, document_name: name, document_description: desc || null,
      document_type: type, workstream: ws, storage_type: isGoogle ? "google_drive" : "external_link",
      external_url: url, is_seller_visible: seller, uploaded_by: user?.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Document linked");
    setUrl(""); setName(""); setDesc(""); setSeller(false);
    onOpenChange(false); onAdded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Link External Document</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="https://docs.google.com/..." value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Document name (e.g. Power Kickoff Deck)" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          <div className="grid grid-cols-2 gap-2">
            <select className="text-sm rounded-md border bg-background px-2 py-2" value={type} onChange={(e) => setType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="text-sm rounded-md border bg-background px-2 py-2" value={ws} onChange={(e) => setWs(e.target.value)}>
              {DOC_WORKSTREAMS.map((w) => <option key={w} value={w}>{workstreamLabel(w)}</option>)}
            </select>
          </div>
          <Label className="flex items-center gap-2 text-sm"><Switch checked={seller} onCheckedChange={setSeller} /> Seller visible</Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">{busy ? "Adding…" : "Add Link"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
