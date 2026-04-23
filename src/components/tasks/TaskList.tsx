import { useEffect, useState } from "react";
import { OrgTask, STATUS_LABEL, STATUS_STYLE, PRIORITY_STYLE, groupByEngine, ENGINES } from "@/lib/tasks";
import { formatDate } from "@/lib/format";
import OwnerPill from "@/components/tasks/OwnerPill";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  tasks: OrgTask[];
  scores?: Record<string, number | null>;
  onSelect: (task: OrgTask) => void;
  /** When true, draft tasks are visually marked. Admin views only. */
  showPlanStatus?: boolean;
  /** When true, render owner pills on each task row. Admin views only. */
  showOwner?: boolean;
}

type AssigneeMap = Record<string, { user_id: string; initial: string; name: string }[]>;

export default function TaskList({ tasks, scores, onSelect, showPlanStatus = false, showOwner = false }: Props) {
  const [assigneesByTask, setAssigneesByTask] = useState<AssigneeMap>({});

  useEffect(() => {
    if (!showOwner || tasks.length === 0) { setAssigneesByTask({}); return; }
    const ids = tasks.map((t) => t.id);
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("org_task_assignees" as any)
        .select("task_id, user_id")
        .in("task_id", ids);
      const userIds = Array.from(new Set(((rows ?? []) as any[]).map((r) => r.user_id)));
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
        : { data: [] as any[] };
      const profMap = new Map<string, { name: string; initial: string }>();
      for (const p of (profs ?? []) as any[]) {
        const name = p.full_name || p.email;
        profMap.set(p.user_id, { name, initial: name.charAt(0).toUpperCase() });
      }
      const map: AssigneeMap = {};
      for (const r of (rows ?? []) as any[]) {
        const info = profMap.get(r.user_id);
        if (!info) continue;
        (map[r.task_id] ||= []).push({ user_id: r.user_id, name: info.name, initial: info.initial });
      }
      if (!cancelled) setAssigneesByTask(map);
    })();
    return () => { cancelled = true; };
  }, [tasks, showOwner]);

  const grouped = groupByEngine(tasks);
  const engineOrder = ENGINES.filter(e => grouped[e]?.length).sort((a, b) => {
    const sa = scores?.[a];
    const sb = scores?.[b];
    // Engines without a score (null/undefined) sort to the end
    const aMissing = sa === null || sa === undefined;
    const bMissing = sb === null || sb === undefined;
    if (aMissing && bMissing) return ENGINES.indexOf(a) - ENGINES.indexOf(b);
    if (aMissing) return 1;
    if (bMissing) return -1;
    if (sa !== sb) return (sa as number) - (sb as number);
    return ENGINES.indexOf(a) - ENGINES.indexOf(b);
  });

  if (engineOrder.length === 0) {
    return <div className="curve-card text-sm text-muted-foreground">No tasks yet.</div>;
  }

  return (
    <div className="space-y-6">
      {engineOrder.map(engine => {
        const list = grouped[engine];
        const completed = list.filter(t => t.status === "completed").length;
        const score = scores?.[engine];
        const draftInGroup = list.filter(t => t.plan_status === "draft").length;
        return (
          <div key={engine} id={`engine-${engine}`} className="curve-card p-0 overflow-hidden scroll-mt-24">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-3">
                <h3 className="font-display font-semibold">{engine}</h3>
                {score !== null && score !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-border tabular-nums">
                    Score {score}/10
                  </span>
                )}
                {showPlanStatus && draftInGroup > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 tabular-nums">
                    {draftInGroup} draft
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{completed} / {list.length} complete</span>
            </div>
            <ul className="divide-y divide-border">
              {list.map(t => {
                const isDraft = showPlanStatus && t.plan_status === "draft";
                const isCurveOwned = t.owner_type === "curve_team";
                const isThirdParty = t.owner_type === "third_party";
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => onSelect(t)}
                      className={`w-full text-left px-5 py-3 hover:bg-secondary/40 transition-colors flex items-center gap-3 ${isDraft ? "bg-amber-50/30" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.task_type}
                          {t.due_date ? ` · Due ${formatDate(t.due_date)}` : ""}
                          {!showOwner && isCurveOwned && " · Managed by your Curve team"}
                          {!showOwner && isThirdParty && " · Tracking (third party)"}
                        </p>
                      </div>
                      {showOwner && (assigneesByTask[t.id]?.length ?? 0) > 0 && (
                        <div className="flex items-center -space-x-1.5" title={assigneesByTask[t.id].map((a) => a.name).join(", ")}>
                          {assigneesByTask[t.id].slice(0, 3).map((a) => (
                            <span
                              key={a.user_id}
                              className="h-5 w-5 rounded-full bg-accent/15 border border-accent/40 text-[10px] font-semibold flex items-center justify-center text-accent"
                            >
                              {a.initial}
                            </span>
                          ))}
                          {assigneesByTask[t.id].length > 3 && (
                            <span className="h-5 w-5 rounded-full bg-secondary border border-border text-[10px] font-semibold flex items-center justify-center text-muted-foreground">
                              +{assigneesByTask[t.id].length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {showOwner && <OwnerPill owner={t.owner_type} size="xs" />}
                      {isDraft && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 uppercase tracking-wider font-medium">Draft</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

