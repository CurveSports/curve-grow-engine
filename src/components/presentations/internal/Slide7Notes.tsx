import { useEffect, useState } from "react";
import { CurveBadge } from "../shared";
import { EditableText } from "../EditableField";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function Slide7Notes({
  orgId, tasks, projects, notes: initialNotes, activity, scenarios,
  get, save, editing,
}: {
  orgId: string;
  tasks: any[]; projects: any[]; notes: any[]; activity: any[]; scenarios: any[];
  get: (slide: number, field: string, fallback: string) => string;
  save: (slide: number, field: string, value: string) => Promise<void>;
  editing: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { setNotes(initialNotes); }, [initialNotes]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const weekAgo = Date.now() - 7 * 86400000;
  const completedThisWeek = tasks.filter((t) => t.status === "completed" && t.completed_at && new Date(t.completed_at).getTime() > weekAgo).length;

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const draftProjects = projects.filter((p) => p.status === "draft").length;

  const lastActivity = activity[0];

  const addNote = async () => {
    if (!draft.trim()) return;
    setAdding(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("org_notes").insert({
        org_id: orgId, note_text: draft.trim(), created_by: u.user.id,
      }).select("*").single();
      if (error) throw error;
      setNotes([data, ...notes]);
      setDraft("");
      toast.success("Note added");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add note");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold">Notes & History</p>
        <CurveBadge />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-3">Internal Notes</p>
        <div className="flex gap-2 mb-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note for the team…"
            className="flex-1 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm placeholder:text-white/40 resize-none"
            rows={2}
          />
          <Button onClick={addNote} disabled={adding || !draft.trim()} size="sm">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Add</>}
          </Button>
        </div>
        <ul className="space-y-2 max-h-[260px] overflow-y-auto">
          {notes.length === 0 && <li className="text-sm text-white/50">No notes yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-white/85 whitespace-pre-wrap">{n.note_text}</p>
                <span className="text-[10px] text-white/40 whitespace-nowrap">{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
              {n.tag && <span className="inline-block mt-1 text-[10px] uppercase tracking-wider text-accent">#{n.tag}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-3">Activity Summary</p>
          <ul className="text-sm space-y-1.5 text-white/85">
            <li>Tasks completed: <span className="font-semibold tabular-nums">{completed}</span> total / <span className="font-semibold tabular-nums">{completedThisWeek}</span> this week</li>
            <li>Projects: <span className="tabular-nums">{activeProjects}</span> active · <span className="tabular-nums">{completedProjects}</span> completed · <span className="tabular-nums">{draftProjects}</span> draft</li>
            <li>Calculator scenarios saved: <span className="tabular-nums">{scenarios.length}</span></li>
            <li>Last activity: {lastActivity ? `${lastActivity.action.replace(/_/g, " ")} · ${new Date(lastActivity.created_at).toLocaleDateString()}` : "—"}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-3">Calculator Activity</p>
          {scenarios.length === 0 ? (
            <p className="text-sm text-white/50">No scenarios saved yet.</p>
          ) : (
            <ul className="text-sm space-y-1.5">
              {scenarios.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-2">
                  <span className="text-white/85 truncate">{s.scenario_label}</span>
                  <span className="text-[10px] text-white/40 whitespace-nowrap">{s.calculator_type} · {new Date(s.saved_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-2">Internal Comments</p>
        <p className="text-sm text-white/85 leading-relaxed">
          <EditableText
            value={get(7, "internal_comments", "Add internal context, observations, or follow-up reminders here.")}
            editing={editing}
            multiline
            onSave={(v) => save(7, "internal_comments", v)}
          />
        </p>
      </div>
    </div>
  );
}
