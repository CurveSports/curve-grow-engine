import { useEffect, useMemo, useRef, useState, useCallback, MouseEvent as ReactMouseEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { toast } from "@/hooks/use-toast";
import { Search, ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

type ZoomKey = "30d" | "90d" | "6m" | "12m";
const ZOOM_DAYS: Record<ZoomKey, number> = { "30d": 30, "90d": 90, "6m": 183, "12m": 365 };
const ZOOM_LABELS: Record<ZoomKey, string> = { "30d": "30 days", "90d": "90 days", "6m": "6 months", "12m": "12 months" };

type Project = {
  id: string;
  org_id: string;
  name: string;
  engine: string | null;
  status: "draft" | "active" | "completed";
  release_date: string | null;
  released_at: string | null;
  completion_approved_at: string | null;
  created_at: string;
};

type Task = {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  due_date: string | null;
  suggested_due_date: string | null;
  status: string;
  engine: string;
};

type Org = { id: string; name: string };

const dayMs = 86400000;
const toDate = (s: string | null | undefined): Date | null => (s ? new Date(s) : null);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtISO = (d: Date) => d.toISOString().slice(0, 10);
const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtMonth = (d: Date) => d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
const fmtFull = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

const ENGINE_COLOR: Record<string, string> = {
  Pricing: "bg-blue-500",
  Sponsorship: "bg-purple-500",
  Apparel: "bg-pink-500",
  Events: "bg-emerald-500",
  "Add-Ons": "bg-orange-500",
  Retention: "bg-cyan-500",
  Facility: "bg-indigo-500",
  Affiliate: "bg-violet-500",
  Platform: "bg-slate-500",
  Marketing: "bg-amber-500",
  Operations: "bg-teal-500",
};

function getProjectRange(p: Project): { start: Date; end: Date } | null {
  // start = released_at || release_date || created_at
  // end   = completion_approved_at || release_date+30d (heuristic) || start+30d
  const startSrc = p.released_at || p.release_date || p.created_at;
  const start = toDate(startSrc);
  if (!start) return null;
  const endSrc = p.completion_approved_at;
  let end = toDate(endSrc);
  if (!end) {
    end = new Date(start.getTime() + 30 * dayMs);
  }
  if (end.getTime() < start.getTime()) end = new Date(start.getTime() + dayMs);
  return { start: startOfDay(start), end: startOfDay(end) };
}

export default function AdminRoadmap() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<ZoomKey>("90d");
  const [windowStart, setWindowStart] = useState<Date>(() => startOfDay(new Date(Date.now() - 14 * dayMs)));
  const [query, setQuery] = useState("");
  const [showDrafts, setShowDrafts] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragTip, setDragTip] = useState<{ x: number; y: number; start: Date; end: Date; mode: "move" | "resize-start" | "resize-end"; name: string } | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: orgsData }, { data: pData }, { data: tData }] = await Promise.all([
        supabase.from("organizations").select("id, name").order("name"),
        supabase.from("org_projects").select("id, org_id, name, engine, status, release_date, released_at, completion_approved_at, created_at"),
        supabase.from("org_tasks").select("id, org_id, project_id, title, due_date, suggested_due_date, status, engine"),
      ]);
      setOrgs((orgsData ?? []) as Org[]);
      setProjects((pData ?? []) as Project[]);
      setTasks((tData ?? []) as Task[]);
      setLoading(false);
    })();
  }, []);

  const days = ZOOM_DAYS[zoom];
  const windowEnd = useMemo(() => new Date(windowStart.getTime() + days * dayMs), [windowStart, days]);
  const today = useMemo(() => startOfDay(new Date()), []);

  // Tick marks
  const ticks = useMemo(() => {
    const out: { x: number; label: string; major: boolean }[] = [];
    const step = days <= 30 ? 2 : days <= 90 ? 7 : days <= 183 ? 14 : 30;
    for (let i = 0; i <= days; i += step) {
      const d = new Date(windowStart.getTime() + i * dayMs);
      out.push({
        x: i / days,
        label: days >= 183 ? fmtMonth(d) : fmtShort(d),
        major: d.getDate() === 1 || i === 0,
      });
    }
    return out;
  }, [windowStart, days]);

  const projectsByOrg = useMemo(() => {
    const m = new Map<string, Project[]>();
    for (const p of projects) {
      if (!showDrafts && p.status === "draft") continue;
      if (!showCompleted && p.status === "completed") continue;
      const arr = m.get(p.org_id) ?? [];
      arr.push(p);
      m.set(p.org_id, arr);
    }
    return m;
  }, [projects, showDrafts, showCompleted]);

  const visibleOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orgs.filter((o) => {
      if (q && !o.name.toLowerCase().includes(q)) return false;
      const list = projectsByOrg.get(o.id) ?? [];
      return list.length > 0;
    });
  }, [orgs, query, projectsByOrg]);

  // Map a date to a fractional position in the current window (clamped 0..1)
  const dateToPct = useCallback(
    (d: Date) => {
      const t = (d.getTime() - windowStart.getTime()) / (days * dayMs);
      return Math.max(0, Math.min(1, t));
    },
    [windowStart, days],
  );

  // Pan controls
  const panDays = (delta: number) => setWindowStart(startOfDay(new Date(windowStart.getTime() + delta * dayMs)));
  const jumpToToday = () => setWindowStart(startOfDay(new Date(today.getTime() - Math.floor(days * 0.2) * dayMs)));

  // ---- Drag-to-reschedule ----
  const dragRef = useRef<{
    project: Project;
    mode: "move" | "resize-start" | "resize-end";
    startX: number;
    startStart: Date;
    startEnd: Date;
    pxPerDay: number;
  } | null>(null);

  const beginDrag = (e: ReactMouseEvent, p: Project, mode: "move" | "resize-start" | "resize-end") => {
    if (p.status === "completed") return;
    const range = getProjectRange(p);
    if (!range) return;
    const trackEl = trackRef.current;
    if (!trackEl) return;
    const width = trackEl.clientWidth;
    dragRef.current = {
      project: p,
      mode,
      startX: e.clientX,
      startStart: range.start,
      startEnd: range.end,
      pxPerDay: width / days,
    };
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragMove = useCallback((e: globalThis.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dxDays = Math.round((e.clientX - d.startX) / d.pxPerDay);
    if (dxDays === 0) return;
    const newStart = new Date(d.startStart.getTime() + (d.mode !== "resize-end" ? dxDays * dayMs : 0));
    const newEnd = new Date(d.startEnd.getTime() + (d.mode !== "resize-start" ? dxDays * dayMs : 0));
    // only repaint via state-update on the dragged project
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== d.project.id) return p;
        if (d.mode === "move") {
          return {
            ...p,
            release_date: fmtISO(newStart),
            released_at: p.released_at ? new Date(d.startStart.getTime() + dxDays * dayMs).toISOString() : p.released_at,
            completion_approved_at: p.completion_approved_at ? new Date(newEnd).toISOString() : p.completion_approved_at,
          };
        }
        if (d.mode === "resize-start") {
          return {
            ...p,
            release_date: fmtISO(newStart),
            released_at: p.released_at ? new Date(d.startStart.getTime() + dxDays * dayMs).toISOString() : p.released_at,
          };
        }
        // resize-end
        return {
          ...p,
          completion_approved_at: new Date(newEnd).toISOString(),
        };
      }),
    );
  }, []);

  const onDragEnd = useCallback(async () => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    const updated = projects.find((p) => p.id === d.project.id);
    if (!updated) return;
    const patch: { release_date?: string | null; released_at?: string | null; completion_approved_at?: string | null } = {};
    if (d.mode !== "resize-end") {
      patch.release_date = updated.release_date;
      if (updated.released_at) patch.released_at = updated.released_at;
    }
    if (d.mode !== "resize-start") {
      if (updated.completion_approved_at) patch.completion_approved_at = updated.completion_approved_at;
    }
    const { error } = await supabase.from("org_projects").update(patch).eq("id", d.project.id);
    if (error) {
      toast({ title: "Couldn't reschedule", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rescheduled", description: updated.name });
    }
  }, [projects]);

  useEffect(() => {
    const move = (e: globalThis.MouseEvent) => onDragMove(e);
    const up = () => onDragEnd();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [onDragMove, onDragEnd]);

  if (loading) return <AppShell><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  const todayPct = dateToPct(today);
  const todayInWindow = today >= windowStart && today <= windowEnd;

  return (
    <AppShell title="Roadmap">
      <div className="mb-6">
        <p className="curve-eyebrow mb-2">Portfolio</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Roadmap Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drag project pills to reschedule. Drag edges to adjust release or completion dates.
        </p>
      </div>

      {/* Controls */}
      <div className="curve-card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search organizations…" className="pl-9 h-9" />
        </div>
        <div className="flex rounded-md border border-input overflow-hidden text-xs">
          {(["30d", "90d", "6m", "12m"] as ZoomKey[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-3 py-1.5 transition-colors ${zoom === z ? "bg-accent text-accent-foreground" : "bg-background hover:bg-secondary"}`}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border border-input overflow-hidden text-xs">
          <button onClick={() => panDays(-Math.floor(days / 4))} className="px-3 py-1.5 bg-background hover:bg-secondary transition-colors">←</button>
          <button onClick={jumpToToday} className="px-3 py-1.5 bg-background hover:bg-secondary transition-colors inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Today
          </button>
          <button onClick={() => panDays(Math.floor(days / 4))} className="px-3 py-1.5 bg-background hover:bg-secondary transition-colors">→</button>
        </div>
        <label className="text-xs flex items-center gap-1.5">
          <input type="checkbox" checked={showDrafts} onChange={(e) => setShowDrafts(e.target.checked)} /> Drafts
        </label>
        <label className="text-xs flex items-center gap-1.5">
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} /> Completed
        </label>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-6 rounded bg-accent" /> Active</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-6 rounded border-2 border-dashed border-accent bg-accent/10" /> Draft</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-6 rounded bg-muted" /> Completed (locked)</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-px bg-red-500" /> Today</span>
      </div>

      {/* Timeline */}
      <div className="curve-card p-0 overflow-hidden">
        <div className="grid grid-cols-[200px_1fr] border-b border-border">
          <div className="px-4 py-2 text-[11px] uppercase tracking-wider font-medium text-muted-foreground bg-secondary/40">
            Organization
          </div>
          <div ref={trackRef} className="relative bg-secondary/40 h-9">
            {ticks.map((t, i) => (
              <div key={i} className="absolute top-0 bottom-0 flex items-center" style={{ left: `${t.x * 100}%` }}>
                <div className={`absolute top-0 bottom-0 w-px ${t.major ? "bg-border" : "bg-border/40"}`} />
                <span className={`relative pl-1 text-[10px] ${t.major ? "text-foreground" : "text-muted-foreground"} tabular-nums`}>
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {visibleOrgs.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">No organizations match your filters.</div>
          )}
          {visibleOrgs.map((org) => {
            const orgProjects = projectsByOrg.get(org.id) ?? [];
            const isExpanded = expanded.has(org.id);
            return (
              <div key={org.id} className="grid grid-cols-[200px_1fr] border-b border-border hover:bg-secondary/20 transition-colors">
                <div className="px-4 py-3 flex items-start gap-2 min-w-0">
                  <button
                    onClick={() => {
                      setExpanded((prev) => {
                        const n = new Set(prev);
                        if (n.has(org.id)) n.delete(org.id); else n.add(org.id);
                        return n;
                      });
                    }}
                    className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/org/${org.id}/tasks`} className="text-sm font-medium hover:text-accent transition-colors truncate block">
                      {org.name}
                    </Link>
                    <p className="text-[10px] text-muted-foreground tabular-nums">{orgProjects.length} project{orgProjects.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="relative" style={{ minHeight: 56 }}>
                  {/* Today line */}
                  {todayInWindow && (
                    <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none" style={{ left: `${todayPct * 100}%` }} />
                  )}
                  {/* Tick guide lines */}
                  {ticks.map((t, i) => (
                    <div key={i} className={`absolute top-0 bottom-0 w-px ${t.major ? "bg-border/60" : "bg-border/20"}`} style={{ left: `${t.x * 100}%` }} />
                  ))}
                  {/* Project pills */}
                  <div className="relative py-2 space-y-1.5">
                    {orgProjects.map((p) => {
                      const range = getProjectRange(p);
                      if (!range) return null;
                      const startPct = dateToPct(range.start);
                      const endPct = dateToPct(range.end);
                      const visible = !(range.end < windowStart || range.start > windowEnd);
                      if (!visible) return null;
                      const left = startPct * 100;
                      const width = Math.max((endPct - startPct) * 100, 2);
                      const engineColor = ENGINE_COLOR[p.engine ?? ""] ?? "bg-slate-500";
                      const isCompleted = p.status === "completed";
                      const isDraft = p.status === "draft";
                      const draggable = !isCompleted;
                      return (
                        <div
                          key={p.id}
                          className="relative h-7"
                          title={`${p.name} · ${fmtShort(range.start)} → ${fmtShort(range.end)}${isCompleted ? " (completed)" : ""}`}
                        >
                          <div
                            onMouseDown={(e) => draggable && beginDrag(e, p, "move")}
                            className={`absolute top-0 h-7 rounded-md text-[11px] text-white font-medium flex items-center px-2 select-none overflow-hidden whitespace-nowrap shadow-sm ${
                              isCompleted ? "bg-muted text-muted-foreground cursor-not-allowed" :
                              isDraft ? `bg-transparent border-2 border-dashed text-foreground ${engineColor.replace("bg-", "border-")}` :
                              `${engineColor} cursor-grab active:cursor-grabbing`
                            }`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            {/* Resize handles */}
                            {draggable && (
                              <>
                                <div
                                  onMouseDown={(e) => beginDrag(e, p, "resize-start")}
                                  className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/20"
                                />
                                <div
                                  onMouseDown={(e) => beginDrag(e, p, "resize-end")}
                                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-black/20"
                                />
                              </>
                            )}
                            <span className="truncate pointer-events-none">{p.name}</span>
                          </div>
                        </div>
                      );
                    })}
                    {isExpanded && orgProjects.map((p) => {
                      const ptasks = tasks.filter((t) => t.project_id === p.id);
                      if (ptasks.length === 0) return null;
                      return (
                        <div key={`tasks-${p.id}`} className="relative h-5 mt-1">
                          {ptasks.map((t) => {
                            const dueStr = t.due_date || t.suggested_due_date;
                            if (!dueStr) return null;
                            const d = startOfDay(new Date(dueStr));
                            const pct = dateToPct(d);
                            if (d < windowStart || d > windowEnd) return null;
                            const dotColor =
                              t.status === "completed" ? "bg-accent" :
                              t.status === "overdue" ? "bg-red-500" :
                              "bg-muted-foreground";
                            return (
                              <div
                                key={t.id}
                                className={`absolute top-1.5 h-2 w-2 rounded-full ${dotColor} ring-2 ring-background`}
                                style={{ left: `calc(${pct * 100}% - 4px)` }}
                                title={`${t.title} · due ${fmtShort(d)} · ${t.status}`}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        Tip: Drag the middle of a pill to shift the whole project. Drag the left/right edges to adjust release or completion dates. Completed projects are locked.
      </p>
    </AppShell>
  );
}
