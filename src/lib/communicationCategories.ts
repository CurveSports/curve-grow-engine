// Categories and prompt scaffolds for the Communication Assistant

export type CommCard = {
  id: string;
  label: string;
  prompt: string;          // pre-filled into the prompt textarea
  badge?: "Document" | "Message";
  highlight?: boolean;     // visual treatment (e.g. Affiliate Sales Deck)
};

export type CommCategory = {
  id: string;
  label: string;
  description?: string;
  cards: CommCard[];
};

const PARENT: CommCategory = {
  id: "parent",
  label: "PARENT COMMUNICATIONS",
  cards: [
    { id: "weekly_team_update", label: "Weekly team update", prompt: "Write a weekly update for [team name] covering [what happened last week] and [what's coming up this week]. Include any reminders about [upcoming events]." },
    { id: "schedule_change", label: "Schedule change", prompt: "Write a message notifying families of a schedule change. Include [old details], [new details], and [reason if appropriate]." },
    { id: "tournament_announcement", label: "Tournament announcement", prompt: "Write a tournament announcement covering [tournament name], [dates], [location], [arrival time], and [what to bring]." },
    { id: "reenrollment_outreach", label: "Re-enrollment outreach", prompt: "Write a re-enrollment message encouraging families to commit for next season. Highlight the value of staying in the program and include an early commitment incentive of [incentive]." },
    { id: "season_kickoff", label: "Season kickoff letter", prompt: "Write a season kickoff letter welcoming families, setting expectations, and outlining what's ahead this season." },
    { id: "end_of_season", label: "End of season message", prompt: "Write an end-of-season message thanking families, celebrating wins, and previewing what's next." },
    { id: "new_program", label: "New program or service announcement", prompt: "Write an announcement introducing [new program/service]. Cover what it is, who it's for, when it starts, and how to sign up." },
    { id: "referral_program", label: "Referral program invitation", prompt: "Write a message inviting families to refer new players. Explain the referral incentive and how it works." },
  ],
};

const COACH: CommCategory = {
  id: "coach",
  label: "COACH COMMUNICATIONS",
  cards: [
    { id: "weekly_expectation", label: "Weekly expectation reminder", prompt: "Write a weekly reminder to coaches outlining expectations for practice quality, attendance reporting, and parent communication." },
    { id: "accountability_followup", label: "Accountability follow-up", prompt: "Write an accountability follow-up to a coach about [issue]. Be direct, professional, and constructive." },
    { id: "practice_structure", label: "Practice structure guidance", prompt: "Write practice structure guidance for our coaching staff covering warm-up, focus blocks, and competitive reps." },
    { id: "performance_feedback", label: "Performance feedback framework", prompt: "Write a performance feedback framework for coaches to use with players — what to praise, how to correct, and how to set goals." },
    { id: "season_expectations", label: "Season expectations and standards letter", prompt: "Write a season expectations letter for coaches covering professionalism, communication standards, and program values." },
  ],
};

const SPONSOR: CommCategory = {
  id: "sponsor",
  label: "SPONSOR OUTREACH",
  cards: [
    { id: "initial_outreach", label: "Initial outreach email", prompt: "Write an initial sponsor outreach email introducing our organization and the sponsorship opportunity." },
    { id: "followup", label: "Follow-up message", prompt: "Write a polite follow-up to a sponsor prospect we haven't heard back from." },
    { id: "sponsor_proposal_cover", label: "Sponsorship proposal cover letter", prompt: "Write a sponsorship proposal cover letter to accompany our formal proposal." },
    { id: "thank_you_renewal", label: "Thank you and renewal message", prompt: "Write a thank-you and renewal message to a current sponsor whose agreement is ending." },
    { id: "midseason_fulfillment", label: "Mid-season sponsor fulfillment update", prompt: "Write a mid-season fulfillment update showing a sponsor what activations have happened and what's still ahead." },
    { id: "renewal_campaign", label: "Sponsor renewal campaign message", prompt: "Write a renewal campaign message reminding sponsors of the value delivered and inviting them to renew." },
  ],
};

const EVENT: CommCategory = {
  id: "event",
  label: "EVENT PROMOTION",
  cards: [
    { id: "camp_clinic", label: "Camp or clinic announcement", prompt: "Write a camp/clinic announcement covering dates, location, age groups, what players will work on, and pricing." },
    { id: "showcase_invite", label: "Showcase invitation", prompt: "Write a showcase invitation describing the event, who should attend, and how to register." },
    { id: "data_day", label: "Data day promotion", prompt: "Write a data day promotion explaining what players will get measured, why it matters, and how to register." },
    { id: "tournament_hosting", label: "Tournament hosting announcement", prompt: "Write a tournament hosting announcement aimed at outside teams. Include dates, format, fees, and how to register." },
  ],
};

