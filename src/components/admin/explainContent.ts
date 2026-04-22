import type { ExplainContent } from "./ExplainDrawer";

type Severity = "Low" | "Medium" | "High";
type Complexity = "Straightforward" | "Moderate" | "Complex";

type Intake = Record<string, any>;
type Metrics = Record<string, any>;

const arr = (v: any): string => Array.isArray(v) ? (v.length ? v.join(", ") : "None selected") : (v ?? "Not provided");

function dimensionMeaning(score: number | null): string {
  if (score === null || score === undefined) return "Score not yet calculated.";
  if (score >= 7) return `${score}/10 — Strong foundation. The org is ready to execute revenue strategies reliably.`;
  if (score >= 4) return `${score}/10 — Some systems exist but inconsistency is a risk. Monitor closely.`;
  return `${score}/10 — Foundational gaps. Revenue recommendations will be hard to execute without addressing the basics first.`;
}

function dimensionAction(score: number | null, low: string, mid: string, high: string): string {
  if (score === null || score === undefined) return "Awaiting calculation.";
  if (score >= 7) return high;
  if (score >= 4) return mid;
  return low;
}

export function operationsHealthExplain(intake: Intake, metrics: Metrics): ExplainContent {
  const score = metrics?.operations_health_score ?? null;
  return {
    metric: "Operations Health",
    currentValue: score !== null ? `${score}/10` : "—",
    drivers: [
      { label: "Operational Structure", value: intake?.operational_structure },
      { label: "Coach Alignment", value: intake?.coach_alignment },
      { label: "Coaching Structure", value: intake?.coaching_structure },
      { label: "Parent Communication", value: arr(intake?.parent_communication) },
    ],
    meaning: dimensionMeaning(score),
    whatToDo: dimensionAction(
      score,
      "Address operations before revenue. Lead kickoff with coach communication standards and an accountability framework.",
      "Run operations and revenue tracks in parallel. Don't wait for perfect — set clear checkpoints.",
      "Execute freely. This org can handle multiple workstreams simultaneously.",
    ),
  };
}

export function marketPositionExplain(intake: Intake, metrics: Metrics): ExplainContent {
  const score = metrics?.market_position_health_score ?? null;
  return {
    metric: "Market Position",
    currentValue: score !== null ? `${score}/10` : "—",
    drivers: [
      { label: "Demand for Organization", value: intake?.demand_for_organization },
      { label: "Local Market Competition", value: intake?.local_market_competition },
      { label: "Current Growth Trend", value: intake?.current_growth_trend },
    ],
    meaning: dimensionMeaning(score),
    whatToDo: dimensionAction(
      score,
      "Lead with retention and internal revenue before external growth strategies. Stabilize before expanding.",
      "Differentiation messaging is important — help them articulate what makes them worth the premium.",
      "Market conditions support aggressive pricing and expansion moves.",
    ),
  };
}

export function programHealthExplain(intake: Intake, metrics: Metrics): ExplainContent {
  const score = metrics?.program_health_score ?? null;
  const retention = intake?.retention_pct;
  return {
    metric: "Program Health",
    currentValue: score !== null ? `${score}/10` : "—",
    drivers: [
      { label: "Player Commitment Level", value: intake?.player_commitment_level },
      { label: "Typical Participation", value: intake?.typical_player_participation },
      { label: "Retention %", value: retention !== null && retention !== undefined ? `${retention}%` : null },
    ],
    meaning: dimensionMeaning(score),
    whatToDo: dimensionAction(
      score,
      "Retention plan is non-negotiable before anything else. Revenue built on a leaky bucket won't hold.",
      "Re-enrollment process and family engagement touchpoints should be early priorities.",
      "Strong base to build on. Referral program will perform well here.",
    ),
  };
}

export function strategicClarityExplain(intake: Intake, metrics: Metrics): ExplainContent {
  const score = metrics?.strategic_clarity_score ?? null;
  return {
    metric: "Strategic Clarity",
    currentValue: score !== null ? `${score}/10` : "—",
    drivers: [
      { label: "Organization Focus", value: intake?.organization_focus },
      { label: "Pricing Approach", value: intake?.pricing_approach },
      { label: "Sponsorship Approach", value: intake?.sponsorship_approach },
      { label: "Market Strategy", value: intake?.market_strategy },
    ],
    meaning: dimensionMeaning(score),
    whatToDo: dimensionAction(
      score,
      "Strategy conversation needed in kickoff. Help them articulate their identity before activating revenue engines.",
      "Clarify 1–2 strategic priorities in the first check-in.",
      "Leadership is aligned — activate quickly.",
    ),
  };
}

