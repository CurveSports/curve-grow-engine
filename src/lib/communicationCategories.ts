// Categories, structured input schemas, and prompt builders for the Communication Assistant
// Round 6B — structured inputs replace free-form prompt
//
// Each card defines a list of structured inputs. The renderer generates a form
// from this schema; the buildUserPrompt function turns filled values into a
// concrete instruction sent to the AI.

export type FieldKind = "text" | "textarea" | "pill" | "date";

export type CommField = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  options?: string[];          // for pill kind
  showIf?: (values: Record<string, string>) => boolean; // conditional fields
};

export type CommCard = {
  id: string;
  label: string;
  fields: CommField[];
  badge?: "Document" | "Message";
  highlight?: boolean;
  // Override for prompt assembly (e.g. Affiliate Sales Deck multi-section)
  promptIntro?: string;
};

export type CommCategory = {
  id: string;
  label: string;
  description?: string;
  cards: CommCard[];
  // optional track selector (used by sponsor outreach)
  hasTrackSelector?: boolean;
};

// ── PARENT ────────────────────────────────────────────────────────────────

const PARENT: CommCategory = {
  id: "parent",
  label: "PARENT COMMUNICATIONS",
  description: "Keep families informed, engaged, and connected to your program",
  cards: [
    {
      id: "weekly_team_update",
      label: "Weekly team update",
      fields: [
        { key: "team", label: "Team name", kind: "text", required: true },
        { key: "recap", label: "Last week recap", kind: "textarea", required: true,
          placeholder: "What happened — wins, losses, practice highlights, themes you noticed" },
        { key: "schedule", label: "This week schedule", kind: "textarea", required: true,
          placeholder: "List practices, games, tournaments with dates and times" },
        { key: "reminders", label: "Reminders", kind: "textarea",
          placeholder: "Anything families need to know — gear, arrivals, payments, etc." },
      ],
    },
    {
      id: "schedule_change",
      label: "Schedule change or cancellation",
      fields: [
        { key: "team", label: "Team name", kind: "text", required: true },
        { key: "what_changed", label: "What changed", kind: "pill", required: true,
          options: ["Practice cancelled", "Game cancelled", "Practice rescheduled", "Game rescheduled", "Location changed", "Time changed"] },
        { key: "original", label: "Original date and time", kind: "text", required: true },
        { key: "new_datetime", label: "New date and time", kind: "text",
          showIf: (v) => /rescheduled|Time changed/i.test(v.what_changed || "") },
        { key: "new_location", label: "New location", kind: "text",
          showIf: (v) => /Location changed/i.test(v.what_changed || "") },
        { key: "reason", label: "Reason for change", kind: "text",
          placeholder: "e.g. field conditions, weather, facility conflict" },
        { key: "action", label: "Action required from families", kind: "text",
          placeholder: "e.g. no action needed / please confirm attendance" },
      ],
    },
    {
      id: "tournament_announcement",
      label: "Tournament announcement",
      fields: [
        { key: "name", label: "Tournament name", kind: "text", required: true },
        { key: "dates", label: "Dates", kind: "text", required: true },
        { key: "location", label: "Location", kind: "text", required: true },
        { key: "format", label: "Format", kind: "text",
          placeholder: "e.g. pool play + bracket, 3 game guarantee" },
        { key: "cost", label: "Cost to families", kind: "text" },
        { key: "prep", label: "What to bring or prepare", kind: "textarea" },
        { key: "deadline", label: "Registration or payment deadline", kind: "text" },
      ],
    },
    {
      id: "reenrollment_outreach",
      label: "Re-enrollment outreach",
      fields: [
        { key: "season", label: "Season name", kind: "text", required: true,
          placeholder: "e.g. Spring 2025, Fall Ball" },
        { key: "deadline", label: "Registration deadline", kind: "text", required: true },
        { key: "incentive", label: "Early commitment incentive", kind: "text",
          placeholder: "e.g. $50 discount if committed by [date]" },
        { key: "whats_new", label: "What is new next season", kind: "textarea" },
        { key: "how", label: "How to re-enroll", kind: "text", required: true,
          placeholder: "Link, contact person, or form" },
      ],
    },
    {
      id: "season_kickoff",
      label: "Season kickoff letter",
      fields: [
        { key: "season", label: "Season name", kind: "text", required: true },
        { key: "start", label: "Season start date", kind: "text", required: true },
        { key: "key_dates", label: "Key dates", kind: "textarea", required: true,
          placeholder: "First practice, first game, important tournaments" },
        { key: "expect", label: "What to expect this season", kind: "textarea", required: true },
        { key: "whats_new", label: "New additions this season", kind: "textarea",
          placeholder: "New coaches, facilities, programs" },
        { key: "contact", label: "How to reach coaches", kind: "text", required: true },
      ],
    },
    {
      id: "end_of_season",
      label: "End of season message",
      fields: [
        { key: "season", label: "Season name", kind: "text", required: true },
        { key: "highlights", label: "Season highlights", kind: "textarea", required: true,
          placeholder: "Record, standout moments, team growth, memorable games" },
        { key: "thanks", label: "Acknowledgments", kind: "textarea",
          placeholder: "Volunteers, sponsors, families to thank specifically" },
        { key: "next", label: "What comes next", kind: "text",
          placeholder: "Fall ball, off-season training, next season dates" },
      ],
    },
    {
      id: "new_program",
      label: "New program or service announcement",
      fields: [
        { key: "name", label: "Program name", kind: "text", required: true },
        { key: "what", label: "What it is", kind: "textarea", required: true },
        { key: "audience", label: "Who it is for", kind: "text", required: true,
          placeholder: "e.g. all players, 12U and under, HS only" },
        { key: "cost", label: "Cost", kind: "text" },
        { key: "signup", label: "How to sign up", kind: "text", required: true },
        { key: "start", label: "Start date", kind: "text", required: true },
      ],
    },
    {
      id: "referral_program",
      label: "Referral program invitation",
      fields: [
        { key: "incentive", label: "Incentive offered", kind: "text", required: true,
          placeholder: "e.g. $100 credit, free month of membership" },
        { key: "what", label: "What they are referring", kind: "text", required: true,
          placeholder: "e.g. new players, new families" },
        { key: "how", label: "How to refer", kind: "text", required: true },
        { key: "deadline", label: "Deadline", kind: "text" },
      ],
    },
    // ── Round 10: tryout templates ──
    {
      id: "tryout_announcement",
      label: "Tryout announcement",
      fields: [
        { key: "team", label: "Team or age group", kind: "text", required: true },
        { key: "tryout_date", label: "Tryout date", kind: "text", required: true },
        { key: "tryout_time", label: "Tryout time", kind: "text", required: true },
        { key: "location", label: "Location", kind: "text", required: true },
        { key: "ages", label: "Age groups eligible", kind: "text", required: true },
        { key: "register", label: "How to register or sign up", kind: "text", required: true },
        { key: "bring", label: "What to bring", kind: "textarea" },
        { key: "contact", label: "Contact for questions", kind: "text", required: true },
      ],
    },
    {
      id: "tryout_reminder",
      label: "Tryout reminder",
      fields: [
        { key: "family", label: "Player or family name", kind: "text" },
        { key: "team", label: "Team or age group", kind: "text", required: true },
        { key: "datetime", label: "Tryout date and time", kind: "text", required: true },
        { key: "location", label: "Location and address", kind: "text", required: true },
        { key: "parking", label: "Parking details", kind: "text" },
        { key: "wear", label: "What to wear", kind: "text" },
        { key: "arrival", label: "Arrival time recommendation", kind: "text" },
      ],
    },
    {
      id: "tryout_result_accepted",
      label: "Tryout result — accepted",
      fields: [
        { key: "player", label: "Player first name", kind: "text", required: true },
        { key: "parent", label: "Parent first name", kind: "text" },
        { key: "team", label: "Team selected for", kind: "text", required: true },
        { key: "season", label: "Season", kind: "text", required: true },
        { key: "quality", label: "Specific quality observed at tryout", kind: "text", required: true,
          placeholder: "e.g. strong arm, competitive at-bats, great attitude" },
        { key: "deadline", label: "Confirmation deadline", kind: "text", required: true },
        { key: "how", label: "How to confirm", kind: "text", required: true },
        { key: "next", label: "Next steps after confirmation", kind: "textarea" },
      ],
    },
    {
      id: "tryout_result_not_selected",
      label: "Tryout result — not selected",
      fields: [
        { key: "player", label: "Player first name", kind: "text", required: true },
        { key: "parent", label: "Parent first name", kind: "text" },
        { key: "positive", label: "One genuine positive observation", kind: "text",
          placeholder: "Only include if true and specific — leave blank if not" },
        { key: "feedback", label: "Offer development feedback?", kind: "pill",
          options: ["Yes", "No"] },
      ],
    },
  ],
};

