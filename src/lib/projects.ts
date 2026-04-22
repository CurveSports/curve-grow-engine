import type { Engine, OrgTask } from "@/lib/tasks";

export type OrgProjectStatus = "draft" | "active" | "completed";

export type OrgProject = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  engine: Engine | null;
  status: OrgProjectStatus;
  release_date: string | null;
  released_at: string | null;
  released_by: string | null;
  display_order: number;
  auto_created: boolean;
  awaiting_completion_approval: boolean;
  completion_approved_at: string | null;
  completion_approved_by: string | null;
  suggested_next_project_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProjectWithTasks = OrgProject & {
  tasks: OrgTask[];
  taskTotal: number;
  taskComplete: number;
  progressPct: number;
};

export const PROJECT_NAME_SUGGESTIONS = [
  "Foundation",
  "Quick Wins",
  "Sponsorship Launch",
  "Pricing Activation",
  "Apparel Optimization",
  "Event Build",
  "Training Revenue",
  "Retention Plan",
  "Facility Activation",
  "Affiliate Development",
  "Operations Build",
  "Revenue Expansion",
  "Communication Standards",
  "Family Experience",
  "Growth Initiative",
] as const;

export const PROJECT_STATUS_STYLE: Record<OrgProjectStatus, string> = {
  draft: "bg-secondary text-foreground/70 border-border",
  active: "bg-info-soft text-info border-info/30",
  completed: "bg-accent-soft text-accent border-accent/30",
};

export const PROJECT_STATUS_LABEL: Record<OrgProjectStatus, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
};

/** Combine project + tasks into a single derived shape */
export function buildProjectWithTasks(project: OrgProject, allTasks: OrgTask[]): ProjectWithTasks {
  const tasks = allTasks.filter((t) => (t as any).project_id === project.id);
  const taskTotal = tasks.length;
  const taskComplete = tasks.filter((t) => t.status === "completed").length;
  const progressPct = taskTotal > 0 ? Math.round((taskComplete / taskTotal) * 100) : 0;
  return { ...project, tasks, taskTotal, taskComplete, progressPct };
}
