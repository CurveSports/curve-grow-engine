import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Org = {
  id: string;
  name: string;
  last_activity_at: string | null;
  monetization_tier: string | null;
};

const TIER_STYLES: Record<string, string> = {
  Foundational: "bg-secondary text-foreground border-border",
  Emerging: "bg-info-soft text-info border-info/30",
  Growth: "bg-accent-soft text-accent border-accent/30",
  Advanced: "bg-health-soft text-health border-health/30",
  Elite: "bg-warning-soft text-warning border-warning/30",
};

export default function AdminCommunications() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: orgRows }, { data: metricRows }] = await Promise.all([
        supabase.from("organizations").select("id, name, last_activity_at").order("name", { ascending: true }),
        supabase.from("derived_metrics").select("org_id, monetization_tier"),
      ]);
      const tierMap = new Map<string, string | null>();
      (metricRows ?? []).forEach((m: any) => tierMap.set(m.org_id, m.monetization_tier ?? null));
      setOrgs(
        (orgRows ?? []).map((o: any) => ({
          id: o.id,
          name: o.name,
          last_activity_at: o.last_activity_at,
          monetization_tier: tierMap.get(o.id) ?? null,
        })),
      );
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return orgs;
    const q = search.toLowerCase();
    return orgs.filter((o) => o.name.toLowerCase().includes(q));
  }, [orgs, search]);

  return (
    <AppShell title="Communications">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Communication Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">Select an organization to draft for.</p>
      </div>

      <div className="curve-card max-w-2xl mx-auto">
        <Input
          placeholder="Search organizations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations match.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((org) => (
              <li key={org.id}>
                <button
                  onClick={() => navigate(`/communications/${org.id}`)}
                  className="w-full flex items-center justify-between gap-3 py-3 px-2 text-left hover:bg-secondary/50 rounded-md transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Last activity: {org.last_activity_at ? new Date(org.last_activity_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  {org.monetization_tier && (
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border", TIER_STYLES[org.monetization_tier] ?? "bg-secondary")}>
                      {org.monetization_tier}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground text-center">Select an organization above to begin.</p>
      </div>
    </AppShell>
  );
}