// ── COACH ─────────────────────────────────────────────────────────────────

const COACH: CommCategory = {
  id: "coach",
  label: "COACH COMMUNICATIONS",
  description: "Set standards, hold your staff accountable, and build a consistent coaching culture",
  cards: [
    {
      id: "weekly_expectation",
      label: "Weekly expectation reminder",
      fields: [
        { key: "week", label: "Week of", kind: "text", required: true },
        { key: "focus", label: "Focus areas this week", kind: "textarea", required: true,
          placeholder: "What should coaches emphasize in practice and games this week" },
        { key: "events", label: "Upcoming key events", kind: "textarea", required: true },
        { key: "reminders", label: "Specific reminders", kind: "textarea", required: true,
          placeholder: "e.g. weekly updates due Sunday, arrive 30 min early to Saturday tournament" },
        { key: "issues", label: "Any issues to address", kind: "textarea",
          placeholder: "e.g. communication has been inconsistent, practice structure needs work" },
      ],
    },
    {
      id: "accountability_followup",
      label: "Accountability follow-up",
      fields: [
        { key: "coach", label: "Coach name", kind: "text", required: true },
        { key: "issue", label: "Issue being addressed", kind: "textarea", required: true,
          placeholder: "Be specific — what happened or what did not happen" },
        { key: "expected", label: "Expected change", kind: "textarea", required: true,
          placeholder: "What do you need them to do differently going forward" },
        { key: "timeline", label: "Timeline", kind: "text", required: true,
          placeholder: "e.g. starting this week, by next Monday" },
        { key: "fb_tone", label: "Tone", kind: "pill", required: true,
          options: ["Supportive", "Direct", "Formal warning"] },
      ],
    },
    {
      id: "practice_structure",
      label: "Practice structure guidance",
      fields: [
        { key: "team", label: "Team name or age group", kind: "text", required: true },
        { key: "focus", label: "Practice focus", kind: "textarea", required: true,
          placeholder: "Skills, situations, or themes to emphasize" },
        { key: "duration", label: "Practice duration", kind: "text", required: true },
        { key: "drills", label: "Specific activities or drills", kind: "textarea" },
        { key: "situation", label: "Game situation to simulate", kind: "text" },
      ],
    },
    {
      id: "performance_feedback",
      label: "Performance feedback",
      fields: [
        { key: "coach", label: "Coach name", kind: "text", required: true },
        { key: "doing_well", label: "What they are doing well", kind: "textarea", required: true },
        { key: "improvement", label: "Area for improvement", kind: "textarea", required: true },
        { key: "recommendation", label: "Specific recommendation", kind: "textarea", required: true },
      ],
    },
    {
      id: "season_expectations",
      label: "Season expectations letter",
      fields: [
        { key: "season", label: "Season name", kind: "text", required: true },
        { key: "standards", label: "Key standards being set", kind: "textarea", required: true,
          placeholder: "Communication frequency, practice structure, parent interaction standards" },
        { key: "measure", label: "How success will be measured", kind: "textarea", required: true },
        { key: "consequences", label: "Consequences for not meeting standards", kind: "text" },
      ],
    },
    // ── Round 10: coach templates ──
    {
      id: "new_coach_onboarding",
      label: "New coach onboarding",
      fields: [
        { key: "coach", label: "Coach first name", kind: "text", required: true },
        { key: "season", label: "Season", kind: "text", required: true },
        { key: "bgcheck", label: "Background check provider", kind: "text", required: true },
        { key: "platform", label: "Platform name", kind: "text", required: true,
          placeholder: "Curve Sports Platform" },
        { key: "team", label: "Team name and age group", kind: "text", required: true },
        { key: "first_practice", label: "First practice date, time, location", kind: "text", required: true },
        { key: "director", label: "Director name", kind: "text", required: true },
        { key: "director_phone", label: "Director phone", kind: "text", required: true },
      ],
    },
    {
      id: "end_of_season_debrief",
      label: "End of season debrief request",
      fields: [
        { key: "coach", label: "Coach first name", kind: "text", required: true },
        { key: "team", label: "Team name", kind: "text", required: true },
        { key: "season", label: "Season name", kind: "text", required: true },
        { key: "deadline", label: "Deadline for responses", kind: "text", required: true },
        { key: "platform", label: "Platform where dev notes should be logged", kind: "text",
          placeholder: "Curve Sports Platform" },
      ],
    },
  ],
};

