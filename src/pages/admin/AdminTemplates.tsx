import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TaskTemplate, ENGINES, TASK_TYPES } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Copy, Info, Search, FolderPlus } from "lucide-react";

type TemplateWithUsage = TaskTemplate & { usage_count: number };

type OrgOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; org_id: string; status: string };

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<TemplateWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [addingTo, setAddingTo] = useState<TaskTemplate | null>(null);

  const [search, setSearch] = useState("");
  const [engineFilter, setEngineFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [{ data: tpls }, { data: tasks }] = await Promise.all([
      supabase.from("task_templates").select("*").order("engine").order("title"),
      supabase.from("org_tasks").select("template_id"),
    ]);
    const counts = new Map<string, number>();
    (tasks ?? []).forEach((t: any) => {
      if (t.template_id) counts.set(t.template_id, (counts.get(t.template_id) ?? 0) + 1);
    });
    const withUsage = ((tpls as TaskTemplate[]) ?? []).map(t => ({
      ...t,
      usage_count: counts.get(t.id) ?? 0,
    }));
    setTemplates(withUsage);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? Tasks already created from it are unaffected.")) return;
    const { error } = await supabase.from("task_templates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Template deleted"); load(); }
  };

  const handleDuplicate = async (t: TaskTemplate) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("task_templates").insert({
      title: `${t.title} (Copy)`,
      description: t.description,
      engine: t.engine,
      task_type: t.task_type,
      suggested_days_to_complete: t.suggested_days_to_complete,
      is_system_template: false,
      created_by: user?.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Template duplicated as Custom"); load(); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter(t => {
      if (engineFilter !== "all" && t.engine !== engineFilter) return false;
      if (typeFilter !== "all" && t.task_type !== typeFilter) return false;
      if (sourceFilter === "system" && !t.is_system_template) return false;
      if (sourceFilter === "custom" && t.is_system_template) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, search, engineFilter, typeFilter, sourceFilter]);

  const totalUsage = useMemo(() => templates.reduce((s, t) => s + t.usage_count, 0), [templates]);

  return (
    <div className="space-y-4">
      {/* Explainer */}
      <div className="curve-card p-4 flex gap-3 bg-accent-soft/40 border-accent/30">
        <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Task Library — reusable tasks the system recommends and admins can add to any project.</p>
          <p className="text-muted-foreground mt-1">
            Each library entry is a <strong>blueprint</strong> (title, description, engine, type, suggested duration). Use <strong>Add to Project</strong> to drop one into an org's draft project, or open a project's <em>Add Task</em> menu to pick from here. <strong>System</strong> entries are seeded by Curve and read-only; <strong>Custom</strong> entries are yours to edit, duplicate, and delete.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={engineFilter} onValueChange={setEngineFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Engine" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All engines</SelectItem>
              {ENGINES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Library Entry</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New library entry</DialogTitle>
              <DialogDescription>This blueprint will be available when building projects for any org.</DialogDescription>
            </DialogHeader>
            <TemplateForm onSaved={() => { setCreateOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {templates.length} library entries · {totalUsage} total tasks created from these blueprints
      </p>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="curve-card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Engine</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium text-right">Days</th>
                <th className="px-5 py-3 font-medium text-right">Used</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground text-sm">No library entries match those filters.</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-secondary/40">
                  <td className="px-5 py-3">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">{t.description}</div>
                  </td>
                  <td className="px-5 py-3 text-xs">{t.engine}</td>
                  <td className="px-5 py-3 text-xs">{t.task_type}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{t.suggested_days_to_complete}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {t.usage_count > 0 ? <span className="font-medium">{t.usage_count}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {t.is_system_template
                      ? <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">System</span>
                      : <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/30">Custom</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setAddingTo(t)}
                        title="Add to a project"
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-accent"
                      >
                        <FolderPlus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(t)}
                        title="Duplicate as Custom"
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {!t.is_system_template && (
                        <>
                          <button
                            onClick={() => setEditing(t)}
                            title="Edit"
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            title="Delete"
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit library entry</DialogTitle>
            <DialogDescription>Existing tasks already created from this entry won't change.</DialogDescription>
          </DialogHeader>
          {editing && (
            <TemplateForm
              initial={editing}
              onSaved={() => { setEditing(null); load(); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {addingTo && (
        <AddTemplateToProjectDialog
          template={addingTo}
          onClose={() => setAddingTo(null)}
          onAdded={() => { setAddingTo(null); load(); }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Add-to-Project dialog ───────────────────────── */

function AddTemplateToProjectDialog({
  template, onClose, onAdded,
}: {
  template: TaskTemplate;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("organizations").select("id, name").order("name");
      setOrgs((data as OrgOption[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!orgId) { setProjects([]); setProjectId(""); return; }
    (async () => {
      const { data } = await supabase
        .from("org_projects")
        .select("id, name, org_id, status")
        .eq("org_id", orgId)
        .in("status", ["draft", "active"])
        .order("status")
        .order("name");
      setProjects((data as ProjectOption[]) ?? []);
      setProjectId("");
    })();
  }, [orgId]);

  const add = async () => {
    if (!projectId) { toast.error("Pick a project"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const days = template.suggested_days_to_complete || 30;
    const due = new Date();
    due.setDate(due.getDate() + days);
    const { data: inserted, error } = await supabase
      .from("org_tasks")
      .insert({
        org_id: orgId,
        project_id: projectId,
        template_id: template.id,
        title: template.title,
        description: template.description,
        engine: template.engine,
        task_type: template.task_type,
        priority: "medium" as const,
        status: "not_started" as const,
        plan_status: "active" as const,
        source: "library" as const,
        suggested_due_date: due.toISOString().slice(0, 10),
        assigned_by: user?.id ?? null,
      })
      .select("id")
      .single();
    if (error || !inserted) { toast.error(error?.message ?? "Failed"); setBusy(false); return; }
    await supabase.from("task_activity_log").insert({
      task_id: inserted.id, org_id: orgId, action: "created",
      performed_by: user?.id ?? null, new_value: "Added from Task Library",
    });
    toast.success("Task added to project");
    setBusy(false);
    onAdded();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to a project</DialogTitle>
          <DialogDescription>Drop "{template.title}" into a draft or active project.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Organization</label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Select an org…" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Project</label>
            <Select value={projectId} onValueChange={setProjectId} disabled={!orgId || projects.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={!orgId ? "Pick an org first" : projects.length === 0 ? "No draft/active projects" : "Select a project…"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} <span className="text-muted-foreground">({p.status})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={add} disabled={busy || !projectId} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {busy ? "Adding…" : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Library entry form ───────────────────────── */

function TemplateForm({ initial, onSaved }: { initial?: TaskTemplate; onSaved: () => void }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [engine, setEngine] = useState<string>(initial?.engine ?? "Pricing");
  const [taskType, setTaskType] = useState<string>(initial?.task_type ?? "Strategy");
  const [days, setDays] = useState(initial?.suggested_days_to_complete ?? 30);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim() || !description.trim()) { toast.error("Title and description required"); return; }
    setBusy(true);
    if (isEdit && initial) {
      const { error } = await supabase.from("task_templates").update({
        title: title.trim(), description: description.trim(),
        engine: engine as any, task_type: taskType as any,
        suggested_days_to_complete: days,
      }).eq("id", initial.id);
      setBusy(false);
      if (error) toast.error(error.message);
      else { toast.success("Library entry updated"); onSaved(); }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("task_templates").insert({
        title: title.trim(), description: description.trim(),
        engine: engine as any, task_type: taskType as any,
        suggested_days_to_complete: days, is_system_template: false, created_by: user?.id,
      });
      setBusy(false);
      if (error) toast.error(error.message);
      else { toast.success("Library entry created"); onSaved(); }
    }
  };

  return (
    <div className="grid gap-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Title</label>
        <Input placeholder="e.g. Audit current pricing tiers" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <Textarea placeholder="What should the org do, and why?" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Engine</label>
          <Select value={engine} onValueChange={setEngine}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ENGINES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <Select value={taskType} onValueChange={setTaskType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Suggested days</label>
          <Input type="number" min={1} value={days} onChange={e => setDays(Number(e.target.value))} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={busy}>{isEdit ? "Save changes" : "Create entry"}</Button>
      </DialogFooter>
    </div>
  );
}
