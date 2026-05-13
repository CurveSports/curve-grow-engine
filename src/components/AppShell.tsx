import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { cn } from "@/lib/utils";
import { PageTransition } from "@/components/motion/PageTransition";
import {
  LayoutDashboard, Grid3x3, ListChecks, FileText, BarChart3,
  Settings, LogOut, Users, Megaphone, Calculator, Mail, Sparkles, UserCircle2, UsersRound, Target, GanttChartSquare, DollarSign, Briefcase, Mic, Plug,
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
      { to: "/admin/marketing/approvals", label: "Marketing Approvals", icon: Megaphone, match: (p) => p.startsWith("/admin/marketing/approvals") },
      { to: "/admin/pipeline", label: "Sponsorship Pipeline", icon: DollarSign, match: (p) => p.startsWith("/admin/pipeline") },
      { to: "/admin/revenue-share", label: "Revenue Share", icon: Calculator, match: (p) => p.startsWith("/admin/revenue-share") },
    ],
  },
  {
    label: "Library",
    items: [
      { to: "/admin/templates", label: "Task Library", icon: FileText, match: (p) => p.startsWith("/admin/templates") },
      { to: "/admin/marketing/templates", label: "Design Templates", icon: Sparkles, match: (p) => p.startsWith("/admin/marketing/templates") },
      { to: "/admin/marketing/email-templates", label: "Email Templates", icon: Sparkles, match: (p) => p.startsWith("/admin/marketing/email-templates") },
      { to: "/admin/presentations", label: "Presentations", icon: Sparkles, match: (p) => p.startsWith("/admin/presentations") },
      { to: "/calculators", label: "Calculators", icon: Calculator, match: (p) => p.startsWith("/calculators") },
      { to: "/admin/communications", label: "Communications", icon: Mail, match: (p) => p.startsWith("/admin/communications") || p.startsWith("/communications") },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/admin/users", label: "Users", icon: UsersRound, match: (p) => p.startsWith("/admin/users") || p.startsWith("/admin/invite") },
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
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/marketing", label: "Marketing", icon: Sparkles, match: (p) => p.startsWith("/marketing") },
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
  // Admin marketing items are gated by the "marketing" module
  const marketingPaths = ["/admin/marketing/approvals", "/admin/marketing/templates", "/admin/marketing/email-templates"];
  const filteredAllegianceGroups: NavGroup[] = role === "admin" && !hasModule("marketing")
    ? allegianceGroups.map((g) => ({ ...g, items: g.items.filter((it) => !it.to || !marketingPaths.includes(it.to)) }))
    : allegianceGroups;
  let groups = role === "admin" && hasModule("acquisitions")
    ? [...filteredAllegianceGroups, acquisitionsGroup]
    : (role === "admin" ? filteredAllegianceGroups : baseGroups);
  if (isCurveOwner) groups = [...groups, systemGroup];
  const showTeam = role === "org_user" && isPrimary;

  const isItemActive = (item: NavItem) =>
    item.to ? (item.match ? item.match(location.pathname) : location.pathname === item.to) : false;

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
      <header className="md:hidden sticky top-0 h-14 bg-nav text-white flex items-center justify-between px-4 z-30 border-b border-nav-border">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Home">
          <img src={logoUrl ?? logoIconWhite} alt="" className="h-6 w-6 max-w-[120px] object-contain" />
          <span className="font-display font-semibold text-sm tracking-tight">{title ?? "Curve OS"}</span>
        </Link>
        <button onClick={signOut} className="text-xs text-nav-muted hover:text-white" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
      </header>

      {/* Main content */}
      <main className="md:ml-[240px] md:pt-[60px] pb-20 md:pb-0 min-h-screen">
        <PageTransition
          key={location.pathname}
          className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8"
        >
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
