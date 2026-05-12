import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, CheckCircle2, AlertCircle, MinusCircle, XCircle } from "lucide-react";

type Integration = {
  id: string;
  integration_key: string;
  display_name: string;
  category: string | null;
  env_var_names: string[];
  status: "live" | "stubbed" | "not_built" | "broken";
  last_health_check_at: string | null;
  last_health_check_result: { success?: boolean; latency_ms?: number; error_message?: string; missing_vars?: string[] } | null;
  what_works_when_stubbed: string | null;
  what_unlocks_when_wired: string | null;
  setup_instructions: string | null;
  estimated_cost_monthly: string | null;
  activate_when: string | null;
  provider_docs_url: string | null;
  notes: string | null;
  used_by_features: string[];
};

const STATUS_META: Record<Integration["status"], { label: string; color: string; icon: any; dot: string }> = {
  live:      { label: "Live",      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2, dot: "bg-emerald-500" },
  stubbed:   { label: "Stubbed",   color: "bg-amber-500/10 text-amber-600 border-amber-500/30",       icon: AlertCircle,  dot: "bg-amber-500" },
  not_built: { label: "Not built", color: "bg-muted text-muted-foreground border-border",              icon: MinusCircle,  dot: "bg-muted-foreground/40" },
  broken:    { label: "Broken",    color: "bg-red-500/10 text-red-600 border-red-500/30",              icon: XCircle,      dot: "bg-red-500" },
};

