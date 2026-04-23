// Helpers specific to the org-facing sponsorship view.
import type { Stage } from "./sponsorship";

export const WARM_REASON_OPTIONS = [
  "Current family or parent in our program",
  "Former family or alumni connection",
  "Personal friend or acquaintance",
  "Existing business relationship",
  "Attended one of our events",
  "Previously expressed interest",
  "Board member or advisor connection",
  "Referred by someone in our network",
  "Community partner",
] as const;

export const BUSINESS_TYPE_OPTIONS = [
  "Restaurant / Bar",
  "Auto Dealer",
  "Retail Store",
  "Healthcare",
  "Real Estate",
  "Financial Services",
  "Construction",
  "Sports / Fitness",
  "Food & Beverage",
  "Professional Services",
] as const;

// Plain-English stage labels mirror the SQL function for client-side rendering safety.
export const STAGE_SIMPLIFIED: Record<Stage, string> = {
  new_lead: "Submitted — awaiting outreach",
  contacted: "DSF team has reached out",
  responded: "In conversation",
  meeting_scheduled: "Meeting scheduled",
  proposal_sent: "Proposal delivered",
  negotiating: "In final discussions",
  closed_won: "Partnership secured",
  closed_lost: "Not pursued",
};

export type OrgLeadView = {
  id: string;
  business_name: string;
  contact_name: string | null;
  business_type: string | null;
  city_state: string | null;
  source: string;
  is_warm: boolean;
  warm_reasons: string[];
  warm_notes: string | null;
  stage: Stage;
  stage_simplified: string;
  sponsorship_tier: string | null;
  closed_value: number | null;
  closed_at: string | null;
  submitted_at: string;
  last_stage_change_at: string;
  assigned_rep_name: string | null;
  client_notes: { note_text: string; created_at: string; author_name: string | null }[] | null;
};

export const IN_PROGRESS_STAGES: Stage[] = [
  "new_lead",
  "contacted",
  "responded",
  "meeting_scheduled",
  "proposal_sent",
  "negotiating",
];

export function isOrgSubmitted(source: string): boolean {
  return source === "org_warm" || source === "org_cold";
}

// Browser feature detection for Contact Picker API
export function supportsContactPicker(): boolean {
  if (typeof navigator === "undefined") return false;
  // @ts-expect-error - non-standard API
  return !!navigator.contacts && typeof navigator.contacts.select === "function";
}
