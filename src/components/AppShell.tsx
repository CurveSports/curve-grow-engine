import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/motion/PageTransition";
import ImpersonationBanner from "@/components/marketing/ImpersonationBanner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { resolveMobileRoute } from "@/components/mobile/mobileRoutes";
import {
  LayoutDashboard, Grid3x3, ListChecks, FileText, BarChart3,
  Settings, LogOut, Users, Megaphone, Calculator, Mail, Sparkles, UserCircle2, UsersRound, Target, GanttChartSquare, DollarSign, Briefcase, Mic, Plug,
  Palette, Image as ImageIcon, Send, MessageSquare, Share2, Workflow, Smile, CheckSquare, Link2, FlaskConical, Clock, BarChart2, Building2, GraduationCap, CalendarDays, Inbox, ClipboardList, Search,
  Menu, Folder,
} from "lucide-react";
import logoIconWhite from "@/assets/curve-logo-icon-white.png";
import logoFullWhite from "@/assets/curve-logo-full-white.png";

type NavItem = {
  to?: string;
  label: string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
  match?: (path: string) => boolean;
};

type NavGroup = {
  label?: string; // omit for top group
  items: NavItem[];
};

const ADMIN_GROUPS: NavGroup[] = [
  {
    items: [
      { to: "/admin", label: "Organizations", icon: Grid3x3, match: (p) => p === "/admin" || p.startsWith("/admin/org") },
      { to: "/admin/my-tasks", label: "My Tasks", icon: UserCircle2, match: (p) => p.startsWith("/admin/my-tasks") },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/tasks", label: "Portfolio Health", icon: ListChecks, match: (p) => p.startsWith("/admin/tasks") },
      { to: "/admin/weekly-focus", label: "Weekly Focus", icon: Target, match: (p) => p.startsWith("/admin/weekly-focus") },
      { to: "/admin/roadmap", label: "Roadmap", icon: GanttChartSquare, match: (p) => p.startsWith("/admin/roadmap") },
      { to: "/admin/pipeline", label: "Sponsorship Pipeline", icon: DollarSign, match: (p) => p.startsWith("/admin/pipeline") },
      { to: "/admin/revenue-share", label: "Revenue Share", icon: Calculator, match: (p) => p.startsWith("/admin/revenue-share") },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/admin/revenue-audits", label: "Revenue Audits", icon: ClipboardList, match: (p) => p.startsWith("/admin/revenue-audits") },
    ],
  },
  {
    label: "Library",
    items: [
      { to: "/admin/templates", label: "Task Library", icon: FileText, match: (p) => p.startsWith("/admin/templates") },
      { to: "/admin/presentations", label: "Presentations", icon: Sparkles, match: (p) => p.startsWith("/admin/presentations") },
      { to: "/calculators", label: "Calculators", icon: Calculator, match: (p) => p.startsWith("/calculators") },
      { to: "/admin/communications", label: "Communications", icon: Mail, match: (p) => p.startsWith("/admin/communications") || p.startsWith("/communications") },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/admin/users", label: "Users", icon: UsersRound, match: (p) => p === "/admin/users" || p.startsWith("/admin/invite") },
      { to: "/admin/users/lookup", label: "User Lookup", icon: Search, match: (p) => p.startsWith("/admin/users/lookup") },
      { to: "/admin/reports", label: "Internal Reports", icon: BarChart3, match: (p) => p.startsWith("/admin/reports") },
    ],
  },
];

// Mobile bottom-nav for admins (curated 4 highest-frequency tabs)
const ADMIN_MOBILE: NavItem[] = [
  { to: "/admin", label: "Orgs", icon: Grid3x3, match: (p) => p === "/admin" || p.startsWith("/admin/org") },
  { to: "/admin/my-tasks", label: "My Tasks", icon: UserCircle2, match: (p) => p.startsWith("/admin/my-tasks") },
  { to: "/admin/weekly-focus", label: "Focus", icon: Target, match: (p) => p.startsWith("/admin/weekly-focus") },
  { to: "/admin/communications", label: "Comms", icon: Mail, match: (p) => p.startsWith("/admin/communications") || p.startsWith("/communications") },
];