const ago = (iso: string | null) => {
  if (!iso) return "Never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function SystemIntegrations() {
  const { profile, role } = useAuth();
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"all" | Integration["status"]>("all");
  const [selected, setSelected] = useState<Integration | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  // Hard gate: only matt.gerber@curvesports.com
  const allowed = role === "admin" && profile?.email?.toLowerCase() === "matt.gerber@curvesports.com";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_integrations")
      .select("*")
      .order("sort_order");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Integration[]);
    setLoading(false);
  };

  useEffect(() => { if (allowed) load(); }, [allowed]);
  useEffect(() => { if (selected) setNotesDraft(selected.notes ?? ""); }, [selected]);

  if (!allowed) return <Navigate to="/" replace />;

  const counts = useMemo(() => ({
    live: items.filter((i) => i.status === "live").length,
    stubbed: items.filter((i) => i.status === "stubbed").length,
    not_built: items.filter((i) => i.status === "not_built").length,
    broken: items.filter((i) => i.status === "broken").length,
  }), [items]);

  const lastCheck = items
    .map((i) => i.last_health_check_at)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const runHealthCheck = async (integration_key?: string) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-integration-health", {
        body: integration_key ? { integration_key } : {},
      });
      if (error) throw error;
      toast.success(`Checked ${data?.checked ?? 0} integration(s)`);
      await load();
      if (selected && integration_key) {
        const refreshed = (await supabase.from("system_integrations").select("*").eq("id", selected.id).maybeSingle()).data;
        if (refreshed) setSelected(refreshed as Integration);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Health check failed");
    } finally {
      setRunning(false);
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from("system_integrations")
      .update({ notes: notesDraft })
      .eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Notes saved");
    setSelected({ ...selected, notes: notesDraft });
    load();
  };

  return (
    <AppShell title="System Integrations">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">System Integrations</h1>
          <p className="text-muted-foreground mt-1">Status of every external service Curve OS connects to.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Last checked: {ago(lastCheck)}</span>
          <Button onClick={() => runHealthCheck()} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
            Run Health Check Now
          </Button>
        </div>
      </div>

      <div className={`grid gap-3 mb-6 ${counts.broken > 0 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}>
        <StatCard label="Live" count={counts.live} accent="bg-emerald-500" />
        <StatCard label="Stubbed" count={counts.stubbed} accent="bg-amber-500" />
        <StatCard label="Not built" count={counts.not_built} accent="bg-muted-foreground/40" />
        {counts.broken > 0 && <StatCard label="Broken" count={counts.broken} accent="bg-red-500" />}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["all", "live", "stubbed", "not_built", "broken"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : STATUS_META[f].label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Integration</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Cost</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Last checked</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No integrations match this filter.</td></tr>
            ) : filtered.map((it) => {
              const meta = STATUS_META[it.status];
              return (
                <tr key={it.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(it)}>
                  <td className="px-4 py-3 font-medium">{it.display_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      <span>{meta.label}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell capitalize text-muted-foreground">{it.category}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{it.estimated_cost_monthly ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{ago(it.last_health_check_at)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">→</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (() => {
            const meta = STATUS_META[selected.status];
            const Icon = meta.icon;
            return (
              <>
                <SheetHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <SheetTitle className="font-display text-2xl">{selected.display_name}</SheetTitle>
                      {selected.category && <Badge variant="outline" className="mt-2 capitalize">{selected.category}</Badge>}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium ${meta.color}`}>
                      <Icon className="h-4 w-4" />{meta.label}
                    </span>
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  <Button size="sm" variant="outline" onClick={() => runHealthCheck(selected.integration_key)} disabled={running}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
                    Run Health Check
                  </Button>

                  <Section title="Status">
                    <p className="text-sm text-muted-foreground">Last health check: {ago(selected.last_health_check_at)}</p>
                    {selected.status === "broken" && selected.last_health_check_result?.error_message && (
                      <div className="mt-2 p-3 rounded-md bg-red-500/10 text-red-600 text-sm border border-red-500/30">
                        {selected.last_health_check_result.error_message}
                      </div>
                    )}
                  </Section>

                  {selected.env_var_names.length > 0 && (
                    <Section title="Environment Variables">
                      <ul className="space-y-1.5">
                        {selected.env_var_names.map((v) => {
                          const missing = selected.last_health_check_result?.missing_vars?.includes(v);
                          // If we have no result yet, infer from status: 'live' → set; otherwise unknown.
                          const present = selected.last_health_check_result
                            ? !missing
                            : selected.status === "live";
                          return (
                            <li key={v} className="flex items-center justify-between text-sm">
                              <code className="font-mono bg-muted px-2 py-1 rounded text-xs">{v}</code>
                              <span className={present ? "text-emerald-600" : "text-red-600"}>{present ? "✓ Set" : "✗ Missing"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </Section>
                  )}

                  {(selected.status === "stubbed" || selected.status === "not_built") && selected.what_works_when_stubbed && (
                    <Section title="What works when stubbed">
                      <p className="text-sm text-muted-foreground">{selected.what_works_when_stubbed}</p>
                    </Section>
                  )}

                  {selected.what_unlocks_when_wired && (
                    <Section title="What unlocks when wired">
                      <p className="text-sm text-muted-foreground">{selected.what_unlocks_when_wired}</p>
                    </Section>
                  )}

                  {(selected.status === "stubbed" || selected.status === "not_built") && (selected.setup_instructions || selected.provider_docs_url) && (
                    <Section title="Setup instructions">
                      {selected.setup_instructions && (
                        <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">{selected.setup_instructions}</pre>
                      )}
                      {selected.provider_docs_url && (
                        <a href={selected.provider_docs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary mt-3">
                          Open provider documentation <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </Section>
                  )}

                  <Section title="Cost & timing">
                    <p className="text-sm"><span className="text-muted-foreground">Estimated cost:</span> {selected.estimated_cost_monthly ?? "—"}</p>
                    {selected.activate_when && <p className="text-sm mt-1"><span className="text-muted-foreground">Activate when:</span> {selected.activate_when}</p>}
                  </Section>

                  {selected.used_by_features.length > 0 && (
                    <Section title="Used by">
                      <div className="flex flex-wrap gap-1.5">
                        {selected.used_by_features.map((f) => (
                          <Badge key={f} variant="secondary" className="font-mono text-xs">{f}</Badge>
                        ))}
                      </div>
                    </Section>
                  )}

                  <Section title="Notes">
                    <Textarea rows={4} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Internal notes…" />
                    <Button size="sm" className="mt-2" onClick={saveNotes}>Save notes</Button>
                  </Section>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function StatCard({ label, count, accent }: { label: string; count: number; accent: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{count}</div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}
