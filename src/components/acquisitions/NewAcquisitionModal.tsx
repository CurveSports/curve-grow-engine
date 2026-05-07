import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { US_STATES, addDays } from "@/lib/acquisitions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function NewAcquisitionModal({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    club_name: "", codename: "", entity_name: "", state: "", city: "", close_date: "",
    seller_primary_name: "", seller_primary_email: "", seller_primary_phone: "",
    seller_secondary_name: "", seller_secondary_email: "", acquisition_notes: "",
  });
  const set = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.club_name.trim() || !f.state) { toast.error("Club name and state are required"); return; }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const payload: any = { ...f, created_by: userRes.user?.id ?? null };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });

      const { data: project, error } = await supabase
        .from("acquisition_projects").insert(payload).select("*").single();
      if (error) throw error;

      // Generate tasks from templates
      const { data: templates } = await supabase
        .from("acquisition_task_templates")
        .select("*")
        .eq("is_system_template", true)
        .order("workstream").order("display_order");

      const tasks = (templates ?? [])
        .filter((t: any) => !t.state_filter || t.state_filter === project.state)
        .map((t: any) => ({
          acquisition_id: project.id,
          title: t.title,
          description: t.description,
          workstream: t.workstream,
          phase: t.phase,
          status: "open",
          priority: t.priority,
          lead_person_name: t.lead_role,
          target_date: project.close_date && t.suggested_days_from_close != null
            ? addDays(project.close_date, t.suggested_days_from_close) : null,
          template_id: t.id,
          is_seller_visible: t.is_seller_visible,
          is_staff_visible: t.is_staff_visible,
          display_order: t.display_order,
          created_by: userRes.user?.id ?? null,
        }));

      if (tasks.length) {
        const { error: tErr } = await supabase.from("acquisition_tasks").insert(tasks);
        if (tErr) throw tErr;
      }

      toast.success(`${project.club_name} created — ${tasks.length} tasks generated`);
      onOpenChange(false);
      onCreated(project.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create acquisition");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Acquisition</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Club name *"><Input value={f.club_name} onChange={(e) => set("club_name", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Codename"><Input placeholder="e.g. Project North" value={f.codename} onChange={(e) => set("codename", e.target.value)} /></Field>
            <Field label="Entity name"><Input placeholder="Legal entity name if known" value={f.entity_name} onChange={(e) => set("entity_name", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State *">
              <Select value={f.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger><SelectValue placeholder="Select state…" /></SelectTrigger>
                <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="City"><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
          </div>
          <Field label="Close date" hint="Leave blank if not yet scheduled. Tasks generate without target dates and can be updated later.">
            <Input type="date" value={f.close_date} onChange={(e) => set("close_date", e.target.value)} />
          </Field>
          <div className="pt-2 border-t border-border">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Seller — primary contact</p>
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Name" value={f.seller_primary_name} onChange={(e) => set("seller_primary_name", e.target.value)} />
              <Input placeholder="Email" value={f.seller_primary_email} onChange={(e) => set("seller_primary_email", e.target.value)} />
              <Input placeholder="Phone" value={f.seller_primary_phone} onChange={(e) => set("seller_primary_phone", e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Seller — secondary contact</p>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Name" value={f.seller_secondary_name} onChange={(e) => set("seller_secondary_name", e.target.value)} />
              <Input placeholder="Email" value={f.seller_secondary_email} onChange={(e) => set("seller_secondary_email", e.target.value)} />
            </div>
          </div>
          <Field label="Acquisition notes"><Textarea rows={3} value={f.acquisition_notes} onChange={(e) => set("acquisition_notes", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create Acquisition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
