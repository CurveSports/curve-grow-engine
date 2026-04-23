import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ENGINES, OrgTask, STATUS_STYLE, STATUS_LABEL,
  PRIORITY_STYLE, TASK_PRIORITIES, OWNER_LABEL, OWNER_STYLE,
  TASK_OWNER_TYPES,
} from "@/lib/tasks";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Search, X, Archive, RotateCcw, Trash2, Flag, UserCog } from "lucide-react";

type Props = {
  orgId: string;
  tasks: OrgTask[];
  scores: Record<string, number | null>;
  priorityEngine: string | null;
  fastestPathEngines: string[];
  onSelect: (task: OrgTask) => void;
  onChanged: () => void;
};

type FilterPlanStatus = "review" | "draft" | "parked" | "all";

const SCORE_BADGE = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "bg-muted text-muted-foreground border-transparent";
  if (score <= 3) return "bg-destructive/15 text-destructive border-destructive/30";
  if (score <= 6) return "bg-warning/15 text-warning border-warning/30";
  if (score <= 7) return "bg-accent/15 text-accent border-accent/30";
  return "bg-muted text-muted-foreground border-transparent";
};

function dueClasses(due: string | null) {
  if (!due) return "text-muted-foreground";
  const days = Math.floor((new Date(due).getTime() - Date.now()) / 86400000);
  if (days < 0) return "text-destructive font-medium";
  if (days < 7) return "text-warning font-medium";
  return "text-muted-foreground";
}

