import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Check, Plus, X, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AdminRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  org_ids: Set<string>;
};

type Org = { id: string; name: string };

export default function AdminOrgAssignments() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const orgsById = useMemo(() => {
    const map = new Map<string, Org>();
    for (const o of orgs) map.set(o.id, o);
    return map;
  }, [orgs]);

  const load = async () => {
    setLoading(true);
    const [{ data: roles }, { data: orgsData }] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
      supabase.from("organizations").select("id, name").order("name"),
    ]);
    const adminIds = (roles ?? []).map((r: any) => r.user_id);
    const [{ data: profiles }, { data: assignments }] = await Promise.all([
      adminIds.length
        ? supabase.from("profiles").select("user_id, email, full_name").in("user_id", adminIds)
        : Promise.resolve({ data: [] as any[] }),
      adminIds.length
        ? supabase.from("admin_org_assignments" as any).select("user_id, org_id").in("user_id", adminIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const assignmentMap = new Map<string, Set<string>>();
    for (const a of (assignments ?? []) as any[]) {
      if (!assignmentMap.has(a.user_id)) assignmentMap.set(a.user_id, new Set());
      assignmentMap.get(a.user_id)!.add(a.org_id);
    }
    const rows: AdminRow[] = ((profiles ?? []) as any[])
      .map((p) => ({
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
        org_ids: assignmentMap.get(p.user_id) ?? new Set<string>(),
      }))
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
    setAdmins(rows);
    setOrgs((orgsData ?? []) as Org[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleOrg = async (adminId: string, orgId: string, currentlyAssigned: boolean) => {
    if (!user) return;
    const key = `${adminId}:${orgId}`;
    setBusyKey(key);
    if (currentlyAssigned) {
      const { error } = await supabase
        .from("admin_org_assignments" as any)
        .delete()
        .eq("user_id", adminId)
        .eq("org_id", orgId);
      if (error) {
        toast.error(error.message);
      } else {
        setAdmins((prev) =>
          prev.map((a) => {
            if (a.user_id !== adminId) return a;
            const next = new Set(a.org_ids);
            next.delete(orgId);
            return { ...a, org_ids: next };
          }),
        );
      }
    } else {
      const { error } = await supabase
        .from("admin_org_assignments" as any)
        .insert({ user_id: adminId, org_id: orgId, assigned_by: user.id } as any);
      if (error) {
        toast.error(error.message);
      } else {
        setAdmins((prev) =>
          prev.map((a) => {
            if (a.user_id !== adminId) return a;
            const next = new Set(a.org_ids);
            next.add(orgId);
            return { ...a, org_ids: next };
          }),
        );
      }
    }
    setBusyKey(null);
  };

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) =>
      `${a.full_name ?? ""} ${a.email}`.toLowerCase().includes(q),
    );
  }, [admins, search]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading admins…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Curve Admin assignments</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Assign Curve Sports admins to the organizations they own. Admins can be assigned to multiple orgs.
          </p>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admins…"
            className="h-9 pl-9 w-56"
          />
        </div>
      </div>

      <div className="curve-card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Admin</th>
              <th className="px-5 py-3 font-medium">Assigned organizations</th>
              <th className="px-5 py-3 font-medium text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAdmins.map((a) => {
              const assigned = orgs.filter((o) => a.org_ids.has(o.id));
              return (
                <tr key={a.user_id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-5 py-4 align-top">
                    <p className="font-medium text-foreground">{a.full_name || a.email}</p>
                    {a.full_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{a.email}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    {assigned.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No organizations assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assigned.map((o) => (
                          <span
                            key={o.id}
                            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs bg-accent/10 border border-accent/30 text-foreground"
                          >
                            <Building2 className="h-3 w-3 text-accent" />
                            {o.name}
                            <button
                              type="button"
                              aria-label={`Unassign ${o.name}`}
                              onClick={() => toggleOrg(a.user_id, o.id, true)}
                              className="ml-0.5 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                              disabled={busyKey === `${a.user_id}:${o.id}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top text-right">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs">
                          <Plus className="h-3 w-3 mr-1" /> Assign org
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-72 p-1">
                        <OrgSelector
                          orgs={orgs}
                          assignedIds={a.org_ids}
                          busyKey={busyKey}
                          adminId={a.user_id}
                          onToggle={(orgId, currentlyAssigned) =>
                            toggleOrg(a.user_id, orgId, currentlyAssigned)
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </td>
                </tr>
              );
            })}
            {filteredAdmins.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {admins.length === 0
                    ? "No Curve admins yet. Create one above to get started."
                    : "No admins match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrgSelector({
  orgs,
  assignedIds,
  busyKey,
  adminId,
  onToggle,
}: {
  orgs: Org[];
  assignedIds: Set<string>;
  busyKey: string | null;
  adminId: string;
  onToggle: (orgId: string, currentlyAssigned: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return orgs;
    return orgs.filter((o) => o.name.toLowerCase().includes(t));
  }, [orgs, q]);

  return (
    <div>
      <div className="px-1 pt-1 pb-2">
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search organizations…"
          className="h-8"
        />
      </div>
      {filtered.length === 0 && (
        <p className="px-2 py-3 text-xs text-muted-foreground">No matches.</p>
      )}
      <ul className="max-h-64 overflow-y-auto">
        {filtered.map((o) => {
          const active = assignedIds.has(o.id);
          const busy = busyKey === `${adminId}:${o.id}`;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => onToggle(o.id, active)}
                disabled={busy}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-secondary transition-colors text-left",
                  active && "bg-secondary/60",
                )}
              >
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate text-foreground">{o.name}</span>
                {active && <Check className="h-4 w-4 text-accent flex-shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