const DEVELOPMENT: CommCategory = {
  id: "development",
  label: "DEVELOPMENT COMMUNICATIONS",
  cards: [
    { id: "player_progress", label: "Player progress update", prompt: "Write a player progress update for a parent covering recent improvements, current focus areas, and next steps." },
    { id: "training_recommendation", label: "Training recommendation", prompt: "Write a training recommendation for a player suggesting [type of training] and explaining the why." },
    { id: "lessons_addon_upsell", label: "Lessons and add-on upsell", prompt: "Write a message inviting families to add lessons or extra training to their player's plan. Lead with value, not price." },
    { id: "recruiting_milestone", label: "Recruiting milestone announcement", prompt: "Write a recruiting milestone announcement for [player name] celebrating their commitment/offer to [school]." },
  ],
};

const FACILITY_OWNER: CommCategory = {
  id: "facility_owner",
  label: "FACILITY COMMUNICATIONS",
  description: "Communications for your facility operations and programming",
  cards: [
    { id: "rental_availability", label: "Facility rental availability announcement", prompt: "Write an announcement of available rental hours at our facility. Include rates, how to book, and best use cases." },
    { id: "open_cage_field", label: "Open cage or field time promotion", prompt: "Write a promotion for open cage/field time. Emphasize value, easy booking, and any introductory offer." },
    { id: "outside_team_outreach", label: "Outside team or school rental outreach", prompt: "Write outreach to outside teams or schools offering our facility for their practices and training." },
    { id: "facility_partnership_proposal", label: "Facility partnership proposal", prompt: "Write a facility partnership proposal aimed at a complementary organization (training, instruction, etc.)." },
    { id: "instruction_program", label: "Instruction program announcement", prompt: "Write an announcement of our instruction program at the facility, covering coaches, structure, and pricing." },
    { id: "open_gym", label: "Open gym or open field event promotion", prompt: "Write a promotion for an upcoming open gym or open field event including date, time, audience, and cost." },
  ],
};

const FACILITY_OUTREACH: CommCategory = {
  id: "facility_outreach",
  label: "FACILITY & SPACE OUTREACH",
  description: "Reaching out to facilities or looking to partner with a local space?",
  cards: [
    { id: "facility_rental_inquiry", label: "Facility rental inquiry", prompt: "Write an inquiry to a facility asking about rental availability for our team's practices." },
    { id: "facility_partnership_proposal_outreach", label: "Facility partnership proposal", prompt: "Write a partnership proposal to a local facility outlining how a partnership with our organization would benefit them." },
  ],
};

const AFFILIATE: CommCategory = {
  id: "affiliate",
  label: "AFFILIATE COMMUNICATIONS",
  description: "Whether you have affiliates today or are building toward them — these tools help you grow your network",
  cards: [
    { id: "affiliate_welcome", label: "Affiliate welcome and onboarding letter", prompt: "Write an onboarding letter welcoming a new affiliate, outlining what they can expect, and key first steps." },
    { id: "affiliate_standards", label: "Affiliate standards and expectations update", prompt: "Write an update to existing affiliates reaffirming standards, expectations, and program values." },
    { id: "affiliate_prospect", label: "Affiliate prospect outreach", prompt: "Write an outreach message to a potential affiliate organization introducing our affiliate program and its benefits." },
    { id: "affiliate_sales_deck", label: "Affiliate Sales Deck", prompt: "Generate a complete affiliate sales deck for a serious prospect.", badge: "Document", highlight: true },
  ],
};

const GENERAL: CommCategory = {
  id: "general",
  label: "GENERAL",
  cards: [
    { id: "something_else", label: "Something else", prompt: "" },
  ],
};

export function getCategoriesForOrg(orgType: string | null | undefined): CommCategory[] {
  // "Facility + Teams" or "Facility Only" → owner cards; else outreach cards
  const isFacilityOrg = !!orgType && /facility/i.test(orgType);
  const facility = isFacilityOrg ? FACILITY_OWNER : FACILITY_OUTREACH;
  return [PARENT, COACH, SPONSOR, EVENT, DEVELOPMENT, facility, AFFILIATE, GENERAL];
}

export function findCard(categories: CommCategory[], cardId: string): { category: CommCategory; card: CommCard } | null {
  for (const cat of categories) {
    const c = cat.cards.find((x) => x.id === cardId);
    if (c) return { category: cat, card: c };
  }
  return null;
}
