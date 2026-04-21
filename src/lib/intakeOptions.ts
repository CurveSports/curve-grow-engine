// Intake form options & field types for Curve OS Revenue Assessment
export const MARKET_TYPES = [
  "Rural",
  "Suburban",
  "Mid-size Metro",
  "Major Metro",
  "High-income Suburban",
] as const;

export const ORG_TYPES = ["Travel Teams Only", "Facility + Teams", "Facility Only"] as const;
export const YEARS_OPTIONS = ["Less than 2", "2-5", "5-10", "10+"] as const;
export const GROWTH_TRENDS = ["Growing", "Stable", "Declining", "Not Sure"] as const;
export const PLAYER_MIX = ["Mostly Youth 14U and below", "Balanced", "Mostly High School"] as const;
export const COMPETITION = ["Highly Competitive", "Moderately Competitive", "Limited Competition"] as const;
export const ORG_FOCUS = ["Development-focused", "Exposure-focused", "Hybrid"] as const;
export const MARKET_STRATEGY = ["Dominate local market", "Expand regionally", "National exposure focus"] as const;

export const SEASONS = ["Fall", "Spring-Summer", "Year-round"] as const;
export const TEAM_STRUCTURE = ["Top team only with cuts", "Multiple tiers A-B-C", "Open model minimal cuts"] as const;
export const PLAYER_PARTICIPATION = ["1 season", "2 seasons", "3+ seasons"] as const;
export const COMMITMENT = ["Mostly full-time", "Mixed", "Mostly seasonal"] as const;
export const DEMAND = ["High demand with waitlists", "Balanced", "Inconsistent", "Struggling to fill"] as const;
export const SELECTION = ["Regularly cut players", "Try to place most players", "Rarely cut players"] as const;

export const DUES_INCLUSIONS = [
  "Team participation","Practices","Strength and conditioning","Lessons and training",
  "Tournament fees","Uniforms and apparel","Recruiting and showcases","Other",
] as const;
export const TIERED = ["Yes", "Somewhat", "No"] as const;
export const PRICE_POINT = ["Above Market", "At Market", "Below Market", "Not Sure"] as const;
export const KNOWS_MARGIN = ["Yes", "No"] as const;
export const MARGIN_RANGES = ["Under 10%", "10-20%", "20-30%", "30%+"] as const;
export const SPONSORSHIPS = ["Yes", "No", "Informally"] as const;
export const YES_NO = ["Yes", "No"] as const;

// New apparel & gear options
export const UNIFORM_PACKAGE_COST = ["Under $100", "$100–$200", "$200–$350", "$350–$500", "Over $500"] as const;
export const UNIFORM_MARKUP = ["Under 10%", "10–20%", "20–30%", "30%+", "Not Sure"] as const;
export const HARD_GOODS_PURCHASED = ["Yes regularly", "Sometimes", "No"] as const;
export const HARD_GOODS_SPEND = ["Under $100", "$100–$250", "$250–$500", "Over $500", "Not Sure"] as const;
export const HARD_GOODS_MARKUP = ["Under 10%", "10–20%", "20–30%", "Not Sure"] as const;
export const TEAM_STORE_STATUS = ["Yes full store", "Yes limited", "No"] as const;
export const ADDON_SOFT_GOODS_SPEND = ["Under $50", "$50–$150", "$150–$300", "Over $300", "Not Sure"] as const;

export const OPS_STRUCTURE = ["Clear systems", "Some structure", "Reactive"] as const;
export const PARENT_COMMS = ["Standardized", "Proactive", "Individualized", "Bulk", "Reactive", "None"] as const;
export const COACH_ALIGNMENT = ["Highly aligned", "Somewhat", "Not aligned"] as const;
export const COACHING_STRUCTURE = ["Structured", "Somewhat", "Coach-dependent"] as const;
export const PRICING_APPROACH = ["Structured", "Competitor-based", "Not defined"] as const;
export const SPONSORSHIP_APPROACH = ["Structured", "Somewhat", "None"] as const;

export const EVENT_TYPES = [
  "Tournaments we host",
  "Camps",
  "Clinics",
  "Showcases",
  "Recruiting Events",
  "Data Days",
  "Other Events",
] as const;

export const LESSONS_CAPTURE_MODEL = [
  "We capture it directly",
  "It goes to individual coaches",
  "Mixed — we capture some",
] as const;

export const SECTION_TITLES = [
  "Organization Profile",
  "Player & Team Structure",
  "Revenue",
  "Retention",
  "Operations",
];
