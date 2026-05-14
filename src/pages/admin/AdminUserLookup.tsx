import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldAlert, KeyRound, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const OWNER_EMAIL = "matt.gerber@curvesports.com";

type LookupRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  org_id: string | null;
  org_name: string | null;
  module_access: string[];
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  recovery_sent_at: string | null;
  banned_until: string | null;
  providers: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdminUserLookup() {
  const { user } = useAuth();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  const load = async (q: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { search: q },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setRows(((data as any)?.users ?? []) as LookupRow[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Lookup failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);

  // Hide other Curve admins from non-owner accounts
  const visible = useMemo(() => {
    if (isOwner) return rows;
    return rows.filter((r) => !r.roles.includes("admin") || r.user_id === user?.id);
  }, [rows, isOwner, user?.id]);

  const sendPasswordReset = async (email: string) => {
    setResetting(email);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset email sent to ${email}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send reset email");
    } finally {
      setResetting(null);
    }
  };

  return (
    <AppShell title="User Lookup">
      <div className="space-y-6">
        <div>
          <p className="curve-eyebrow mb-2">Curve Admin</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">User Lookup</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Diagnose sign-in problems. Check email confirmation, last sign-in, and providers — then send a password reset if needed.
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); load(search.trim()); }}
          className="flex gap-2 max-w-xl"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="pl-9 h-10"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-10">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        <div className="curve-card p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : visible.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No users match.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Org</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Email confirmed</th>
                    <th className="px-4 py-3 font-medium">Last sign-in</th>
                    <th className="px-4 py-3 font-medium">Providers</th>
                    <th className="px-4 py-3 font-medium">Recovery sent</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((r) => {
                    const banned = r.banned_until && new Date(r.banned_until) > new Date();
                    return (
                      <tr key={r.user_id} className="hover:bg-secondary/40">
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.email}</div>
                          {banned && <div className="mt-0.5 text-[11px] text-destructive font-medium">BANNED until {fmtDate(r.banned_until)}</div>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.org_name ?? "—"}</td>
                        <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                          {r.roles.length ? r.roles.join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r.email_confirmed_at ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span className="text-xs">{fmtDate(r.email_confirmed_at)}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span className="text-xs">Not confirmed</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs">{fmtDate(r.last_sign_in_at)}</div>
                          {r.last_sign_in_at && (
                            <div className="text-[11px] text-muted-foreground">{timeAgo(r.last_sign_in_at)}</div>
                          )}
                          {!r.last_sign_in_at && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400">Never signed in</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.providers}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.recovery_sent_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resetting === r.email}
                            onClick={() => sendPasswordReset(r.email)}
                            title="Send password reset email"
                          >
                            {resetting === r.email
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                              : <KeyRound className="h-3.5 w-3.5 mr-1" />}
                            Send reset
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isOwner && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3 w-3" /> Curve admin accounts other than yours are hidden. Ask {OWNER_EMAIL} for full visibility.
          </p>
        )}
      </div>
    </AppShell>
  );
}
