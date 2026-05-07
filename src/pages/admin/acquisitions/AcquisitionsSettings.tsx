import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Shield, ShieldCheck } from "lucide-react";
import { WORKSTREAMS, PHASES, US_STATES, workstreamLabel, phaseLabel } from "@/lib/acquisitions";
import { REQUIREMENT_TYPES, ROLE_TYPES } from "@/lib/compliance";
import { toast } from "sonner";

const ALL_STATES = "__all__";

type Tpl = {
  id: string;
  title: string;
  description: string | null;
  workstream: string;
  phase: string;
  priority: string | null;
  lead_role: string | null;
  suggested_days_from_close: number | null;
  state_filter: string | null;
  is_system_template: boolean;
  display_order: number;
  is_seller_visible: boolean;
  is_staff_visible: boolean;
};

export default function AcquisitionsSettings() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [wsFilter, setWsFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Tpl> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("acquisition_task_templates")
      .select("*")
      .order("workstream").order("display_order");
    setTemplates((data ?? []) as Tpl[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => { if (t.state_filter) set.add(t.state_filter); });
    return Array.from(set).sort();
  }, [templates]);

  const stateGroups = useMemo(() => {
    const m = new Map<string, Tpl[]>();
    templates.forEach((t) => {
      if (!t.state_filter) return;
      if (!m.has(t.state_filter)) m.set(t.state_filter, []);
      m.get(t.state_filter)!.push(t);
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [templates]);

  const filtered = templates.filter((t) => {
    if (wsFilter !== "all" && t.workstream !== wsFilter) return false;
    if (stateFilter !== "all") {
      if (stateFilter === "__none__" ? t.state_filter !== null : t.state_filter !== stateFilter) return false;
    }
    return true;
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this template? Existing tasks will not be affected.")) return;
    const { error } = await supabase.from("acquisition_task_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Template deleted");
    load();
  };

  return (
    <AppShell title="Acquisitions — Templates">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold">Task Templates</h1>
            <p className="text-sm text-muted-foreground">System templates auto-generate when a new acquisition is created.</p>
          </div>
          <Button onClick={() => setEditing({})} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1.5" /> Add Template
          </Button>
        </div>

        <div className="curve-card">
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold text-muted-foreground">Workstream:</span>
              <ChipBtn active={wsFilter === "all"} onClick={() => setWsFilter("all")}>All</ChipBtn>
              {WORKSTREAMS.map((w) => (
                <ChipBtn key={w.key} active={wsFilter === w.key} onClick={() => setWsFilter(w.key)}>{w.label}</ChipBtn>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold text-muted-foreground">State:</span>
              <ChipBtn active={stateFilter === "all"} onClick={() => setStateFilter("all")}>All</ChipBtn>
              {stateOptions.map((s) => (
                <ChipBtn key={s} active={stateFilter === s} onClick={() => setStateFilter(s)}>{s}</ChipBtn>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Workstream</th>
                    <th className="py-2 pr-3">Phase</th>
                    <th className="py-2 pr-3">State</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Lead Role</th>
                    <th className="py-2 pr-3">Days</th>
                    <th className="py-2 pr-3">System</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="py-2 pr-3 font-medium">{t.title}</td>
                      <td className="py-2 pr-3">{workstreamLabel(t.workstream)}</td>
                      <td className="py-2 pr-3">{phaseLabel(t.phase)}</td>
                      <td className="py-2 pr-3">
                        {t.state_filter
                          ? <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">{t.state_filter}</span>
                          : <span className="text-muted-foreground">All states</span>}
                      </td>
                      <td className="py-2 pr-3">{t.priority ?? "—"}</td>
                      <td className="py-2 pr-3">{t.lead_role ?? "—"}</td>
                      <td className="py-2 pr-3">{t.suggested_days_from_close ?? "—"}</td>
                      <td className="py-2 pr-3">{t.is_system_template ? "Yes" : "No"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditing(t)} className="p-1 hover:text-foreground text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => remove(t.id)} className="p-1 hover:text-rose-600 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="py-6 text-center text-muted-foreground italic">No templates match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="curve-card">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2"><Shield className="h-5 w-5 text-amber-600" /> State-Specific Compliance</h2>
              <p className="text-sm text-muted-foreground">Templates that only generate for acquisitions in specific states.</p>
            </div>
            <Button onClick={() => setEditing({ workstream: "compliance", state_filter: "" })} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1.5" /> Add State Requirement
            </Button>
          </div>

          {stateGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No state-specific templates yet.</p>
          ) : (
            <div className="space-y-4">
              {stateGroups.map(([state, items]) => (
                <div key={state}>
                  <p className="text-xs uppercase tracking-wider font-semibold text-amber-800 mb-1.5">
                    {state.toUpperCase()} <span className="text-muted-foreground font-normal">({items.length} template{items.length === 1 ? "" : "s"})</span>
                  </p>
                  <ul className="space-y-1">
                    {items.map((t) => (
                      <li key={t.id} className="text-sm flex items-center justify-between rounded-md px-3 py-1.5 bg-muted/40">
                        <span>{t.title}</span>
                        <button onClick={() => setEditing(t)} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <TemplateModal
          initial={editing}
          requireState={editing.workstream === "compliance" && editing.state_filter === ""}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </AppShell>
  );
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${active ? "bg-emerald-600 text-white border-emerald-600" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>{children}</button>;
}

function TemplateModal({ initial, requireState, onClose, onSaved }: {
  initial: Partial<Tpl>; requireState: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({
    title: initial.title ?? "",
    description: initial.description ?? "",
    workstream: initial.workstream ?? "compliance",
    phase: initial.phase ?? "first_30",
    priority: initial.priority ?? "",
    lead_role: initial.lead_role ?? "",
    suggested_days_from_close: initial.suggested_days_from_close ?? "",
    state_filter: initial.state_filter ?? ALL_STATES,
    display_order: initial.display_order ?? 100,
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.title.trim()) return toast.error("Title required");
    if (requireState && (f.state_filter === ALL_STATES || !f.state_filter)) {
      return toast.error("Select a state for state-specific compliance");
    }
    setSaving(true);
    try {
      const payload: any = {
        title: f.title.trim(),
        description: f.description || null,
        workstream: f.workstream,
        phase: f.phase,
        priority: f.priority || null,
        lead_role: f.lead_role || null,
        suggested_days_from_close: f.suggested_days_from_close === "" ? null : Number(f.suggested_days_from_close),
        state_filter: f.state_filter === ALL_STATES ? null : f.state_filter,
        display_order: Number(f.display_order) || 0,
        is_system_template: true,
      };
      if (initial.id) {
        const { error } = await supabase.from("acquisition_task_templates").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("acquisition_task_templates").insert(payload);
        if (error) throw error;
      }
      toast.success("Template saved");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Could not save"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial.id ? "Edit Template" : "Add Template"}</DialogTitle></DialogHeader>
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
          <Field
            label={`State requirement${requireState ? " *" : " (optional)"}`}
            hint="Leave as 'All states' unless this task only applies to clubs in a specific state"
          >
            <Select value={f.state_filter || ALL_STATES} onValueChange={(v) => set("state_filter", v)}>
              <SelectTrigger><SelectValue placeholder="Select state…" /></SelectTrigger>
              <SelectContent>
                {!requireState && <SelectItem value={ALL_STATES}>All states (default — generates for every deal)</SelectItem>}
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Priority"><Input placeholder="1st / 2nd / 3rd" value={f.priority} onChange={(e) => set("priority", e.target.value)} /></Field>
            <Field label="Lead role"><Input value={f.lead_role} onChange={(e) => set("lead_role", e.target.value)} /></Field>
            <Field label="Days from close"><Input type="number" value={f.suggested_days_from_close} onChange={(e) => set("suggested_days_from_close", e.target.value)} /></Field>
          </div>
          <Field label="Display order"><Input type="number" value={f.display_order} onChange={(e) => set("display_order", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
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
