import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { BUDGET_CATEGORIES } from "@/lib/dealRoom";
import { WORKSTREAMS } from "@/lib/acquisitions";
import { toast } from "sonner";

const PAYMENT_METHODS = ["Amex","Rho","Wire","Check","Cash","Other"];

export default function BudgetItemModal({ open, onOpenChange, acquisitionId, item, onSaved }: any) {
  const [f, setF] = useState<any>({});
  const [docs, setDocs] = useState<any[]>([]);
  useEffect(() => {
    setF(item ? { ...item } : { workstream: "general", category: "other", is_paid: false });
  }, [item, open]);
  useEffect(() => {
    if (!open) return;
    supabase.from("acquisition_documents")
      .select("id, document_name, document_type, workstream")
      .eq("acquisition_id", acquisitionId)
      .eq("is_current_version", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setDocs(data ?? []));
  }, [open, acquisitionId]);

  const submit = async () => {
    if (!f.description || !f.workstream || !f.category) return toast.error("Required fields missing");
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      acquisition_id: acquisitionId, workstream: f.workstream, category: f.category,
      description: f.description, vendor: f.vendor || null,
      budgeted_amount: f.budgeted_amount ? Number(f.budgeted_amount) : null,
      actual_amount: f.actual_amount ? Number(f.actual_amount) : null,
      date_incurred: f.date_incurred || null, is_paid: !!f.is_paid,
      payment_method: f.payment_method || null, notes: f.notes || null,
      receipt_document_id: f.receipt_document_id || null,
    };
    let err;
    if (item?.id) ({ error: err } = await supabase.from("acquisition_budget_items").update(payload).eq("id", item.id));
    else ({ error: err } = await supabase.from("acquisition_budget_items").insert({ ...payload, created_by: user?.id }));
    if (err) return toast.error(err.message);
    toast.success(item ? "Updated" : "Added"); onOpenChange(false); onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Edit" : "Add"} Budget Item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={f.workstream ?? ""} onChange={(e) => setF({ ...f, workstream: e.target.value })} className="text-sm rounded-md border bg-background px-2 py-2">
              {WORKSTREAMS.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
              <option value="general">General</option>
            </select>
            <select value={f.category ?? ""} onChange={(e) => setF({ ...f, category: e.target.value })} className="text-sm rounded-md border bg-background px-2 py-2">
              {BUDGET_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <Input placeholder="Description (e.g. Sikich March invoice)" value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <Input placeholder="Vendor" value={f.vendor ?? ""} onChange={(e) => setF({ ...f, vendor: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" step="0.01" placeholder="Budgeted" value={f.budgeted_amount ?? ""} onChange={(e) => setF({ ...f, budgeted_amount: e.target.value })} />
            <Input type="number" step="0.01" placeholder="Actual" value={f.actual_amount ?? ""} onChange={(e) => setF({ ...f, actual_amount: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={f.date_incurred ?? ""} onChange={(e) => setF({ ...f, date_incurred: e.target.value })} />
            <select value={f.payment_method ?? ""} onChange={(e) => setF({ ...f, payment_method: e.target.value })} className="text-sm rounded-md border bg-background px-2 py-2">
              <option value="">Payment method…</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <Label className="flex items-center gap-2 text-sm"><Switch checked={!!f.is_paid} onCheckedChange={(v) => setF({ ...f, is_paid: v })} /> Paid</Label>
          <div className="space-y-1">
            <Label className="text-sm">Receipt (optional)</Label>
            <select value={f.receipt_document_id ?? ""} onChange={(e) => setF({ ...f, receipt_document_id: e.target.value || null })} className="w-full text-sm rounded-md border bg-background px-2 py-2">
              <option value="">— No receipt linked —</option>
              {docs.map((d) => <option key={d.id} value={d.id}>{d.document_name}{d.document_type ? ` · ${d.document_type}` : ""}</option>)}
            </select>
            <p className="text-[11px] text-muted-foreground">Upload receipts in the Documents tab first, then link them here.</p>
          </div>
          <Textarea placeholder="Notes" value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">{item ? "Save" : "Add Item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