// ── SPONSOR (with DSF + Direct tracks) ────────────────────────────────────
// Both tracks share the same fields. The track determines voice (system prompt).

const SPONSOR_FIELDS: Record<string, CommField[]> = {
  initial: [
    { key: "business", label: "Business name", kind: "text", required: true },
    { key: "contact", label: "Contact name", kind: "text" },
    { key: "biz_type", label: "Business type", kind: "text", required: true,
      placeholder: "e.g. local restaurant, auto dealership, family-owned retailer" },
    { key: "fit", label: "Why this business is a good fit", kind: "text",
      placeholder: "e.g. family-owned, youth-focused, active in community" },
    { key: "tier", label: "Sponsorship tier to propose", kind: "pill", required: true,
      options: ["Presenting", "Supporting", "Community"] },
    { key: "assets", label: "Specific assets to highlight", kind: "textarea",
      placeholder: "e.g. jersey placement, tournament naming rights, facility signage" },
  ],
  followup: [
    { key: "business", label: "Business name", kind: "text", required: true },
    { key: "contact", label: "Contact name", kind: "text" },
    { key: "prev_date", label: "Previous outreach date", kind: "text", required: true },
    { key: "discussed", label: "What was discussed", kind: "text" },
    { key: "next_step", label: "Proposed next step", kind: "text", required: true,
      placeholder: "e.g. 15 minute call, send package, meet in person" },
  ],
  proposal: [
    { key: "business", label: "Business name", kind: "text", required: true },
    { key: "contact", label: "Contact name", kind: "text", required: true },
    { key: "tier", label: "Tier being proposed", kind: "pill", required: true,
      options: ["Presenting", "Supporting", "Community"] },
    { key: "value", label: "Key value points to emphasize", kind: "textarea", required: true },
    { key: "amount", label: "Asking investment amount", kind: "text", required: true },
    { key: "deadline", label: "Response deadline", kind: "text" },
  ],
  thank_you: [
    { key: "sponsor", label: "Sponsor name", kind: "text", required: true },
    { key: "contact", label: "Contact name", kind: "text", required: true },
    { key: "what", label: "What they sponsored", kind: "text", required: true },
    { key: "impact", label: "Specific impact to highlight", kind: "textarea", required: true,
      placeholder: "e.g. logo seen by 800 families at our showcase, named sponsor of fall tournament" },
    { key: "ask", label: "Renewal ask", kind: "text",
      placeholder: "Same package, upgraded package, or just a thank you with no ask" },
  ],
  midseason: [
    { key: "sponsor", label: "Sponsor name", kind: "text", required: true },
    { key: "contact", label: "Contact name", kind: "text", required: true },
    { key: "delivered", label: "What has been delivered", kind: "textarea", required: true,
      placeholder: "e.g. jersey placement at 12 games, signage at spring tournament, 3 social media posts" },
    { key: "upcoming", label: "Events still coming", kind: "textarea", required: true },
    { key: "extra", label: "Any additional value delivered", kind: "text" },
  ],
  renewal: [
    { key: "sponsor", label: "Sponsor name", kind: "text", required: true },
    { key: "contact", label: "Contact name", kind: "text", required: true },
    { key: "current_tier", label: "Current tier", kind: "text", required: true },
    { key: "renewal_date", label: "Renewal date", kind: "text", required: true },
    { key: "results", label: "Results from this year", kind: "textarea", required: true },
    { key: "upgrades", label: "What is new or upgraded next year", kind: "text" },
    { key: "new_amount", label: "New investment amount if different", kind: "text" },
  ],
};

