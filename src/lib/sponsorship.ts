// Shared types, constants, and helpers for the Sponsorship Pipeline.

export const STAGES = [
  "new_lead",
  "contacted",
  "responded",
  "meeting_scheduled",
  "proposal_sent",
  "negotiating",
  "closed_won",
  "closed_lost",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  responded: "Responded",
  meeting_scheduled: "Meeting Scheduled",
  proposal_sent: "Proposal Sent",
  negotiating: "Negotiating",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

// Pill color classes per stage (semantic tokens only).
export const STAGE_PILL: Record<Stage, string> = {
  new_lead: "bg-secondary text-foreground border-border",
  contacted: "bg-info-soft text-info border-info/30",
  responded: "bg-info-soft text-info border-info/30",
  meeting_scheduled: "bg-accent-soft text-accent border-accent/30",
  proposal_sent: "bg-accent-soft text-accent border-accent/30",
  negotiating: "bg-warning-soft text-warning border-warning/30",
  closed_won: "bg-health-soft text-health border-health/30",
  closed_lost: "bg-destructive/10 text-destructive border-destructive/30",
};

export const SOURCES = [
  "org_warm",
  "org_cold",
  "dsf_outreach",
  "referral",
  "inbound",
  "other",
] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  org_warm: "Org — Warm",
  org_cold: "Org — Cold",
  dsf_outreach: "DSF Outreach",
  referral: "Referral",
  inbound: "Inbound",
  other: "Other",
};

export const SOURCE_PILL: Record<Source, string> = {
  org_warm: "bg-health-soft text-health border-health/30",
  org_cold: "bg-info-soft text-info border-info/30",
  dsf_outreach: "bg-accent-soft text-accent border-accent/30",
  referral: "bg-info-soft text-info border-info/30",
  inbound: "bg-warning-soft text-warning border-warning/30",
  other: "bg-muted text-muted-foreground border-border",
};

export const TIERS = ["Presenting", "Supporting", "Community"] as const;
export type Tier = (typeof TIERS)[number];

export type SponsorshipLead = {
  id: string;
  org_id: string;
  business_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_type: string | null;
  city_state: string | null;
  source: Source;
  source_other: string | null;
  is_warm: boolean;
  warm_flagged_by_org: boolean;
  warm_flagged_by_dsf: boolean;
  warm_notes: string | null;
  stage: Stage;
  sponsorship_tier: Tier | null;
  proposed_value: number | null;
  closed_value: number | null;
  assigned_to: string | null;
  submitted_at: string;
  last_stage_change_at: string;
  closed_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function daysBetween(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export function staleClass(days: number): string {
  if (days > 30) return "text-destructive font-semibold";
  if (days > 14) return "text-warning font-semibold";
  return "text-muted-foreground";
}

// Lightweight confetti — no dependencies. Spawns absolutely-positioned divs
// at viewport center and animates them outward, then cleans up.
export function fireConfetti() {
  if (typeof document === "undefined") return;
  const colors = ["hsl(var(--health))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--info))"];
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.pointerEvents = "none";
  root.style.zIndex = "9999";
  document.body.appendChild(root);
  const N = 80;
  for (let i = 0; i < N; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 6;
    p.style.position = "absolute";
    p.style.left = "50%";
    p.style.top = "40%";
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.background = colors[i % colors.length];
    p.style.borderRadius = Math.random() > 0.5 ? "2px" : "50%";
    p.style.transform = "translate(-50%,-50%)";
    p.style.opacity = "1";
    p.style.transition = "transform 1200ms cubic-bezier(0.2,0.8,0.2,1), opacity 1200ms";
    root.appendChild(p);
    requestAnimationFrame(() => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 + Math.random() * 300;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist + 200;
      const rot = Math.random() * 720 - 360;
      p.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg)`;
      p.style.opacity = "0";
    });
  }
  setTimeout(() => root.remove(), 1500);
}
