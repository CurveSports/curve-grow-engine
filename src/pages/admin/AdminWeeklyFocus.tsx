import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { weekStartingMonday } from "@/lib/week";
import { AlertTriangle, CheckCircle2, ExternalLink, Pencil, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  org_id: string;
  title: string;
  engine: string;
  due_date: string | null;
  status: string;
  priority: string;
};

type OrgRow = {
  id: string;
  name: string;
  plan_activated_at: string | null;
};

type FocusRow = {
  org_id: string;
  week_starting: string;
  focus_task_ids: string[] | null;
  focus_note: string | null;
};

export default function AdminWeeklyFocus() {
  const { user } = useAuth();
  const week = weekStartingMonday();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [tasksByOrg, setTasksByOrg] = useState<Record<string, Task[]>>({});
  const [focusByOrg, setFocusByOrg] = useState<Record<string, FocusRow>>({});
  const [loading, setLoading] = useState(true);
  const [missingOnly, setMissingOnly] = useState(true);

  // per-org local edit state
  const [draftIds, setDraftIds] = useState<Record<string, string[]>>({});
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});

  // per-org task filters
  const [filterQuery, setFilterQuery] = useState<Record<string, string>>({});
  const [filterEngine, setFilterEngine] = useState<Record<string, string>>({});
  const [filterPriority, setFilterPriority] = useState<Record<string, string>>({});
  const [filterDue, setFilterDue] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: o }, { data: t }, { data: f }] = await Promise.all([
      supabase.from("organizations").select("id, name, plan_activated_at").order("name"),
      supabase.from("org_tasks")
        .select("id, org_id, title, engine, due_date, status, priority")
        .neq("status", "completed"),
      supabase.from("org_weekly_focus" as any).select("org_id, week_starting, focus_task_ids, focus_note"),
    ]);
    const orgList = (o as OrgRow[]) ?? [];
    setOrgs(orgList);

    const tMap: Record<string, Task[]> = {};
    for (const tk of (t as Task[]) ?? []) {
      (tMap[tk.org_id] ??= []).push(tk);
    }
    setTasksByOrg(tMap);

    const fMap: Record<string, FocusRow> = {};
    const ids: Record<string, string[]> = {};
    const notes: Record<string, string> = {};
    for (const row of ((f as any[]) ?? [])) {
      fMap[row.org_id] = row;
      if (row.week_starting === week) {
        ids[row.org_id] = row.focus_task_ids ?? [];
        notes[row.org_id] = row.focus_note ?? "";
      }
    }
    setFocusByOrg(fMap);
    setDraftIds(ids);
    setDraftNote(notes);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const isSetThisWeek = (orgId: string) =>
    !!focusByOrg[orgId] && focusByOrg[orgId].week_starting === week && (focusByOrg[orgId].focus_task_ids?.length ?? 0) > 0;

  const missingCount = useMemo(
    () => orgs.filter(o => !isSetThisWeek(o.id)).length,
    [orgs, focusByOrg, week]
  );

  const visibleOrgs = useMemo(
    () => missingOnly ? orgs.filter(o => !isSetThisWeek(o.id)) : orgs,
    [orgs, missingOnly, focusByOrg, week]
  );

  const toggleTask = (orgId: string, taskId: string) => {
    setDraftIds(prev => {
      const cur = prev[orgId] ?? [];
      const next = cur.includes(taskId) ? cur.filter(x => x !== taskId) : [...cur, taskId];
      return { ...prev, [orgId]: next };
    });
  };

  const save = async (orgId: string) => {
    const ids = draftIds[orgId] ?? [];
    if (ids.length < 3 || ids.length > 7) {
      toast({ title: "Select 3–7 tasks for the weekly focus", variant: "destructive" });
      return;
    }
    if (!user) return;
    setSaving(prev => ({ ...prev, [orgId]: true }));
    const { error } = await supabase.from("org_weekly_focus" as any)
      .upsert({
        org_id: orgId,
        focus_task_ids: ids,
        focus_note: (draftNote[orgId] ?? "").trim() || null,
        set_by: user.id,
        week_starting: week,
      } as any, { onConflict: "org_id" });
    setSaving(prev => ({ ...prev, [orgId]: false }));
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Weekly focus saved" });
    // optimistic local update
    setFocusByOrg(prev => ({
      ...prev,
      [orgId]: { org_id: orgId, week_starting: week, focus_task_ids: ids, focus_note: (draftNote[orgId] ?? "").trim() || null },
    }));
    setEditing(prev => ({ ...prev, [orgId]: false }));
  };

  return (
    <AppShell title="Weekly Focus">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">Set This Week's Focus</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Weekly Focus</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week starting <span className="font-medium text-foreground">{week}</span>. Pick 3–7 tasks per org so clients know what matters most.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Missing only</span>
          <Switch checked={missingOnly} onCheckedChange={setMissingOnly} />
        </div>
      </div>

      {!loading && missingCount > 0 && (
        <div className="curve-card border-l-4 border-l-warning bg-warning-soft/40 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {missingCount} org{missingCount === 1 ? "" : "s"} still need this week's focus set.
            </p>
            <p className="text-xs text-muted-foreground">Clients won't see a "this week's focus" card until you set one.</p>
          </div>
        </div>
      )}

      {!loading && missingCount === 0 && (
        <div className="curve-card border-l-4 border-l-accent bg-accent-soft/40 mb-6 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
          <p className="text-sm font-medium">All orgs have a focus set for this week. Nice work.</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visibleOrgs.length === 0 ? (
        <div className="curve-card text-center py-10 text-sm text-muted-foreground">
          {missingOnly ? "Every org has a focus set for this week." : "No organizations."}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleOrgs.map((o) => {
            const tasks = tasksByOrg[o.id] ?? [];
            const ids = draftIds[o.id] ?? [];
            const set = isSetThisWeek(o.id);
            const lastWeek = focusByOrg[o.id];
            const isEditing = editing[o.id] ?? !set;
            const currentFocus = set ? focusByOrg[o.id] : null;
            const taskById: Record<string, Task> = {};
            for (const tk of tasks) taskById[tk.id] = tk;
            return (
              <div key={o.id} className="curve-card">
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-lg font-semibold truncate">{o.name}</h2>
                      {set ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground">
                          <CheckCircle2 className="h-3 w-3" /> Set this week
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warning text-warning-foreground">
                          <AlertTriangle className="h-3 w-3" /> Not set
                        </span>
                      )}
                      {!o.plan_activated_at && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-semibold">
                          Plan not activated
                        </span>
                      )}
                    </div>
                    {!set && lastWeek && lastWeek.week_starting !== week && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last set for week of {lastWeek.week_starting}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {set && !isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(prev => ({ ...prev, [o.id]: true }))}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                      </Button>
                    )}
                    <Link
                      to={`/admin/org/${o.id}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Open org <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {set && !isEditing && currentFocus ? (
                  <div className="space-y-2">
                    <ul className="space-y-1.5">
                      {(currentFocus.focus_task_ids ?? []).map(tid => {
                        const t = taskById[tid];
                        return (
                          <li key={tid} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent flex-shrink-0" />
                            <span className="min-w-0">
                              <span className="block font-medium truncate">{t?.title ?? "(task no longer open)"}</span>
                              {t && (
                                <span className="block text-xs text-muted-foreground">
                                  {t.engine}{t.due_date ? ` · due ${t.due_date}` : ""} · {t.priority}
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {currentFocus.focus_note && (
                      <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3 mt-2">
                        "{currentFocus.focus_note}"
                      </p>
                    )}
                  </div>
                ) : tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No open tasks to choose from.</p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Select 3–7 tasks ({ids.length} selected)
                    </p>
                    {(() => {
                      const q = (filterQuery[o.id] ?? "").trim().toLowerCase();
                      const eng = filterEngine[o.id] ?? "all";
                      const pri = filterPriority[o.id] ?? "all";
                      const dueSort = filterDue[o.id] ?? "none";
                      const engines = Array.from(new Set(tasks.map(t => t.engine))).sort();
                      let filtered = tasks.filter(t => {
                        if (q && !t.title.toLowerCase().includes(q)) return false;
                        if (eng !== "all" && t.engine !== eng) return false;
                        if (pri !== "all" && t.priority !== pri) return false;
                        return true;
                      });
                      if (dueSort === "asc" || dueSort === "desc") {
                        filtered = [...filtered].sort((a, b) => {
                          const av = a.due_date ?? "9999-12-31";
                          const bv = b.due_date ?? "9999-12-31";
                          return dueSort === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                        });
                      }
                      return (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
                            <Input
                              placeholder="Search by name…"
                              value={filterQuery[o.id] ?? ""}
                              onChange={(e) => setFilterQuery(prev => ({ ...prev, [o.id]: e.target.value }))}
                              className="h-9 text-sm"
                            />
                            <Select value={eng} onValueChange={(v) => setFilterEngine(prev => ({ ...prev, [o.id]: v }))}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Engine" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All engines</SelectItem>
                                {engines.map(en => <SelectItem key={en} value={en}>{en}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={pri} onValueChange={(v) => setFilterPriority(prev => ({ ...prev, [o.id]: v }))}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All priorities</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={dueSort} onValueChange={(v) => setFilterDue(prev => ({ ...prev, [o.id]: v }))}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Due date" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Default order</SelectItem>
                                <SelectItem value="asc">Due date ↑ (soonest)</SelectItem>
                                <SelectItem value="desc">Due date ↓ (latest)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="max-h-64 overflow-y-auto border border-border rounded-md divide-y divide-border mb-3">
                            {filtered.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-3">No tasks match these filters.</p>
                            ) : filtered.map(t => (
                              <label key={t.id} className={cn(
                                "flex items-center gap-3 p-2.5 hover:bg-secondary/50 cursor-pointer",
                                ids.includes(t.id) && "bg-secondary/40",
                              )}>
                                <Checkbox
                                  checked={ids.includes(t.id)}
                                  onCheckedChange={() => toggleTask(o.id, t.id)}
                                />
                                <span className="flex-1 min-w-0">
                                  <span className="block text-sm font-medium truncate">{t.title}</span>
                                  <span className="block text-xs text-muted-foreground">
                                    {t.engine}{t.due_date ? ` · due ${t.due_date}` : ""} · {t.priority}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                    <Textarea
                      placeholder="Optional focus note for this org…"
                      rows={2}
                      value={draftNote[o.id] ?? ""}
                      onChange={(e) => setDraftNote(prev => ({ ...prev, [o.id]: e.target.value }))}
                      className="mb-3"
                    />
                    <div className="flex justify-end gap-2">
                      {set && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(prev => ({ ...prev, [o.id]: false }))}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => save(o.id)}
                        disabled={saving[o.id]}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        <Save className="h-4 w-4 mr-1.5" />
                        {saving[o.id] ? "Saving…" : set ? "Update focus" : "Save focus"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
