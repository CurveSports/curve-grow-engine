import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ExternalLink, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Lead = {
  id: string;
  org_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  role: string | null;
  city_state: string | null;
  inputs: any;
  report_payload: any;
  status: string;
  admin_notes: string | null;
  internal_alert_sent_at: string | null;
  confirmation_sent_at: string | null;
  ip_address: string | null;
  created_at: string;
  report_token: string;
};

const STATUSES = ["new", "contacted", "closed"];

export default function AdminRevenueAuditDetail() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("public_audit_leads").select("*").eq("id", id).maybeSingle();
      if (data) {
        setLead(data as Lead);
        setNotes((data as Lead).admin_notes ?? "");
      }
      setLoading(false);
    })();
  }, [id]);

  const updateStatus = async (s: string) => {
    if (!lead) return;
    await supabase.from("public_audit_leads").update({ status: s }).eq("id", lead.id);
    setLead({ ...lead, status: s });
    toast({ title: "Status updated" });
  };

  const saveNotes = async () => {
    if (!lead) return;
    setSaving(true);
    await supabase.from("public_audit_leads").update({ admin_notes: notes }).eq("id", lead.id);
    setSaving(false);
    toast({ title: "Notes saved" });
  };

  if (loading) {
    return <AppShell><div className="p-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div></AppShell>;
  }
  if (!lead) {
    return <AppShell><div className="p-12 text-center text-muted-foreground">Lead not found.</div></AppShell>;
  }

  const reportUrl = `${window.location.origin}/revenue-audit/report/${lead.report_token}`;
  const r = lead.report_payload ?? {};

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Link to="/admin/revenue-audits" className="text-sm text-muted-foreground hover:text-foreground">← All audit leads</Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{lead.org_name}</h1>
            <p className="text-sm text-muted-foreground">Submitted {new Date(lead.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <Button key={s} size="sm" variant={lead.status === s ? "default" : "outline"} onClick={() => updateStatus(s)}>{s}</Button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold mb-3">Contact</h3>
            <dl className="text-sm space-y-1.5">
              <Row label="Name" value={lead.contact_name} />
              <Row label="Email" value={<a href={`mailto:${lead.email}`} className="text-emerald-600 hover:underline">{lead.email}</a>} />
              <Row label="Phone" value={lead.phone || "—"} />
              <Row label="Role" value={lead.role || "—"} />
              <Row label="Location" value={lead.city_state || "—"} />
            </dl>
          </div>

          <div className="border rounded-lg p-5">
            <h3 className="font-semibold mb-3">Report</h3>
            <div className="text-3xl font-bold text-emerald-600 mb-1">{r.totals?.totalOpportunityFormatted ?? "—"}</div>
            <div className="text-sm text-muted-foreground mb-4">Total untapped opportunity (+{r.totals?.upliftPct ?? 0}%)</div>
            <div className="flex gap-2">
              <a href={reportUrl} target="_blank" rel="noreferrer" className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  Open public report <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </a>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(reportUrl); toast({ title: "Link copied" }); }}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-5">
          <h3 className="font-semibold mb-3">Opportunities</h3>
          <div className="space-y-2">
            {(r.opportunities ?? []).map((o: any) => (
              <div key={o.key} className="flex justify-between py-2 border-b last:border-0">
                <div>
                  <div className="font-medium">{o.label}</div>
                  <div className="text-xs text-muted-foreground">{o.detail}</div>
                </div>
                <div className="font-semibold text-emerald-600">{o.amountFormatted}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-lg p-5">
          <h3 className="font-semibold mb-3">Inputs</h3>
          <pre className="text-xs bg-muted/40 p-3 rounded overflow-auto">{JSON.stringify(lead.inputs, null, 2)}</pre>
        </div>

        <div className="border rounded-lg p-5">
          <h3 className="font-semibold mb-3">Internal notes</h3>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Call notes, next steps…" />
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={saveNotes} disabled={saving}>{saving ? "Saving…" : "Save notes"}</Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>Internal alert: {lead.internal_alert_sent_at ? new Date(lead.internal_alert_sent_at).toLocaleString() : "not sent"}</div>
          <div>Confirmation to lead: {lead.confirmation_sent_at ? new Date(lead.confirmation_sent_at).toLocaleString() : "not sent"}</div>
          <div>IP: {lead.ip_address || "—"}</div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground w-20 shrink-0">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
