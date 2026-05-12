// 10 system email templates (MJML). Use {{variable}} placeholders interpolated
// at render time via Mustache. Brand vars (brand.primary, brand.logoUrl, etc.)
// are merged in automatically by the composer from the org's brand kit.

export type TemplateInputField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "url" | "date" | "list";
  placeholder?: string;
  required?: boolean;
};

export type SystemTemplate = {
  key: string;
  name: string;
  category: string;
  description: string;
  rendering_engine: "mjml";
  input_fields: TemplateInputField[];
  preview_props: Record<string, any>;
  mjml: string;
  sort_order: number;
};

const HEADER = `
  <mj-section background-color="{{brand.primary}}" padding="20px 0">
    <mj-column>
      {{#brand.logoUrl}}<mj-image src="{{brand.logoUrl}}" alt="{{brand.orgName}}" width="120px" align="center" />{{/brand.logoUrl}}
      {{^brand.logoUrl}}<mj-text align="center" color="#ffffff" font-size="22px" font-weight="700" font-family="{{brand.headingFont}}">{{brand.orgName}}</mj-text>{{/brand.logoUrl}}
    </mj-column>
  </mj-section>
`;

const FOOTER = `
  <mj-section background-color="#f4f4f5" padding="24px 0">
    <mj-column>
      <mj-text align="center" color="#71717a" font-size="12px" font-family="{{brand.bodyFont}}">
        {{brand.orgName}} · {{brand.address}}<br/>
        <a href="{{unsubscribeUrl}}" style="color:#71717a">Unsubscribe</a>
      </mj-text>
    </mj-column>
  </mj-section>
`;

