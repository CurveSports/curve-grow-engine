import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function TopNav() {
  const { role, signOut, isPrimary } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-40">
      <div className="curve-container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-display font-bold text-sm">C</span>
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Curve OS</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {role === "admin" && (
            <>
              <Link to="/admin" className="text-foreground/70 hover:text-foreground transition-colors">Admin</Link>
              <Link to="/admin/task-tracker" className="text-foreground/70 hover:text-foreground transition-colors">Task Tracker</Link>
              <Link to="/admin/health" className="text-foreground/70 hover:text-foreground transition-colors">Health</Link>
              <Link to="/admin/invite" className="text-foreground/70 hover:text-foreground transition-colors">Invite</Link>
            </>
          )}
          {role === "org_user" && (
            <>
              <Link to="/dashboard" className="text-foreground/70 hover:text-foreground transition-colors">Dashboard</Link>
              <Link to="/report" className="text-foreground/70 hover:text-foreground transition-colors">Report</Link>
              {isPrimary && (
                <Link to="/team" className="text-foreground/70 hover:text-foreground transition-colors">Team</Link>
              )}
            </>
          )}
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </nav>
      </div>
    </header>
  );
}
