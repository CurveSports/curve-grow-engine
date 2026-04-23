export const ENGINES = [
  "Pricing", "Sponsorship", "Apparel", "Events", "Add-Ons",
  "Retention", "Facility", "Affiliate",
  "Platform", "Marketing",
  "Operations",
] as const;
export type Engine = typeof ENGINES[number];

/** Engines whose tasks/projects are auto-created for every org regardless of score. */
export const UNIVERSAL_ENGINES: readonly Engine[] = ["Platform", "Marketing"] as const;

/** Revenue engines whose scores feed the monetization tier. */
export const REVENUE_ENGINES: readonly Engine[] = [
  "Pricing", "Sponsorship", "Apparel", "Events", "Add-Ons", "Retention", "Facility", "Affiliate",
] as const;

export const TASK_OWNER_TYPES = ["curve_team", "org_user", "third_party", "combo"] as const;
export type TaskOwnerType = typeof TASK_OWNER_TYPES[number];

export const OWNER_LABEL: Record<TaskOwnerType, string> = {
  curve_team: "Curve Team",
  org_user: "Org User",
  third_party: "Third Party",
  combo: "Combo",
};

export const OWNER_STYLE: Record<TaskOwnerType, string> = {
  curve_team: "bg-info-soft text-info border-info/30",
  org_user: "bg-accent-soft text-accent border-accent/30",
  third_party: "bg-secondary text-foreground/70 border-border",
  combo: "bg-combo-soft text-combo border-combo/30",
};

export const OWNER_HELP: Record<TaskOwnerType, string> = {
  curve_team: "Curve staff are responsible for completing this task",
  org_user: "The organization is responsible for completing this task",
  third_party: "An external partner or vendor completes this — track status only",
  combo: "Both Curve team and org user are involved in completing this task",
};

export const TASK_TYPES = ["Strategy", "Execute", "Communication", "Track"] as const;
export type TaskType = typeof TASK_TYPES[number];

export const TASK_STATUSES = ["not_started", "in_progress", "completed", "overdue"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

export const TASK_PRIORITIES = ["high", "medium", "low"] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  overdue: "Overdue",
};

export const STATUS_STYLE: Record<TaskStatus, string> = {
  not_started: "bg-secondary text-foreground/70 border-border",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-accent-soft text-accent border-accent/30",
  overdue: "bg-red-50 text-red-700 border-red-200",
};

export const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-secondary text-foreground/70 border-border",
};

export const ENGINE_SCORE_FIELD: Record<string, string> = {
  Pricing: "pricing_score",
  Sponsorship: "sponsorship_score",
  Apparel: "apparel_score",
  Events: "event_score",
  "Add-Ons": "addon_score",
  Retention: "retention_score",
  Facility: "facility_score",
};

export type PlanStatus = "draft" | "active" | "parked";

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "Draft",
  active: "Active",
  parked: "Parked",
};

export const PLAN_STATUS_STYLE: Record<PlanStatus, string> = {
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-accent-soft text-accent border-accent/30",
  parked: "bg-secondary text-foreground/60 border-border",
};

export type TaskSource = "system" | "library" | "custom";

export const TASK_SOURCE_LABEL: Record<TaskSource, string> = {
  system: "Recommended",
  library: "From Library",
  custom: "Custom",
};

export const TASK_SOURCE_STYLE: Record<TaskSource, string> = {
  system: "bg-info-soft text-info border-info/30",
  library: "bg-accent-soft text-accent border-accent/30",
  custom: "bg-secondary text-foreground/70 border-border",
};

export type OrgTask = {
  id: string;
  org_id: string;
  template_id: string | null;
  title: string;
  description: string;
  engine: Engine;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  plan_status: PlanStatus;
  source: TaskSource;
  owner_type: TaskOwnerType;
  project_id: string | null;
  suggested_due_date: string | null;
  due_date: string | null;
  assigned_by: string | null;
  created_at: string;
  last_activity_at: string;
  completed_at: string | null;
  completed_by: string | null;
};

export type TaskNote = {
  id: string;
  task_id: string;
  note_text: string;
  created_by: string;
  created_at: string;
};

export type TaskActivity = {
  id: string;
  task_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  created_at: string;
};

export type TaskTemplate = {
  id: string;
  title: string;
  description: string;
  engine: Engine;
  task_type: TaskType;
  owner_type: TaskOwnerType;
  display_order: number;
  suggested_days_to_complete: number;
  is_system_template: boolean;
  created_by: string | null;
  created_at: string;
};

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function groupByEngine<T extends { engine: string }>(items: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) {
    (out[it.engine] ||= []).push(it);
  }
  return out;
}