const wrap = (body: string) => `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="{{brand.bodyFont}}" />
      <mj-text color="#1a1a1a" font-size="15px" line-height="1.6" />
      <mj-button background-color="{{brand.accent}}" color="#ffffff" font-weight="700" font-size="15px" border-radius="6px" padding="14px 28px" />
    </mj-attributes>
    <mj-style>
      @media (prefers-color-scheme: dark) {
        .body-bg { background-color: #0a0a0a !important; }
        .card-bg { background-color: #1a1a1a !important; }
        .body-text { color: #e5e5e5 !important; }
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#ffffff" css-class="body-bg">
    ${HEADER}
    ${body}
    ${FOOTER}
  </mj-body>
</mjml>
`.trim();

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    key: "TryoutAnnouncement",
    name: "Tryout Announcement",
    category: "event",
    description: "Announce tryouts with date, location, age groups, and a register CTA.",
    rendering_engine: "mjml",
    sort_order: 10,
    input_fields: [
      { key: "firstName", label: "Recipient first name token", type: "text", required: true, placeholder: "{{contact.first_name}}" },
      { key: "eventDate", label: "Event date", type: "text", required: true },
      { key: "eventTime", label: "Event time", type: "text", required: true },
      { key: "location", label: "Location", type: "text", required: true },
      { key: "ageGroups", label: "Age groups", type: "text" },
      { key: "heroPhotoUrl", label: "Hero photo URL", type: "url" },
      { key: "registrationUrl", label: "Registration URL", type: "url", required: true },
      { key: "addToCalendarUrl", label: "Add to calendar URL", type: "url" },
    ],
    preview_props: {
      firstName: "Alex", eventDate: "Saturday, April 12", eventTime: "9:00 AM",
      location: "City Park Field 3", ageGroups: "8U–14U",
      heroPhotoUrl: "", registrationUrl: "https://example.com/register",
      addToCalendarUrl: "https://example.com/ics",
    },
    mjml: wrap(`
      <mj-section background-color="#ffffff" css-class="card-bg" padding="32px 24px">
        <mj-column>
          {{#heroPhotoUrl}}<mj-image src="{{heroPhotoUrl}}" alt="Tryouts" border-radius="8px" />{{/heroPhotoUrl}}
          <mj-text font-family="{{brand.headingFont}}" font-size="28px" font-weight="700" color="{{brand.primary}}">Tryouts are coming, {{firstName}}!</mj-text>
          <mj-text css-class="body-text">Mark your calendar — we'd love to see {{firstName}} on the field.</mj-text>
          <mj-divider border-color="#e5e5e5" border-width="1px" />
          <mj-text css-class="body-text"><strong>Date:</strong> {{eventDate}}<br/><strong>Time:</strong> {{eventTime}}<br/><strong>Where:</strong> {{location}}<br/><strong>Ages:</strong> {{ageGroups}}</mj-text>
          <mj-button href="{{registrationUrl}}">Register now</mj-button>
          {{#addToCalendarUrl}}<mj-text align="center"><a href="{{addToCalendarUrl}}" style="color:{{brand.primary}}">📅 Add to your calendar</a></mj-text>{{/addToCalendarUrl}}
        </mj-column>
      </mj-section>
    `),
  },
  {
    key: "ReEnrollmentReminder",
    name: "Re-enrollment Reminder",
    category: "reminder",
    description: "Remind returning families to re-enroll before a deadline.",
    rendering_engine: "mjml",
    sort_order: 20,
    input_fields: [
      { key: "firstName", label: "First name token", type: "text" },
      { key: "deadline", label: "Deadline", type: "text", required: true },
      { key: "discountInfo", label: "Returning-family discount", type: "text" },
      { key: "registrationUrl", label: "Registration URL", type: "url", required: true },
    ],
    preview_props: {
      firstName: "Alex", deadline: "March 15",
      discountInfo: "$50 off when you enroll before March 1.",
      registrationUrl: "https://example.com/enroll",
    },
    mjml: wrap(`
      <mj-section padding="32px 24px">
        <mj-column>
          <mj-text font-family="{{brand.headingFont}}" font-size="26px" font-weight="700" color="{{brand.primary}}">Welcome back, {{firstName}}</mj-text>
          <mj-text>Re-enrollment closes <strong>{{deadline}}</strong>. Lock in your spot for the upcoming season today.</mj-text>
          {{#discountInfo}}<mj-text color="{{brand.accent}}"><strong>{{discountInfo}}</strong></mj-text>{{/discountInfo}}
          <mj-button href="{{registrationUrl}}">Re-enroll now</mj-button>
        </mj-column>
      </mj-section>
    `),
  },
  {
    key: "CommitCelebration",
    name: "Commit Celebration",
    category: "announcement",
    description: "Celebrate a player committing to the next level.",
    rendering_engine: "mjml",
    sort_order: 30,
    input_fields: [
      { key: "playerName", label: "Player name", type: "text", required: true },
      { key: "school", label: "School", type: "text", required: true },
      { key: "photoUrl", label: "Player photo URL", type: "url" },
      { key: "message", label: "Team message", type: "textarea" },
    ],
    preview_props: { playerName: "Jordan Smith", school: "State University", photoUrl: "", message: "We're so proud of how hard you worked." },
    mjml: wrap(`
      <mj-section padding="32px 24px">
        <mj-column>
          {{#photoUrl}}<mj-image src="{{photoUrl}}" alt="{{playerName}}" border-radius="8px" />{{/photoUrl}}
          <mj-text font-family="{{brand.headingFont}}" font-size="30px" font-weight="700" color="{{brand.primary}}" align="center">🎉 {{playerName}} commits to {{school}}!</mj-text>
          <mj-text align="center">{{message}}</mj-text>
          <mj-text align="center" color="{{brand.accent}}" font-weight="700">Congratulations from the entire {{brand.orgName}} family.</mj-text>
        </mj-column>
      </mj-section>
    `),
  },
  {
    key: "EventInvite",
    name: "Event Invite",
    category: "event",
    description: "Invite contacts to any event with .ics attachment links.",
    rendering_engine: "mjml",
    sort_order: 40,
    input_fields: [
      { key: "eventTitle", label: "Event title", type: "text", required: true },
      { key: "eventDate", label: "Date", type: "text", required: true },
      { key: "eventTime", label: "Time", type: "text", required: true },
      { key: "location", label: "Location", type: "text", required: true },
      { key: "details", label: "Details", type: "textarea" },
      { key: "rsvpUrl", label: "RSVP URL", type: "url", required: true },
      { key: "addToCalendarUrl", label: "Add to calendar URL", type: "url" },
    ],
    preview_props: {
      eventTitle: "Spring Showcase", eventDate: "April 20", eventTime: "1:00 PM",
      location: "Memorial Stadium", details: "Open to families and recruiters.",
      rsvpUrl: "https://example.com/rsvp", addToCalendarUrl: "https://example.com/ics",
    },
    mjml: wrap(`
      <mj-section padding="32px 24px">
        <mj-column>
          <mj-text font-family="{{brand.headingFont}}" font-size="26px" font-weight="700" color="{{brand.primary}}">You're invited: {{eventTitle}}</mj-text>
          <mj-text><strong>{{eventDate}}</strong> · {{eventTime}}<br/>{{location}}</mj-text>
          {{#details}}<mj-text>{{details}}</mj-text>{{/details}}
          <mj-button href="{{rsvpUrl}}">RSVP</mj-button>
          {{#addToCalendarUrl}}<mj-text align="center"><a href="{{addToCalendarUrl}}" style="color:{{brand.primary}}">📅 Add to calendar</a></mj-text>{{/addToCalendarUrl}}
        </mj-column>
      </mj-section>
    `),
  },
  {
    key: "GameRecap",
    name: "Game Recap",
    category: "recap",
    description: "Share a game result with key plays and a link to the full recap.",
    rendering_engine: "mjml",
    sort_order: 50,
    input_fields: [
      { key: "headline", label: "Headline", type: "text", required: true },
      { key: "score", label: "Score line", type: "text", required: true },
      { key: "summary", label: "Summary", type: "textarea", required: true },
      { key: "photoUrl", label: "Photo URL", type: "url" },
      { key: "fullRecapUrl", label: "Full recap URL", type: "url" },
    ],
    preview_props: { headline: "Power BB takes the weekend!", score: "Power BB 7 — Eagles 3", summary: "Three doubles and a clutch ninth-inning save.", photoUrl: "", fullRecapUrl: "https://example.com" },
    mjml: wrap(`
      <mj-section padding="32px 24px">
        <mj-column>
          {{#photoUrl}}<mj-image src="{{photoUrl}}" alt="Game" border-radius="8px" />{{/photoUrl}}
          <mj-text font-family="{{brand.headingFont}}" font-size="26px" font-weight="700" color="{{brand.primary}}">{{headline}}</mj-text>
          <mj-text font-size="18px" font-weight="700" color="{{brand.accent}}">{{score}}</mj-text>
          <mj-text>{{summary}}</mj-text>
          {{#fullRecapUrl}}<mj-button href="{{fullRecapUrl}}">Read the full recap</mj-button>{{/fullRecapUrl}}
        </mj-column>
      </mj-section>
    `),
  },
  {
    key: "SponsorThankYou",
    name: "Sponsor Thank You",
    category: "announcement",
    description: "Recognize a sponsor and what their support enables.",
    rendering_engine: "mjml",
    sort_order: 60,
    input_fields: [
      { key: "sponsorName", label: "Sponsor name", type: "text", required: true },
      { key: "sponsorLogoUrl", label: "Sponsor logo URL", type: "url" },
      { key: "partnershipLength", label: "Partnership length", type: "text" },
      { key: "impactStatement", label: "What this sponsorship enables", type: "textarea", required: true },
      { key: "sponsorUrl", label: "Sponsor website", type: "url" },
    ],
    preview_props: { sponsorName: "Local Athletic Co.", sponsorLogoUrl: "", partnershipLength: "3 years", impactStatement: "New uniforms for every player this season.", sponsorUrl: "https://example.com" },
    mjml: wrap(`
      <mj-section padding="32px 24px">
        <mj-column>
          <mj-text font-family="{{brand.headingFont}}" font-size="24px" font-weight="700" color="{{brand.primary}}" align="center">Thank you, {{sponsorName}}</mj-text>
          {{#sponsorLogoUrl}}<mj-image src="{{sponsorLogoUrl}}" alt="{{sponsorName}}" width="180px" align="center" />{{/sponsorLogoUrl}}
          {{#partnershipLength}}<mj-text align="center" color="#71717a">A proud partner for {{partnershipLength}}</mj-text>{{/partnershipLength}}
          <mj-text>{{impactStatement}}</mj-text>
          {{#sponsorUrl}}<mj-button href="{{sponsorUrl}}">Visit {{sponsorName}}</mj-button>{{/sponsorUrl}}
        </mj-column>
      </mj-section>
    `),
  },
  {
    key: "WelcomeOnboarding",
    name: "Welcome / Onboarding",
    category: "transactional",
    description: "Welcome new families with a next-steps checklist.",
    rendering_engine: "mjml",
    sort_order: 70,
    input_fields: [
      { key: "firstName", label: "First name token", type: "text" },
      { key: "step1", label: "Step 1", type: "text", required: true },
      { key: "step2", label: "Step 2", type: "text", required: true },
      { key: "step3", label: "Step 3", type: "text" },
      { key: "portalUrl", label: "Portal / next-step URL", type: "url", required: true },
    ],
    preview_props: { firstName: "Alex", step1: "Complete your player profile", step2: "Upload medical clearance", step3: "Join the team chat", portalUrl: "https://example.com/portal" },
    mjml: wrap(`
      <mj-section padding="32px 24px">
        <mj-column>
          <mj-text font-family="{{brand.headingFont}}" font-size="26px" font-weight="700" color="{{brand.primary}}">Welcome, {{firstName}}</mj-text>
          <mj-text>We're glad you're here. Here's what to do next:</mj-text>
          <mj-text>✅ {{step1}}<br/>✅ {{step2}}{{#step3}}<br/>✅ {{step3}}{{/step3}}</mj-text>
          <mj-button href="{{portalUrl}}">Open your portal</mj-button>
        </mj-column>
      </mj-section>
    `),
  },
  {
    key: "SeasonKickoff",
    name: "Season Kickoff",
    category: "announcement",
    description: "Outline the upcoming season schedule, key dates, and coach intros.",
    rendering_engine: "mjml",
    sort_order: 80,
    input_fields: [
      { key: "seasonName", label: "Season name", type: "text", required: true },
      { key: "firstPracticeDate", label: "First practice date", type: "text", required: true },
      { key: "firstGameDate", label: "First game date", type: "text" },
      { key: "headCoachName", label: "Head coach name", type: "text" },
      { key: "scheduleUrl", label: "Full schedule URL", type: "url", required: true },
    ],
    preview_props: { seasonName: "Spring 2026", firstPracticeDate: "March 1", firstGameDate: "March 22", headCoachName: "Coach Rivera", scheduleUrl: "https://example.com/schedule" },
    mjml: wrap(`
      <mj-section padding="32px 24px">
        <mj-column>
          <mj-text font-family="{{brand.headingFont}}" font-size="28px" font-weight="700" color="{{brand.primary}}">{{seasonName}} — let's go.</mj-text>
          <mj-text>First practice: <strong>{{firstPracticeDate}}</strong>{{#firstGameDate}}<br/>First game: <strong>{{firstGameDate}}</strong>{{/firstGameDate}}{{#headCoachName}}<br/>Led by: <strong>{{headCoachName}}</strong>{{/headCoachName}}</mj-text>
          <mj-button href="{{scheduleUrl}}">View full schedule</mj-button>
        </mj-column>
      </mj-section>
    `),
  },
  {
    key: "Newsletter",
    name: "Newsletter (Multi-section)",
    category: "newsletter",
    description: "Flexible newsletter with up to three highlighted sections.",
    rendering_engine: "mjml",
    sort_order: 90,
    input_fields: [
      { key: "headline", label: "Headline", type: "text", required: true },
      { key: "intro", label: "Intro paragraph", type: "textarea" },
      { key: "section1Title", label: "Section 1 title", type: "text" },
      { key: "section1Body", label: "Section 1 body", type: "textarea" },
      { key: "section2Title", label: "Section 2 title", type: "text" },
      { key: "section2Body", label: "Section 2 body", type: "textarea" },
      { key: "section3Title", label: "Section 3 title", type: "text" },
      { key: "section3Body", label: "Section 3 body", type: "textarea" },
      { key: "ctaLabel", label: "CTA button text", type: "text" },
      { key: "ctaUrl", label: "CTA URL", type: "url" },
    ],
    preview_props: {
      headline: "This month at the club", intro: "What we shipped, what's coming.",
      section1Title: "Tryouts open", section1Body: "Sign up by April 1.",
      section2Title: "New coach", section2Body: "Welcome Coach Rivera.",
      section3Title: "Sponsor spotlight", section3Body: "Thanks to Local Athletic Co.",
      ctaLabel: "See more", ctaUrl: "https://example.com",
    },
    mjml: wrap(`
      <mj-section padding="32px 24px">
        <mj-column>
          <mj-text font-family="{{brand.headingFont}}" font-size="28px" font-weight="700" color="{{brand.primary}}">{{headline}}</mj-text>
          {{#intro}}<mj-text>{{intro}}</mj-text>{{/intro}}
        </mj-column>
      </mj-section>
      {{#section1Title}}
      <mj-section padding="0 24px 16px">
        <mj-column>
          <mj-text font-weight="700" color="{{brand.primary}}" font-size="18px">{{section1Title}}</mj-text>
          <mj-text>{{section1Body}}</mj-text>
        </mj-column>
      </mj-section>
      {{/section1Title}}
      {{#section2Title}}
      <mj-section padding="0 24px 16px">
        <mj-column>
          <mj-text font-weight="700" color="{{brand.primary}}" font-size="18px">{{section2Title}}</mj-text>
          <mj-text>{{section2Body}}</mj-text>
        </mj-column>
      </mj-section>
      {{/section2Title}}
      {{#section3Title}}
      <mj-section padding="0 24px 16px">
        <mj-column>
          <mj-text font-weight="700" color="{{brand.primary}}" font-size="18px">{{section3Title}}</mj-text>
          <mj-text>{{section3Body}}</mj-text>
        </mj-column>
      </mj-section>
      {{/section3Title}}
      {{#ctaUrl}}
      <mj-section padding="16px 24px 32px">
        <mj-column>
          <mj-button href="{{ctaUrl}}">{{ctaLabel}}</mj-button>
        </mj-column>
      </mj-section>
      {{/ctaUrl}}
    `),
  },
  {
    key: "GenericAnnouncement",
    name: "Generic Announcement",
    category: "announcement",
    description: "Single message + CTA fallback for anything else.",
    rendering_engine: "mjml",
    sort_order: 100,
    input_fields: [
      { key: "headline", label: "Headline", type: "text", required: true },
      { key: "body", label: "Body", type: "textarea", required: true },
      { key: "ctaLabel", label: "CTA button text", type: "text" },
      { key: "ctaUrl", label: "CTA URL", type: "url" },
    ],
    preview_props: { headline: "Big news", body: "Something important to share with the family.", ctaLabel: "Learn more", ctaUrl: "https://example.com" },
    mjml: wrap(`
      <mj-section padding="32px 24px">
        <mj-column>
          <mj-text font-family="{{brand.headingFont}}" font-size="26px" font-weight="700" color="{{brand.primary}}">{{headline}}</mj-text>
          <mj-text>{{body}}</mj-text>
          {{#ctaUrl}}<mj-button href="{{ctaUrl}}">{{ctaLabel}}</mj-button>{{/ctaUrl}}
        </mj-column>
      </mj-section>
    `),
  },
];

export const SYSTEM_TEMPLATE_BY_KEY: Record<string, SystemTemplate> =
  Object.fromEntries(SYSTEM_TEMPLATES.map((t) => [t.key, t]));