const SPONSOR: CommCategory = {
  id: "sponsor",
  label: "SPONSOR OUTREACH",
  description: "Build local business partnerships that fund your program and support your community",
  hasTrackSelector: true,
  cards: [
    { id: "sponsor_initial", label: "Initial outreach", fields: SPONSOR_FIELDS.initial },
    { id: "sponsor_followup", label: "Follow-up", fields: SPONSOR_FIELDS.followup },
    { id: "sponsor_proposal", label: "Proposal cover letter", fields: SPONSOR_FIELDS.proposal },
    { id: "sponsor_thank_you", label: "Thank you and renewal", fields: SPONSOR_FIELDS.thank_you },
    { id: "sponsor_midseason", label: "Mid-season fulfillment update", fields: SPONSOR_FIELDS.midseason },
    { id: "sponsor_renewal_campaign", label: "Renewal campaign", fields: SPONSOR_FIELDS.renewal },
  ],
};

// ── EVENT PROMOTION ───────────────────────────────────────────────────────

const EVENT: CommCategory = {
  id: "event",
  label: "EVENT PROMOTION",
  description: "Drive participation and fill your camps, clinics, showcases, and tournaments",
  cards: [
    {
      id: "camp_clinic",
      label: "Camp or clinic announcement",
      fields: [
        { key: "name", label: "Event name", kind: "text", required: true },
        { key: "type", label: "Event type", kind: "pill",
          options: ["Camp", "Clinic", "Training session"] },
        { key: "datetime", label: "Date and time", kind: "text", required: true },
        { key: "location", label: "Location", kind: "text", required: true },
        { key: "audience", label: "Who it is for", kind: "text", required: true,
          placeholder: "e.g. all ages, 10U-14U, HS only" },
        { key: "cost", label: "Cost", kind: "text", required: true },
        { key: "focus", label: "What they will work on", kind: "textarea", required: true,
          placeholder: "Skills, focus areas, what players will leave with" },
        { key: "register", label: "How to register", kind: "text", required: true },
        { key: "deadline", label: "Registration deadline", kind: "text" },
        { key: "spots", label: "Spots available", kind: "text" },
      ],
    },
    {
      id: "showcase_invite",
      label: "Showcase invitation",
      fields: [
        { key: "name", label: "Showcase name", kind: "text", required: true },
        { key: "datelocation", label: "Date and location", kind: "text", required: true },
        { key: "audience", label: "Who should attend", kind: "text", required: true,
          placeholder: "e.g. players with college aspirations, 2025-2027 grad years" },
        { key: "value", label: "What makes this showcase valuable", kind: "textarea", required: true,
          placeholder: "Colleges attending, exposure level, format" },
        { key: "cost", label: "Cost", kind: "text", required: true },
        { key: "register", label: "How to register", kind: "text", required: true },
        { key: "deadline", label: "Deadline", kind: "text" },
      ],
    },
    {
      id: "data_day",
      label: "Data day promotion",
      fields: [
        { key: "name", label: "Event name", kind: "text", required: true },
        { key: "datelocation", label: "Date and location", kind: "text", required: true },
        { key: "measured", label: "What gets measured", kind: "textarea", required: true,
          placeholder: "Exit velocity, spin rate, 60 time, arm strength, etc." },
        { key: "audience", label: "Who should attend", kind: "text", required: true },
        { key: "cost", label: "Cost", kind: "text", required: true },
        { key: "register", label: "How to register", kind: "text", required: true },
        { key: "receive", label: "What they receive", kind: "text", required: true,
          placeholder: "e.g. full report, video analysis, comparison to peers" },
      ],
    },
    {
      id: "tournament_hosting",
      label: "Tournament hosting announcement",
      fields: [
        { key: "name", label: "Tournament name", kind: "text", required: true },
        { key: "datelocation", label: "Dates and location", kind: "text", required: true },
        { key: "ages", label: "Age groups", kind: "text", required: true },
        { key: "format", label: "Format", kind: "text", required: true,
          placeholder: "e.g. pool play + bracket, 3 game guarantee" },
        { key: "fee", label: "Entry fee", kind: "text", required: true },
        { key: "deadline", label: "Registration deadline", kind: "text", required: true },
        { key: "register", label: "How to register", kind: "text", required: true },
        { key: "features", label: "Any special features", kind: "textarea",
          placeholder: "College coaches attending, live scoring, awards ceremony" },
      ],
    },
  ],
};

