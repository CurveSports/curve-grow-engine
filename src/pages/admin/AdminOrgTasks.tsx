import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import TaskList from "@/components/tasks/TaskList";
import TaskDetailPanel from "@/components/tasks/TaskDetailPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrgTask, TaskTemplate, ENGINES, TASK_TYPES, ENGINE_SCORE_FIELD } from "@/lib/tasks";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function AdminOrgTasks() {
  const { orgId } = useParams<{ orgId: string }>();
  const [orgName, setOrgName] = useState("");
  const [planActivatedAt, setPlanActivatedAt] = useState<string | null>(null);
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selected, setSelected] = useState<OrgTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    if (!orgId) return;
    const [{ data: org }, { data: t }, { data: m }, { data: tpl }] = await Promise.all([
      supabase.from("organizations").select("name, plan_activated_at").eq("id", orgId).maybeSingle(),
      supabase.from("org_tasks").select("*").eq("org_id", orgId).order("priority").order("due_date"),
      supabase.from("derived_metrics").select("*").eq("org_id", orgId).maybeSingle(),
      supabase.from("task_templates").select("*").order("engine"),
    ]);
    setOrgName((org as any)?.name ?? "");
    setPlanActivatedAt((org as any)?.plan_activated_at ?? null);
    setTasks((t as OrgTask[]) ?? []);
    setTemplates((tpl as TaskTemplate[]) ?? []);
    if (m) {
      const s: Record<string, number | null> = {};
      for (const [eng, field] of Object.entries(ENGINE_SCORE_FIELD)) s[eng] = (m as any)[field];
      setScores(s);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const handleActivate = async () => {
    setActivating(true);
    const { data, error } = await supabase.functions.invoke("activate-action-plan", { body: { org_id: orgId } });
    setActivating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Activation failed");
    } else {
      toast.success(`Action plan activated · ${(data as any)?.tasks_created ?? 0} tasks generated`);
      load();
    }
  };

  return (
    <AppShell>
      <div className="mb-2">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Organizations</Link>
      </div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">Action Plan</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{orgName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {planActivatedAt ? `Plan activated ${formatDate(planActivatedAt)}` : "Plan not activated yet"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/org/${orgId}`}><Button variant="outline" size="sm">View Report</Button></Link>
          {!planActivatedAt ? (
            <Button onClick={handleActivate} disabled={activating}>{activating ? "Activating…" : "Activate Action Plan"}</Button>
          ) : (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add task</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Add task to {orgName}</DialogTitle></DialogHeader>
                <AddTaskForm orgId={orgId!} templates={templates} onSaved={() => { setAddOpen(false); load(); }} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        tasks.length === 0 ? (
          <div className="curve-card text-center py-16">
            <p className="text-muted-foreground mb-4">{planActivatedAt ? "No tasks yet — add one to get started." : "Activate the action plan to auto-generate tasks based on this org's report scores."}</p>
          </div>
        ) : (
          <TaskList tasks={tasks} scores={scores} onSelect={setSelected} />
        )
      )}

      <TaskDetailPanel task={selected} open={!!selected} onClose={() => setSelected(null)} isAdmin={true} onChanged={load} />
    </AppShell>
  );
}

function AddTaskForm({ orgId, templates, onSaved }: { orgId: string; templates: TaskTemplate[]; onSaved: () => void }) {
  const [templateId, setTemplateId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [engine, setEngine] = useState<string>("Operations");
  const [taskType, setTaskType] = useState<string>("Execute");
  const [priority, setPriority] = useState<string>("medium");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find(x => x.id === id);
    if (t) {
      setTitle(t.title); setDescription(t.description);
      setEngine(t.engine); setTaskType(t.task_type);
      const d = new Date(); d.setDate(d.getDate() + t.suggested_days_to_complete);
      setDueDate(d.toISOString().slice(0, 10));
    }
  };

  const save = async () => {
    if (!title.trim() || !description.trim()) { toast.error("Title and description required"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: t, error } = await supabase.from("org_tasks").insert({
      org_id: orgId, template_id: templateId || null,
      title: title.trim(), description: description.trim(),
      engine: engine as any, task_type: taskType as any,
      priority: priority as any, due_date: dueDate || null, suggested_due_date: dueDate || null,
      assigned_by: user?.id,
    }).select("id").single();
    if (!error && t) {
      await supabase.from("task_activity_log").insert({ task_id: t.id, org_id: orgId, action: "created", performed_by: user?.id, new_value: "manually added" });
    }
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Task added"); onSaved(); }
  };

  return (
    <div className="grid gap-3">
      <div>
        <label className="curve-eyebrow block mb-1.5">Use template (optional)</label>
        <Select value={templateId} onValueChange={applyTemplate}>
          <SelectTrigger><SelectValue placeholder="Select template…" /></SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.engine} · {t.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <Textarea placeholder="Description" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Select value={engine} onValueChange={setEngine}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ENGINES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
        <Select value={taskType} onValueChange={setTaskType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">high</SelectItem><SelectItem value="medium">medium</SelectItem><SelectItem value="low">low</SelectItem></SelectContent></Select>
        <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>
      <Button onClick={save} disabled={busy}>Add task</Button>
    </div>
  );
}
