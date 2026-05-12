import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Mail, Send as SendIcon, Loader2, Eye, MousePointer, AlertTriangle } from "lucide-react";

type EmailSend = {
  id: string;
  subject: string | null;
  status: string;
  recipient_count: number | null;
  delivered_count: number | null;
  opened_count: number | null;
  clicked_count: number | null;
  bounced_count: number | null;
  sent_at: string | null;
  created_at: string;
  segment_id: string | null;
  design_id: string | null;
};

type Segment = { id: string; name: string; contact_count: number };
type Domain = { id: string; from_email: string | null; from_name: string | null; is_default: boolean };
type Design = { id: string; name: string | null; generated_html: string | null; status: string; preview_url: string | null };

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  sending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  sent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-destructive/10 text-destructive",
};

export default function Emails() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  const [params] = useSearchParams();
  const presetDesignId = params.get("design");

  const [sends, setSends] = useState<EmailSend[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Partial<EmailSend & { from_email: string; from_name: string; html_body: string; preview_text: string }>>({});

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const [s, seg, dom, des] = await Promise.all([
      supabase.from("org_email_sends").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
      supabase.from("org_contact_segments").select("id,name,contact_count").eq("org_id", orgId).order("name"),
      supabase.from("org_email_domains").select("id,from_email,from_name,is_default").eq("org_id", orgId),
      supabase.from("designs").select("id,name,generated_html,status,preview_url").eq("org_id", orgId).eq("status", "approved").order("created_at", { ascending: false }).limit(50),
    ]);
    setSends((s.data ?? []) as EmailSend[]);
    setSegments((seg.data ?? []) as Segment[]);
    setDomains((dom.data ?? []) as Domain[]);
    setDesigns((des.data ?? []) as Design[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  useEffect(() => {
    if (presetDesignId && designs.length) {
      const d = designs.find((x) => x.id === presetDesignId);
      if (d) {
        setDraft((prev) => ({ ...prev, design_id: d.id, html_body: d.generated_html || "" }));
        setComposeOpen(true);
      }
    }
  }, [presetDesignId, designs]);

  useEffect(() => {
    if (composeOpen && !draft.from_email) {
      const def = domains.find((d) => d.is_default) ?? domains[0];
      if (def) setDraft((s) => ({ ...s, from_email: def.from_email || "", from_name: def.from_name || "" }));
    }
  }, [composeOpen, domains, draft.from_email]);

  const recipientEstimate = useMemo(() => {
    const seg = segments.find((s) => s.id === draft.segment_id);
    return seg?.contact_count ?? 0;
  }, [segments, draft.segment_id]);

  const onPickDesign = (id: string) => {
    const d = designs.find((x) => x.id === id);
    setDraft((s) => ({ ...s, design_id: id, html_body: d?.generated_html || s.html_body }));
  };

  const saveDraft = async (sendNow: boolean) => {
    if (!orgId) return;
    if (!draft.subject) return toast.error("Subject required");
    if (!draft.segment_id) return toast.error("Pick a segment");
    if (!draft.html_body && !draft.design_id) return toast.error("Pick a design or write content");
    setComposing(true);
    try {
      const payload: any = {
        org_id: orgId,
        subject: draft.subject,
        preview_text: draft.preview_text || null,
        from_email: draft.from_email || null,
        from_name: draft.from_name || null,
        segment_id: draft.segment_id,
        design_id: draft.design_id || null,
        html_body: draft.html_body || null,
        status: "draft",
        created_by: profile?.user_id,
      };
      const { data, error } = await supabase.from("org_email_sends").insert(payload).select().single();
      if (error) throw error;
      if (sendNow) {
        const { error: sendErr } = await supabase.functions.invoke("send-marketing-email", {
          body: { send_id: data.id },
        });
        if (sendErr) throw sendErr;
        toast.success("Email sent");
      } else {
        toast.success("Draft saved");
      }
      setComposeOpen(false);
      setDraft({});
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setComposing(false);
    }
  };

  const sendExisting = async (id: string) => {
    if (!confirm("Send this email now?")) return;
    try {
      const { error } = await supabase.functions.invoke("send-marketing-email", { body: { send_id: id } });
      if (error) throw error;
      toast.success("Sent");
      load();
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    }
  };

  return (
    <AppShell title="Emails">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Email campaigns</h1>
          <p className="text-muted-foreground mt-1">Send approved designs to your segments and watch engagement.</p>
        </div>
        <Button asChild><Link to="/marketing/emails/new"><Plus className="h-4 w-4 mr-2" />New email</Link></Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      ) : sends.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-semibold mb-1">No emails yet</p>
          <p className="text-sm text-muted-foreground mb-4">Compose your first campaign and send it to a segment.</p>
          <Button onClick={() => setComposeOpen(true)}><Plus className="h-4 w-4 mr-2" />New email</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Subject</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Recipients</th>
                <th className="text-right p-3"><Eye className="inline h-3 w-3" /> Opens</th>
                <th className="text-right p-3"><MousePointer className="inline h-3 w-3" /> Clicks</th>
                <th className="text-right p-3"><AlertTriangle className="inline h-3 w-3" /> Bounces</th>
                <th className="text-left p-3">When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sends.map((s) => {
                const openRate = s.recipient_count ? Math.round((s.opened_count ?? 0) / s.recipient_count * 100) : 0;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3 font-medium">{s.subject || "(no subject)"}</td>
                    <td className="p-3"><span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${STATUS_BADGE[s.status] ?? STATUS_BADGE.draft}`}>{s.status}</span></td>
                    <td className="p-3 text-right">{s.recipient_count ?? "—"}</td>
                    <td className="p-3 text-right">{s.opened_count ?? 0}{s.recipient_count ? <span className="text-muted-foreground text-xs ml-1">({openRate}%)</span> : null}</td>
                    <td className="p-3 text-right">{s.clicked_count ?? 0}</td>
                    <td className="p-3 text-right">{s.bounced_count ?? 0}</td>
                    <td className="p-3 text-muted-foreground text-xs">{s.sent_at ? new Date(s.sent_at).toLocaleString() : new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      {s.status === "draft" && <button onClick={() => sendExisting(s.id)} className="text-xs text-primary hover:underline">Send →</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={composeOpen} onOpenChange={(o) => { setComposeOpen(o); if (!o) setDraft({}); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New email</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Subject *</Label>
              <Input value={draft.subject ?? ""} onChange={(e) => setDraft((s) => ({ ...s, subject: e.target.value }))} placeholder="Tryouts start Saturday — register now" />
            </div>
            <div className="md:col-span-2">
              <Label>Preview text</Label>
              <Input value={draft.preview_text ?? ""} onChange={(e) => setDraft((s) => ({ ...s, preview_text: e.target.value }))} placeholder="Shown in inbox preview after the subject" />
            </div>
            <div>
              <Label>From email</Label>
              <Input value={draft.from_email ?? ""} onChange={(e) => setDraft((s) => ({ ...s, from_email: e.target.value }))} />
            </div>
            <div>
              <Label>From name</Label>
              <Input value={draft.from_name ?? ""} onChange={(e) => setDraft((s) => ({ ...s, from_name: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Segment *</Label>
              <select value={draft.segment_id ?? ""} onChange={(e) => setDraft((s) => ({ ...s, segment_id: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Pick a segment…</option>
                {segments.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.contact_count})</option>)}
              </select>
              {draft.segment_id && <p className="text-xs text-muted-foreground mt-1">~{recipientEstimate} contacts will receive this email.</p>}
            </div>
            <div className="md:col-span-2">
              <Label>Design (approved only)</Label>
              <select value={draft.design_id ?? ""} onChange={(e) => onPickDesign(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Custom HTML below…</option>
                {designs.map((d) => <option key={d.id} value={d.id}>{d.name || "Untitled"}</option>)}
              </select>
              {!designs.length && <p className="text-xs text-muted-foreground mt-1">No approved designs yet — <Link to="/marketing/designs" className="underline">create one</Link>.</p>}
            </div>
            <div className="md:col-span-2">
              <Label>HTML body</Label>
              <Textarea rows={8} className="font-mono text-xs" value={draft.html_body ?? ""} onChange={(e) => setDraft((s) => ({ ...s, html_body: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => saveDraft(false)} disabled={composing}>Save draft</Button>
            <Button onClick={() => saveDraft(true)} disabled={composing}>
              {composing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SendIcon className="h-4 w-4 mr-2" />}Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
