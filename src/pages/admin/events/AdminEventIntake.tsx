import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, ExternalLink, Download, Search, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type Survey = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  instructions: string | null;
  w9_template_url: string | null;
  is_active: boolean;
};

type Response = {
  id: string;
  first_name: string;
  last_name: string;
  organization: string;
  phone: string;
  personal_email: string;
  payment_method: "zelle" | "echeck";
  zelle_id: string | null;
  zelle_id_type: string | null;
  check_payable_to: string | null;
  check_delivery_email: string | null;
  w9_file_path: string | null;
  w9_file_name: string | null;
  notes: string | null;
  submitted_at: string;
};

export default function AdminEventIntake() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Survey | null>(null);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "zelle" | "echeck">("all");
  const [detail, setDetail] = useState<Response | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: s } = await supabase
      .from("event_surveys")
      .select("*")
      .eq("slug", "payment-intake")
      .maybeSingle();
    setSurvey(s as Survey | null);
    if (s) {
      const { data: r } = await supabase
        .from("event_survey_responses")
        .select("*")
        .eq("survey_id", (s as Survey).id)
        .order("submitted_at", { ascending: false });
      setResponses((r ?? []) as Response[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const publicUrl = useMemo(() => {
    if (!survey) return "";
    return `${window.location.origin}/events/intake/${survey.slug}`;
  }, [survey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return responses.filter((r) => {
      if (paymentFilter !== "all" && r.payment_method !== paymentFilter) return false;
      if (!q) return true;
      const hay = `${r.first_name} ${r.last_name} ${r.organization} ${r.personal_email} ${r.phone} ${r.zelle_id ?? ""} ${r.check_payable_to ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [responses, search, paymentFilter]);

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Public link copied");
  };

  const startEdit = () => {
    if (survey) { setDraft({ ...survey }); setEditing(true); }
  };

  const saveSurvey = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("event_surveys")
        .update({
          title: draft.title.trim(),
          description: draft.description ?? "",
          instructions: draft.instructions ?? "",
          w9_template_url: draft.w9_template_url?.trim() || null,
          slug: draft.slug.trim(),
          is_active: draft.is_active,
        })
        .eq("id", draft.id);
      if (error) throw error;
      toast.success("Survey updated");
      setEditing(false);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (next: boolean) => {
    if (!survey) return;
    const { error } = await supabase.from("event_surveys").update({ is_active: next }).eq("id", survey.id);
    if (error) { toast.error(error.message); return; }
    setSurvey({ ...survey, is_active: next });
  };

  const downloadW9 = async (r: Response) => {
    if (!r.w9_file_path) return;
    const { data, error } = await supabase.storage.from("event-w9s").createSignedUrl(r.w9_file_path, 60);
    if (error || !data?.signedUrl) { toast.error("Could not generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const deleteResponse = async (id: string) => {
    if (!confirm("Delete this response permanently?")) return;
    const { error } = await supabase.from("event_survey_responses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    setDetail(null);
    load();
  };

  const exportCsv = () => {
    const rows = [
      ["Submitted","First","Last","Organization","Phone","Email","Payment","Zelle ID","Zelle Type","Check Payable","Check Email","W-9 File","Notes"],
      ...filtered.map((r) => [
        new Date(r.submitted_at).toISOString(),
        r.first_name, r.last_name, r.organization, r.phone, r.personal_email,
        r.payment_method, r.zelle_id ?? "", r.zelle_id_type ?? "",
        r.check_payable_to ?? "", r.check_delivery_email ?? "",
        r.w9_file_name ?? "", (r.notes ?? "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `event-intake-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Event Payment Intake">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !survey ? (
          <p className="text-sm text-muted-foreground">No survey configured.</p>
        ) : (
          <>
            {/* Survey config card */}
            <div className="curve-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-display text-lg font-semibold">{survey.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">Public intake form</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={survey.is_active} onCheckedChange={toggleActive} />
                    <span className="text-xs text-muted-foreground">{survey.is_active ? "Active" : "Disabled"}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={startEdit}>Edit form</Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="flex-1 min-w-0 truncate px-3 py-2 rounded-md bg-secondary text-xs">{publicUrl}</code>
                <Button variant="outline" size="sm" onClick={copyLink}><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy</Button>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open</Button>
                </a>
              </div>
            </div>

            {/* Responses */}
            <div className="curve-card p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h3 className="font-display text-base font-semibold">Responses ({filtered.length})</h3>
                <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
                </Button>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, school, email, phone…" className="pl-9 h-10" />
                </div>
                <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as any)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="all">All payment methods</option>
                  <option value="zelle">Zelle</option>
                  <option value="echeck">E-check</option>
                </select>
              </div>

              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-y border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Organization</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 font-medium">Payment</th>
                      <th className="px-5 py-3 font-medium">W-9</th>
                      <th className="px-5 py-3 font-medium">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No responses yet.</td></tr>
                    )}
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => setDetail(r)}>
                        <td className="px-5 py-3 font-medium">{r.first_name} {r.last_name}</td>
                        <td className="px-5 py-3">{r.organization}</td>
                        <td className="px-5 py-3 text-muted-foreground">{r.personal_email}</td>
                        <td className="px-5 py-3 capitalize">{r.payment_method === "echeck" ? "E-check" : "Zelle"}</td>
                        <td className="px-5 py-3">{r.w9_file_path ? <span className="text-accent text-xs">✓ uploaded</span> : <span className="text-destructive text-xs">missing</span>}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit survey dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit intake form</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">URL slug</Label>
                <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className="mt-1.5 h-10" />
                <p className="text-xs text-muted-foreground mt-1">/events/intake/{draft.slug}</p>
              </div>
              <div>
                <Label className="text-sm">Title</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm">Instructions / W-9 notice</Label>
                <Textarea value={draft.instructions ?? ""} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} rows={4} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm">Blank W-9 download URL (optional)</Label>
                <Input value={draft.w9_template_url ?? ""} onChange={(e) => setDraft({ ...draft, w9_template_url: e.target.value })} className="mt-1.5 h-10" placeholder="https://www.irs.gov/pub/irs-pdf/fw9.pdf" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                Form is active (publicly accessible)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveSurvey} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.first_name} {detail?.last_name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <Row label="Organization" value={detail.organization} />
              <Row label="Email" value={detail.personal_email} />
              <Row label="Phone" value={detail.phone} />
              <Row label="Payment" value={detail.payment_method === "echeck" ? "E-check" : "Zelle"} />
              {detail.payment_method === "zelle" && (
                <Row label={`Zelle (${detail.zelle_id_type ?? "—"})`} value={detail.zelle_id ?? "—"} />
              )}
              {detail.payment_method === "echeck" && (
                <>
                  <Row label="Make check to" value={detail.check_payable_to ?? "—"} />
                  <Row label="Delivery email" value={detail.check_delivery_email ?? "—"} />
                </>
              )}
              <Row label="W-9" value={detail.w9_file_name ?? "—"} />
              {detail.notes && <Row label="Notes" value={detail.notes} />}
              <Row label="Submitted" value={new Date(detail.submitted_at).toLocaleString()} />
              <div className="flex items-center justify-between pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => detail && deleteResponse(detail.id)} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
                {detail.w9_file_path && (
                  <Button size="sm" onClick={() => downloadW9(detail)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Download W-9
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="col-span-2 break-words">{value}</div>
    </div>
  );
}
