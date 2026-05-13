/**
 * Route registry for the auto-injected mobile page header.
 * - `top` routes: render title only, no back button (these are the bottom-tab destinations)
 * - everything else: back button + matched title
 *
 * Patterns use simple ":param" segments — matching is done left-to-right with a literal
 * segment match or a `:` placeholder match.
 */

export type MobileRouteEntry = {
  pattern: string;
  title: string | ((params: Record<string, string>) => string);
  /** Top-level (no back button). */
  top?: boolean;
  /** If provided, back navigates here instead of history. */
  backTo?: string | ((params: Record<string, string>) => string);
};

const ENTRIES: MobileRouteEntry[] = [
  // ---------- Org user top-level ----------
  { pattern: "/dashboard", title: "Dashboard", top: true },
  { pattern: "/report", title: "My Report", top: true },
  { pattern: "/plan", title: "Action Plan", top: true },
  { pattern: "/team", title: "Team", top: true },
  { pattern: "/settings", title: "Settings", top: true },
  { pattern: "/communications", title: "Communications", top: true },
  { pattern: "/sponsorships", title: "Sponsorships", top: true },
  { pattern: "/calculators", title: "Calculators", top: true },
  { pattern: "/marketing", title: "Marketing", top: true },
  { pattern: "/customize", title: "Customize" },
  { pattern: "/intake", title: "Intake" },
  { pattern: "/welcome", title: "Welcome", top: true },

  // ---------- Marketing (org) ----------
  { pattern: "/marketing/brand-kit", title: "Brand Kit", backTo: "/marketing" },
  { pattern: "/marketing/contacts", title: "Contacts", backTo: "/marketing" },
  { pattern: "/marketing/email-setup", title: "Email Setup", backTo: "/marketing" },
  { pattern: "/marketing/designs", title: "Designs", backTo: "/marketing" },
  { pattern: "/marketing/designs/:id", title: "Edit Design", backTo: "/marketing/designs" },
  { pattern: "/marketing/emails", title: "Emails", backTo: "/marketing" },
  { pattern: "/marketing/emails/new", title: "New Email", backTo: "/marketing/emails" },
  { pattern: "/marketing/campaigns", title: "Campaigns", backTo: "/marketing" },
  { pattern: "/marketing/campaigns/:id", title: "Campaign", backTo: "/marketing/campaigns" },
  { pattern: "/marketing/approvals", title: "Approvals", backTo: "/marketing" },
  { pattern: "/marketing/shortlinks", title: "Shortlinks", backTo: "/marketing" },
  { pattern: "/marketing/ab-tests", title: "A/B Tests", backTo: "/marketing" },
  { pattern: "/marketing/send-times", title: "Send Times", backTo: "/marketing" },
  { pattern: "/marketing/sms-companion", title: "SMS Companion", backTo: "/marketing" },
  { pattern: "/marketing/social", title: "Social Accounts", backTo: "/marketing" },
  { pattern: "/marketing/sequences", title: "Sequences", backTo: "/marketing" },
  { pattern: "/marketing/sequences/:id", title: "Sequence", backTo: "/marketing/sequences" },
  { pattern: "/marketing/sequences/:id/launch", title: "Launch Sequence", backTo: ({ id }) => `/marketing/sequences/${id}` },
  { pattern: "/marketing/sms-setup", title: "SMS Setup", backTo: "/marketing" },
  { pattern: "/marketing/sms", title: "SMS", backTo: "/marketing" },
  { pattern: "/marketing/sms/new", title: "New SMS", backTo: "/marketing/sms" },
  { pattern: "/marketing/nps", title: "NPS Surveys", backTo: "/marketing" },
  { pattern: "/marketing/nps/:id", title: "Survey", backTo: "/marketing/nps" },

  // ---------- Admin top-level ----------
  { pattern: "/admin", title: "Organizations", top: true },
  { pattern: "/admin/my-tasks", title: "My Tasks", top: true },
  { pattern: "/admin/weekly-focus", title: "Weekly Focus", top: true },
  { pattern: "/admin/communications", title: "Communications", top: true },

  // ---------- Admin acting on behalf of org ----------
  { pattern: "/admin/orgs", title: "Browse Orgs", backTo: "/admin" },
  { pattern: "/admin/orgs/:orgId/marketing", title: "Marketing", backTo: "/admin/orgs" },
  { pattern: "/admin/orgs/:orgId/marketing/brand-kit", title: "Brand Kit", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/contacts", title: "Contacts", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/email-setup", title: "Email Setup", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/designs", title: "Designs", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/designs/:id", title: "Edit Design", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing/designs` },
  { pattern: "/admin/orgs/:orgId/marketing/emails", title: "Emails", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/emails/new", title: "New Email", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing/emails` },
  { pattern: "/admin/orgs/:orgId/marketing/campaigns", title: "Campaigns", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/campaigns/:id", title: "Campaign", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing/campaigns` },
  { pattern: "/admin/orgs/:orgId/marketing/approvals", title: "Approvals", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/shortlinks", title: "Shortlinks", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/ab-tests", title: "A/B Tests", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/send-times", title: "Send Times", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/sms-companion", title: "SMS Companion", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/social", title: "Social Accounts", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/sequences", title: "Sequences", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/sequences/:id", title: "Sequence", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing/sequences` },
  { pattern: "/admin/orgs/:orgId/marketing/sequences/:id/launch", title: "Launch", backTo: ({ orgId, id }) => `/admin/orgs/${orgId}/marketing/sequences/${id}` },
  { pattern: "/admin/orgs/:orgId/marketing/sms-setup", title: "SMS Setup", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/sms", title: "SMS", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/sms/new", title: "New SMS", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing/sms` },
  { pattern: "/admin/orgs/:orgId/marketing/nps", title: "NPS Surveys", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing` },
  { pattern: "/admin/orgs/:orgId/marketing/nps/:id", title: "Survey", backTo: ({ orgId }) => `/admin/orgs/${orgId}/marketing/nps` },

  // ---------- Admin marketing library ----------
  { pattern: "/admin/marketing/templates", title: "Design Templates" },
  { pattern: "/admin/marketing/email-templates", title: "Email Templates" },
  { pattern: "/admin/marketing/sequence-templates", title: "Sequence Templates" },
  { pattern: "/admin/marketing/schools", title: "Schools Library" },
  { pattern: "/admin/marketing/portfolio", title: "Portfolio Analytics" },
  { pattern: "/admin/marketing/approvals", title: "Curve Approvals" },

  // ---------- Admin org detail / library ----------
  { pattern: "/admin/org/:orgId", title: "Organization" },
  { pattern: "/admin/org/:orgId/tasks", title: "Tasks" },
  { pattern: "/admin/org/:orgId/engine/:engine", title: "Engine" },
  { pattern: "/admin/org/:orgId/branding", title: "Branding" },
  { pattern: "/admin/tasks", title: "Portfolio Health" },
  { pattern: "/admin/tasks-this-week", title: "This Week" },
  { pattern: "/admin/task-tracker", title: "Task Tracker" },
  { pattern: "/admin/health", title: "Health Reports" },
  { pattern: "/admin/presentations", title: "Presentations" },
  { pattern: "/admin/pipeline", title: "Sponsorship Pipeline" },
  { pattern: "/admin/revenue-share", title: "Revenue Share" },
  { pattern: "/admin/revenue-share/:orgId", title: "Revenue Share", backTo: "/admin/revenue-share" },
  { pattern: "/admin/templates", title: "Task Library" },
  { pattern: "/admin/users", title: "Users" },
  { pattern: "/admin/invite", title: "Invite User", backTo: "/admin/users" },
  { pattern: "/admin/roadmap", title: "Roadmap" },

  // Acquisitions
  { pattern: "/admin/acquisitions", title: "Acquisitions" },
  { pattern: "/admin/acquisitions/settings", title: "Acquisitions Settings", backTo: "/admin/acquisitions" },
  { pattern: "/admin/acquisitions/compliance", title: "Compliance", backTo: "/admin/acquisitions" },
  { pattern: "/admin/acquisitions/meetings", title: "Meetings", backTo: "/admin/acquisitions" },
  { pattern: "/admin/acquisitions/:id", title: "Acquisition", backTo: "/admin/acquisitions" },
  { pattern: "/admin/acquisitions/:id/transcript/:transcriptId", title: "Transcript", backTo: ({ id }) => `/admin/acquisitions/${id}` },
  { pattern: "/admin/acquisitions/transcript/:transcriptId", title: "Transcript", backTo: "/admin/acquisitions/meetings" },
];

function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const pSegs = pattern.split("/").filter(Boolean);
  const aSegs = pathname.split("/").filter(Boolean);
  if (pSegs.length !== aSegs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pSegs.length; i++) {
    const p = pSegs[i];
    const a = aSegs[i];
    if (p.startsWith(":")) {
      params[p.slice(1)] = decodeURIComponent(a);
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

export type ResolvedMobileRoute = {
  title: string;
  top: boolean;
  backTo?: string;
};

export function resolveMobileRoute(pathname: string): ResolvedMobileRoute | null {
  // Prefer the most specific (longest) pattern that matches.
  let best: { entry: MobileRouteEntry; params: Record<string, string>; specificity: number } | null = null;
  for (const entry of ENTRIES) {
    const params = matchPattern(entry.pattern, pathname);
    if (!params) continue;
    const specificity = entry.pattern.split("/").filter((s) => s && !s.startsWith(":")).length * 10
      + entry.pattern.split("/").length;
    if (!best || specificity > best.specificity) {
      best = { entry, params, specificity };
    }
  }
  if (!best) return null;
  const { entry, params } = best;
  const title = typeof entry.title === "function" ? entry.title(params) : entry.title;
  const backTo = typeof entry.backTo === "function" ? entry.backTo(params) : entry.backTo;
  return { title, top: !!entry.top, backTo };
}
