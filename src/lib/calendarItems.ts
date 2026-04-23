// Round 10 — System calendar item definitions and generator
// Spawned per-season when a season is created.

export type CalendarItemSpec = {
  system_code: string;
  title: string;
  description: string;
  phase: "pre_season" | "in_season" | "post_season";
  timing_type: "relative" | "recurring" | "manual";
  timing_anchor?: "tryout_date" | "season_start" | "season_end" | "re_enrollment_deadline";
  timing_offset_days?: number;
  timing_direction?: "before" | "after";
  timing_note?: string;
  recurrence_frequency?: "weekly" | "monthly";
  recurrence_day?: string;
  recurrence_note?: string;
  stakeholder: "parents" | "coaches" | "admin" | "players";
  ai_communication_type?: string;
  requires_tryouts?: boolean;
  is_non_negotiable?: boolean;
};

export const PRE_SEASON_ITEMS: CalendarItemSpec[] = [
  {
    system_code: "PRE-01",
    title: "Tryout Announcement",
    description: "Announces open tryouts. Covers dates, location, age groups, how to sign up, what to bring.",
    phase: "pre_season",
    timing_type: "relative",
    timing_anchor: "tryout_date",
    timing_offset_days: 56,
    timing_direction: "before",
    stakeholder: "parents",
    ai_communication_type: "Tryout announcement",
    requires_tryouts: true,
  },
  {
    system_code: "PRE-02",
    title: "Tryout Reminder",
    description: "Confirms tryout details. Date, time, address, parking, what to wear, arrival time.",
    phase: "pre_season",
    timing_type: "relative",
    timing_anchor: "tryout_date",
    timing_offset_days: 3,
    timing_direction: "before",
    stakeholder: "parents",
    ai_communication_type: "Tryout reminder",
    requires_tryouts: true,
  },
  {
    system_code: "PRE-03",
    title: "Tryout Result — Accepted",
    description: "Offer of roster spot. Team selected for, qualities observed, confirmation deadline, next steps.",
    phase: "pre_season",
    timing_type: "manual",
    timing_note: "Send within 48 hours of tryout",
    stakeholder: "parents",
    ai_communication_type: "Tryout result — accepted",
    requires_tryouts: true,
  },
  {
    system_code: "PRE-04",
    title: "Tryout Result — Not Selected",
    description: "Professional, specific, and kind decline. Offer of development feedback.",
    phase: "pre_season",
    timing_type: "manual",
    timing_note: "Send within 48 hours of tryout",
    stakeholder: "parents",
    ai_communication_type: "Tryout result — not selected",
    requires_tryouts: true,
  },
  {
    system_code: "PRE-05",
    title: "Season Welcome",
    description: "First practice details, roster, coaching staff, what to bring, communication expectations.",
    phase: "pre_season",
    timing_type: "relative",
    timing_anchor: "season_start",
    timing_offset_days: 14,
    timing_direction: "before",
    stakeholder: "parents",
    ai_communication_type: "Season kickoff letter",
  },
  {
    system_code: "PRE-06",
    title: "New Coach Onboarding",
    description: "Background check link, platform access, team roster, first practice, non-negotiables.",
    phase: "pre_season",
    timing_type: "manual",
    stakeholder: "coaches",
    ai_communication_type: "New coach onboarding",
  },
  {
    system_code: "PRE-07",
    title: "Season Kickoff — Staff Message",
    description: "Background check status, weekly check-in process, template access, season non-negotiables.",
    phase: "pre_season",
    timing_type: "relative",
    timing_anchor: "season_start",
    timing_offset_days: 7,
    timing_direction: "before",
    stakeholder: "coaches",
    ai_communication_type: "Season expectations letter",
  },
  {
    system_code: "PRE-08",
    title: "Initial Sponsor Outreach",
    description: "Org intro, sponsorship opportunity, suggested package range, call request.",
    phase: "pre_season",
    timing_type: "relative",
    timing_anchor: "season_start",
    timing_offset_days: 42,
    timing_direction: "before",
    stakeholder: "admin",
    ai_communication_type: "Initial outreach",
  },
];

