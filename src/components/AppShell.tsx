import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Grid3x3, ListChecks, FileText, BarChart3,
  Settings, LogOut, Users, Megaphone, Calculator, Mail, TrendingUp, Sparkles, BookOpen, UserCircle2, UsersRound,
} from "lucide-react";

type NavItem = {
  to?: string;
  label: string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
  match?: (path: string) => boolean;
};

const ADMIN_PRIMARY: NavItem[] = [
  { to: "/admin", label: "Home", icon: LayoutDashboard, match: (p) => p === "/admin" },
  { to: "/admin", label: "Organizations", icon: Grid3x3, match: (p) => p.startsWith("/admin/org") || p === "/admin" },
  { to: "/admin/my-tasks", label: "My Tasks", icon: UserCircle2, match: (p) => p.startsWith("/admin/my-tasks") },
  { to: "/admin/tasks", label: "Portfolio Tasks", icon: ListChecks, match: (p) => p.startsWith("/admin/tasks") },
  { to: "/admin/templates", label: "Task Library", icon: FileText, match: (p) => p.startsWith("/admin/templates") },
  { to: "/admin/reports", label: "Internal Reports", icon: BarChart3, match: (p) => p.startsWith("/admin/reports") },
  { to: "/admin/presentations", label: "Presentations", icon: Sparkles, match: (p) => p.startsWith("/admin/presentations") },
  { to: "/calculators", label: "Calculators", icon: Calculator, match: (p) => p.startsWith("/calculators") },
  { to: "/admin/communications", label: "Communications", icon: Mail, match: (p) => p.startsWith("/admin/communications") || p.startsWith("/communications") },
  { to: "/admin/internal-resources", label: "Internal Resources", icon: BookOpen, match: (p) => p.startsWith("/admin/internal-resources") },
  { to: "/admin/users", label: "Users", icon: UsersRound, match: (p) => p.startsWith("/admin/users") || p.startsWith("/admin/invite") },
];
const ADMIN_SOON: NavItem[] = [
  { label: "Sponsorship Pipeline", icon: TrendingUp, soon: true },
  { label: "Analytics", icon: BarChart3, soon: true },
];

const ORG_PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  { to: "/report", label: "My Report", icon: FileText, match: (p) => p === "/report" },
  { to: "/plan", label: "Action Plan", icon: ListChecks, match: (p) => p.startsWith("/plan") },
  { to: "/calculators", label: "Calculators", icon: Calculator, match: (p) => p === "/calculators" },
  { to: "/communications", label: "Communications", icon: Mail, match: (p) => p === "/communications" },
];
const ORG_SOON: NavItem[] = [
  { label: "Sponsorships", icon: Megaphone, soon: true },
];

export default function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { role, profile, signOut, isPrimary } = useAuth();
  const location = useLocation();

  const primary = role === "admin" ? ADMIN_PRIMARY : ORG_PRIMARY;
  const soon = role === "admin" ? ADMIN_SOON : ORG_SOON;
  const showTeam = role === "org_user" && isPrimary;

  // De-dupe: Organizations + Home both link to /admin in current routing — keep both labels but mark Home active only at exact /admin
  const isItemActive = (item: NavItem) =>
    item.to ? (item.match ? item.match(location.pathname) : location.pathname === item.to) : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[240px] bg-nav text-nav-foreground flex-col z-40 border-r border-nav-border">
        <div className="h-[60px] flex items-center px-6 border-b border-nav-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="font-display font-bold text-white text-sm">C</span>
            </div>
            <span className="font-display font-semibold text-base tracking-tight text-white">Curve OS</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-5 px-3">
          <ul className="space-y-1">
            {primary.map((item) => (
              <li key={item.label}>
                <SidebarLink item={item} active={isItemActive(item)} />
              </li>
            ))}
            {showTeam && (
              <li>
                <SidebarLink
                  item={{ to: "/team", label: "Team", icon: Users, match: (p) => p === "/team" }}
                  active={location.pathname === "/team"}
                />
              </li>
            )}
          </ul>

          <div className="mt-8 mb-2 px-3 curve-eyebrow text-nav-muted">Coming Soon</div>
          <ul className="space-y-1">
            {soon.map((item) => (
              <li key={item.label}><SidebarLink item={item} active={false} /></li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-nav-border p-3">
          <SidebarLink
            item={{ to: "#", label: "Settings", icon: Settings }}
            active={false}
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
          <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-white font-semibold text-xs">
            {(profile?.full_name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 h-14 bg-nav text-white flex items-center justify-between px-4 z-30 border-b border-nav-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center">
            <span className="font-display font-bold text-white text-xs">C</span>
          </div>
          <span className="font-display font-semibold text-sm">{title ?? "Curve OS"}</span>
        </Link>
        <button onClick={signOut} className="text-xs text-nav-muted hover:text-white"><LogOut className="h-4 w-4" /></button>
      </header>

      {/* Main content */}
      <main className="md:ml-[240px] md:pt-[60px] pb-20 md:pb-0 min-h-screen">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8 animate-in fade-in duration-200">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-nav text-nav-foreground border-t border-nav-border z-40 flex items-stretch">
        {primary.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          return (
            <Link
              key={item.label}
              to={item.to ?? "#"}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px]",
                active ? "text-white" : "text-nav-muted hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && <span className="absolute top-0 h-0.5 w-10 bg-accent rounded-b-full" />}
            </Link>
          );
        })}
        {showTeam && (
          <Link to="/team" className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px]",
            location.pathname === "/team" ? "text-white" : "text-nav-muted",
          )}>
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-medium">Team</span>
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
      active && "bg-accent text-white",
    )}>
      {active && <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-1 bg-accent rounded-r-full" />}
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