// ── FACILITY ─────────────────────────────────────────────────────────────

const FACILITY_OWNER: CommCategory = {
  id: "facility_owner",
  label: "FACILITY COMMUNICATIONS",
  description: "Fill your facility, maximize utilization, and grow instruction revenue",
  cards: [
    {
      id: "rental_availability",
      label: "Facility rental availability announcement",
      fields: [
        { key: "blocks", label: "Available time blocks", kind: "textarea", required: true,
          placeholder: "e.g. Monday and Wednesday mornings 8-11am, weekend afternoons" },
        { key: "what", label: "What is available", kind: "text", required: true,
          placeholder: "Full field, batting cages, indoor turf, full facility" },
        { key: "rates", label: "Rental rates", kind: "text" },
        { key: "contact", label: "Who to contact to book", kind: "text", required: true },
      ],
    },
    {
      id: "open_cage_field",
      label: "Open cage or field time promotion",
      fields: [
        { key: "blocks", label: "Available time blocks", kind: "textarea", required: true },
        { key: "what", label: "What is open", kind: "text", required: true },
        { key: "rates", label: "Rates", kind: "text" },
        { key: "contact", label: "Who to contact / how to book", kind: "text", required: true },
      ],
    },
    {
      id: "outside_team_outreach",
      label: "Outside team or school rental outreach",
      fields: [
        { key: "target", label: "Target organization name", kind: "text", required: true,
          placeholder: "e.g. Lincoln High School, Westside Rec League" },
        { key: "contact", label: "Contact name", kind: "text" },
        { key: "offering", label: "What you are offering", kind: "textarea", required: true },
        { key: "rates", label: "Rates", kind: "text" },
        { key: "blocks", label: "Available time blocks", kind: "text", required: true },
        { key: "fit", label: "Why this is a good fit for them", kind: "text" },
      ],
    },
    {
      id: "facility_owner_partnership",
      label: "Facility partnership proposal",
      fields: [
        { key: "target", label: "Facility or organization name", kind: "text", required: true },
        { key: "contact", label: "Contact name", kind: "text" },
        { key: "proposing", label: "What partnership you are proposing", kind: "textarea", required: true },
        { key: "give", label: "What you bring to them", kind: "textarea", required: true },
        { key: "need", label: "What you need from them", kind: "textarea", required: true },
        { key: "terms", label: "Proposed terms", kind: "text" },
      ],
    },
    {
      id: "instruction_program",
      label: "Instruction program announcement",
      fields: [
        { key: "name", label: "Program name", kind: "text", required: true },
        { key: "included", label: "What is included", kind: "textarea", required: true },
        { key: "audience", label: "Who it is for", kind: "text", required: true },
        { key: "pricing", label: "Pricing", kind: "text", required: true },
        { key: "schedule", label: "Schedule", kind: "text", required: true },
        { key: "signup", label: "How to sign up", kind: "text", required: true },
      ],
    },
    {
      id: "open_gym",
      label: "Open gym or open field event promotion",
      fields: [
        { key: "name", label: "Event name", kind: "text", required: true },
        { key: "datetime", label: "Date and time", kind: "text", required: true },
        { key: "audience", label: "Who it is for", kind: "text", required: true },
        { key: "cost", label: "Cost", kind: "text" },
        { key: "register", label: "How to register / show up", kind: "text", required: true },
      ],
    },
  ],
};