const RISK_MEANING: Record<Severity, Record<"execution" | "market" | "retention", string>> = {
  Low: {
    execution: "Org will execute recommendations reliably.",
    market: "Market supports growth strategies.",
    retention: "Revenue base is stable.",
  },
  Medium: {
    execution: "Some risk of inconsistent execution. Set clear accountability.",
    market: "Competitive dynamics require care — value narrative matters.",
    retention: "Some churn risk — re-enrollment process is a priority.",
  },
  High: {
    execution: "Significant risk that recommendations won't be implemented as designed.",
    market: "Market headwinds will limit impact of growth-oriented strategies.",
    retention: "Significant revenue at risk from churn.",
  },
};

const RISK_ACTION: Record<Severity, Record<"execution" | "market" | "retention", string>> = {
  Low: {
    execution: "Full speed ahead. This org will execute.",
    market: "Market supports aggressive revenue activation.",
    retention: "Stable base. Focus energy on growth, not retention.",
  },
  Medium: {
    execution: "Set clear accountability checkpoints. Weekly focus card is important for this org.",
    market: "Differentiation and value narrative are critical before pricing moves.",
    retention: "Re-enrollment process is a first-month priority.",
  },
  High: {
    execution: "Sequence tasks that don't require coach or staff behavior change first. Build trust and early wins before asking for operational change.",
    market: "Retention-first approach. Every family retained is worth more than a new family acquired in a difficult market.",
    retention: "Retention plan must launch in parallel with everything else — not sequentially. Every week without a retention system is revenue at risk.",
  },
};

export function executionRiskExplain(_intake: Intake, metrics: Metrics): ExplainContent {
  const v = (metrics?.execution_risk as Severity) ?? "Medium";
  return {
    metric: "Execution Risk",
    currentValue: v,
    drivers: [
      { label: "Operations Health Score", value: metrics?.operations_health_score !== null && metrics?.operations_health_score !== undefined ? `${metrics.operations_health_score}/10` : null },
    ],
    meaning: RISK_MEANING[v].execution,
    whatToDo: RISK_ACTION[v].execution,
  };
}

export function marketRiskExplain(_intake: Intake, metrics: Metrics): ExplainContent {
  const v = (metrics?.market_risk as Severity) ?? "Medium";
  return {
    metric: "Market Risk",
    currentValue: v,
    drivers: [
      { label: "Market Position Health Score", value: metrics?.market_position_health_score !== null && metrics?.market_position_health_score !== undefined ? `${metrics.market_position_health_score}/10` : null },
    ],
    meaning: RISK_MEANING[v].market,
    whatToDo: RISK_ACTION[v].market,
  };
}

export function retentionRiskExplain(intake: Intake, metrics: Metrics): ExplainContent {
  const v = (metrics?.retention_risk as Severity) ?? "Medium";
  return {
    metric: "Retention Risk",
    currentValue: v,
    drivers: [
      { label: "Retention Score", value: metrics?.retention_score !== null && metrics?.retention_score !== undefined ? `${metrics.retention_score}/10` : null },
      { label: "Retention %", value: intake?.retention_pct !== null && intake?.retention_pct !== undefined ? `${intake.retention_pct}%` : null },
    ],
    meaning: RISK_MEANING[v].retention,
    whatToDo: RISK_ACTION[v].retention,
  };
}

