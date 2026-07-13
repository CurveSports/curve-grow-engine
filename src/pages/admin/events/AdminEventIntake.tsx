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
  FileText, Users, ChevronRight, Clock, Calendar as CalendarIcon,
  MapPin, Files as FilesIcon, Archive, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  EVENT_PRESETS, type CustomField, type CustomFieldType,
  CUSTOM_FIELD_TYPE_LABEL, fieldKeyFromLabel, slugify,
} from "@/lib/eventIntake";

type Survey = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  instructions: string | null;
  w9_template_url: string | null;
  is_active: boolean;
  created_at: string;
  event_date: string | null;
  event_location: string | null;
  w9_required: boolean;
  role_required: boolean;
  role_options: string[];
  fields: CustomField[];
  archived_at: string | null;
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
  role: string | null;
  extra: Record<string, unknown> | null;
};

type NewDraft = {
  presetId: string;
  title: string;
  slug: string;
  event_date: string;
  event_location: string;
  description: string;
  instructions: string;
  w9_template_url: string;
  w9_required: boolean;
  role_required: boolean;
  role_options: string[];
  fields: CustomField[];
};

const emptyDraft = (): NewDraft => ({
  presetId: "blank",
  title: "",
  slug: "",
  event_date: "",
  event_location: "",
  description: "",
  instructions: "",
  w9_template_url: "",
  w9_required: true,
  role_required: false,
  role_options: [],
  fields: [],
});

