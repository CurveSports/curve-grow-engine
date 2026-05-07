import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WORKSTREAMS, PHASES, workstreamColor, workstreamLabel, phaseLabel } from "@/lib/acquisitions";
import { formatDate } from "@/lib/format";

const STATUSES = ["open", "started", "blocked", "done"];
const PRIORITIES = ["low", "medium", "high", "critical"];

interface Props {
  taskId: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function TaskDetailPanel({ taskId, onClose, onChanged }: Props) {
  const [task, setTask] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<any>({});

  const load = async () => {
    const [{ data: t }, { data: n }, { data: a }] = await Promise.all([
      supabase.from("acquisition_tasks").select("*").eq("id", taskId).maybeSingle(),
      supabase.from("acquisition_task_notes").select("*").eq("task_id", taskId).order("created_at", { ascending: true }),
      supabase.from("acquisition_task_activity").select("*").eq("task_id", taskId).order("created_at", { ascending: true }),
    ]);
    setTask(t);
    setNotes(n ?? []);
    setActivity(a ?? []);
    if (t) setEdit({ title: t.title, description: t.description ?? "", lead_person_name: t.lead_person_name ?? "", target_date: t.target_date ?? "", dependency: t.dependency ?? "" });
  };

  useEffect(() => { load(); }, [taskId]);

  const logActivity = async (action: string, oldVal?: string, newVal?: string) => {
    if (!task) return;
    const { data: userRes } = await supabase.auth.getUser();
    await supabase.from("acquisition_task_activity").insert({
      task_id: task.id, acquisition_id: task.acquisition_id, action,
      old_value: oldVal ?? null, new_value: newVal ?? null,
      performed_by: userRes.user?.id ?? null,
    });
  };

  const update = async (patch: any, action?: string, oldVal?: string, newVal?: string) => {
    if (!task) return;
    setBusy(true);
    const updatePatch: any = { ...patch };
    if (patch.status === "done" && task.status !== "done") {
      updatePatch.completed_date = new Date().toISOString().slice(0, 10);
    } else if (patch.status && patch.status !== "done") {
      updatePatch.completed_date = null;
    }
    const { error } = await supabase.from("acquisition_tasks").update(updatePatch).eq("id", task.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (action) await logActivity(action, oldVal, newVal);
    await load();
    onChanged();
  };

  const handleSaveContent = async () => {
    if (!task) return;
    if (!edit.title.trim()) { toast.error("Title required"); return; }
    const patch: any = {};
    if (edit.title !== task.title) patch.title = edit.title.trim();
    if (edit.description !== (task.description ?? "")) patch.description = edit.description || null;
    if (edit.lead_person_name !== (task.lead_person_name ?? "")) patch.lead_person_name = edit.lead_person_name || null;
    if (edit.target_date !== (task.target_date ?? "")) patch.target_date = edit.target_date || null;
    if (edit.dependency !== (task.dependency ?? "")) patch.dependency = edit.dependency || null;
    if (Object.keys(patch).length === 0) return;
    await update(patch, "edited");
  };

  const addNote = async () => {
    if (!task || !newNote.trim()) return;
    setBusy(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("acquisition_task_notes").insert({
      task_id: task.id, acquisition_id: task.acquisition_id,
      note_text: newNote.trim(), created_by: userRes.user?.id ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setNewNote("");
    await logActivity("note_added");
    await load();
    onChanged();
  };

  const remove = async () => {
    if (!task) return;
    setBusy(true);
    await supabase.from("acquisition_task_notes").delete().eq("task_id", task.id);
    await supabase.from("acquisition_task_activity").delete().eq("task_id", task.id);
    const { error } = await supabase.from("acquisition_tasks").delete().eq("id", task.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Task deleted");
    onChanged();
    onClose();
  };

  if (!task) {
    return (
      <Sheet open onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-full sm:max-w-xl"><div className="py-20 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div></SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl pr-8">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[11px] font-medium text-white" style={{ background: workstreamColor(task.workstream) }}>
            {workstreamLabel(task.workstream)}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] bg-muted">{phaseLabel(task.phase)}</span>
          {task.is_custom && <span className="px-2 py-0.5 rounded text-[11px] border border-border">custom</span>}
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} onBlur={handleSaveContent} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea rows={4} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} onBlur={handleSaveContent} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={task.status} onValueChange={(v) => update({ status: v }, "status_changed", task.status, v)} disabled={busy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Select value={task.priority ?? ""} onValueChange={(v) => update({ priority: v }, "priority_changed", task.priority, v)} disabled={busy}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Workstream</Label>
              <Select value={task.workstream} onValueChange={(v) => update({ workstream: v }, "workstream_changed", task.workstream, v)} disabled={busy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WORKSTREAMS.map((w) => <SelectItem key={w.key} value={w.key}>{w.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phase</Label>
              <Select value={task.phase} onValueChange={(v) => update({ phase: v }, "phase_changed", task.phase, v)} disabled={busy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PHASES.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target date</Label>
              <Input type="date" value={edit.target_date} onChange={(e) => setEdit({ ...edit, target_date: e.target.value })} onBlur={handleSaveContent} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lead</Label>
              <Input value={edit.lead_person_name} onChange={(e) => setEdit({ ...edit, lead_person_name: e.target.value })} onBlur={handleSaveContent} />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dependency</Label>
            <Input value={edit.dependency} onChange={(e) => setEdit({ ...edit, dependency: e.target.value })} onBlur={handleSaveContent} placeholder="What must be complete first?" />
          </div>

          {task.completed_date && (
            <p className="text-xs text-emerald-700">Completed {formatDate(task.completed_date)}</p>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Notes ({notes.length})</h3>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="p-3 rounded-md bg-muted/40 text-sm">
                <p className="whitespace-pre-wrap">{n.note_text}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
              </div>
            ))}
            {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
          </div>
          <div className="mt-3">
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note…" rows={2} />
            <Button size="sm" className="mt-2" onClick={addNote} disabled={busy || !newNote.trim()}>Add note</Button>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Activity</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {activity.map((a) => (
              <li key={a.id}>
                <span className="font-medium text-foreground">{a.action.replace(/_/g, " ")}</span>
                {a.old_value && a.new_value && <> · {a.old_value} → {a.new_value}</>}
                <span className="ml-2">{formatDate(a.created_at)}</span>
              </li>
            ))}
            {activity.length === 0 && <li>No activity yet.</li>}
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={busy}>
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete task
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes "{task.title}" along with its notes and activity. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