export function engagementComplexityExplain(_intake: Intake, metrics: Metrics): ExplainContent {
  const v = (metrics?.engagement_complexity as Complexity) ?? "Moderate";
  const risks: { label: string; value: Severity | null }[] = [
    { label: "Execution", value: metrics?.execution_risk ?? null },
    { label: "Market", value: metrics?.market_risk ?? null },
    { label: "Retention", value: metrics?.retention_risk ?? null },
  ];
  const order: Severity[] = ["High", "Medium", "Low"];
  const highest = risks
    .filter((r) => r.value)
    .sort((a, b) => order.indexOf(a.value as Severity) - order.indexOf(b.value as Severity))[0];

  const meaning =
    v === "Straightforward"
      ? "Activate fast. Multiple tracks can run in parallel — the org is ready and capable."
      : v === "Moderate"
        ? "Balanced approach. Mix quick wins (sponsorship, events) with foundational work (operations, retention)."
        : "Foundational work first. Plan for a longer runway — first 30 days is about building the foundation, not chasing wins.";

  const whatToDo =
    v === "Straightforward"
      ? "Move fast. Lead with the highest opportunity engine immediately and queue secondary engines for week 2–3."
      : v === "Moderate"
        ? "Run two parallel tracks: one revenue activation, one operational. Steady weekly cadence keeps both moving."
        : "Set realistic expectations with the client up front — first 30 days is foundation. Use the weekly focus to keep the team anchored on the right work.";

  return {
    metric: "Engagement Complexity",
    currentValue: v,
    drivers: [
      { label: "Overall Health Score", value: metrics?.overall_health_score !== null && metrics?.overall_health_score !== undefined ? `${metrics.overall_health_score}/40` : null },
      { label: "Highest Risk Rating", value: highest ? `${highest.label}: ${highest.value}` : "—" },
    ],
    meaning,
    whatToDo,
  };
}

/* ─────────────────────────  ENGINE SCORES  ───────────────────────── */

const ENGINE_INPUTS: Record<string, (intake: Intake) => Array<{ label: string; value: any }>> = {
  Pricing: (i) => [
    { label: "Pricing Approach", value: i.pricing_approach },
    { label: "Dues Model", value: i.dues_model },
    { label: "Tiered Packages", value: i.tiered_packages },
    { label: "Knows Profit Margin", value: i.knows_profit_margin },
  ],
  Sponsorship: (i) => [
    { label: "Seeks Sponsorships", value: i.seeks_sponsorships },
    { label: "Sponsorship Approach", value: i.sponsorship_approach },
    { label: "Number of Sponsors", value: i.number_of_sponsors },
    { label: "Total Sponsorship Revenue", value: i.total_sponsorship_revenue },
  ],
  Apparel: (i) => [
    { label: "Uniform Vendor", value: i.uniform_vendor },
    { label: "Uniform Markup", value: i.uniform_markup },
    { label: "Hard Goods Purchased", value: i.hard_goods_purchased },
    { label: "Team Store Status", value: i.team_store_status },
  ],
  Events: (i) => [
    { label: "Runs Own Events", value: i.runs_own_events },
    { label: "Events Per Year", value: i.events_per_year },
    { label: "Event Types Offered", value: arr(i.event_types_offered) },
    { label: "Total Event Revenue", value: i.total_event_revenue },
  ],
  "Add-Ons": (i) => [
    { label: "Camps Revenue", value: i.camps_revenue },
    { label: "Clinics Revenue", value: i.clinics_revenue },
    { label: "Lessons Revenue Model", value: i.lessons_revenue_model },
    { label: "Add-On Soft Goods Spend", value: i.addon_soft_goods_spend },
  ],
  Retention: (i) => [
    { label: "Retention %", value: i.retention_pct !== null && i.retention_pct !== undefined ? `${i.retention_pct}%` : null },
    { label: "Avg Player Years", value: i.avg_player_years },
    { label: "Player Commitment Level", value: i.player_commitment_level },
    { label: "Typical Participation", value: i.typical_player_participation },
  ],
  Facility: (i) => [
    { label: "Facility Rental Revenue", value: i.facility_rental_revenue },
    { label: "Annual Facility Rental Revenue", value: i.annual_facility_rental_revenue },
  ],
  Affiliate: (i) => [
    { label: "Has Affiliates", value: i.has_affiliates },
    { label: "Number of Affiliates", value: i.number_of_affiliates },
    { label: "Affiliate Players Charged", value: i.affiliate_players_charged },
    { label: "Affiliate Fee per Player", value: i.affiliate_fee_per_player },
  ],
};

function engineMeaning(score: number): string {
  if (score >= 9) return `${score}/10 — Best in class. Maintenance mode for this engine.`;
  if (score >= 7) return `${score}/10 — Solid performance with optimization opportunity.`;
  if (score >= 4) return `${score}/10 — Some activity in place, significant upside remains.`;
  return `${score}/10 — Minimal or no system in place. Maximum opportunity engine.`;
}

