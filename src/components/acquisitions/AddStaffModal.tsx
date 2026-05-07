import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ROLE_TYPES, EMPLOYMENT_TYPES, generateComplianceItemsForStaff } from "@/lib/compliance";

export default function AddStaffModal({ open, onOpenChange, acquisition, onAdded }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  acquisition: { id: string; state?: string | null; close_date?: string | null };
  onAdded: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    first_name: "", last_name: "", email: "", phone: "",
    role: "", role_type: "coach", employment_type: "employee",
    team_or_department: "", start_date: "", notes: "",
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.first_name.trim() || !f.last_name.trim() || !f.role.trim()) {
      return toast.error("First name, last name, and role are required");
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from("acquisition_staff")
        .insert({
          acquisition_id: acquisition.id,
          first_name: f.first_name.trim(),
          last_name: f.last_name.trim(),
          email: f.email || null,
          phone: f.phone || null,
          role: f.role.trim(),
          role_type: f.role_type,
          employment_type: f.employment_type,
          team_or_department: f.team_or_department || null,
          start_date: f.start_date || null,
          notes: f.notes || null,
          created_by: u?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const count = await generateComplianceItemsForStaff(supabase, created, acquisition, u?.user?.id);
      toast.success(`${f.first_name} added — ${count} compliance requirements generated`);
      onAdded();
      onOpenChange(false);
      setF({ first_name: "", last_name: "", email: "", phone: "", role: "", role_type: "coach", employment_type: "employee", team_or_department: "", start_date: "", notes: "" });
    } catch (e: any) { toast.error(e?.message ?? "Could not add staff"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Fld label="First name *"><Input value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></Fld>
            <Fld label="Last name *"><Input value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></Fld>
            <Fld label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Fld>
            <Fld label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Fld>
          </div>
          <Fld label="Role *"><Input placeholder="e.g. Head Coach, Facility Manager" value={f.role} onChange={(e) => set("role", e.target.value)} /></Fld>
          <Fld label="Role type *">
            <PillRow value={f.role_type} options={ROLE_TYPES as readonly string[]} onChange={(v) => set("role_type", v)} />
          </Fld>
          <Fld label="Employment type *">
            <PillRow value={f.employment_type} options={EMPLOYMENT_TYPES as readonly string[]} onChange={(v) => set("employment_type", v)} />
          </Fld>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Team or department"><Input placeholder="e.g. 14U National, Facility Ops" value={f.team_or_department} onChange={(e) => set("team_or_department", e.target.value)} /></Fld>
            <Fld label="Start date"><Input type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></Fld>
          </div>
          <Fld label="Notes"><Textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Fld>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Staff Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm font-medium">{label}</Label>{children}</div>;
}
function PillRow({ value, options, onChange }: { value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`px-3 py-1 text-xs font-semibold rounded-full border capitalize ${value === o ? "bg-emerald-600 text-white border-emerald-600" : "bg-card text-muted-foreground border-border"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}