export default function AdminEventIntake() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "date" | "name">("date");
  const [showArchived, setShowArchived] = useState(false);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Survey | null>(null);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "zelle" | "echeck">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Response | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<NewDraft>(emptyDraft());
  const [creatingLoading, setCreatingLoading] = useState(false);

  const loadSurveys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("event_surveys")
      .select("*")
      .order("created_at", { ascending: false });
    const list = ((data ?? []) as any[]).map(normalizeSurvey);
    setSurveys(list);
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
    setRoleFilter("all");
    setDetail(null);
  };

  const publicUrl = useMemo(() => {
    if (!survey) return "";
    return `${window.location.origin}/events/intake/${survey.slug}`;
  }, [survey]);

  const visibleSurveys = useMemo(() => {
    const list = surveys.filter((s) => (showArchived ? !!s.archived_at : !s.archived_at));
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "date") {
        const ad = a.event_date ? new Date(a.event_date).getTime() : Infinity;
        const bd = b.event_date ? new Date(b.event_date).getTime() : Infinity;
        return ad - bd;
      }
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortBy === "oldest" ? da - db : db - da;
    });
    return sorted;
  }, [surveys, sortBy, showArchived]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = responses.filter((r) => {
      if (paymentFilter !== "all" && r.payment_method !== paymentFilter) return false;
      if (roleFilter !== "all" && (r.role ?? "") !== roleFilter) return false;
      if (!q) return true;
      const hay = `${r.first_name} ${r.last_name} ${r.organization} ${r.personal_email} ${r.phone} ${r.zelle_id ?? ""} ${r.check_payable_to ?? ""} ${r.role ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
    return out;
  }, [responses, search, paymentFilter, roleFilter]);

  const availableRoles = useMemo(() => {
    const s = new Set<string>();
    responses.forEach((r) => { if (r.role) s.add(r.role); });
    return Array.from(s).sort();
  }, [responses]);

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
          event_date: draft.event_date || null,
          event_location: draft.event_location || null,
          w9_required: draft.w9_required,
          role_required: draft.role_required,
          role_options: draft.role_options ?? [],
          fields: (draft.fields ?? []) as any,
        })
        .eq("id", draft.id);
      if (error) throw error;
      toast.success("Form updated");
      setEditing(false);
      loadSurveys();
      if (survey?.id === draft.id) setSurvey({ ...survey, ...draft });
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

  const applyPreset = (presetId: string) => {
    const p = EVENT_PRESETS.find((x) => x.id === presetId) ?? EVENT_PRESETS[EVENT_PRESETS.length - 1];
    setNewDraft((d) => ({
      ...d,
      presetId,
      title: d.title || p.seed.title || "",
      description: d.description || p.seed.description || "",
      instructions: d.instructions || p.seed.instructions || "",
      w9_required: p.seed.w9_required,
      role_required: p.seed.role_required,
      role_options: [...p.seed.role_options],
      fields: p.seed.fields.map((f) => ({ ...f })),
    }));
  };

  const openCreate = () => {
    setNewDraft(emptyDraft());
    setCreating(true);
  };

  const createSurvey = async () => {
    const title = newDraft.title.trim();
    if (!title) { toast.error("Give the event a title"); return; }
    const slug = slugify(newDraft.slug || newDraft.title);
    if (!slug) { toast.error("Enter a URL slug"); return; }
    setCreatingLoading(true);
    try {
      const { data, error } = await supabase
        .from("event_surveys")
        .insert({
          title,
          slug,
          description: newDraft.description || null,
          instructions: newDraft.instructions || null,
          w9_template_url: newDraft.w9_template_url?.trim() || null,
          is_active: true,
          fields: newDraft.fields as any,
          event_date: newDraft.event_date || null,
          event_location: newDraft.event_location || null,
          w9_required: newDraft.w9_required,
          role_required: newDraft.role_required,
          role_options: newDraft.role_options,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("Event created");
      setCreating(false);
      setNewDraft(emptyDraft());
      loadSurveys();
      if (data) selectSurvey(normalizeSurvey(data));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create event");
    } finally {
      setCreatingLoading(false);
    }
  };

  const duplicateSurvey = async (s: Survey, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const baseSlug = `${s.slug}-copy`;
      let slug = baseSlug;
      let n = 2;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: existing } = await supabase
          .from("event_surveys").select("id").eq("slug", slug).maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${n++}`;
        if (n > 20) break;
      }
      const { data, error } = await supabase.from("event_surveys").insert({
        title: `${s.title} (copy)`,
        slug,
        description: s.description ?? "",
        instructions: s.instructions ?? "",
        w9_template_url: s.w9_template_url,
        is_active: false,
        fields: (s.fields ?? []) as any,
        event_date: null,
        event_location: s.event_location,
        w9_required: s.w9_required,
        role_required: s.role_required,
        role_options: s.role_options ?? [],
      }).select().single();
      if (error) throw error;
      toast.success("Duplicated — remember to update the date");
      loadSurveys();
      if (data) selectSurvey(normalizeSurvey(data));
    } catch (err: any) {
      toast.error(err.message ?? "Duplicate failed");
    }
  };

  const archiveSurvey = async (s: Survey, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const archive = !s.archived_at;
    if (archive && !confirm(`Archive "${s.title}"? Its public link will keep working; you can restore it later.`)) return;
    const { error } = await supabase.from("event_surveys")
      .update({ archived_at: archive ? new Date().toISOString() : null, is_active: archive ? false : s.is_active })
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success(archive ? "Archived" : "Restored");
    loadSurveys();
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
    if (!survey) return;
    const customKeys = (survey.fields ?? []).map((f) => f.key);
    const customLabels = (survey.fields ?? []).map((f) => f.label);
    const header = [
      "Submitted", "First", "Last", "Role", "Organization", "Phone", "Email",
      "Payment", "Zelle ID", "Zelle Type", "Check Payable", "Check Email",
      "W-9 File", "Notes", ...customLabels,
    ];
    const rows = [
      header,
      ...filtered.map((r) => [
        new Date(r.submitted_at).toISOString(),
        r.first_name, r.last_name, r.role ?? "",
        r.organization, r.phone, r.personal_email,
        r.payment_method, r.zelle_id ?? "", r.zelle_id_type ?? "",
        r.check_payable_to ?? "", r.check_delivery_email ?? "",
        r.w9_file_name ?? "", (r.notes ?? "").replace(/\n/g, " "),
        ...customKeys.map((k) => extraValue(r.extra, k)),
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `event-intake-${survey?.slug ?? new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── List view ──
  if (!survey) {
    return (
      <AppShell title="Event Intake">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-xl font-semibold">Events</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create a public intake form to gather W-9s, payment info, and other details for any event.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm">
                <option value="date">By event date</option>
                <option value="newest">Newest created</option>
                <option value="oldest">Oldest created</option>
                <option value="name">By name</option>
              </select>
              <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? "Show active" : "Show archived"}
              </Button>
              <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" /> New event
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : visibleSurveys.length === 0 ? (
            <div className="curve-card p-10 text-center space-y-3">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {showArchived ? "No archived events." : "No events yet. Create your first event intake form."}
              </p>
              {!showArchived && (
                <Button onClick={openCreate} variant="outline">Create event</Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleSurveys.map((s) => (
                <div
                  key={s.id}
                  onClick={() => selectSurvey(s)}
                  className="curve-card p-5 text-left hover:shadow-md transition-shadow cursor-pointer group flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 truncate">/events/intake/{s.slug}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${s.archived_at ? "bg-muted text-muted-foreground" : s.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                      {s.archived_at ? "Archived" : s.is_active ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs text-muted-foreground">
                    {s.event_date && (
                      <span className="flex items-center gap-1 text-foreground/70">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {new Date(s.event_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                    {s.event_location && (
                      <span className="flex items-center gap-1 truncate max-w-[10rem]"><MapPin className="h-3.5 w-3.5" />{s.event_location}</span>
                    )}
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {counts[s.id] ?? 0}</span>
                    {!s.event_date && (
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(s.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                    <span className="text-xs text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                      Open <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/events/intake/${s.slug}`); toast.success("Link copied"); }}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title="Copy public link"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => duplicateSurvey(s, e)}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title="Duplicate"
                      >
                        <FilesIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => archiveSurvey(s, e)}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title={s.archived_at ? "Restore" : "Archive"}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create dialog */}
        <CreateEventDialog
          open={creating}
          onOpenChange={setCreating}
          draft={newDraft}
          setDraft={setNewDraft}
          onApplyPreset={applyPreset}
          onCreate={createSurvey}
          creating={creatingLoading}
        />
      </AppShell>
    );
  }

  // ── Detail view ──
  return (
    <AppShell title={survey.title}>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={backToList} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> All events
          </Button>
        </div>

        {/* Survey config card */}
        <div className="curve-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-lg font-semibold">{survey.title}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1.5">
                {survey.event_date && (
                  <span className="flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5" />
                    {new Date(survey.event_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
                {survey.event_location && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{survey.event_location}</span>
                )}
                <span>·</span>
                <span>
                  Collects: contact info{survey.role_required && ", role"}, payment{survey.w9_required && ", W-9"}
                  {(survey.fields?.length ?? 0) > 0 && `, ${survey.fields.length} custom field${survey.fields.length === 1 ? "" : "s"}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={survey.is_active} onCheckedChange={toggleActive} />
                <span className="text-xs text-muted-foreground">{survey.is_active ? "Active" : "Disabled"}</span>
              </div>
              <Button variant="outline" size="sm" onClick={startEdit}>Edit event</Button>
              <Button variant="outline" size="sm" onClick={(e) => duplicateSurvey(survey, e)}>
                <FilesIcon className="h-3.5 w-3.5 mr-1.5" /> Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={(e) => archiveSurvey(survey, e)}>
                <Archive className="h-3.5 w-3.5 mr-1.5" /> {survey.archived_at ? "Restore" : "Archive"}
              </Button>
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
            {availableRoles.length > 0 && (
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                <option value="all">All roles</option>
                {availableRoles.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            )}
          </div>

          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-y border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Name</th>
                  {survey.role_required && <th className="px-5 py-3 font-medium">Role</th>}
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  {survey.w9_required && <th className="px-5 py-3 font-medium">W-9</th>}
                  <th className="px-5 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">No responses yet.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/40 cursor-pointer" onClick={() => setDetail(r)}>
                    <td className="px-5 py-3 font-medium">{r.first_name} {r.last_name}</td>
                    {survey.role_required && <td className="px-5 py-3">{r.role ?? "—"}</td>}
                    <td className="px-5 py-3">{r.organization}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.personal_email}</td>
                    <td className="px-5 py-3 capitalize">{r.payment_method === "echeck" ? "E-check" : "Zelle"}</td>
                    {survey.w9_required && <td className="px-5 py-3">{r.w9_file_path ? <span className="text-accent text-xs">✓ uploaded</span> : <span className="text-destructive text-xs">missing</span>}</td>}
                    <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(r.submitted_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit event dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit event</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Event title</Label>
                  <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1.5 h-10" />
                </div>
                <div>
                  <Label className="text-sm">URL slug</Label>
                  <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className="mt-1.5 h-10" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Event date</Label>
                  <Input type="date" value={draft.event_date ?? ""} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} className="mt-1.5 h-10" />
                </div>
                <div>
                  <Label className="text-sm">Location</Label>
                  <Input value={draft.event_location ?? ""} onChange={(e) => setDraft({ ...draft, event_location: e.target.value })} className="mt-1.5 h-10" placeholder="City, ballpark, etc." />
                </div>
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm">Instructions</Label>
                <Textarea value={draft.instructions ?? ""} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} rows={3} className="mt-1.5" />
              </div>

              <div className="rounded-md border border-border p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={draft.w9_required} onCheckedChange={(v) => setDraft({ ...draft, w9_required: v })} />
                  Require a W-9
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={draft.role_required} onCheckedChange={(v) => setDraft({ ...draft, role_required: v })} />
                  Ask for role / position
                </label>
                {draft.role_required && (
                  <RoleOptionsEditor
                    values={draft.role_options ?? []}
                    onChange={(v) => setDraft({ ...draft, role_options: v })}
                  />
                )}
              </div>

              <FieldsBuilder
                fields={draft.fields ?? []}
                onChange={(v) => setDraft({ ...draft, fields: v })}
              />

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
              {detail.role && <Row label="Role" value={detail.role} />}
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
              {survey.w9_required && <Row label="W-9" value={detail.w9_file_name ?? "—"} />}
              {(survey.fields ?? []).map((f) => (
                <Row key={f.key} label={f.label} value={String(extraValue(detail.extra, f.key) || "—")} />
              ))}
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

// ── Sub-components ──

function CreateEventDialog({
  open, onOpenChange, draft, setDraft, onApplyPreset, onCreate, creating,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  draft: NewDraft;
  setDraft: (d: NewDraft | ((prev: NewDraft) => NewDraft)) => void;
  onApplyPreset: (id: string) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  const set = <K extends keyof NewDraft>(k: K, v: NewDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const autoSlug = draft.slug || slugify(draft.title);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
          <p className="text-xs text-muted-foreground">Pick a starting point, then tweak the details.</p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Preset picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EVENT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onApplyPreset(p.id)}
                className={`text-left rounded-md border p-3 transition ${draft.presetId === p.id ? "border-accent bg-accent/5" : "border-border hover:border-foreground/30"}`}
              >
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Event title *</Label>
              <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g., NERP Summer 2026" className="mt-1.5 h-10" />
            </div>
            <div>
              <Label className="text-sm">URL slug</Label>
              <Input value={draft.slug} onChange={(e) => set("slug", e.target.value)} placeholder={autoSlug || "nerp-summer-2026"} className="mt-1.5 h-10" />
              <p className="text-xs text-muted-foreground mt-1 truncate">/events/intake/{autoSlug || "your-slug"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Event date</Label>
              <Input type="date" value={draft.event_date} onChange={(e) => set("event_date", e.target.value)} className="mt-1.5 h-10" />
            </div>
            <div>
              <Label className="text-sm">Location</Label>
              <Input value={draft.event_location} onChange={(e) => set("event_location", e.target.value)} placeholder="City, ballpark, etc." className="mt-1.5 h-10" />
            </div>
          </div>

          <div>
            <Label className="text-sm">Description (shown at top of the form)</Label>
            <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={2} className="mt-1.5" />
          </div>

          <div>
            <Label className="text-sm">Instructions / W-9 notice</Label>
            <Textarea value={draft.instructions} onChange={(e) => set("instructions", e.target.value)} rows={3} className="mt-1.5" placeholder="Shown at the top of the public form" />
          </div>

          <div className="rounded-md border border-border p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.w9_required} onCheckedChange={(v) => set("w9_required", v)} />
              Require a W-9
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.role_required} onCheckedChange={(v) => set("role_required", v)} />
              Ask for role / position
            </label>
            {draft.role_required && (
              <RoleOptionsEditor
                values={draft.role_options}
                onChange={(v) => set("role_options", v)}
              />
            )}
          </div>

          <FieldsBuilder fields={draft.fields} onChange={(v) => set("fields", v)} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={creating}>Cancel</Button>
          <Button onClick={onCreate} disabled={creating} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {creating ? "Creating…" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleOptionsEditor({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (values.includes(v)) { setInput(""); return; }
    onChange([...values, v]);
    setInput("");
  };
  return (
    <div className="space-y-2 pl-8">
      <Label className="text-xs text-muted-foreground">Role options (participants pick one)</Label>
      <div className="flex flex-wrap gap-1.5">
        {values.map((r) => (
          <span key={r} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-xs">
            {r}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== r))} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add a role and press Enter"
          className="h-9 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

function FieldsBuilder({ fields, onChange }: { fields: CustomField[]; onChange: (v: CustomField[]) => void }) {
  const add = () => {
    onChange([
      ...fields,
      { key: fieldKeyFromLabel("Question"), label: "New question", type: "short_text", required: false },
    ]);
  };
  const update = (idx: number, patch: Partial<CustomField>) => {
    onChange(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };
  const remove = (idx: number) => onChange(fields.filter((_, i) => i !== idx));

  return (
    <div className="rounded-md border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Custom questions</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add question
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">No custom questions yet. The form still collects contact info, payment, and (optionally) W-9.</p>
      ) : (
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.key} className="rounded-md border border-border p-3 space-y-2 bg-secondary/30">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs text-muted-foreground">Question</Label>
                  <Input value={f.label} onChange={(e) => update(i, { label: e.target.value })} className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <select
                    value={f.type}
                    onChange={(e) => update(i, { type: e.target.value as CustomFieldType, options: e.target.value === "single_choice" ? (f.options ?? []) : undefined })}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {(Object.keys(CUSTOM_FIELD_TYPE_LABEL) as CustomFieldType[]).map((t) => (
                      <option key={t} value={t}>{CUSTOM_FIELD_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {f.type === "single_choice" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Options (comma separated)</Label>
                  <Input
                    value={(f.options ?? []).join(", ")}
                    onChange={(e) => update(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    className="h-9 text-sm mt-1"
                    placeholder="Option A, Option B, Option C"
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={!!f.required} onCheckedChange={(v) => update(i, { required: v })} />
                Required
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
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

function normalizeSurvey(s: any): Survey {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description ?? null,
    instructions: s.instructions ?? null,
    w9_template_url: s.w9_template_url ?? null,
    is_active: !!s.is_active,
    created_at: s.created_at,
    event_date: s.event_date ?? null,
    event_location: s.event_location ?? null,
    w9_required: s.w9_required ?? true,
    role_required: s.role_required ?? false,
    role_options: Array.isArray(s.role_options) ? s.role_options : [],
    fields: Array.isArray(s.fields) ? s.fields : [],
    archived_at: s.archived_at ?? null,
  };
}

function extraValue(extra: Record<string, unknown> | null, key: string): string {
  if (!extra || typeof extra !== "object") return "";
  const v = (extra as any)[key];
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// Suppress unused-import warning
void EventPreset;