const FACILITY_OUTREACH: CommCategory = {
  id: "facility_outreach",
  label: "FACILITY & SPACE OUTREACH",
  description: "Reach out to facilities for rental space or partnership opportunities",
  cards: [
    {
      id: "facility_rental_inquiry",
      label: "Facility rental inquiry",
      fields: [
        { key: "facility", label: "Facility name", kind: "text", required: true },
        { key: "contact", label: "Contact name", kind: "text" },
        { key: "need", label: "What you need", kind: "textarea", required: true,
          placeholder: "Field time, cage time, indoor space — how many hours, how often" },
        { key: "preferred", label: "Preferred dates or times", kind: "text", required: true },
        { key: "intro", label: "Your organization details", kind: "text",
          placeholder: "Brief description to introduce your org" },
      ],
    },
    {
      id: "facility_outreach_partnership",
      label: "Facility partnership proposal",
      fields: [
        { key: "facility", label: "Facility or organization name", kind: "text", required: true },
        { key: "contact", label: "Contact name", kind: "text" },
        { key: "proposing", label: "What partnership you are proposing", kind: "textarea", required: true },
        { key: "give", label: "What you bring to them", kind: "textarea", required: true },
        { key: "need", label: "What you need from them", kind: "textarea", required: true },
        { key: "terms", label: "Proposed terms", kind: "text" },
      ],
    },
  ],
};

