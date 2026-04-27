import { supabase } from "@/integrations/supabase/client";

export const REVENUE_ENGINES = [
  "Pricing", "Sponsorship", "Apparel", "Events", "Add-Ons",
  "Retention", "Facility", "Affiliate", "Other",
] as const;
export type RevenueEngine = typeof REVENUE_ENGINES[number];

export type RevenueShareSummary = {
  org_id: string;
  revenue_baseline: number;
  contract_value: number;
  total_paid_to_date: number;
  total_new_revenue: number;
  recovery_threshold: number;
  revenue_toward_recovery: number;
  investment_recovered_pct: number;
  investment_fully_recovered: boolean;
  revenue_above_threshold: number;
  curve_share_earned: number;
  total_invoiced: number;
  total_collected: number;
  outstanding_balance: number;
  sponsorship_new_revenue: number;
  pricing_new_revenue: number;
  apparel_new_revenue: number;
  events_new_revenue: number;
  addon_new_revenue: number;
  retention_new_revenue: number;
  facility_new_revenue: number;
  affiliate_new_revenue: number;
  other_new_revenue: number;
};

export type RecoveryStatus = "none" | "recovering" | "recovered" | "sharing";

export function recoveryStatus(s: Pick<RevenueShareSummary, "recovery_threshold" | "total_new_revenue" | "curve_share_earned">): RecoveryStatus {
  if (!s.recovery_threshold) return "none";
  if (s.curve_share_earned > 0) return "sharing";
  if (s.total_new_revenue >= s.recovery_threshold) return "recovered";
  return "recovering";
}

export const STATUS_LABEL: Record<RecoveryStatus, string> = {
  none: "No contract",
  recovering: "Recovering",
  recovered: "Recovered",
  sharing: "Sharing",
};

export const STATUS_COLOR: Record<RecoveryStatus, string> = {
  none: "bg-muted text-muted-foreground border-border",
  recovering: "bg-warning-soft text-warning border-warning/30",
  recovered: "bg-health-soft text-health border-health/30",
  sharing: "bg-accent-soft text-accent border-accent/30",
};

export function buildInvoiceNumber(orgName: string, seq: number) {
  const initials = orgName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 4)
    .join("")
    .toUpperCase() || "ORG";
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `INV-${initials}-${ym}-${String(seq).padStart(3, "0")}`;
}

export async function nextInvoiceSeq(orgId: string) {
  const { count } = await supabase
    .from("org_revenue_share_invoices")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);
  return (count ?? 0) + 1;
}

/**
 * Mark sent invoices as overdue when past due date. Cheap idempotent client-side
 * sweep called when admin opens the invoices view.
 */
export async function sweepOverdueInvoices() {
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("org_revenue_share_invoices")
    .update({ status: "overdue" })
    .eq("status", "sent")
    .lt("due_date", today);
}
