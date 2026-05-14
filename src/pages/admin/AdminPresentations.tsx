import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PresentationsTab } from "@/components/presentations/PresentationsTab";

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

const PLATFORMS: Array<{ key: string; label: string }> = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "x", label: "X / Twitter" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
];

type PostUrls = Record<string, string[]>;

function emptyPostUrls(): PostUrls {
  return PLATFORMS.reduce((acc, p) => ({ ...acc, [p.key]: ["", "", ""] }), {} as PostUrls);
}

export default function AdminPresentations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [auditType, setAuditType] = useState<AuditType>("combined");
  const [running, setRunning] = useState(false);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  // Pre-audit post URL refresh modal
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [postUrls, setPostUrls] = useState<PostUrls>(emptyPostUrls());
  const [savingPosts, setSavingPosts] = useState(false);

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

  const openRefreshModal = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("org_digital_presence")
      .select("recent_post_urls")
      .eq("org_id", orgId)
      .maybeSingle();
    const existing = (data?.recent_post_urls ?? {}) as Record<string, string[]>;
    const seeded: PostUrls = emptyPostUrls();
    for (const p of PLATFORMS) {
      const arr = Array.isArray(existing[p.key]) ? existing[p.key] : [];
      seeded[p.key] = [arr[0] ?? "", arr[1] ?? "", arr[2] ?? ""];
    }
    setPostUrls(seeded);
    setRefreshOpen(true);
  };

  const setPostUrl = (platform: string, idx: number, value: string) => {
    setPostUrls((prev) => {
      const next = { ...prev, [platform]: [...(prev[platform] ?? ["", "", ""])] };
      next[platform][idx] = value;
      return next;
    });
  };

  const saveAndRun = async () => {
    if (!orgId) return;
    setSavingPosts(true);
    try {
      // Clean URLs: trim, drop empties, dedupe
      const cleaned: PostUrls = {};
      for (const p of PLATFORMS) {
        const arr = (postUrls[p.key] ?? []).map((u) => u.trim()).filter(Boolean);
        cleaned[p.key] = Array.from(new Set(arr));
      }
      const { data: userRes } = await supabase.auth.getUser();
      const { error: upErr } = await supabase
        .from("org_digital_presence")
        .upsert(
          {
            org_id: orgId,
            recent_post_urls: cleaned,
            updated_by: userRes.user?.id ?? null,
          },
          { onConflict: "org_id" }
        );
      if (upErr) throw upErr;
      setRefreshOpen(false);
      await runAudit();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save post URLs");
    } finally {
      setSavingPosts(false);
    }
  };

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

            <Button onClick={openRefreshModal} disabled={!orgId || running}>
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

        {orgId && (
          <div className="curve-card">
            <h2 className="font-display text-lg font-semibold mb-4">All Presentations</h2>
            <PresentationsTab orgId={orgId} />
          </div>
        )}
      </div>
        )}
      </div>

      <Dialog open={refreshOpen} onOpenChange={setRefreshOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refresh recent post URLs</DialogTitle>
            <DialogDescription>
              Paste the org's three most recent posts on each platform so the audit reflects current
              brand voice. Leave blank to skip a platform. Existing values are pre-filled — replace
              them with fresh links.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {PLATFORMS.map((p) => (
              <div key={p.key} className="space-y-2">
                <Label className="text-sm font-semibold">{p.label}</Label>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    placeholder={`https://… (post ${i + 1})`}
                    value={postUrls[p.key]?.[i] ?? ""}
                    onChange={(e) => setPostUrl(p.key, i, e.target.value)}
                  />
                ))}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefreshOpen(false)} disabled={savingPosts || running}>
              Cancel
            </Button>
            <Button onClick={saveAndRun} disabled={savingPosts || running}>
              {(savingPosts || running) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {running ? "Running audit…" : savingPosts ? "Saving…" : "Save & Run Audit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