// ── AFFILIATE ────────────────────────────────────────────────────────────

const AFFILIATE: CommCategory = {
  id: "affiliate",
  label: "AFFILIATE COMMUNICATIONS",
  description: "Build and manage your affiliate network — whether you are starting or scaling",
  cards: [
    {
      id: "affiliate_prospect",
      label: "Affiliate prospect outreach",
      fields: [
        { key: "org", label: "Organization name", kind: "text", required: true },
        { key: "contact", label: "Contact name", kind: "text" },
        { key: "fit", label: "Why they are a good fit", kind: "textarea", required: true,
          placeholder: "What makes this org a strong affiliate candidate" },
        { key: "offer", label: "What affiliation offers them", kind: "textarea", required: true,
          placeholder: "Brand, curriculum, network, apparel program, recruiting support" },
        { key: "fee", label: "Your fee structure", kind: "text", required: true,
          placeholder: "e.g. $125 per player annually" },
        { key: "next", label: "Proposed next step", kind: "text", required: true },
      ],
    },
    {
      id: "affiliate_welcome",
      label: "Affiliate welcome and onboarding",
      fields: [
        { key: "org", label: "Affiliate org name", kind: "text", required: true },
        { key: "contact", label: "Contact name", kind: "text", required: true },
        { key: "expectations", label: "Key expectations", kind: "textarea", required: true,
          placeholder: "Branding standards, communication requirements, apparel requirements" },
        { key: "benefits", label: "Key benefits they receive", kind: "textarea", required: true },
        { key: "next30", label: "Next steps in first 30 days", kind: "textarea", required: true },
      ],
    },
    {
      id: "affiliate_standards",
      label: "Affiliate standards update",
      fields: [
        { key: "change", label: "What is changing", kind: "textarea", required: true },
        { key: "why", label: "Why", kind: "textarea" },
        { key: "effective", label: "Effective date", kind: "text", required: true },
        { key: "action", label: "Action required from affiliates", kind: "text" },
      ],
    },
    {
      id: "affiliate_sales_deck",
      label: "Affiliate Sales Deck",
      badge: "Document",
      highlight: true,
      promptIntro: "Generate a complete, multi-section affiliate sales deck (not a single message).",
      fields: [
        { key: "target", label: "Target affiliate name", kind: "text",
          placeholder: "Leave blank for a generic deck" },
        { key: "market", label: "Their market or location", kind: "text" },
        { key: "players", label: "Their approximate player count", kind: "text" },
        { key: "diff", label: "What differentiates your program", kind: "textarea", required: true,
          placeholder: "What makes your org worth affiliating with" },
        { key: "fee", label: "Your fee structure", kind: "text", required: true },
        { key: "benefits", label: "Key benefits you offer affiliates", kind: "textarea", required: true },
        { key: "selling", label: "Any additional selling points", kind: "textarea" },
      ],
    },
  ],
};

