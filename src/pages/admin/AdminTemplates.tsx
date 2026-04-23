import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TaskTemplate, ENGINES, TASK_TYPES, TASK_OWNER_TYPES, TaskOwnerType,
  OWNER_LABEL, OWNER_STYLE, OWNER_HELP, UNIVERSAL_ENGINES, REVENUE_ENGINES,
} from "@/lib/tasks";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, Copy, Search, FolderPlus, GripVertical, X, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TemplateWithUsage = TaskTemplate & { usage_count: number };
type OrgOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; org_id: string; status: string };
type SortKey = "order" | "used" | "newest" | "az";
type EngineFilter = "all" | (typeof ENGINES)[number];

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<TemplateWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [addingTo, setAddingTo] = useState<TaskTemplate | null>(null);

  const [activeEngine, setActiveEngine] = useState<EngineFilter>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("order");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const [{ data: tpls }, { data: tasks }] = await Promise.all([
      supabase.from("task_templates").select("*")
        .order("engine").order("display_order").order("title"),
      supabase.from("org_tasks").select("template_id"),
    ]);
    const counts = new Map<string, number>();
    (tasks ?? []).forEach((t: any) => {
      if (t.template_id) counts.set(t.template_id, (counts.get(t.template_id) ?? 0) + 1);
    });
    const withUsage = ((tpls as TaskTemplate[]) ?? []).map(t => ({
      ...t, usage_count: counts.get(t.id) ?? 0,
    }));
    setTemplates(withUsage);
    setSelected(new Set());
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
    const { data, error } = await supabase.from("task_templates").insert({
      title: `${t.title} (copy)`,
      description: t.description,
      engine: t.engine,
      task_type: t.task_type,
      owner_type: t.owner_type,
      suggested_days_to_complete: t.suggested_days_to_complete,
      display_order: 999,
      is_system_template: false,
      created_by: user?.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Duplicated");
    await load();
    if (data) setEditing(data as TaskTemplate);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter(t => {
      if (activeEngine !== "all" && t.engine !== activeEngine) return false;
      if (typeFilter !== "all" && t.task_type !== typeFilter) return false;
      if (ownerFilter !== "all" && t.owner_type !== ownerFilter) return false;
      if (sourceFilter === "system" && !t.is_system_template) return false;
      if (sourceFilter === "custom" && t.is_system_template) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, activeEngine, search, typeFilter, ownerFilter, sourceFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "order") {
      copy.sort((a, b) =>
        a.engine.localeCompare(b.engine) ||
        (a.display_order ?? 0) - (b.display_order ?? 0) ||
        a.title.localeCompare(b.title));
    } else if (sort === "used") {
      copy.sort((a, b) => b.usage_count - a.usage_count || a.title.localeCompare(b.title));
    } else if (sort === "newest") {
      copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    }
    return copy;
  }, [filtered, sort]);

  // Drag-and-drop only when single engine + order sort
  const dragEnabled = activeEngine !== "all" && sort === "order" && search.trim() === "";

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sorted.findIndex(t => t.id === active.id);
    const newIdx = sorted.findIndex(t => t.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(sorted, oldIdx, newIdx);
    // Update local state immediately for snappy UX
    const idToOrder = new Map<string, number>();
    reordered.forEach((t, i) => idToOrder.set(t.id, i + 1));
    setTemplates(prev => prev.map(t =>
      idToOrder.has(t.id) ? { ...t, display_order: idToOrder.get(t.id)! } : t
    ));
    // Persist
    const updates = reordered.map((t, i) =>
      supabase.from("task_templates").update({ display_order: i + 1 }).eq("id", t.id)
    );
    const results = await Promise.all(updates);
    const err = results.find(r => r.error);
    if (err?.error) toast.error("Reorder failed: " + err.error.message);
  };

  const counts = useMemo(() => {
    const by: Record<string, number> = { all: templates.length };
    for (const t of templates) by[t.engine] = (by[t.engine] ?? 0) + 1;
    return by;
  }, [templates]);

  const sysCount = templates.filter(t => t.is_system_template).length;
  const customCount = templates.length - sysCount;
  const headerLabel = activeEngine === "all" ? "All Templates" : `${activeEngine} Templates`;

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const bulkSetOwner = async (owner: TaskOwnerType) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("task_templates")
      .update({ owner_type: owner })
      .in("id", ids);
    if (error) toast.error(error.message);
    else { toast.success(`Owner set to ${OWNER_LABEL[owner]} for ${ids.length} template${ids.length === 1 ? "" : "s"}`); load(); }
  };
  const bulkDelete = async () => {
    const ids = Array.from(selected);
    const sysSelected = templates.filter(t => ids.includes(t.id) && t.is_system_template);
    if (sysSelected.length > 0) {
      toast.error("System templates cannot be deleted. Deselect them first.");
      return;
    }
    if (!confirm(`Delete ${ids.length} templates? This cannot be undone.`)) return;
    const { error } = await supabase.from("task_templates").delete().in("id", ids);
    if (error) toast.error(error.message);
    else { toast.success(`${ids.length} deleted`); load(); }
  };

  return (
    <AppShell title="Task Library">
      <div className="mb-6">
        <p className="curve-eyebrow mb-2">Curve OS</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Task Library</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Reusable task blueprints — system templates auto-generate for new orgs; custom templates can be added to any project.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 sticky top-[60px] self-start">
          <nav className="curve-card p-2 space-y-0.5">
            <SidebarItem
              label="All Templates" count={counts.all} active={activeEngine === "all"}
              onClick={() => setActiveEngine("all")} icon={<Layers className="h-3.5 w-3.5" />}
            />
            <SidebarHeading>Revenue Engines</SidebarHeading>
            {REVENUE_ENGINES.map(e => (
              <SidebarItem key={e} label={e} count={counts[e] ?? 0}
                active={activeEngine === e} onClick={() => setActiveEngine(e)} />
            ))}
            <SidebarHeading>Platform & Marketing</SidebarHeading>
            {UNIVERSAL_ENGINES.map(e => (
              <SidebarItem key={e} label={e} count={counts[e] ?? 0}
                active={activeEngine === e} onClick={() => setActiveEngine(e)} />
            ))}
            <SidebarHeading>Other</SidebarHeading>
            <SidebarItem label="Operations" count={counts["Operations"] ?? 0}
              active={activeEngine === "Operations"} onClick={() => setActiveEngine("Operations")} />
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-xl font-semibold">{headerLabel}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {templates.length} templates · {sysCount} system · {customCount} custom
              </p>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add Template</DialogTitle>
                  <DialogDescription>
                    Define a reusable task blueprint.
                  </DialogDescription>
                </DialogHeader>
                <TemplateForm
                  defaultEngine={activeEngine === "all" ? "Pricing" : activeEngine}
                  onSaved={() => { setCreateOpen(false); load(); }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {TASK_OWNER_TYPES.map(o => <SelectItem key={o} value={o}>{OWNER_LABEL[o]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Display order</SelectItem>
                <SelectItem value="used">Most used</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="az">A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dragEnabled && (
            <p className="text-[11px] text-muted-foreground mb-2 italic">
              Drag rows to reorder. Order controls the sequence of auto-generated tasks for new orgs.
            </p>
          )}

          {/* Table */}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : sorted.length === 0 ? (
            <div className="curve-card text-center py-12">
              <p className="text-sm text-muted-foreground">No templates match your filters.</p>
            </div>
          ) : (
            <div className="curve-card p-0 overflow-hidden">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sorted.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[10px] text-muted-foreground uppercase tracking-wider bg-secondary/30">
                        <th className="w-8"></th>
                        <th className="w-8 px-2"></th>
                        <th className="px-3 py-2.5 font-medium">Title</th>
                        {activeEngine === "all" && <th className="px-3 py-2.5 font-medium">Engine</th>}
                        <th className="px-3 py-2.5 font-medium">Type</th>
                        <th className="px-3 py-2.5 font-medium">Owner</th>
                        <th className="px-3 py-2.5 font-medium text-right">Days</th>
                        <th className="px-3 py-2.5 font-medium text-right">Used</th>
                        <th className="px-3 py-2.5 font-medium">Source</th>
                        <th className="pr-4 pl-3 py-2.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sorted.map(t => (
                        <TemplateRow
                          key={t.id} t={t}
                          showEngine={activeEngine === "all"}
                          dragEnabled={dragEnabled}
                          checked={selected.has(t.id)}
                          onCheck={() => toggleSelect(t.id)}
                          onAdd={() => setAddingTo(t)}
                          onDuplicate={() => handleDuplicate(t)}
                          onEdit={() => setEditing(t)}
                          onDelete={() => handleDelete(t.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 curve-card flex items-center gap-3 shadow-lg bg-card">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
          <Button size="sm" variant="destructive" onClick={bulkDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Existing tasks created from this template won't change.
            </DialogDescription>
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
    </AppShell>
  );
}

/* ─────────────── Sidebar bits ─────────────── */

function SidebarItem({ label, count, active, onClick, icon }: {
  label: string; count: number; active: boolean; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm text-left transition-colors",
        active ? "bg-accent text-accent-foreground font-medium" : "hover:bg-secondary text-foreground/80",
      )}
    >
      <span className="flex items-center gap-2 min-w-0 truncate">{icon}{label}</span>
      <span className={cn(
        "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full shrink-0",
        active ? "bg-accent-foreground/20" : "bg-secondary text-muted-foreground",
      )}>{count}</span>
    </button>
  );
}

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      {children}
    </p>
  );
}

/* ─────────────── Sortable row ─────────────── */

function TemplateRow({
  t, showEngine, dragEnabled, checked, onCheck, onAdd, onDuplicate, onEdit, onDelete,
}: {
  t: TemplateWithUsage; showEngine: boolean; dragEnabled: boolean;
  checked: boolean; onCheck: () => void;
  onAdd: () => void; onDuplicate: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: t.id, disabled: !dragEnabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-secondary/40 group">
      <td className="pl-3">
        <Checkbox checked={checked} onCheckedChange={onCheck} aria-label="Select" />
      </td>
      <td className="px-1">
        {dragEnabled ? (
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground" title="Drag to reorder">
            <GripVertical className="h-4 w-4" />
          </button>
        ) : <span className="inline-block w-6" />}
      </td>
      <td className="px-3 py-2.5">
        <div className="font-medium text-foreground">{t.title}</div>
        <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">{t.description}</div>
      </td>
      {showEngine && (
        <td className="px-3 py-2.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-border bg-secondary text-foreground/80">
            {t.engine}
          </span>
        </td>
      )}
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-border bg-secondary text-foreground/80 whitespace-nowrap">
          {t.task_type}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
          OWNER_STYLE[t.owner_type],
        )}>
          {OWNER_LABEL[t.owner_type]}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{t.suggested_days_to_complete}d</td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {t.usage_count > 0 ? <span className="font-medium">{t.usage_count}</span> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-2.5">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
          t.is_system_template ? "bg-secondary text-foreground/70 border-border" : "bg-info-soft text-info border-info/30",
        )}>
          {t.is_system_template ? "System" : "Custom"}
        </span>
      </td>
      <td className="pr-4 pl-3 py-2.5">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onAdd} title="Add to a project"
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-accent">
            <FolderPlus className="h-4 w-4" />
          </button>
          <button onClick={onEdit} title="Edit"
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDuplicate} title="Duplicate"
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={t.is_system_template}
            title={t.is_system_template ? "System templates cannot be deleted. Duplicate and modify instead." : "Delete"}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────── Add to project dialog ─────────────── */