const ORG_GROUPS: NavGroup[] = [
  {
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
      { to: "/report", label: "My Report", icon: FileText, match: (p) => p === "/report" },
      { to: "/plan", label: "Action Plan", icon: ListChecks, match: (p) => p.startsWith("/plan") },
      { to: "/files", label: "Shared Files", icon: Folder, match: (p) => p.startsWith("/files") },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/marketing", label: "Hub", icon: Sparkles, match: (p) => p === "/marketing" },
      { to: "/marketing/create", label: "Create", icon: ImageIcon, match: (p) => p.startsWith("/marketing/create") || p.startsWith("/marketing/designs") || p.startsWith("/marketing/emails") || p.startsWith("/marketing/sms") || p.startsWith("/marketing/social") || p.startsWith("/marketing/sequences") },
      { to: "/marketing/media", label: "Content Library", icon: Folder, match: (p) => p.startsWith("/marketing/media") || p.startsWith("/marketing/library") },
      { to: "/marketing/contacts", label: "Audience", icon: UsersRound, match: (p) => p.startsWith("/marketing/contacts") || p.startsWith("/marketing/brand-kit") },
      { to: "/marketing/campaigns", label: "Campaigns", icon: Megaphone, match: (p) => p.startsWith("/marketing/campaigns") || p.startsWith("/marketing/approvals") },
      { to: "/marketing/insights", label: "Insights", icon: BarChart2, match: (p) => p.startsWith("/marketing/insights") || p.startsWith("/marketing/ab-tests") || p.startsWith("/marketing/send-times") || p.startsWith("/marketing/shortlinks") },
    ],
  },
  {
    label: "Retention & Referrals",
    items: [
      { to: "/retention", label: "Hub", icon: Smile, match: (p) => p === "/retention" },
      { to: "/retention/surveys", label: "Parent Surveys", icon: Smile, match: (p) => p.startsWith("/retention/surveys") || p.startsWith("/marketing/nps") },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/calculators", label: "Calculators", icon: Calculator, match: (p) => p === "/calculators" },
      { to: "/communications", label: "Communications", icon: Mail, match: (p) => p === "/communications" },
      { to: "/sponsorships", label: "Sponsorships", icon: Megaphone, match: (p) => p.startsWith("/sponsorships") },
    ],
  },
];

