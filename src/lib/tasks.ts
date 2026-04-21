export const ENGINES = ["Pricing", "Sponsorship", "Apparel", "Events", "Add-Ons", "Retention", "Facility", "Operations"] as const;
export type Engine = typeof ENGINES[number];

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
