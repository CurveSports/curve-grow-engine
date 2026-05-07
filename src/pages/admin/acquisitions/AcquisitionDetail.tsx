import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ArrowLeft } from "lucide-react";
import { PHASES, WORKSTREAMS, workstreamColor, workstreamLabel, phaseLabel, dayOf100 } from "@/lib/acquisitions";
import AddTaskModal from "@/components/acquisitions/AddTaskModal";
import TaskDetailPanel from "@/components/acquisitions/TaskDetailPanel";
import CompliancePanel from "@/components/acquisitions/CompliancePanel";
import DocumentsPanel from "@/components/acquisitions/DocumentsPanel";
import BudgetPanel from "@/components/acquisitions/BudgetPanel";
import CommunicationsPanel from "@/components/acquisitions/CommunicationsPanel";
import SentimentPanel from "@/components/acquisitions/SentimentPanel";
import RollUpPanel from "@/components/acquisitions/RollUpPanel";
import { toast } from "sonner";

type DealView = "timeline" | "workstream" | "compliance" | "documents" | "budget" | "communications" | "sentiment" | "rollup";

export default function AcquisitionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stateTaskCount, setStateTaskCount] = useState(0);
  const initialView = sp.get("tab") === "compliance" ? "compliance" : sp.get("tab") === "workstream" ? "workstream" : "timeline";
  const [view, setView] = useState<"timeline" | "workstream" | "compliance">(initialView);
  const [addOpen, setAddOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("acquisition_projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("acquisition_tasks").select("*").eq("acquisition_id", id).order("display_order"),
    ]);
    setProject(p); setTasks(t ?? []);
    if (p?.state) {
      const { data: stateTpls } = await supabase
        .from("acquisition_task_templates").select("id").eq("state_filter", p.state);
      const ids = new Set((stateTpls ?? []).map((x: any) => x.id));
      setStateTaskCount((t ?? []).filter((x: any) => x.template_id && ids.has(x.template_id)).length);
    } else { setStateTaskCount(0); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading || !project) {
    return <AppShell title="Acquisition"><div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div></AppShell>;
  }

  const day = dayOf100(project.close_date);
  const today = new Date().toISOString().slice(0, 10);

  const tasksByPhase = (phase: string) => tasks.filter((t) => t.phase === phase && t.workstream !== "value_creation");
  const valueTasks = tasks.filter((t) => t.workstream === "value_creation");
  const tasksByWorkstream = (ws: string) => tasks.filter((t) => t.workstream === ws);

  return (
    <AppShell title={project.club_name}>
      <div className="max-w-7xl mx-auto space-y-5">
        <button onClick={() => nav("/admin/acquisitions")} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> All acquisitions
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">
              {project.club_name}
              {project.codename && <span className="text-muted-foreground font-normal text-xl ml-3">— {project.codename}</span>}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">{phaseLabel(project.phase)}</span>
              {day != null && <span className="text-muted-foreground">Day {day} of 100</span>}
              <span className="text-muted-foreground">Overall {Number(project.completion_pct).toFixed(0)}% complete</span>
              {project.state && (
                <span className="text-muted-foreground">
                  State: <span className="text-foreground font-medium">{project.state}</span>
                  {stateTaskCount > 0 && (
                    <button
                      onClick={() => { setView("workstream"); setTimeout(() => document.getElementById("ws-compliance")?.scrollIntoView({ behavior: "smooth" }), 50); }}
                      className="ml-1.5 inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
                      title="View state-specific compliance tasks"
                    >
                      🔒 {stateTaskCount} state-specific compliance task{stateTaskCount === 1 ? "" : "s"}
                    </button>
                  )}
                </span>
              )}
            </div>
          </div>
          {view !== "compliance" && (
            <Button onClick={() => setAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1.5" /> Add Task
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ToggleBtn active={view === "timeline"} onClick={() => { setView("timeline"); setSp({}); }}>Timeline View</ToggleBtn>
          <ToggleBtn active={view === "workstream"} onClick={() => { setView("workstream"); setSp({ tab: "workstream" }); }}>Workstream View</ToggleBtn>
          <ToggleBtn active={view === "compliance"} onClick={() => { setView("compliance"); setSp({ tab: "compliance" }); }}>Compliance</ToggleBtn>
        </div>

        {view === "compliance" ? (
          <CompliancePanel acquisition={project} />
        ) : view === "timeline" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {PHASES.map((p) => {
              const phaseTasks = tasksByPhase(p.key);
              const done = phaseTasks.filter((t) => t.status === "done").length;
              return (
                <PhaseColumn key={p.key} title={p.label} tasks={phaseTasks} done={done} total={phaseTasks.length} today={today} onClick={setActiveTaskId} />
              );
            })}
            <PhaseColumn title="Value Creation" tasks={valueTasks} done={valueTasks.filter((t) => t.status === "done").length} total={valueTasks.length} today={today} onClick={setActiveTaskId} />
          </div>
        ) : (
          <div className="space-y-3">
            {[...WORKSTREAMS].sort((a, b) => {
              const ap = Number(project[`${a.key === "hr_culture" ? "hr_culture" : a.key}_pct`] ?? 0);
              const bp = Number(project[`${b.key === "hr_culture" ? "hr_culture" : b.key}_pct`] ?? 0);
              return ap - bp;
            }).map((w) => {
              const wsTasks = tasksByWorkstream(w.key);
              const done = wsTasks.filter((t) => t.status === "done").length;
              const pct = wsTasks.length ? Math.round((done / wsTasks.length) * 100) : 0;
              return (
                <details key={w.key} id={`ws-${w.key}`} className="curve-card" open={w.key === "compliance" && stateTaskCount > 0}>
                  <summary className="cursor-pointer flex items-center gap-3">
                    <div className="h-3 w-3 rounded-sm" style={{ background: w.color }} />
                    <span className="font-semibold flex-1">{w.label}</span>
                    <span className="text-sm text-muted-foreground">{done} / {wsTasks.length} · {pct}%</span>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {wsTasks.length === 0 && <p className="text-sm text-muted-foreground italic">No tasks in this workstream.</p>}
                    {wsTasks.map((t) => <TaskCard key={t.id} task={t} today={today} onClick={() => setActiveTaskId(t.id)} />)}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      <AddTaskModal open={addOpen} onOpenChange={setAddOpen} acquisitionId={project.id} onAdded={load} />
      {activeTaskId && (
        <TaskDetailPanel
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onChanged={load}
        />
      )}
    </AppShell>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-3 py-1.5 text-sm font-semibold rounded-md border ${active ? "bg-emerald-600 text-white border-emerald-600" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>{children}</button>;
}

function PhaseColumn({ title, tasks, done, total, today, onClick }: { title: string; tasks: any[]; done: number; total: number; today: string; onClick: (id: string) => void }) {
  return (
    <div className="rounded-xl bg-muted/30 p-3 min-h-[200px]">
      <div className="mb-3">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-[11px] text-muted-foreground">{done} / {total} done</p>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-xs text-muted-foreground italic">No tasks.</p>}
        {tasks.map((t) => <TaskCard key={t.id} task={t} today={today} onClick={() => onClick(t.id)} />)}
      </div>
    </div>
  );
}

function TaskCard({ task, today, onClick }: { task: any; today: string; onClick: () => void }) {
  const overdue = task.target_date && task.target_date < today && task.status !== "done" && task.status !== "blocked";
  const bg = task.status === "done" ? "bg-emerald-50" : task.status === "blocked" ? "bg-rose-50 border-rose-300" : overdue ? "bg-amber-50" : "bg-card";
  return (
    <button onClick={onClick} className={`relative w-full text-left rounded-md border p-2.5 text-xs hover:shadow-sm transition-shadow ${bg}`}>
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md" style={{ background: workstreamColor(task.workstream) }} />
      <p className="font-semibold text-[13px] leading-snug pl-1.5">{task.title}</p>
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pl-1.5">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ background: workstreamColor(task.workstream) }}>{workstreamLabel(task.workstream)}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
          task.status === "done" ? "bg-emerald-200 text-emerald-800" :
          task.status === "blocked" ? "bg-rose-200 text-rose-800" :
          task.status === "started" ? "bg-amber-200 text-amber-800" : "bg-muted text-muted-foreground"
        }`}>{task.status}</span>
        {task.priority && <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted">{task.priority}</span>}
      </div>
      {task.lead_person_name && <p className="text-[11px] text-muted-foreground mt-1 pl-1.5">Lead: {task.lead_person_name}</p>}
      {task.target_date && <p className={`text-[11px] mt-0.5 pl-1.5 ${overdue ? "text-rose-600 font-semibold" : "text-muted-foreground"}`}>Due {task.target_date}</p>}
    </button>
  );
}
