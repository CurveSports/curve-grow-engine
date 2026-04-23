import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { weekStartingMonday } from "@/lib/week";
import { Pencil, Quote, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

type Task = { id: string; title: string; engine: string; due_date: string | null; status: string; priority: string };

export function WeeklyFocusCard({
  orgId,
  tasks,
  editable,
}: {
  orgId: string;
  tasks: Task[];
  editable: boolean;
}) {
  const { user } = useAuth();
  const week = weekStartingMonday();
  const [focus, setFocus] = useState<{ focus_task_ids: string[] | null; focus_note: string | null; week_starting: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("org_weekly_focus" as any)
      .select("focus_task_ids, focus_note, week_starting")
      .eq("org_id", orgId)
      .maybeSingle();
    if (data && (data as any).week_starting === week) {
      const f = data as any;
      setFocus({ focus_task_ids: f.focus_task_ids ?? null, focus_note: f.focus_note ?? null, week_starting: f.week_starting });
      setSelectedIds(f.focus_task_ids ?? []);
      setNote(f.focus_note ?? "");
    } else {
      setFocus(null);
      setSelectedIds([]);
      setNote("");
    }
  };

  useEffect(() => { load(); }, [orgId]);

  const openTasks = useMemo(() => tasks.filter(t => t.status !== "completed"), [tasks]);

  const focusTasks = useMemo(() => {
    if (focus?.focus_task_ids?.length) {
      const map = new Map(tasks.map(t => [t.id, t]));
      return focus.focus_task_ids.map(id => map.get(id)).filter(Boolean) as Task[];
    }
    if (!editable) return [];
    // Admin-only preview fallback: top high-priority open tasks
    return [...openTasks].sort((a, b) => {
      const pri = { high: 0, medium: 1, low: 2 } as any;
      return (pri[a.priority] ?? 9) - (pri[b.priority] ?? 9);
    }).slice(0, 4);
  }, [focus, tasks, openTasks, editable]);

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const save = async () => {
    if (selectedIds.length < 3 || selectedIds.length > 7) {
      toast({ title: "Select 3–7 tasks for the weekly focus", variant: "destructive" });
      return;
    }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("org_weekly_focus" as any)
      .upsert({
        org_id: orgId,
        focus_task_ids: selectedIds,
        focus_note: note.trim() || null,
        set_by: user.id,
        week_starting: week,
      } as any, { onConflict: "org_id" });
    setSaving(false);
    if (error) { toast({ title: "Failed to save focus", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Weekly focus saved" });
    setEditing(false);
    load();
  };

  const isAdminSet = !!focus?.focus_task_ids?.length;

  // Org-side: hide entirely when no focus set for current week (no stale data)
  if (!editable && !isAdminSet) return null;

  return (
    <div className="curve-card border-l-4 border-l-warning">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <p className="curve-eyebrow text-warning">This Week's Focus</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isAdminSet ? "Set by your Curve team" : "Derived from highest-priority open tasks"}
          </p>
        </div>
        {editable && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Focus
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Select 3–7 tasks ({selectedIds.length} selected)</p>
            <div className="max-h-72 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {openTasks.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No open tasks available.</p>
              ) : openTasks.map(t => (
                <label key={t.id} className="flex items-center gap-3 p-3 hover:bg-secondary/50 cursor-pointer">
                  <Checkbox checked={selectedIds.includes(t.id)} onCheckedChange={() => toggle(t.id)} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{t.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.engine}{t.due_date ? ` · due ${t.due_date}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Focus note (optional)</p>
            <Textarea
              placeholder="Big week — let's get the sponsorship outreach started…"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Week starting: <span className="font-medium text-foreground">{week}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); load(); }}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {saving ? "Saving…" : "Save Focus"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {isAdminSet && focus?.focus_note && (
            <blockquote className="border-l-4 border-accent bg-accent-soft/50 px-4 py-3 mb-4 rounded-r-md">
              <Quote className="h-3.5 w-3.5 text-accent inline mr-1.5" />
              <span className="text-sm text-foreground italic">{focus.focus_note}</span>
              <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mt-1.5">From your Curve team</p>
            </blockquote>
          )}
          {focusTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks — plan not yet activated or all tasks complete.</p>
          ) : (
            <ul className="divide-y divide-border">
              {focusTasks.map(t => (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-secondary text-foreground border-border uppercase tracking-wide">
                    {t.engine}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground truncate">{t.title}</span>
                  <FocusStatusPill status={t.status} dueDate={t.due_date} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function FocusStatusPill({ status, dueDate }: { status: string; dueDate: string | null }) {
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== "completed";
  if (status === "completed") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground"><CheckCircle2 className="h-3 w-3" /> Done</span>;
  }
  if (isOverdue) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive text-destructive-foreground"><AlertCircle className="h-3 w-3" /> Overdue</span>;
  }
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-info text-info-foreground")}><Clock className="h-3 w-3" /> Open</span>;
}
