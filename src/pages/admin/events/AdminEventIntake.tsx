import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Copy, ExternalLink, Download, Search, Trash2, Plus, ArrowLeft,
  FileText, Users, ChevronRight, Clock,
} from "lucide-react";
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
  created_at: string;
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
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Survey | null>(null);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "zelle" | "echeck">("all");
  const [detail, setDetail] = useState<Response | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState({ title: "", slug: "", description: "", instructions: "", w9_template_url: "" });
  const [creatingLoading, setCreatingLoading] = useState(false);

  const loadSurveys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("event_surveys")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Survey[];
    setSurveys(list);
    // Fetch counts in parallel
    const entries = await Promise.all(
      list.map(async (s) => {
        const { count } = await supabase
          .from("event_survey_responses")
          .select("id", { count: "exact", head: true })
          .eq("survey_id", s.id);
        return [s.id, count ?? 0] as [string, number];
      })
    );
    setCounts(Object.fromEntries(entries));
    setLoading(false);
  };

  const loadResponses = async (surveyId: string) => {
    const { data: r } = await supabase
      .from("event_survey_responses")
      .select("*")
      .eq("survey_id", surveyId)
      .order("submitted_at", { ascending: false });
    setResponses((r ?? []) as Response[]);
  };

  useEffect(() => { loadSurveys(); }, []);

  const selectSurvey = async (s: Survey) => {
    setSurvey(s);
    setResponses([]);
    await loadResponses(s.id);
  };

  const backToList = () => {
    setSurvey(null);
    setResponses([]);
    setSearch("");
    setPaymentFilter("all");
    setDetail(null);
  };

  const publicUrl = useMemo(() => {
    if (!survey) return "";
    return `${window.location.origin}/events/intake/${survey.slug}`;
  }, [survey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = responses.filter((r) => {
      if (paymentFilter !== "all" && r.payment_method !== paymentFilter) return false;
      if (!q) return true;
      const hay = `${r.first_name} ${r.last_name} ${r.organization} ${r.personal_email} ${r.phone} ${r.zelle_id ?? ""} ${r.check_payable_to ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
    out.sort((a, b) => {
      if (sortBy === "name") return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
      const da = new Date(a.submitted_at).getTime();
      const db = new Date(b.submitted_at).getTime();
      return sortBy === "oldest" ? da - db : db - da;
    });
    return out;
  }, [responses, search, paymentFilter, sortBy]);

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
      loadSurveys();
      if (survey?.id === draft.id) {
        setSurvey({ ...survey, ...draft });
      }
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
    const updated = { ...survey, is_active: next };
    setSurvey(updated);
    setSurveys((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const createSurvey = async () => {
    if (!newDraft.title.trim() || !newDraft.slug.trim()) {
      toast.error("Title and URL slug are required");
      return;
    }
    setCreatingLoading(true);
    try {
      const slug = newDraft.slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { data, error } = await supabase
        .from("event_surveys")
        .insert({
          title: newDraft.title.trim(),
          slug,
          description: newDraft.description || null,
          instructions: newDraft.instructions || null,
          w9_template_url: newDraft.w9_template_url?.trim() || null,
          is_active: true,
          fields: [],
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Form created");
      setCreating(false);
      setNewDraft({ title: "", slug: "", description: "", instructions: "", w9_template_url: "" });
      loadSurveys();
      if (data) selectSurvey(data as Survey);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create form");
    } finally {
      setCreatingLoading(false);
    }
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
    if (survey) loadResponses(survey.id);
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
    a.href = url; a.download = `event-intake-${survey?.slug ?? new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── List view ──
  if (!survey) {
    return (
      <AppShell title="Event Payment Intake">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-xl font-semibold">Event Intake Forms</h2>
              <p className="text-sm text-muted-foreground mt-1">Create and manage payment intake forms per event.</p>
            </div>
            <Button onClick={() => setCreating(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" /> New form
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : surveys.length === 0 ? (
            <div className="curve-card p-10 text-center space-y-3">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No forms yet. Create your first event intake form.</p>
              <Button onClick={() => setCreating(true)} variant="outline">Create form</Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {surveys.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSurvey(s)}
                  className="curve-card p-5 text-left hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 truncate">/events/intake/{s.slug}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${s.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                      {s.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(s.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {counts[s.id] ?? 0} response{(counts[s.id] ?? 0) === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-3 flex items-center text-accent text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Open responses <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create dialog */}
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create event intake form</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Event name / title</Label>
                <Input value={newDraft.title} onChange={(e) => setNewDraft({ ...newDraft, title: e.target.value })} placeholder="e.g., NERP Summer 2026" className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-sm">URL slug</Label>
                <Input value={newDraft.slug} onChange={(e) => setNewDraft({ ...newDraft, slug: e.target.value })} placeholder="nerp-summer-2026" className="mt-1.5 h-10" />
                <p className="text-xs text-muted-foreground mt-1">/events/intake/{newDraft.slug || "your-slug"}</p>
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea value={newDraft.description} onChange={(e) => setNewDraft({ ...newDraft, description: e.target.value })} rows={2} className="mt-1.5" placeholder="Optional short description" />
              </div>
              <div>
                <Label className="text-sm">Instructions / W-9 notice</Label>
                <Textarea value={newDraft.instructions} onChange={(e) => setNewDraft({ ...newDraft, instructions: e.target.value })} rows={3} className="mt-1.5" placeholder="Shown at the top of the public form" />
              </div>
              <div>
                <Label className="text-sm">Blank W-9 download URL (optional)</Label>
                <Input value={newDraft.w9_template_url} onChange={(e) => setNewDraft({ ...newDraft, w9_template_url: e.target.value })} className="mt-1.5 h-10" placeholder="https://www.irs.gov/pub/irs-pdf/fw9.pdf" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreating(false)} disabled={creatingLoading}>Cancel</Button>
              <Button onClick={createSurvey} disabled={creatingLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {creatingLoading ? "Creating…" : "Create form"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    );
  }

  // ── Detail view ──
  return (
    <AppShell title={survey.title}>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={backToList} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> All forms
          </Button>
        </div>

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
