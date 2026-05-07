export const REQUIREMENT_TYPES = [
  { key: "background_check", label: "Background Check" },
  { key: "fingerprinting", label: "Fingerprinting" },
  { key: "concussion_training", label: "Concussion" },
  { key: "abuse_prevention_training", label: "Abuse Prev." },
  { key: "handbook_acknowledgment", label: "Handbook" },
  { key: "other", label: "Other" },
] as const;

export const ROLE_TYPES = ["coach", "staff", "admin", "director"] as const;
export const EMPLOYMENT_TYPES = ["employee", "contractor", "volunteer"] as const;

export const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  complete: "Complete",
  expired: "Expired",
  waived: "Waived",
  overdue: "Overdue",
  compliant: "Compliant",
};

export function statusIcon(status: string, overdue?: boolean): string {
  if (overdue) return "⏰";
  switch (status) {
    case "complete": return "✅";
    case "submitted": return "📤";
    case "in_progress": return "🔄";
    case "waived": return "➖";
    case "expired": return "⚠️";
    default: return "⬜";
  }
}

export function statusPillClass(status: string): string {
  switch (status) {
    case "compliant":
    case "complete":
      return "bg-emerald-100 text-emerald-700";
    case "overdue":
    case "expired":
      return "bg-rose-100 text-rose-700";
    case "in_progress":
    case "submitted":
      return "bg-amber-100 text-amber-700";
    case "waived":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function isOverdue(item: { due_date?: string | null; status: string }): boolean {
  if (!item.due_date) return false;
  if (["complete", "waived", "submitted"].includes(item.status)) return false;
  return item.due_date < new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export async function generateComplianceItemsForStaff(
  supabase: any,
  staff: { id: string; role_type: string },
  acquisition: { id: string; state?: string | null; close_date?: string | null },
  userId?: string,
) {
  const { data: tpls } = await supabase
    .from("compliance_requirement_templates")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  const today = new Date().toISOString().slice(0, 10);
  const rows: any[] = [];
  for (const t of tpls ?? []) {
    if (t.state_filter && t.state_filter !== acquisition.state) continue;
    if (t.applies_to_role_types?.length && !t.applies_to_role_types.includes(staff.role_type)) continue;
    const baseDate = acquisition.close_date ?? today;
    rows.push({
      acquisition_id: acquisition.id,
      staff_id: staff.id,
      requirement_type: t.requirement_type,
      requirement_name: t.requirement_name,
      status: "not_started",
      due_date: addDays(baseDate, t.default_days_to_complete ?? 30),
      expiration_date: t.expires_after_years ? addYears(today, t.expires_after_years) : null,
      created_by: userId ?? null,
    });
  }
  if (rows.length) {
    await supabase.from("acquisition_compliance_items").insert(rows);
  }
  return rows.length;
}
