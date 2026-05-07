import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { COMM_TYPES, COMM_METHODS } from "@/lib/dealRoom";
import { toast } from "sonner";

const TYPE_LABEL: Record<string, string> = { seller: "Seller", staff: "Staff", sikich: "Sikich", legal: "Legal", vendor: "Vendor", internal: "Internal", other: "Other" };

export default function LogCommunicationModal({ open, onOpenChange, acquisitionId, item, onSaved }: any) {
  const [f, setF] = useState<any>({});
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    setF(item ? { ...item, communication_date: item.communication_date?.slice(0, 16) }
      : { communication_type: "seller", method: "call", communication_date: new Date().toISOString().slice(0, 16), follow_up_needed: false });
  }, [item, open]);

  useEffect(() => {
    if (!open) return;
    supabase.from("acquisition_tasks").select("id,title").eq("acquisition_id", acquisitionId).then(({ data }) => setTasks(data ?? []));
  }, [open, acquisitionId]);

  const submit = async () => {
    if (!f.subject || !f.summary || !f.communication_type || !f.method) return toast.error("Required fields missing");
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      acquisition_id: acquisitionId,
      communication_type: f.communication_type, subject: f.subject, summary: f.summary,
      contact_name: f.contact_name || null, contact_role: f.contact_role || null, contact_organization: f.contact_organization || null,
      method: f.method, communication_date: new Date(f.communication_date).toISOString(),
      follow_up_needed: !!f.follow_up_needed,
      follow_up_date: f.follow_up_needed ? f.follow_up_date || null : null,
      follow_up_notes: f.follow_up_needed ? f.follow_up_notes || null : null,
      related_task_id: f.related_task_id || null,
    };
    let err;
    if (item?.id) ({ error: err } = await supabase.from("acquisition_communications").update(payload).eq("id", item.id));
    else ({ error: err } = await supabase.from("acquisition_communications").insert({ ...payload, logged_by: user?.id }));
    if (err) return toast.error(err.message);
    toast.success("Logged"); onOpenChange(false); onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Edit" : "Log"} Communication</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Type</p>
            <div className="flex flex-wrap gap-1">
              {COMM_TYPES.map((t) => (
                <button key={t} onClick={() => setF({ ...f, communication_type: t })} className={`text-xs px-3 py-1 rounded-full border ${f.communication_type === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-card hover:bg-muted"}`}>{TYPE_LABEL[t]}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Method</p>
            <div className="flex flex-wrap gap-1">
              {COMM_METHODS.map((m) => (
                <button key={m.key} onClick={() => setF({ ...f, method: m.key })} className={`text-xs px-3 py-1 rounded-full border ${f.method === m.key ? "bg-emerald-600 text-white border-emerald-600" : "bg-card hover:bg-muted"}`}>{m.icon} {m.label}</button>
              ))}
            </div>
          </div>
          <Input type="datetime-local" value={f.communication_date ?? ""} onChange={(e) => setF({ ...f, communication_date: e.target.value })} />
          <Input placeholder="Subject" value={f.subject ?? ""} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          <Textarea placeholder="Summary — key points, decisions, outcomes" value={f.summary ?? ""} onChange={(e) => setF({ ...f, summary: e.target.value })} rows={4} />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Contact name" value={f.contact_name ?? ""} onChange={(e) => setF({ ...f, contact_name: e.target.value })} />
            <Input placeholder="Role" value={f.contact_role ?? ""} onChange={(e) => setF({ ...f, contact_role: e.target.value })} />
            <Input placeholder="Organization" value={f.contact_organization ?? ""} onChange={(e) => setF({ ...f, contact_organization: e.target.value })} />
          </div>
          <Label className="flex items-center gap-2 text-sm"><Switch checked={!!f.follow_up_needed} onCheckedChange={(v) => setF({ ...f, follow_up_needed: v })} /> Follow-up needed</Label>
          {f.follow_up_needed && (
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={f.follow_up_date ?? ""} onChange={(e) => setF({ ...f, follow_up_date: e.target.value })} />
              <Input placeholder="Follow-up notes" value={f.follow_up_notes ?? ""} onChange={(e) => setF({ ...f, follow_up_notes: e.target.value })} />
            </div>
          )}
          <select value={f.related_task_id ?? ""} onChange={(e) => setF({ ...f, related_task_id: e.target.value || null })} className="w-full text-sm rounded-md border bg-background px-2 py-2">
            <option value="">Related task (optional)…</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">Log Communication</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
