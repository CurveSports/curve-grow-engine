import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { WORKSTREAMS, PHASES } from "@/lib/acquisitions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const PRIORITIES = ["low", "medium", "high", "critical"];

export type AddTaskPrefill = Partial<{
  title: string; description: string; workstream: string; phase: string;
  priority: string; lead_person_name: string; target_date: string; dependency: string;
}>;

export default function AddTaskModal({
  open, onOpenChange, acquisitionId, onAdded, prefill, onCreated,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; acquisitionId: string;
  onAdded: () => void; prefill?: AddTaskPrefill;
  onCreated?: (taskId: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const blank = {
    title: "", description: "", workstream: "integration", phase: "first_30",
    priority: "medium", lead_person_name: "", target_date: "", dependency: "",
  };
  const [f, setF] = useState<any>(blank);
  useEffect(() => {
    if (open) setF({ ...blank, ...(prefill ?? {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);
  const set = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const payload: any = {
        acquisition_id: acquisitionId,
        title: f.title.trim(),
        description: f.description || null,
        workstream: f.workstream,
        phase: f.phase,
        status: "open",
        priority: f.priority || null,
        lead_person_name: f.lead_person_name || null,
        target_date: f.target_date || null,
        dependency: f.dependency || null,
        is_custom: true,
        created_by: userRes.user?.id ?? null,
      };
      const { error } = await supabase.from("acquisition_tasks").insert(payload);
      if (error) throw error;
      toast.success("Task added");
      onOpenChange(false);
      setF({ title: "", description: "", workstream: "integration", phase: "first_30", priority: "medium", lead_person_name: "", target_date: "", dependency: "" });
      onAdded();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add task");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Title *"><Input value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Description"><Textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Workstream">
              <Select value={f.workstream} onValueChange={(v) => set("workstream", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WORKSTREAMS.map((w) => <SelectItem key={w.key} value={w.key}>{w.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Phase">
              <Select value={f.phase} onValueChange={(v) => set("phase", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PHASES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <Select value={f.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Target date"><Input type="date" value={f.target_date} onChange={(e) => set("target_date", e.target.value)} /></Field>
          </div>
          <Field label="Lead (person name)"><Input value={f.lead_person_name} onChange={(e) => set("lead_person_name", e.target.value)} /></Field>
          <Field label="Dependency"><Input placeholder="What must be complete first?" value={f.dependency} onChange={(e) => set("dependency", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