export default function PlanReviewWorkspace({
  orgId, tasks, scores, priorityEngine, fastestPathEngines, onSelect, onChanged,
}: Props) {
  const [search, setSearch] = useState("");
  const [engineFilter, setEngineFilter] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<FilterPlanStatus>("review");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Reset selection when filter set changes
  useEffect(() => { setSelected(new Set()); }, [engineFilter, ownerFilter, statusFilter, search]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === "review" && t.plan_status === "active") return false;
      if (statusFilter === "draft" && t.plan_status !== "draft") return false;
      if (statusFilter === "parked" && t.plan_status !== "parked") return false;
      if (engineFilter && t.engine !== engineFilter) return false;
      if (ownerFilter !== "all" && t.owner_type !== ownerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, engineFilter, ownerFilter, search]);

  // Per-engine counts based on the broader review pool (draft + parked, ignoring engine filter)
  const engineCounts = useMemo(() => {
    const draft: Record<string, number> = {};
    const parked: Record<string, number> = {};
    for (const t of tasks) {
      if (t.plan_status === "draft") draft[t.engine] = (draft[t.engine] ?? 0) + 1;
      else if (t.plan_status === "parked") parked[t.engine] = (parked[t.engine] ?? 0) + 1;
    }
    return { draft, parked };
  }, [tasks]);

  const orderedEngines = useMemo(() => {
    // Sort engines by priority signal then engine score asc, then alpha
    const has = (e: string) => (engineCounts.draft[e] ?? 0) + (engineCounts.parked[e] ?? 0) > 0;
    const list = ENGINES.filter(has);
    const fpSet = new Set(fastestPathEngines ?? []);
    return [...list].sort((a, b) => {
      if (a === priorityEngine && b !== priorityEngine) return -1;
      if (b === priorityEngine && a !== priorityEngine) return 1;
      const fa = fpSet.has(a) ? 0 : 1;
      const fb = fpSet.has(b) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const sa = scores[a]; const sb = scores[b];
      const am = sa === null || sa === undefined ? Infinity : sa;
      const bm = sb === null || sb === undefined ? Infinity : sb;
      if (am !== bm) return am - bm;
      return ENGINES.indexOf(a as any) - ENGINES.indexOf(b as any);
    });
  }, [engineCounts, scores, priorityEngine, fastestPathEngines]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  };

  const ids = () => Array.from(selected);

  const bulkSetPlanStatus = async (status: "draft" | "parked") => {
    if (selected.size === 0) return;
    setBusy(true);
    const { error } = await supabase
      .from("org_tasks")
      .update({ plan_status: status as any })
      .in("id", ids());
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`${selected.size} task${selected.size === 1 ? "" : "s"} ${status === "parked" ? "parked" : "restored to draft"}`);
      setSelected(new Set());
      onChanged();
    }
  };

  const bulkSetPriority = async (priority: string) => {
    if (selected.size === 0) return;
    setBusy(true);
    const { error } = await supabase
      .from("org_tasks")
      .update({ priority: priority as any })
      .in("id", ids());
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Priority set to ${priority} on ${selected.size} task${selected.size === 1 ? "" : "s"}`);
      setSelected(new Set());
      onChanged();
    }
  };

  const bulkSetOwner = async (owner: string) => {
    if (selected.size === 0) return;
    setBusy(true);
    const { error } = await supabase
      .from("org_tasks")
      .update({ owner_type: owner as any })
      .in("id", ids());
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Owner set to ${OWNER_LABEL[owner as keyof typeof OWNER_LABEL]} on ${selected.size} task${selected.size === 1 ? "" : "s"}`);
      setSelected(new Set());
      onChanged();
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} task${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from("org_tasks").delete().in("id", ids());
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Deleted ${selected.size} task${selected.size === 1 ? "" : "s"}`);
      setSelected(new Set());
      onChanged();
    }
  };

  const setSinglePriority = async (taskId: string, priority: string) => {
    const { error } = await supabase.from("org_tasks").update({ priority: priority as any }).eq("id", taskId);
    if (error) toast.error(error.message); else onChanged();
  };

  const setSingleStatus = async (taskId: string, status: "draft" | "parked") => {
    const { error } = await supabase.from("org_tasks").update({ plan_status: status as any }).eq("id", taskId);
    if (error) toast.error(error.message); else onChanged();
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="space-y-4">
      {/* Engine filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setEngineFilter(null)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            engineFilter === null ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-secondary border-border"
          }`}
        >
          All engines
        </button>
        {orderedEngines.map((e) => {
          const draftN = engineCounts.draft[e] ?? 0;
          const parkedN = engineCounts.parked[e] ?? 0;
          const isPriority = e === priorityEngine;
          const isFastestPath = (fastestPathEngines ?? []).includes(e);
          const active = engineFilter === e;
          return (
            <button
              key={e}
              onClick={() => setEngineFilter(active ? null : e)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-2 ${
                active ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-secondary border-border"
              }`}
              title={isPriority ? "Priority engine" : isFastestPath ? "On fastest path to next tier" : undefined}
            >
              {isPriority && <Flag className="h-3 w-3 text-warning" />}
              {!isPriority && isFastestPath && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              <span className="font-medium">{e}</span>
              <span className={`text-[10px] px-1.5 rounded-full border ${SCORE_BADGE(scores[e])} ${active ? "bg-background/20 border-background/30 text-background" : ""}`}>
                {scores[e] ?? "—"}
              </span>
              <span className={`text-[10px] tabular-nums ${active ? "text-background/80" : "text-muted-foreground"}`}>
                {draftN}{parkedN > 0 ? ` · ${parkedN} parked` : ""}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8 h-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterPlanStatus)}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="review">In review</SelectItem>
            <SelectItem value="draft">Draft only</SelectItem>
            <SelectItem value="parked">Parked only</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {TASK_OWNER_TYPES.map((o) => <SelectItem key={o} value={o}>{OWNER_LABEL[o]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap gap-2 items-center px-3 py-2 rounded-lg border border-accent/30 bg-accent-soft shadow-sm">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="h-4 w-px bg-border mx-1" />
          {statusFilter === "parked" ? (
            <Button size="sm" variant="outline" onClick={() => bulkSetPlanStatus("draft")} disabled={busy}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore to draft
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => bulkSetPlanStatus("parked")} disabled={busy}>
              <Archive className="h-3.5 w-3.5 mr-1" /> Park
            </Button>
          )}
          <Select onValueChange={bulkSetPriority}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Set priority…" /></SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={bulkSetOwner}>
            <SelectTrigger className="h-8 w-[160px]">
              <UserCog className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Reassign owner…" />
            </SelectTrigger>
            <SelectContent>
              {TASK_OWNER_TYPES.map((o) => <SelectItem key={o} value={o}>{OWNER_LABEL[o]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={bulkDelete} disabled={busy}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="curve-card text-center py-12 text-sm text-muted-foreground">
          No tasks match these filters.
        </div>
      ) : (
        <div className="curve-card p-0 overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center gap-3">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {filtered.length} task{filtered.length === 1 ? "" : "s"} shown
            </span>
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((t) => {
              const isParked = t.plan_status === "parked";
              const checked = selected.has(t.id);
              return (
                <li key={t.id} className={`group flex items-start gap-3 px-4 py-3 hover:bg-secondary/40 ${isParked ? "opacity-60" : ""} ${checked ? "bg-accent/5" : ""}`}>
                  <div className="pt-0.5">
                    <Checkbox checked={checked} onCheckedChange={() => toggle(t.id)} aria-label={`Select ${t.title}`} />
                  </div>
                  <button
                    onClick={() => onSelect(t)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {t.engine} · {t.task_type}
                      {t.due_date && (
                        <> · <span className={dueClasses(t.due_date)}>Due {formatDate(t.due_date)}</span></>
                      )}
                    </p>
                  </button>
                  {/* Inline quick actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${OWNER_STYLE[t.owner_type]}`}>
                      {OWNER_LABEL[t.owner_type]}
                    </span>
                    <Select value={t.priority} onValueChange={(v) => setSinglePriority(t.id, v)}>
                      <SelectTrigger className={`h-6 px-2 text-[10px] border ${PRIORITY_STYLE[t.priority]} w-[78px]`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[t.status]} hidden sm:inline-block`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    {isParked ? (
                      <button
                        onClick={() => setSingleStatus(t.id, "draft")}
                        className="text-muted-foreground hover:text-accent p-1 rounded"
                        title="Restore to draft"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSingleStatus(t.id, "parked")}
                        className="text-muted-foreground hover:text-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Park (defer for later)"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