export const IN_SEASON_ITEMS: CalendarItemSpec[] = [
  {
    system_code: "IN-01",
    title: "Weekly Team Update",
    description: "Schedule, team focus for the week, one coach note. Every Thursday.",
    phase: "in_season",
    timing_type: "recurring",
    recurrence_frequency: "weekly",
    recurrence_day: "thursday",
    recurrence_note: "Every Thursday during the season — no exceptions",
    stakeholder: "parents",
    ai_communication_type: "Weekly team update",
    is_non_negotiable: true,
  },
  {
    system_code: "IN-02",
    title: "Schedule Change",
    description: "What changed, new details, brief reason, whether any action needed.",
    phase: "in_season",
    timing_type: "manual",
    stakeholder: "parents",
    ai_communication_type: "Schedule change or cancellation",
  },
  {
    system_code: "IN-03",
    title: "Cancellation Notice",
    description: "What is cancelled, reason, make-up plan or when families will hear next.",
    phase: "in_season",
    timing_type: "manual",
    stakeholder: "parents",
    ai_communication_type: "Schedule change or cancellation",
  },
  {
    system_code: "IN-05",
    title: "Tournament Logistics",
    description: "Full schedule, venue, parking, hotel if applicable, what to bring, meeting point.",
    phase: "in_season",
    timing_type: "manual",
    stakeholder: "parents",
    ai_communication_type: "Tournament announcement",
  },
  {
    system_code: "IN-06",
    title: "Coach Weekly Check-In",
    description: "Team status, open parent concerns, player development flags. Every Friday.",
    phase: "in_season",
    timing_type: "recurring",
    recurrence_frequency: "weekly",
    recurrence_day: "friday",
    recurrence_note: "Every Friday during the season — coaches submit to director",
    stakeholder: "admin",
    ai_communication_type: "Weekly expectation reminder",
    is_non_negotiable: true,
  },
  {
    system_code: "IN-07",
    title: "Sponsor Follow-Up",
    description: "One follow-up if initial outreach unanswered at one week. Sent once only.",
    phase: "in_season",
    timing_type: "manual",
    stakeholder: "admin",
    ai_communication_type: "Follow-up",
  },
  {
    system_code: "IN-08",
    title: "Sponsor Meeting Confirmation",
    description: "Confirmed date, time, link, three agenda points, reschedule option.",
    phase: "in_season",
    timing_type: "manual",
    stakeholder: "admin",
    ai_communication_type: "Follow-up",
  },
  {
    system_code: "IN-09",
    title: "Post-Meeting Sponsor Follow-Up",
    description: "Personal note, package recommendation, investment amount, agreement timeline.",
    phase: "in_season",
    timing_type: "manual",
    timing_note: "Send within 24 hours of meeting — delay kills momentum",
    stakeholder: "admin",
    ai_communication_type: "Follow-up",
  },
  {
    system_code: "IN-10",
    title: "Urgent Issue Escalation",
    description: "Factual description, current status, specific ask from director.",
    phase: "in_season",
    timing_type: "manual",
    stakeholder: "admin",
    ai_communication_type: "Accountability follow-up",
  },
];

export const POST_SEASON_ITEMS: CalendarItemSpec[] = [
  {
    system_code: "POST-01",
    title: "Debrief Request to Coaches",
    description: "Final dev notes, roster retention feedback, three reflection questions.",
    phase: "post_season",
    timing_type: "manual",
    timing_note: "Send final week of season",
    stakeholder: "coaches",
    ai_communication_type: "End of season debrief request",
  },
  {
    system_code: "POST-03",
    title: "Re-Enrollment Outreach",
    description: "Player development lead, re-enrollment invitation, confirmation deadline.",
    phase: "post_season",
    timing_type: "relative",
    timing_anchor: "season_end",
    timing_offset_days: 21,
    timing_direction: "after",
    stakeholder: "parents",
    ai_communication_type: "Re-enrollment outreach",
    is_non_negotiable: true,
  },
  {
    system_code: "POST-04",
    title: "Re-Enrollment Reminder",
    description: "Warm reminder, clear deadline, no pressure, direct reply option.",
    phase: "post_season",
    timing_type: "relative",
    timing_anchor: "re_enrollment_deadline",
    timing_offset_days: 7,
    timing_direction: "before",
    stakeholder: "parents",
    ai_communication_type: "Re-enrollment outreach",
  },
  {
    system_code: "POST-05",
    title: "Sponsor Deal Closed — Welcome",
    description: "Thank you, next steps for logo and features, director as contact.",
    phase: "post_season",
    timing_type: "manual",
    timing_note: "Send within 24 hours of signing",
    stakeholder: "admin",
    ai_communication_type: "Thank you and renewal",
  },
  {
    system_code: "POST-06",
    title: "Sponsor Renewal Outreach",
    description: "Season highlights, early renewal offer, what is new next season.",
    phase: "post_season",
    timing_type: "relative",
    timing_anchor: "season_end",
    timing_offset_days: 42,
    timing_direction: "after",
    stakeholder: "admin",
    ai_communication_type: "Renewal campaign",
  },
  {
    system_code: "POST-07",
    title: "Off-Season Programme Announcement",
    description: "Development need first, then programme. References player reports where possible.",
    phase: "post_season",
    timing_type: "relative",
    timing_anchor: "season_end",
    timing_offset_days: 35,
    timing_direction: "after",
    stakeholder: "parents",
    ai_communication_type: "New program or service announcement",
  },
  {
    system_code: "POST-08",
    title: "New Season Announcement",
    description: "Tryout dates, age groups, what is new, how to register interest.",
    phase: "post_season",
    timing_type: "relative",
    timing_anchor: "season_end",
    timing_offset_days: 63,
    timing_direction: "after",
    stakeholder: "parents",
    ai_communication_type: "Tournament announcement",
  },
];

