import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type AuditType = "website" | "social" | "combined";

type Audit = {
  id: string;
  audit_type: string;
  status: string;
  overall_score: number | null;
  website_score: number | null;
  social_score: number | null;
  ai_summary: string | null;
  wins: any;
  fixes: any;
  sponsor_flags: any;
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
};

export default function AdminPresentations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [auditType, setAuditType] = useState<AuditType>("combined");
  const [running, setRunning] = useState(false);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name", { ascending: true });
      setOrgs((data ?? []) as any);
    })();
  }, []);

  const loadAudits = async (id: string) => {
    setLoadingAudits(true);
    const { data } = await supabase
      .from("org_digital_audits")
      .select("id, audit_type, status, overall_score, website_score, social_score, ai_summary, wins, fixes, sponsor_flags, completed_at, created_at, error_message")
      .eq("org_id", id)
      .order("created_at", { ascending: false })
      .limit(10);
    setAudits((data ?? []) as any);
    setLoadingAudits(false);
  };

  useEffect(() => {
    if (orgId) loadAudits(orgId);
    else setAudits([]);
  }, [orgId]);

  const runAudit = async () => {
    if (!orgId) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-digital-audit", {
        body: { org_id: orgId, audit_type: auditType, trigger_source: "manual" },
      });
      if (error) throw error;
      toast.success("Audit completed");
      await loadAudits(orgId);
    } catch (e: any) {
      toast.error(e?.message ?? "Audit failed");
    } finally {
      setRunning(false);
    }
  };

  const latest = audits[0];

  return (
    <AppShell title="Presentations">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="curve-card">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h1 className="font-display text-2xl font-semibold">Presentations & Digital Audits</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Select an organization to view presentations or run a Digital Presence Audit.
          </p>

          <div className="grid gap-4 md:grid-cols-[1fr_200px_auto_auto]">
            <Select onValueChange={(v) => setOrgId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an organization…" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={auditType} onValueChange={(v) => setAuditType(v as AuditType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="combined">Combined</SelectItem>
                <SelectItem value="website">Website only</SelectItem>
                <SelectItem value="social">Social only</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={runAudit} disabled={!orgId || running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {running ? "Running…" : "Run Audit Now"}
            </Button>

            <Button
              variant="outline"
              disabled={!orgId}
              onClick={() => orgId && navigate(`/admin/org/${orgId}?tab=presentations`)}
            >
              View Presentations
            </Button>
          </div>
        </div>

        {orgId && (
          <div className="curve-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Latest Audit</h2>
              {loadingAudits && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {!latest && !loadingAudits && (
              <p className="text-sm text-muted-foreground">No audits yet. Click "Run Audit Now" to generate one.</p>
            )}

            {latest && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 text-sm">
                  <Badge label="Type" value={latest.audit_type} />
                  <Badge label="Status" value={latest.status} />
                  {latest.overall_score != null && <Badge label="Overall" value={`${latest.overall_score}/100`} />}
                  {latest.website_score != null && <Badge label="Website" value={`${latest.website_score}/100`} />}
                  {latest.social_score != null && <Badge label="Social" value={`${latest.social_score}/100`} />}
                  <Badge label="When" value={new Date(latest.completed_at ?? latest.created_at).toLocaleString()} />
                </div>

                {latest.error_message && (
                  <div className="text-sm text-destructive">Error: {latest.error_message}</div>
                )}

                {latest.ai_summary && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Summary</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{latest.ai_summary}</p>
                  </div>
                )}

                <Section title="Wins" items={asItems(latest.wins)} />
                <Section title="Fixes" items={asItems(latest.fixes)} />
                <Section title="Sponsor Flags" items={asItems(latest.sponsor_flags)} />
              </div>
            )}

            {audits.length > 1 && (
              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold mb-2">History</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {audits.slice(1).map((a) => (
                    <li key={a.id}>
                      {new Date(a.completed_at ?? a.created_at).toLocaleString()} — {a.audit_type} — {a.status}
                      {a.overall_score != null && ` (${a.overall_score}/100)`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1 rounded-md bg-muted text-xs">
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function asItems(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map((x) => typeof x === "string" ? x : (x?.title ?? x?.text ?? x?.description ?? JSON.stringify(x)));
  }
  return [];
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}
