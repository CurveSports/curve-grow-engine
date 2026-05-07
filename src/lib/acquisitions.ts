export const WORKSTREAMS = [
  { key: "integration", label: "Integration", color: "#3B82F6" },
  { key: "financial", label: "Financial", color: "#14B8A6" },
  { key: "legal", label: "Legal", color: "#8B5CF6" },
  { key: "hr_culture", label: "HR / Culture", color: "#F59E0B" },
  { key: "marketing", label: "Marketing", color: "#F97316" },
  { key: "testing", label: "Testing", color: "#22C55E" },
  { key: "it", label: "IT", color: "#6B7280" },
  { key: "data_assets", label: "Data Assets", color: "#64748B" },
  { key: "compliance", label: "Compliance", color: "#EF4444" },
  { key: "value_creation", label: "Value Creation", color: "#0EA5E9" },
] as const;

export const PHASES = [
  { key: "pre_close", label: "Pre-Close" },
  { key: "closing_day", label: "Closing Day" },
  { key: "first_30", label: "First 30" },
  { key: "first_60", label: "First 60" },
  { key: "first_90", label: "First 90" },
] as const;

export const PHASE_PCT_FIELDS = [
  ["integration_pct", "Integration"],
  ["financial_pct", "Financial"],
  ["legal_pct", "Legal"],
  ["hr_culture_pct", "HR / Culture"],
  ["marketing_pct", "Marketing"],
  ["testing_pct", "Testing"],
  ["it_pct", "IT"],
  ["data_assets_pct", "Data Assets"],
  ["compliance_pct", "Compliance"],
] as const;

export function workstreamColor(key: string) {
  return WORKSTREAMS.find((w) => w.key === key)?.color ?? "#6B7280";
}

export function workstreamLabel(key: string) {
  return WORKSTREAMS.find((w) => w.key === key)?.label ?? key;
}

export function phaseLabel(key: string) {
  return PHASES.find((p) => p.key === key)?.label ?? key.replace(/_/g, " ");
}

export function dayOf100(closeDate: string | null): number | null {
  if (!closeDate) return null;
  const days = Math.floor((Date.now() - new Date(closeDate).getTime()) / 86400000);
  if (days < 0) return null;
  return Math.min(days + 1, 100);
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
  "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland",
  "Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];