export default function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { role, profile, signOut, isPrimary } = useAuth();
  const { logoUrl } = useBranding();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Auto-close drawer on route change
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  const { hasModule } = useAuth();
  const baseGroups = role === "admin" ? ADMIN_GROUPS : ORG_GROUPS;
  const acquisitionsGroup: NavGroup = {
    label: "Acquisitions",
    items: [
      { to: "/admin/acquisitions", label: "Dashboard", icon: Briefcase, match: (p) => p === "/admin/acquisitions" || (p.startsWith("/admin/acquisitions/") && !p.startsWith("/admin/acquisitions/settings") && !p.startsWith("/admin/acquisitions/compliance")) },
      { to: "/admin/acquisitions/compliance", label: "Compliance", icon: ListChecks, match: (p) => p.startsWith("/admin/acquisitions/compliance") },
      { to: "/admin/acquisitions/meetings", label: "Meetings", icon: Mic, match: (p) => p.startsWith("/admin/acquisitions/meetings") },
      { label: "Documents", icon: FileText, soon: true },
      { label: "Reports", icon: BarChart3, soon: true },
      { to: "/admin/acquisitions/settings", label: "Templates", icon: Settings, match: (p) => p.startsWith("/admin/acquisitions/settings") },
    ],
  };
  const allegianceGroups: NavGroup[] = role === "admin"
    ? [{ ...baseGroups[0] }, ...baseGroups.slice(1).map((g, i) => i === 0 ? { ...g, label: "Allegiance" } : g)]
    : baseGroups;
  const isCurveOwner = role === "admin" && profile?.email?.toLowerCase() === "matt.gerber@curvesports.com";
  const systemGroup: NavGroup = {
    label: "System",
    items: [
      { to: "/admin/system/wiring-status", label: "Integrations", icon: Plug, match: (p) => p.startsWith("/admin/system") },
    ],
  };
  const adminMarketingGroup: NavGroup = {
    label: "Marketing",
    items: [
      { to: "/admin/orgs", label: "Browse Orgs", icon: Building2, match: (p) => p === "/admin/orgs" || /^\/admin\/orgs\/[0-9a-fA-F-]{36}/.test(p) },
      { to: "/admin/marketing/portfolio", label: "Analytics", icon: BarChart2, match: (p) => p.startsWith("/admin/marketing/portfolio") },
      { to: "/admin/marketing/templates", label: "Design Templates", icon: Sparkles, match: (p) => p === "/admin/marketing/templates" },
      { to: "/admin/marketing/system-prompt", label: "Design System Prompt", icon: Sparkles, match: (p) => p.startsWith("/admin/marketing/system-prompt") },
      { to: "/admin/marketing/email-templates", label: "Email Templates", icon: Mail, match: (p) => p.startsWith("/admin/marketing/email-templates") },
      { to: "/admin/marketing/sequence-templates", label: "Sequence Templates", icon: Workflow, match: (p) => p.startsWith("/admin/marketing/sequence-templates") },
      { to: "/admin/marketing/schools", label: "Schools Library", icon: GraduationCap, match: (p) => p.startsWith("/admin/marketing/schools") },
      { to: "/admin/marketing/audits", label: "Audits", icon: ClipboardList, match: (p) => p.startsWith("/admin/marketing/audits") },
    ],
  };
  const adminRetentionGroup: NavGroup = {
    label: "Retention & Referrals",
    items: [
      { to: "/admin/retention/surveys", label: "Parent Surveys", icon: Smile, match: (p) => p.startsWith("/admin/retention/surveys") || p.startsWith("/admin/marketing/nps") },
      { to: "/admin/retention/question-bank", label: "Core Question Bank", icon: ListChecks, match: (p) => p.startsWith("/admin/retention/question-bank") },
    ],
  };
  const adminEventsGroup: NavGroup = {
    label: "Events",
    items: [
      { to: "/admin/events/intake", label: "Payment Intake", icon: Inbox, match: (p) => p.startsWith("/admin/events/intake") },
    ],
  };
  // Org users without marketing module shouldn't see the Marketing group
  const filteredBaseGroups: NavGroup[] = role === "org_user" && !hasModule("marketing")
    ? baseGroups.filter((g) => g.label !== "Marketing")
    : baseGroups;
  let groups = role === "admin" && hasModule("acquisitions")
    ? [...allegianceGroups, acquisitionsGroup]
    : (role === "admin" ? allegianceGroups : filteredBaseGroups);
  if (role === "admin" && hasModule("marketing")) groups = [...groups, adminMarketingGroup, adminRetentionGroup];
  if (role === "admin" && hasModule("events")) groups = [...groups, adminEventsGroup];

  // When an admin is impersonating an org (URL: /admin/orgs/:orgId/marketing/...),
  // swap the sidebar to the ORG marketing nav, but rewrite every link to the
  // admin-scoped URL so navigation stays inside the impersonation context.
  const impersonateMatch = location.pathname.match(/^\/admin\/orgs\/([0-9a-fA-F-]{36})(?:\/|$)/);
  const impersonatedOrgId = role === "admin" && impersonateMatch ? impersonateMatch[1] : null;
  if (impersonatedOrgId) {
    const prefix = `/admin/orgs/${impersonatedOrgId}`;
    const rewriteItem = (it: NavItem): NavItem => {
      if (!it.to || !(it.to.startsWith("/marketing") || it.to.startsWith("/retention"))) return it;
      const newTo = `${prefix}${it.to}`;
      return {
        ...it,
        to: newTo,
        match: (p) => p === newTo || p.startsWith(newTo + "/") || p.startsWith(newTo + "?"),
      };
    };
    groups = ORG_GROUPS
      .filter((g) => g.label === "Marketing" || g.label === "Retention & Referrals")
      .map((g) => ({ ...g, items: g.items.map(rewriteItem) }));
  }
  if (isCurveOwner) groups = [...groups, systemGroup];
  const showTeam = role === "org_user" && isPrimary;

  // Pick the single best-matching nav item across ALL groups: prefer custom
  // match() hits, then fall back to the longest `to` that prefixes the path.
  // This guarantees sub-routes (e.g. /marketing/sms-companion) light up the
  // most specific item and never highlight two items at once.
  const activeKey = (() => {
    const all = groups.flatMap((g) => g.items);
    const path = location.pathname;
    const matched = all.filter((it) => it.to && (it.match ? it.match(path) : path === it.to));
    if (matched.length === 0) return null;
    matched.sort((a, b) => (b.to?.length ?? 0) - (a.to?.length ?? 0));
    return matched[0].label;
  })();
  const isItemActive = (item: NavItem) => !!item.to && item.label === activeKey;

  // Flat list for mobile bottom-nav fallback (org users)
  const flatPrimary = groups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[240px] bg-nav text-nav-foreground flex-col z-40 border-r border-nav-border">
        <div className="h-[60px] flex items-center px-5 border-b border-nav-border">
          <Link to="/" className="flex items-center" aria-label="Home">
            <img
              src={logoUrl ?? logoFullWhite}
              alt="Organization logo"
              className="h-7 w-auto max-w-[180px] object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {groups.map((group, gi) => (
            <div key={group.label ?? `g-${gi}`} className={gi > 0 ? "mt-5" : ""}>
              {group.label && (
                <div className="mb-1.5 px-3 text-[10px] uppercase tracking-[0.18em] text-nav-muted/70 font-bold">
                  {group.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <SidebarLink item={item} active={isItemActive(item)} />
                  </li>
                ))}
                {gi === 0 && showTeam && (
                  <li>
                    <SidebarLink
                      item={{ to: "/team", label: "Team", icon: Users, match: (p) => p === "/team" }}
                      active={location.pathname === "/team"}
                    />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-nav-border p-3">
          <SidebarLink
            item={{ to: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") }}
            active={location.pathname.startsWith("/settings")}
          />
          <div className="mt-3 px-3 py-3 rounded-lg bg-nav-hover/50">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? profile?.email ?? "Account"}</p>
            <p className="text-xs text-nav-muted truncate">{profile?.email}</p>
            <button
              onClick={signOut}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-nav-muted hover:text-white transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop top header */}
      <header className="hidden md:flex fixed top-0 left-[240px] right-0 h-[60px] bg-nav text-white items-center justify-between px-8 z-30 border-b border-nav-border">
        <h1 className="font-display text-base font-semibold tracking-tight text-white">{title ?? "\u00A0"}</h1>
        <div className="flex items-center gap-3 text-sm text-nav-muted">
          <span className="hidden lg:inline">{profile?.email}</span>
          <div className="h-8 w-8 rounded-full bg-lime text-lime-foreground flex items-center justify-center font-bold text-xs">
            {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 h-14 bg-nav text-white flex items-center justify-between px-3 z-30 border-b border-nav-border">
        <div className="flex items-center gap-1">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <button
                className="p-2 -ml-1 rounded-md hover:bg-nav-hover text-white"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-nav text-nav-foreground border-nav-border">
              <div className="h-[60px] flex items-center px-5 border-b border-nav-border">
                <img
                  src={logoUrl ?? logoFullWhite}
                  alt="Organization logo"
                  className="h-7 w-auto max-w-[180px] object-contain"
                />
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-3 max-h-[calc(100vh-60px-100px)]">
                {groups.map((group, gi) => (
                  <div key={group.label ?? `mg-${gi}`} className={gi > 0 ? "mt-5" : ""}>
                    {group.label && (
                      <div className="mb-1.5 px-3 text-[10px] uppercase tracking-[0.18em] text-nav-muted/70 font-bold">
                        {group.label}
                      </div>
                    )}
                    <ul className="space-y-0.5">
                      {group.items.map((item) => (
                        <li key={item.label}>
                          <SidebarLink item={item} active={isItemActive(item)} />
                        </li>
                      ))}
                      {gi === 0 && showTeam && (
                        <li>
                          <SidebarLink
                            item={{ to: "/team", label: "Team", icon: Users, match: (p) => p === "/team" }}
                            active={location.pathname === "/team"}
                          />
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </nav>
              <div className="border-t border-nav-border p-3">
                <SidebarLink
                  item={{ to: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") }}
                  active={location.pathname.startsWith("/settings")}
                />
                <button
                  onClick={signOut}
                  className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-xs text-nav-muted hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2.5" aria-label="Home">
            <img src={logoUrl ?? logoIconWhite} alt="" className="h-6 w-6 max-w-[120px] object-contain" />
            <span className="font-display font-semibold text-sm tracking-tight truncate max-w-[160px]">{title ?? "Curve OS"}</span>
          </Link>
        </div>
        <button onClick={signOut} className="text-xs text-nav-muted hover:text-white p-2" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
      </header>

      {/* Main content */}
      <main className="md:ml-[240px] md:pt-[60px] pb-20 md:pb-0 min-h-screen">
        <ImpersonationBanner />
        {/\/marketing(\/|$)/.test(location.pathname) && (
          <div className="bg-amber-500/15 border-y border-amber-500/40 text-amber-900 dark:text-amber-200">
            <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-2.5 text-xs md:text-sm font-medium flex items-center gap-2">
              <span aria-hidden>🚧</span>
              <span>
                <strong>Under Construction</strong> — Marketing features are still being tested. Output may be rough or incomplete. Please don't rely on these for live campaigns yet.
              </span>
            </div>
          </div>
        )}
        <PageTransition
          key={location.pathname}
          className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8"
        >
          {(() => {
            const r = resolveMobileRoute(location.pathname);
            if (!r) return null;
            return <MobilePageHeader title={r.title} hideBack={r.top} backTo={r.backTo} />;
          })()}
          {children}
        </PageTransition>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-nav text-nav-foreground border-t border-nav-border z-40 flex items-stretch">
        {(role === "admin" ? ADMIN_MOBILE : flatPrimary.slice(0, 4)).map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          return (
            <Link
              key={item.label}
              to={item.to ?? "#"}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px]",
                active ? "text-lime" : "text-nav-muted hover:text-white",
              )}
            >
              {active && <span className="absolute top-0 h-0.5 w-10 bg-lime rounded-b-full" />}
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
        {role !== "admin" && showTeam && (
          <Link to="/team" className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px]",
            location.pathname === "/team" ? "text-lime" : "text-nav-muted",
          )}>
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Team</span>
          </Link>
        )}
      </nav>
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const content = (
    <div className={cn(
      "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[40px]",
      item.soon && "opacity-50 cursor-not-allowed",
      !item.soon && !active && "text-nav-muted hover:text-white hover:bg-nav-hover",
      active && "bg-lime text-lime-foreground font-semibold",
    )}>
      {active && <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-1 bg-lime rounded-r-full" />}
      <Icon className="h-[18px] w-[18px] flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.soon && (
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-nav-hover text-nav-muted font-semibold">Soon</span>
      )}
    </div>
  );
  if (item.soon || !item.to) return <div>{content}</div>;
  return <Link to={item.to}>{content}</Link>;
}
