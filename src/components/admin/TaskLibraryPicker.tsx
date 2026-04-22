import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ENGINES, TASK_TYPES, type TaskTemplate } from "@/lib/tasks";
import { Search, Library, PlusCircle } from "lucide-react";
import { toast } from "sonner";

type Props = {
  orgId: string;
  projectId: string;
  projectName: string;
  /** Templates already used in this project — pre-marked so admin doesn't add duplicates */
  existingTemplateIds?: string[];
  onClose: () => void;
  onAdded: () => void;
};

/**
 * Modal for adding tasks to a project. Two modes:
 *   • From Library — pick one or more task_templates; we clone them into org_tasks (source='library')
 *   • Custom Task — author a one-off task scoped to this project (source='custom')
 */
export default function TaskLibraryPicker({
  orgId,
  projectId,
  projectName,
  existingTemplateIds = [],
  onClose,
  onAdded,
}: Props) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add tasks to {projectName}</DialogTitle>
          <DialogDescription>
            Pull recommended tasks from the Task Library or write a custom one for this project.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library" className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="library" className="gap-1.5">
              <Library className="h-3.5 w-3.5" /> From Library
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" /> Custom Task
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4">
            <LibraryPicker
              orgId={orgId}
              projectId={projectId}
              existingTemplateIds={existingTemplateIds}
              onAdded={onAdded}
              onClose={onClose}
            />
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <CustomTaskForm
              orgId={orgId}
              projectId={projectId}
              onAdded={onAdded}
              onClose={onClose}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────────── Library picker ───────────────────────────── */

function LibraryPicker({
  orgId, projectId, existingTemplateIds, onAdded, onClose,
}: {
  orgId: string;
  projectId: string;
  existingTemplateIds: string[];
  onAdded: () => void;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [engineFilter, setEngineFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("task_templates")
        .select("*")
        .order("engine")
        .order("title");
      setTemplates((data as TaskTemplate[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const existing = useMemo(() => new Set(existingTemplateIds), [existingTemplateIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (engineFilter !== "all" && t.engine !== engineFilter) return false;
      if (typeFilter !== "all" && t.task_type !== typeFilter) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, search, engineFilter, typeFilter]);

  const toggle = (id: string) => {
    if (existing.has(id)) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const addSelected = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const picks = templates.filter((t) => selected.has(t.id));
    const rows = picks.map((t) => {
      const days = t.suggested_days_to_complete || 30;
      const due = new Date();
      due.setDate(due.getDate() + days);
      return {
        org_id: orgId,
        project_id: projectId,
        template_id: t.id,
        title: t.title,
        description: t.description,
        engine: t.engine,
        task_type: t.task_type,
        priority: "medium" as const,
        status: "not_started" as const,
        plan_status: "active" as const,
        source: "library" as const,
        suggested_due_date: due.toISOString().slice(0, 10),
        assigned_by: user?.id ?? null,
      };
    });

    const { data: inserted, error } = await supabase
      .from("org_tasks")
      .insert(rows)
      .select("id");

    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }

    if (inserted && inserted.length) {
      await supabase.from("task_activity_log").insert(
        inserted.map((row: any) => ({
          task_id: row.id,
          org_id: orgId,
          action: "created" as const,
          performed_by: user?.id ?? null,
          new_value: "Added from Task Library",
        })),
      );
    }

    toast.success(`Added ${rows.length} task${rows.length === 1 ? "" : "s"} from library`);
    setBusy(false);
    onAdded();
    onClose();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={engineFilter} onValueChange={setEngineFilter}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Engine" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All engines</SelectItem>
            {ENGINES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg max-h-[320px] overflow-y-auto divide-y divide-border">
        {loading ? (
          <p className="text-sm text-muted-foreground p-4">Loading templates…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">No templates match those filters.</p>
        ) : (
          filtered.map((t) => {
            const alreadyAdded = existing.has(t.id);
            const isSelected = selected.has(t.id);
            return (
              <label
                key={t.id}
                className={`flex items-start gap-3 px-3 py-2.5 ${alreadyAdded ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary/40 cursor-pointer"}`}
              >
                <Checkbox
                  checked={isSelected || alreadyAdded}
                  disabled={alreadyAdded}
                  onCheckedChange={() => toggle(t.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{t.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                      {t.engine}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                      {t.task_type}
                    </span>
                    {alreadyAdded && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/30">
                        Already added
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Suggested duration: {t.suggested_days_to_complete} days
                  </p>
                </div>
              </label>
            );
          })
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={addSelected}
          disabled={busy || selected.size === 0}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {busy ? "Adding…" : `Add ${selected.size} task${selected.size === 1 ? "" : "s"}`}
        </Button>
      </DialogFooter>
    </div>
  );
}

/* ───────────────────────────── Custom task form ───────────────────────────── */

function CustomTaskForm({
  orgId, projectId, onAdded, onClose,
}: {
  orgId: string;
  projectId: string;
  onAdded: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [engine, setEngine] = useState<string>("Pricing");
  const [taskType, setTaskType] = useState<string>("Strategy");
  const [priority, setPriority] = useState<string>("medium");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Title and description required");
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const due = new Date();
    due.setDate(due.getDate() + days);
    const { data: inserted, error } = await supabase
      .from("org_tasks")
      .insert({
        org_id: orgId,
        project_id: projectId,
        title: title.trim(),
        description: description.trim(),
        engine: engine as any,
        task_type: taskType as any,
        priority: priority as any,
        status: "not_started",
        plan_status: "active",
        source: "custom",
        suggested_due_date: due.toISOString().slice(0, 10),
        assigned_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      toast.error(error?.message ?? "Failed to add task");
      setBusy(false);
      return;
    }

    await supabase.from("task_activity_log").insert({
      task_id: inserted.id,
      org_id: orgId,
      action: "created",
      performed_by: user?.id ?? null,
      new_value: "Custom task created",
    });

    toast.success("Custom task added");
    setBusy(false);
    onAdded();
    onClose();
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Title</label>
        <Input
          placeholder="e.g. Review competitive pricing in West Region"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <Textarea
          rows={3}
          placeholder="What needs to be done, and why does it matter for this project?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Engine</label>
          <Select value={engine} onValueChange={setEngine}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ENGINES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <Select value={taskType} onValueChange={setTaskType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Days</label>
          <Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          {busy ? "Adding…" : "Add Custom Task"}
        </Button>
      </DialogFooter>
    </div>
  );
}
