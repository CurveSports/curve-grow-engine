import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgTask, TaskNote, TaskActivity, STATUS_LABEL, STATUS_STYLE, PRIORITY_STYLE, TASK_STATUSES, TASK_PRIORITIES, daysSince } from "@/lib/tasks";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { Trash2, Lock } from "lucide-react";
import OwnerPill from "@/components/tasks/OwnerPill";
import TaskAssigneePicker from "@/components/tasks/TaskAssigneePicker";

interface Props {
  task: OrgTask | null;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onChanged: () => void;
}

export default function TaskDetailPanel({ task, open, onClose, isAdmin, onChanged }: Props) {
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [newNote, setNewNote] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (!task) return;
    setShowComplete(false);
    setNewNote("");
    setCompletionNote("");
    setEditTitle(task.title);
    setEditDescription(task.description);
    (async () => {
      const [{ data: n }, { data: a }] = await Promise.all([
        supabase.from("task_notes").select("*").eq("task_id", task.id).order("created_at", { ascending: true }),
        supabase.from("task_activity_log").select("*").eq("task_id", task.id).order("created_at", { ascending: true }),
      ]);
      setNotes((n as TaskNote[]) ?? []);
      setActivity((a as TaskActivity[]) ?? []);
    })();
  }, [task]);

  if (!task) return null;

  const isDraft = task.plan_status === "draft";

  const invoke = async (body: any) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("task-action", { body });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Action failed");
      return false;
    }
    onChanged();
    return true;
  };

  const handleStatus = async (status: string) => {
    if (status === "completed") { setShowComplete(true); return; }
    const ok = await invoke({ type: "set_status", task_id: task.id, status });
    if (ok) toast.success("Status updated");
  };

  const handleComplete = async () => {
    if (completionNote.trim().length < 20) { toast.error("Completion note must be at least 20 characters"); return; }
    const ok = await invoke({ type: "set_status", task_id: task.id, status: "completed", completion_note: completionNote.trim() });
    if (ok) { toast.success("Task completed"); setShowComplete(false); }
  };

  const handlePriority = async (priority: string) => {
    const ok = await invoke({ type: "set_priority", task_id: task.id, priority });
    if (ok) toast.success("Priority updated");
  };

  const handleDueDate = async (due_date: string) => {
    const ok = await invoke({ type: "set_due_date", task_id: task.id, due_date });
    if (ok) toast.success("Due date updated");
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const ok = await invoke({ type: "add_note", task_id: task.id, note_text: newNote.trim() });
    if (ok) { setNewNote(""); toast.success("Note added"); }
  };

  // Admin-only: edit title/description directly via DB (RLS allows admin)
  const handleSaveContent = async () => {
    if (!editTitle.trim() || !editDescription.trim()) {
      toast.error("Title and description required");
      return;
    }
    if (editTitle === task.title && editDescription === task.description) return;
    setBusy(true);
    const { error } = await supabase
      .from("org_tasks")
      .update({ title: editTitle.trim(), description: editDescription.trim(), last_activity_at: new Date().toISOString() })
      .eq("id", task.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Task updated");
    onChanged();
  };

  // Admin-only: delete task. Allowed any time but most useful in draft review.
  const handleDelete = async () => {
    setBusy(true);
    // Clean up dependent rows first (no cascade in schema)
    await supabase.from("task_notes").delete().eq("task_id", task.id);
    await supabase.from("task_activity_log").delete().eq("task_id", task.id);
    const { error } = await supabase.from("org_tasks").delete().eq("id", task.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Task deleted");
    onClose();
    onChanged();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl pr-8">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border">{task.engine}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border">{task.task_type}</span>
          <OwnerPill owner={task.owner_type} />
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[task.status]}`}>{STATUS_LABEL[task.status]}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
          {isAdmin && isDraft && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 font-medium">Draft</span>
          )}
        </div>

        {isAdmin ? (
          <div className="mt-6 grid gap-3">
            <div>
              <label className="curve-eyebrow block mb-1.5">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={handleSaveContent} />
            </div>
            <div>
              <label className="curve-eyebrow block mb-1.5">Description</label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} onBlur={handleSaveContent} rows={5} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed whitespace-pre-wrap">{task.description}</p>
        )}

        {!isAdmin && (task.owner_type === "curve_team" || task.owner_type === "third_party") && (
          <div className="mt-4 p-3 rounded-md border border-info/30 bg-info-soft text-sm flex items-start gap-2">
            <Lock className="h-4 w-4 text-info flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">
                {task.owner_type === "curve_team" ? "Managed by your Curve team" : "Tracking — external partner"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You can add notes, but only the {task.owner_type === "curve_team" ? "Curve admin" : "admin"} can mark this task complete.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {(isAdmin || (task.owner_type !== "curve_team" && task.owner_type !== "third_party")) && (
            <div>
              <label className="curve-eyebrow block mb-1.5">Status</label>
              <Select value={task.status} onValueChange={handleStatus} disabled={busy || task.status === "completed"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.filter(s => s !== "overdue").map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {isAdmin && (
            <>
              <div>
                <label className="curve-eyebrow block mb-1.5">Priority</label>
                <Select value={task.priority} onValueChange={handlePriority} disabled={busy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="curve-eyebrow block mb-1.5">Due date</label>
                <Input type="date" defaultValue={task.due_date ?? ""} onBlur={(e) => e.target.value && e.target.value !== task.due_date && handleDueDate(e.target.value)} />
              </div>
            </>
          )}

          {!isAdmin && task.due_date && (
            <p className="text-sm"><span className="curve-eyebrow">Due</span> <span className="ml-2">{formatDate(task.due_date)}</span></p>
          )}
        </div>

        {showComplete && (
          <div className="mt-6 p-4 rounded-lg bg-accent-soft border border-accent/30">
            <p className="text-sm font-medium mb-2">Add a completion note — what did you do?</p>
            <Textarea value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} placeholder="Required, minimum 20 characters" rows={3} />
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleComplete} disabled={busy || completionNote.trim().length < 20}>Mark complete</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowComplete(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="curve-eyebrow mb-3">Notes ({notes.length})</h3>
          <div className="space-y-3">
            {notes.map(n => (
              <div key={n.id} className="p-3 rounded-md bg-secondary/50 text-sm">
                <p className="whitespace-pre-wrap">{n.note_text}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{formatDate(n.created_at)}</p>
              </div>
            ))}
            {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
          </div>
          <div className="mt-3">
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note…" rows={2} />
            <Button size="sm" className="mt-2" onClick={handleAddNote} disabled={busy || !newNote.trim()}>Add note</Button>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="curve-eyebrow mb-3">Activity</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {activity.map(a => (
              <li key={a.id}>
                <span className="font-medium text-foreground">{a.action.replace(/_/g, " ")}</span>
                {a.old_value && a.new_value && <> · {a.old_value} → {a.new_value}</>}
                <span className="ml-2">{daysSince(a.created_at)}d ago</span>
              </li>
            ))}
            {activity.length === 0 && <li>No activity yet.</li>}
          </ul>
        </div>

        {isAdmin && (
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
                    This will permanently remove "{task.title}" along with its notes and activity history. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