// ── GENERAL ──────────────────────────────────────────────────────────────

const GENERAL: CommCategory = {
  id: "general",
  label: "GENERAL",
  cards: [
    {
      id: "something_else",
      label: "Something else",
      fields: [
        { key: "describe", label: "What do you need?", kind: "textarea", required: true,
          placeholder: "Describe what you need and we'll draft it for you" },
      ],
    },
  ],
};

// ── Public API ───────────────────────────────────────────────────────────

export function getCategoriesForOrg(orgType: string | null | undefined): CommCategory[] {
  const isFacilityOrg = !!orgType && /facility/i.test(orgType);
  const facility = isFacilityOrg ? FACILITY_OWNER : FACILITY_OUTREACH;
  return [PARENT, COACH, SPONSOR, EVENT, facility, AFFILIATE, GENERAL];
}

export function findCard(
  categories: CommCategory[],
  cardId: string,
): { category: CommCategory; card: CommCard } | null {
  for (const cat of categories) {
    const c = cat.cards.find((x) => x.id === cardId);
    if (c) return { category: cat, card: c };
  }
  return null;
}

export function visibleFields(card: CommCard, values: Record<string, string>): CommField[] {
  return card.fields.filter((f) => !f.showIf || f.showIf(values));
}

export function validateCard(
  card: CommCard,
  values: Record<string, string>,
): string[] {
  const missing: string[] = [];
  for (const f of visibleFields(card, values)) {
    if (f.required && !(values[f.key] || "").trim()) missing.push(f.key);
  }
  return missing;
}

/**
 * Convert structured field values into a clear instruction the AI can act on.
 * Each non-empty value becomes a "Label: value" line; the card label provides
 * the action. The result is the "user prompt" sent to the LLM.
 */
export function buildUserPrompt(
  card: CommCard,
  values: Record<string, string>,
  personalization?: {
    recipient?: string;
    eventOrDate?: string;
    additionalContext?: string;
  },
): string {
  const lines: string[] = [];
  if (card.promptIntro) {
    lines.push(card.promptIntro);
  } else {
    lines.push(`Write a ${card.label.toLowerCase()}.`);
  }

  const visible = visibleFields(card, values);
  const filled = visible
    .map((f) => {
      const v = (values[f.key] || "").trim();
      return v ? `- ${f.label}: ${v}` : null;
    })
    .filter(Boolean);

  if (filled.length > 0) {
    lines.push("");
    lines.push("Details:");
    lines.push(...(filled as string[]));
  }

  const personalLines: string[] = [];
  if (personalization?.recipient) personalLines.push(`- Recipient: ${personalization.recipient}`);
  if (personalization?.eventOrDate) personalLines.push(`- Specific event/date: ${personalization.eventOrDate}`);
  if (personalization?.additionalContext) personalLines.push(`- Additional context: ${personalization.additionalContext}`);
  if (personalLines.length) {
    lines.push("");
    lines.push("Personalization:");
    lines.push(...personalLines);
  }

  return lines.join("\n");
}
