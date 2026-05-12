import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Copy, Loader2, Mail, RefreshCw, Trash2, Plus } from "lucide-react";

type Domain = {
  id: string;
  domain: string;
  from_email: string | null;
  from_name: string | null;
  dkim_verified: boolean;
  spf_verified: boolean;
  verification_records: any;
  verified_at: string | null;
  is_default: boolean;
};

export default function EmailSetup() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [newFromEmail, setNewFromEmail] = useState("");
  const [newFromName, setNewFromName] = useState("");

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase.from("org_email_domains").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    setDomains((data ?? []) as Domain[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const addDomain = async () => {
    if (!orgId || !newDomain.trim()) return;
    setAdding(true);
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const { data, error } = await supabase.from("org_email_domains").insert({
      org_id: orgId,
      domain,
      from_email: newFromEmail.trim() || `news@${domain}`,
      from_name: newFromName.trim() || null,
      is_default: domains.length === 0,
    }).select().single();
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success("Domain added — verify DNS records below");
    setDomains((d) => [data as Domain, ...d]);
    setNewDomain(""); setNewFromEmail(""); setNewFromName("");
    // kick off verify request to populate records
    await runVerify(data.id);
  };

  const runVerify = async (id: string) => {
    setVerifying(id);
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-domain", {
        body: { domain_id: id },
      });
      if (error) throw error;
      toast.success(data?.verified ? "Domain verified!" : "DNS records ready — add them with your DNS provider, then re-check.");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  const setDefault = async (id: string) => {
    if (!orgId) return;
    await supabase.from("org_email_domains").update({ is_default: false }).eq("org_id", orgId);
    await supabase.from("org_email_domains").update({ is_default: true }).eq("id", id);
    load();
  };

  const removeDomain = async (id: string) => {
    if (!confirm("Remove this domain?")) return;
    await supabase.from("org_email_domains").delete().eq("id", id);
    setDomains((d) => d.filter((x) => x.id !== id));
  };

  const updateSender = async (id: string, patch: Partial<Domain>) => {
    await supabase.from("org_email_domains").update(patch).eq("id", id);
    setDomains((d) => d.map((x) => x.id === id ? { ...x, ...patch } : x));
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <AppShell title="Email Setup">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Email Setup</h1>
        <p className="text-muted-foreground mt-1">Verify your sending domain so emails land in inboxes — not spam.</p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="h-5 w-5" />Add a sending domain</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Domain</Label><Input placeholder="example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} /></div>
          <div><Label>From email</Label><Input placeholder="news@example.com" value={newFromEmail} onChange={(e) => setNewFromEmail(e.target.value)} /></div>
          <div><Label>From name</Label><Input placeholder="Your Org" value={newFromName} onChange={(e) => setNewFromName(e.target.value)} /></div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={addDomain} disabled={adding || !newDomain.trim()}>
            {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add domain
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
        ) : domains.length === 0 ? (
          <Card className="p-12 text-center">
            <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No domains configured. Add one above to start sending.</p>
          </Card>
        ) : domains.map((d) => {
          const verified = d.dkim_verified && d.spf_verified;
          const records: any[] = Array.isArray(d.verification_records) ? d.verification_records : [];
          return (
            <Card key={d.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-xl font-semibold">{d.domain}</h3>
                    {d.is_default && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">Default</span>}
                    {verified ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-semibold">
                        <AlertCircle className="h-3 w-3" />Pending DNS
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">DKIM: {d.dkim_verified ? "✓" : "—"} · SPF: {d.spf_verified ? "✓" : "—"}</p>
                </div>
                <div className="flex gap-2">
                  {!d.is_default && <Button variant="outline" size="sm" onClick={() => setDefault(d.id)}>Make default</Button>}
                  <Button variant="outline" size="sm" onClick={() => runVerify(d.id)} disabled={verifying === d.id}>
                    {verifying === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">Re-check</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => removeDomain(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <Label>From email</Label>
                  <Input defaultValue={d.from_email ?? ""} onBlur={(e) => updateSender(d.id, { from_email: e.target.value })} />
                </div>
                <div>
                  <Label>From name</Label>
                  <Input defaultValue={d.from_name ?? ""} onBlur={(e) => updateSender(d.id, { from_name: e.target.value })} />
                </div>
              </div>

              {records.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">DNS records</h4>
                  <p className="text-xs text-muted-foreground mb-3">Add these records with your DNS provider (GoDaddy, Cloudflare, Namecheap, etc.). Then click Re-check.</p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Host</th>
                          <th className="text-left p-2">Value</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r: any, i: number) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-2 font-mono">{r.type}</td>
                            <td className="p-2 font-mono break-all">{r.name || r.host}</td>
                            <td className="p-2 font-mono break-all max-w-md">{r.value}</td>
                            <td className="p-2"><button onClick={() => copy(r.value)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