export const ALL_SYSTEM_ITEMS: CalendarItemSpec[] = [
  ...PRE_SEASON_ITEMS,
  ...IN_SEASON_ITEMS,
  ...POST_SEASON_ITEMS,
];

export type SeasonAnchors = {
  tryout_date: string | null;
  season_start_date: string;
  season_end_date: string;
  re_enrollment_deadline: string | null;
  has_tryouts: boolean;
};

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculate due date for a relative item, or null if anchor not yet set.
 */
export function calcDueDate(spec: CalendarItemSpec, anchors: SeasonAnchors): string | null {
  if (spec.timing_type !== "relative" || !spec.timing_anchor) return null;
  const anchorVal =
    spec.timing_anchor === "tryout_date" ? anchors.tryout_date :
    spec.timing_anchor === "season_start" ? anchors.season_start_date :
    spec.timing_anchor === "season_end" ? anchors.season_end_date :
    spec.timing_anchor === "re_enrollment_deadline" ? anchors.re_enrollment_deadline :
    null;
  if (!anchorVal) return null;
  const offset = (spec.timing_offset_days ?? 0) * (spec.timing_direction === "before" ? -1 : 1);
  return addDaysISO(anchorVal, offset);
}

/**
 * Build the rows to insert for a newly-created season.
 * Skips tryout items if has_tryouts=false.
 * Sets is_tbd=true when an anchor is missing.
 */
export function buildItemsForSeason(opts: {
  org_id: string;
  season_id: string;
  track: "youth" | "hs";
  anchors: SeasonAnchors;
  created_by: string;
}) {
  const { org_id, season_id, track, anchors, created_by } = opts;

  const applicable = ALL_SYSTEM_ITEMS.filter((spec) => {
    if (spec.requires_tryouts && !anchors.has_tryouts) return false;
    return true;
  });

  return applicable.map((spec) => {
    const due = calcDueDate(spec, anchors);
    const needsAnchor = spec.timing_type === "relative" && !due;
    return {
      org_id,
      season_id,
      track,
      system_code: spec.system_code,
      title: spec.title,
      description: spec.description,
      phase: spec.phase,
      timing_type: spec.timing_type,
      timing_anchor: spec.timing_anchor ?? null,
      timing_offset_days: spec.timing_offset_days ?? null,
      timing_direction: spec.timing_direction ?? null,
      timing_note: spec.timing_note ?? null,
      recurrence_frequency: spec.recurrence_frequency ?? null,
      recurrence_day: spec.recurrence_day ?? null,
      recurrence_note: spec.recurrence_note ?? null,
      calculated_due_date: due,
      is_tbd: needsAnchor,
      stakeholder: spec.stakeholder,
      ai_communication_type: spec.ai_communication_type ?? null,
      is_system_item: true,
      is_custom: false,
      is_non_negotiable: !!spec.is_non_negotiable,
      created_by,
    };
  });
}

export function suggestSeasonName(date = new Date()): string {
  const m = date.getMonth(); // 0-11
  const y = date.getFullYear();
  if (m >= 7 && m <= 10) return `Fall ${y}`;
  if (m === 11 || m <= 2) return `Spring ${m === 11 ? y + 1 : y}`;
  return `Summer ${y}`;
}

export function timingDisplay(item: {
  timing_type: string;
  timing_offset_days: number | null;
  timing_direction: string | null;
  timing_anchor: string | null;
  recurrence_note: string | null;
  recurrence_day: string | null;
  recurrence_frequency: string | null;
  is_tbd: boolean;
  calculated_due_date: string | null;
}): string {
  if (item.timing_type === "recurring") {
    return item.recurrence_note ?? `Every ${item.recurrence_day ?? item.recurrence_frequency}`;
  }
  if (item.timing_type === "manual") return "Send when needed";
  // relative
  const anchorLabel: Record<string, string> = {
    tryout_date: "tryout date",
    season_start: "season start",
    season_end: "season end",
    re_enrollment_deadline: "re-enrollment deadline",
  };
  const days = item.timing_offset_days ?? 0;
  const wks = days % 7 === 0 ? `${days / 7} week${days / 7 === 1 ? "" : "s"}` : `${days} days`;
  return `${wks} ${item.timing_direction} ${anchorLabel[item.timing_anchor ?? ""] ?? "anchor"}`;
}