function AddTemplateToProjectDialog({
  template, onClose, onAdded,
}: {
  template: TaskTemplate; onClose: () => void; onAdded: () => void;
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
        .order("status").order("name");
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
        owner_type: template.owner_type,
        priority: "medium" as const,
        status: "not_started" as const,
        plan_status: "active" as const,
        source: "library" as const,
        suggested_due_date: due.toISOString().slice(0, 10),
        assigned_by: user?.id ?? null,
      })
      .select("id").single();
    if (error || !inserted) { toast.error(error?.message ?? "Failed"); setBusy(false); return; }
    await supabase.from("task_activity_log").insert({
      task_id: inserted.id, org_id: orgId, action: "created",
      performed_by: user?.id ?? null, new_value: "Added from Task Library",
    });
    toast.success("Task added");
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

/* ─────────────── Template form ─────────────── */

function TemplateForm({
  initial, onSaved, defaultEngine,
}: {
  initial?: TaskTemplate; onSaved: () => void; defaultEngine?: string;
}) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [engine, setEngine] = useState<string>(initial?.engine ?? defaultEngine ?? "Pricing");
  const [taskType, setTaskType] = useState<string>(initial?.task_type ?? "Strategy");
  const [ownerType, setOwnerType] = useState<TaskOwnerType>(initial?.owner_type ?? "org_user");
  const [days, setDays] = useState(initial?.suggested_days_to_complete ?? 30);
  const [autoGen, setAutoGen] = useState<boolean>(initial?.is_system_template ?? false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim() || !description.trim()) { toast.error("Title and description required"); return; }
    setBusy(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      engine: engine as any,
      task_type: taskType as any,
      owner_type: ownerType,
      suggested_days_to_complete: days,
      is_system_template: autoGen,
    };
    if (isEdit && initial) {
      const { error } = await supabase.from("task_templates").update(payload).eq("id", initial.id);
      setBusy(false);
      if (error) toast.error(error.message);
      else { toast.success("Template updated"); onSaved(); }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("task_templates").insert({
        ...payload, created_by: user?.id, display_order: 999,
      });
      setBusy(false);
      if (error) toast.error(error.message);
      else { toast.success("Template created"); onSaved(); }
    }
  };

  return (
    <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Task Title</label>
        <Input placeholder="e.g. Build sponsorship prospect list" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <Textarea
          placeholder="What does this task involve? Be specific enough that an org can execute without additional guidance."
          rows={3} value={description} onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Engine</label>
          <Select value={engine} onValueChange={setEngine}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENGINES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Suggested Days to Complete</label>
          <Input type="number" min={1} value={days} onChange={e => setDays(Number(e.target.value))} />
          <p className="text-[10px] text-muted-foreground mt-1">Days from plan activation when this task should ideally be done.</p>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Task Type</label>
        <div className="flex flex-wrap gap-1.5">
          {TASK_TYPES.map(t => (
            <button
              key={t} type="button" onClick={() => setTaskType(t)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                taskType === t ? "bg-accent text-accent-foreground border-accent" : "bg-secondary text-foreground/70 border-border hover:bg-secondary/70",
              )}
            >{t}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Owner</label>
        <div className="flex flex-wrap gap-1.5">
          {TASK_OWNER_TYPES.map(o => (
            <button
              key={o} type="button" onClick={() => setOwnerType(o)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                ownerType === o ? OWNER_STYLE[o] + " ring-2 ring-offset-1 ring-foreground/20" : "bg-secondary text-foreground/70 border-border hover:bg-secondary/70",
              )}
            >{OWNER_LABEL[o]}</button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">{OWNER_HELP[ownerType]}</p>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-md border border-border bg-secondary/30">
        <Switch checked={autoGen} onCheckedChange={setAutoGen} className="mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">Auto-generate for new orgs</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {autoGen
              ? UNIVERSAL_ENGINES.includes(engine as any)
                ? "This template will be created for every new org (Platform & Marketing engines are universal)."
                : "This template will auto-generate when org's engine score meets the threshold."
              : "Custom template — manually assign to projects."}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={save} disabled={busy}>{isEdit ? "Save changes" : "Save Template"}</Button>
      </DialogFooter>
    </div>
  );
}