function engineAction(score: number): string {
  if (score >= 9) return "Acknowledge excellence. Shift conversation to other engines where leverage is higher.";
  if (score >= 7) return "Frame as fine-tuning. 'This is working — here's how we take it from good to great.'";
  if (score >= 4) return "Acknowledge what they're doing well, then bridge to the gap. 'You have a foundation here — let's optimize it.'";
  return "Lead with the full opportunity range for this engine. Make the dollar amount real and specific to their org.";
}

function engineConversationStarter(engine: string, score: number, intake: Intake, metrics: Metrics): string | undefined {
  if (score > 6) return undefined;
  const totalPlayers = intake?.total_players ?? "[X]";
  const market = intake?.city_state ?? "their market";
  switch (engine) {
    case "Sponsorship": {
      const low = metrics?.sponsorship_opportunity_low ?? null;
      const high = metrics?.sponsorship_opportunity_high ?? null;
      const range = low !== null && high !== null ? `$${Math.round(low).toLocaleString()}–$${Math.round(high).toLocaleString()}` : "$X–$X";
      return `You have ${totalPlayers} families in ${market}. Local businesses are spending money to reach exactly this demographic. We can build you a sponsorship program that generates ${range} without asking your families to pay more.`;
    }
    case "Pricing": {
      const low = metrics?.pricing_opportunity_low ?? null;
      const high = metrics?.pricing_opportunity_high ?? null;
      const range = low !== null && high !== null ? `$${Math.round(low).toLocaleString()}–$${Math.round(high).toLocaleString()}` : "$X–$X";
      return `Your pricing is leaving ${range} on the table annually compared to market benchmarks. We can structure a defensible increase tied to value, not cost.`;
    }
    case "Apparel": {
      const low = metrics?.apparel_opportunity_low ?? null;
      const high = metrics?.apparel_opportunity_high ?? null;
      const range = low !== null && high !== null ? `$${Math.round(low).toLocaleString()}–$${Math.round(high).toLocaleString()}` : "$X–$X";
      return `Apparel and hard goods are a margin engine most orgs leave to vendors. There's ${range} of margin available with the right team store setup.`;
    }
    case "Events": {
      const low = metrics?.event_opportunity_low ?? null;
      const high = metrics?.event_opportunity_high ?? null;
      const range = low !== null && high !== null ? `$${Math.round(low).toLocaleString()}–$${Math.round(high).toLocaleString()}` : "$X–$X";
      return `Owned events convert your existing audience into a recurring revenue stream worth ${range}. We'll start with one repeatable format.`;
    }
    case "Add-Ons":
      return `Camps, clinics, and lessons capture wallet share you're already losing to outside providers. Let's identify the 1–2 add-ons your families are asking for.`;
    case "Retention":
      return `Every 5% improvement in retention is worth more than 5% in new acquisition — and easier to achieve. Let's protect the revenue base before chasing growth.`;
    case "Facility":
      return `Your facility is an underutilized asset. Off-season and off-hours rental can fund significant operating costs.`;
    case "Affiliate":
      return `Affiliate fees and shared apparel margin are pure-margin revenue with no additional service load. Let's package what you offer them.`;
    default:
      return undefined;
  }
}

export function engineScoreExplain(engine: string, intake: Intake, metrics: Metrics): ExplainContent {
  const fieldMap: Record<string, string> = {
    Pricing: "pricing_score",
    Sponsorship: "sponsorship_score",
    Apparel: "apparel_score",
    Events: "event_score",
    "Add-Ons": "addon_score",
    Retention: "retention_score",
    Facility: "facility_score",
    Affiliate: "affiliate_score",
  };
  const score = Number(metrics?.[fieldMap[engine]] ?? 0);
  const driverFn = ENGINE_INPUTS[engine] ?? (() => []);
  return {
    metric: `${engine} Engine`,
    currentValue: `${score}/10`,
    drivers: driverFn(intake),
    meaning: engineMeaning(score),
    whatToDo: engineAction(score),
    conversationStarter: engineConversationStarter(engine, score, intake, metrics),
  };
}
