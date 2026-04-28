// Communications 2.0 — admin-only preview at /admin/communications-v2
// Parallel to existing /admin/communications. Does not touch any v1 tables.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format, parseISO, addDays } from "date-fns";
import {
  AlertCircle, Calendar, CheckCircle2, ChevronRight, Clock, FileEdit, Loader2,
  Plus, Sparkles, History, Send, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Org = { id: string; name: string };
type EventType = {
  id: string; code: string; display_name: string; description: string | null;
  fact_schema: FactField[]; supports_multiple_occurrences: boolean;
  default_stakeholder: string | null; default_lead_days: number;
};
type FactField = { key: string; label: string; type: string; required: boolean; help_text?: string };
type CalItem = {
  id: string; org_id: string; event_type_id: string; title: string;
  stakeholder: string; custom_stakeholder_label: string | null;
  original_send_date: string; current_send_date: string;
  draft_lead_days: number; draft_due_date: string | null;
  status: string; notes: string | null;
};
type Facts = {
  id: string; calendar_item_id: string; org_id: string;
  shared_facts: Record<string, any>; occurrences: any[];
  missing_required_fields: string[]; is_complete: boolean;
};
type Draft = {
  id: string; org_id: string; calendar_item_id: string | null;
  draft_mode: string; stakeholder: string; ad_hoc_prompt: string | null;
  subject: string | null; body: string | null;
  format: string; tone: string | null; status: string;
  missing_facts: string[]; generated_at: string | null;
};

const STAKEHOLDERS = [
  { value: "parents", label: "Parents / Families" },
  { value: "sponsors", label: "Sponsors" },
  { value: "board", label: "Board / Leadership" },
  { value: "coaches", label: "Coaches / Staff" },
  { value: "all", label: "Everyone" },
  { value: "custom", label: "Custom audience" },
];

export default function AdminCommunicationsV2() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const orgIdParam = params.get("org");

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string | null>(orgIdParam);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [items, setItems] = useState<CalItem[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [adHocOpen, setAdHocOpen] = useState(false);
  const [openDraftId, setOpenDraftId] = useState<string | null>(null);

  // Load orgs
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("organizations").select("id, name").order("name");
      setOrgs(data ?? []);
      if (!orgId && data && data.length > 0) setOrgId(data[0].id);
    })();
  }, []);

  // Load event types (catalog)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("commv2_event_types").select("*")
        .eq("is_active", true).order("display_order");
      setEventTypes((data as any) ?? []);
    })();
  }, []);

  // Load calendar items + drafts for selected org
  const loadOrgData = async () => {
    if (!orgId) return;
    setLoading(true);
    const [itemsRes, draftsRes] = await Promise.all([
      supabase.from("commv2_calendar_items").select("*")
        .eq("org_id", orgId).order("current_send_date"),
      supabase.from("commv2_drafts").select("*")
        .eq("org_id", orgId).order("created_at", { ascending: false }),
    ]);
    setItems((itemsRes.data as any) ?? []);
    setDrafts((draftsRes.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadOrgData(); }, [orgId]);

  useEffect(() => {
    if (orgId) setParams({ org: orgId }, { replace: true });
  }, [orgId]);

  const eventTypeMap = useMemo(() => {
    const m = new Map<string, EventType>();
    eventTypes.forEach((e) => m.set(e.id, e));
    return m;
  }, [eventTypes]);

  // Group items by month
  const grouped = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    items.forEach((it) => {
      const k = format(parseISO(it.current_send_date), "MMMM yyyy");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    });
    return Array.from(map.entries());
  }, [items]);

  const draftsForItem = (itemId: string) => drafts.filter((d) => d.calendar_item_id === itemId);
  const adHocDrafts = drafts.filter((d) => d.draft_mode === "ad_hoc");

  const factsDueSoon = items.filter((it) => {
    if (it.status === "sent" || it.status === "cancelled") return false;
    if (!it.draft_due_date) return false;
    return parseISO(it.draft_due_date) <= addDays(new Date(), 7);
  });

  return (
    <AppShell title="Communications 2.0">
      <div className="curve-container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="outline" className="mb-2 border-accent text-accent">Preview · Admin only</Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight">Communications 2.0</h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Schedule comms, attach fact sheets (multi-date / multi-location supported),
              auto-draft with AI, and reschedule any item — fully editable. Existing Communications page is untouched.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={orgId ?? ""} onValueChange={(v) => setOrgId(v)}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select org" /></SelectTrigger>
              <SelectContent>
                {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setAdHocOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Ad-hoc draft
            </Button>
            <Button onClick={() => setNewItemOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Schedule comm
            </Button>
          </div>
        </div>

        {/* Drafts due soon */}
        {factsDueSoon.length > 0 && (
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                {factsDueSoon.length} draft{factsDueSoon.length === 1 ? "" : "s"} due in the next 7 days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {factsDueSoon.map((it) => {
                const et = eventTypeMap.get(it.event_type_id);
                return (
                  <button
                    key={it.id}
                    onClick={() => setOpenItemId(it.id)}
                    className="w-full text-left flex items-center justify-between hover:bg-muted/40 rounded px-2 py-1.5 text-sm"
                  >
                    <span className="truncate">
                      <span className="font-medium">{it.title}</span>
                      <span className="text-muted-foreground"> · {et?.display_name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-3">
                      Draft due {format(parseISO(it.draft_due_date!), "MMM d")}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Calendar */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No communications scheduled yet for this org.</p>
              <Button onClick={() => setNewItemOpen(true)}><Plus className="h-4 w-4 mr-2" /> Schedule first comm</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([month, monthItems]) => (
              <div key={month}>
                <h3 className="curve-eyebrow mb-3">{month}</h3>
                <div className="space-y-2">
                  {monthItems.map((it) => (
                    <CalRow
                      key={it.id}
                      item={it}
                      eventType={eventTypeMap.get(it.event_type_id)}
                      drafts={draftsForItem(it.id)}
                      onClick={() => setOpenItemId(it.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ad-hoc drafts */}
        {adHocDrafts.length > 0 && (
          <div>
            <h3 className="curve-eyebrow mb-3 mt-8">Ad-hoc drafts</h3>
            <div className="space-y-2">
              {adHocDrafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setOpenDraftId(d.id)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-muted/40 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{d.subject ?? d.ad_hoc_prompt?.slice(0, 80) ?? "Untitled"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {d.stakeholder} · {d.format} · <StatusBadge status={d.status} />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawers / modals */}
      {openItemId && (
        <CalendarItemDrawer
          itemId={openItemId}
          eventTypes={eventTypes}
          drafts={draftsForItem(openItemId)}
          onClose={() => setOpenItemId(null)}
          onChanged={loadOrgData}
          onOpenDraft={(id) => { setOpenItemId(null); setOpenDraftId(id); }}
        />
      )}
      {newItemOpen && orgId && (
        <NewItemDialog
          orgId={orgId}
          eventTypes={eventTypes}
          onClose={() => setNewItemOpen(false)}
          onCreated={() => { setNewItemOpen(false); loadOrgData(); }}
        />
      )}
      {adHocOpen && orgId && (
        <AdHocDialog
          orgId={orgId}
          onClose={() => setAdHocOpen(false)}
          onCreated={(draftId) => { setAdHocOpen(false); loadOrgData(); setOpenDraftId(draftId); }}
        />
      )}
      {openDraftId && (
        <DraftDrawer
          draftId={openDraftId}
          onClose={() => setOpenDraftId(null)}
          onChanged={loadOrgData}
        />
      )}
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar row

function CalRow({ item, eventType, drafts, onClick }: {
  item: CalItem; eventType?: EventType; drafts: Draft[]; onClick: () => void;
}) {
  const draft = drafts[0];
  const wasRescheduled = item.original_send_date !== item.current_send_date;
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 border rounded-lg hover:bg-muted/40 hover:border-accent/40 transition-colors flex items-center gap-4"
    >
      <div className="text-center shrink-0 w-14">
        <div className="text-xs text-muted-foreground uppercase">{format(parseISO(item.current_send_date), "MMM")}</div>
        <div className="text-2xl font-display font-bold leading-none">{format(parseISO(item.current_send_date), "d")}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
          {item.title}
          {wasRescheduled && (
            <Badge variant="outline" className="text-xs gap-1 h-5">
              <History className="h-3 w-3" /> Rescheduled
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
          <span>{eventType?.display_name ?? "—"}</span>
          <span>·</span>
          <span>{item.stakeholder}</span>
          {item.draft_due_date && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Draft by {format(parseISO(item.draft_due_date), "MMM d")}</span>
            </>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {draft && <StatusBadge status={draft.status} />}
        <StatusBadge status={item.status} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    scheduled: { label: "Scheduled", cls: "bg-muted text-muted-foreground" },
    drafting: { label: "Drafting", cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
    pending_facts: { label: "Needs facts", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    drafted: { label: "Draft ready", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    ready_to_send: { label: "Ready to send", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    sent: { label: "Sent", cls: "bg-foreground/10 text-foreground" },
    cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground line-through" },
    discarded: { label: "Discarded", cls: "bg-muted text-muted-foreground line-through" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", cfg.cls)}>{cfg.label}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// New calendar item

function NewItemDialog({ orgId, eventTypes, onClose, onCreated }: {
  orgId: string; eventTypes: EventType[]; onClose: () => void; onCreated: () => void;
}) {
  const [eventTypeId, setEventTypeId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [stakeholder, setStakeholder] = useState("parents");
  const [sendDate, setSendDate] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"));
  const [leadDays, setLeadDays] = useState(7);
  const [saving, setSaving] = useState(false);

  const et = eventTypes.find((e) => e.id === eventTypeId);
  useEffect(() => {
    if (et) {
      setStakeholder(et.default_stakeholder ?? "parents");
      setLeadDays(et.default_lead_days);
    }
  }, [eventTypeId]);

  const submit = async () => {
    if (!eventTypeId || !title.trim()) { toast.error("Pick an event type and add a title."); return; }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("commv2_calendar_items").insert({
      org_id: orgId, event_type_id: eventTypeId, title: title.trim(),
      stakeholder, original_send_date: sendDate, current_send_date: sendDate,
      draft_lead_days: leadDays, created_by: userRes.user!.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Comm scheduled.");
    onCreated();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a communication</DialogTitle>
          <DialogDescription>Pick the event type, give it a working title, and set the send date. You'll fill in the fact sheet next.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Event type</Label>
            <Select value={eventTypeId} onValueChange={setEventTypeId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Pick a type" /></SelectTrigger>
              <SelectContent>
                {eventTypes.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.display_name}{e.supports_multiple_occurrences ? " (multi-date capable)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {et?.description && <p className="text-xs text-muted-foreground mt-1.5">{et.description}</p>}
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Spring 2026 U12 Tryouts" className="mt-1.5" />
          </div>
          <div>
            <Label>Stakeholder</Label>
            <Select value={stakeholder} onValueChange={setStakeholder}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAKEHOLDERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Send date</Label>
              <Input type="date" value={sendDate} onChange={(e) => setSendDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Draft ready X days before</Label>
              <Input type="number" min={0} max={90} value={leadDays} onChange={(e) => setLeadDays(Number(e.target.value))} className="mt-1.5" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Schedule"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar item drawer (fact sheet, reschedule, drafts)

function CalendarItemDrawer({ itemId, eventTypes, drafts, onClose, onChanged, onOpenDraft }: {
  itemId: string; eventTypes: EventType[]; drafts: Draft[];
  onClose: () => void; onChanged: () => void; onOpenDraft: (id: string) => void;
}) {
  const [item, setItem] = useState<CalItem | null>(null);
  const [facts, setFacts] = useState<Facts | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shared, setShared] = useState<Record<string, any>>({});
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [savingFacts, setSavingFacts] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Reschedule
  const [reschedDate, setReschedDate] = useState("");
  const [reschedReason, setReschedReason] = useState("");
  const [resched, setResched] = useState(false);

  const eventType = useMemo(
    () => (item ? eventTypes.find((e) => e.id === item.event_type_id) : undefined),
    [item, eventTypes]
  );

  const load = async () => {
    setLoading(true);
    const [itemRes, factsRes, histRes] = await Promise.all([
      supabase.from("commv2_calendar_items").select("*").eq("id", itemId).maybeSingle(),
      supabase.from("commv2_event_facts").select("*").eq("calendar_item_id", itemId).maybeSingle(),
      supabase.from("commv2_reschedule_log").select("*").eq("calendar_item_id", itemId).order("changed_at", { ascending: false }),
    ]);
    setItem(itemRes.data as any);
    setFacts(factsRes.data as any);
    setHistory(histRes.data ?? []);
    if (factsRes.data) {
      setShared((factsRes.data as any).shared_facts ?? {});
      setOccurrences((factsRes.data as any).occurrences ?? []);
    } else {
      setShared({});
      setOccurrences([]);
    }
    if (itemRes.data) setReschedDate((itemRes.data as any).current_send_date);
    setLoading(false);
  };
  useEffect(() => { load(); }, [itemId]);

  const saveFacts = async () => {
    if (!item) return;
    setSavingFacts(true);
    const payload = {
      calendar_item_id: item.id, org_id: item.org_id,
      shared_facts: shared, occurrences,
      last_updated_by: (await supabase.auth.getUser()).data.user!.id,
    };
    const res = facts
      ? await supabase.from("commv2_event_facts").update(payload).eq("id", facts.id)
      : await supabase.from("commv2_event_facts").insert(payload);
    setSavingFacts(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Fact sheet saved.");
    await load();
  };

  const generateDraft = async () => {
    if (!item) return;
    setGenerating(true);
    // 1. Create a pending draft row
    const { data: userRes } = await supabase.auth.getUser();
    const { data: newDraft, error: createErr } = await supabase.from("commv2_drafts").insert({
      org_id: item.org_id, calendar_item_id: item.id, draft_mode: "calendar",
      stakeholder: item.stakeholder, format: "email", tone: "warm and professional",
      status: "drafting", created_by: userRes.user!.id,
    }).select("id").single();
    if (createErr || !newDraft) { setGenerating(false); toast.error(createErr?.message ?? "Failed"); return; }

    // 2. Invoke edge function
    const { data, error } = await supabase.functions.invoke("commv2-auto-draft", {
      body: { draft_id: newDraft.id },
    });
    setGenerating(false);
    if (error) { toast.error(error.message); return; }
    if (data?.blocked) {
      toast.error("Missing facts: " + (data.missing_facts ?? []).join(", "));
      onChanged();
      return;
    }
    toast.success("Draft ready.");
    onChanged();
    onOpenDraft(newDraft.id);
  };

  const reschedule = async () => {
    if (!item || !reschedDate || reschedDate === item.current_send_date) {
      toast.error("Pick a different date."); return;
    }
    setResched(true);
    const { data: userRes } = await supabase.auth.getUser();
    const previous = item.current_send_date;
    const { error: updErr } = await supabase.from("commv2_calendar_items")
      .update({ current_send_date: reschedDate }).eq("id", item.id);
    if (updErr) { setResched(false); toast.error(updErr.message); return; }
    await supabase.from("commv2_reschedule_log").insert({
      calendar_item_id: item.id, org_id: item.org_id,
      changed_by: userRes.user!.id, previous_send_date: previous,
      new_send_date: reschedDate, reason: reschedReason || null,
    });
    setResched(false);
    setReschedReason("");
    toast.success("Rescheduled.");
    await load();
    onChanged();
  };

  const deleteItem = async () => {
    if (!item) return;
    if (!confirm("Delete this scheduled communication and all its drafts? This cannot be undone.")) return;
    const { error } = await supabase.from("commv2_calendar_items").delete().eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted.");
    onChanged(); onClose();
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {loading || !item ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{eventType?.display_name}</Badge>
                <StatusBadge status={item.status} />
              </div>
              <SheetTitle className="text-2xl font-display">{item.title}</SheetTitle>
              <SheetDescription>
                Sending to <strong>{item.stakeholder}</strong> on{" "}
                <strong>{format(parseISO(item.current_send_date), "EEE, MMM d, yyyy")}</strong>
                {item.original_send_date !== item.current_send_date && (
                  <span className="text-muted-foreground"> (originally {format(parseISO(item.original_send_date), "MMM d")})</span>
                )}
              </SheetDescription>
            </SheetHeader>

            {/* Reschedule */}
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Reschedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-[1fr_2fr] gap-3">
                  <div>
                    <Label className="text-xs">New send date</Label>
                    <Input type="date" value={reschedDate} onChange={(e) => setReschedDate(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Reason (optional)</Label>
                    <Input value={reschedReason} onChange={(e) => setReschedReason(e.target.value)}
                      placeholder="e.g., conflict with district tournament" className="mt-1" />
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={reschedule}
                  disabled={resched || reschedDate === item.current_send_date}>
                  {resched ? "Updating…" : "Move to this date"}
                </Button>
                {history.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      <History className="h-3 w-3 inline mr-1" /> {history.length} previous reschedule{history.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4 border-l">
                      {history.map((h) => (
                        <li key={h.id} className="text-muted-foreground">
                          {format(parseISO(h.changed_at), "MMM d, yyyy h:mma")} —{" "}
                          {format(parseISO(h.previous_send_date), "MMM d")} → {format(parseISO(h.new_send_date), "MMM d")}
                          {h.reason && <span className="block italic">"{h.reason}"</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>

            {/* Fact sheet */}
            {eventType && (
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileEdit className="h-4 w-4" /> Fact sheet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FactSheetEditor
                    schema={eventType.fact_schema}
                    multi={eventType.supports_multiple_occurrences}
                    shared={shared} setShared={setShared}
                    occurrences={occurrences} setOccurrences={setOccurrences}
                  />
                  <Button size="sm" className="mt-4" onClick={saveFacts} disabled={savingFacts}>
                    {savingFacts ? "Saving…" : "Save fact sheet"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Drafts */}
            <Card className="mt-4">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Drafts
                </CardTitle>
                <Button size="sm" onClick={generateDraft} disabled={generating}>
                  {generating ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Drafting…</> : "Generate new draft"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {drafts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No drafts yet. Save the fact sheet, then generate.</p>
                ) : drafts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onOpenDraft(d.id)}
                    className="w-full text-left p-2 border rounded hover:bg-muted/40 flex items-center justify-between text-sm"
                  >
                    <span className="truncate">
                      <span className="font-medium">{d.subject ?? "Untitled draft"}</span>
                      {d.generated_at && <span className="text-muted-foreground text-xs"> · {format(parseISO(d.generated_at), "MMM d, h:mma")}</span>}
                    </span>
                    <StatusBadge status={d.status} />
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="mt-6 pt-4 border-t flex justify-between">
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={deleteItem}>
                <X className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fact sheet editor (handles single + multi-occurrence)

function FactSheetEditor({ schema, multi, shared, setShared, occurrences, setOccurrences }: {
  schema: FactField[]; multi: boolean;
  shared: Record<string, any>; setShared: (v: Record<string, any>) => void;
  occurrences: any[]; setOccurrences: (v: any[]) => void;
}) {
  // Occurrence-level fields = date/time/location. Everything else = shared.
  const occurrenceFields = schema.filter((f) => ["date", "time", "location"].includes(f.type));
  const sharedFields = schema.filter((f) => !["date", "time", "location"].includes(f.type));

  const addOccurrence = () => {
    const blank: any = { label: "" };
    occurrenceFields.forEach((f) => { blank[f.key] = ""; });
    setOccurrences([...occurrences, blank]);
  };
  const updateOcc = (i: number, key: string, val: string) => {
    const next = [...occurrences];
    next[i] = { ...next[i], [key]: val };
    setOccurrences(next);
  };
  const removeOcc = (i: number) => setOccurrences(occurrences.filter((_, idx) => idx !== i));

  const inputType = (t: string) => {
    if (t === "date") return "date";
    if (t === "time") return "time";
    if (t === "url") return "url";
    if (t === "currency") return "number";
    return "text";
  };

  return (
    <div className="space-y-5">
      {/* Shared facts */}
      {sharedFields.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Shared facts (apply to all occurrences)</p>
          {sharedFields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs">
                {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {f.type === "long_text" ? (
                <Textarea
                  value={shared[f.key] ?? ""} onChange={(e) => setShared({ ...shared, [f.key]: e.target.value })}
                  className="mt-1" rows={3}
                />
              ) : (
                <Input
                  type={inputType(f.type)}
                  value={shared[f.key] ?? ""} onChange={(e) => setShared({ ...shared, [f.key]: e.target.value })}
                  className="mt-1"
                />
              )}
              {f.help_text && <p className="text-xs text-muted-foreground mt-0.5">{f.help_text}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Occurrences */}
      {occurrenceFields.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {multi ? "Occurrences (add one per date/location combo)" : "Event details"}
            </p>
            {multi && (
              <Button size="sm" variant="outline" onClick={addOccurrence}>
                <Plus className="h-3 w-3 mr-1" /> Add occurrence
              </Button>
            )}
          </div>
          {occurrences.length === 0 && !multi && (
            <Button size="sm" variant="outline" onClick={addOccurrence}>
              <Plus className="h-3 w-3 mr-1" /> Add details
            </Button>
          )}
          {occurrences.map((occ, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2 relative">
              {multi && (
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={occ.label ?? ""} onChange={(e) => updateOcc(i, "label", e.target.value)}
                    placeholder={`Occurrence ${i + 1} label (e.g., "Monday session")`}
                    className="text-sm h-8"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeOcc(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {occurrenceFields.map((f) => (
                  <div key={f.key}>
                    <Label className="text-xs">
                      {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                    </Label>
                    <Input
                      type={inputType(f.type)}
                      value={occ[f.key] ?? ""} onChange={(e) => updateOcc(i, f.key, e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ad-hoc draft

function AdHocDialog({ orgId, onClose, onCreated }: {
  orgId: string; onClose: () => void; onCreated: (draftId: string) => void;
}) {
  const [stakeholder, setStakeholder] = useState("parents");
  const [formatVal, setFormatVal] = useState("email");
  const [tone, setTone] = useState("warm and professional");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const submit = async () => {
    if (!prompt.trim()) { toast.error("Tell the AI what to write."); return; }
    setGenerating(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { data: draft, error } = await supabase.from("commv2_drafts").insert({
      org_id: orgId, draft_mode: "ad_hoc", stakeholder, ad_hoc_prompt: prompt.trim(),
      format: formatVal, tone, status: "drafting", created_by: userRes.user!.id,
    }).select("id").single();
    if (error || !draft) { setGenerating(false); toast.error(error?.message ?? "Failed"); return; }
    const { data, error: fnErr } = await supabase.functions.invoke("commv2-auto-draft", {
      body: { draft_id: draft.id },
    });
    setGenerating(false);
    if (fnErr) { toast.error(fnErr.message); return; }
    if (!data?.ok) { toast.error(data?.error ?? "Draft failed"); return; }
    toast.success("Draft ready.");
    onCreated(draft.id);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ad-hoc communication</DialogTitle>
          <DialogDescription>For one-off comms not on the calendar. Tell the AI what you want to say — it won't invent any dates, prices, or links you don't provide.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Audience</Label>
              <Select value={stakeholder} onValueChange={setStakeholder}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAKEHOLDERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format</Label>
              <Select value={formatVal} onValueChange={setFormatVal}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="text">Text message</SelectItem>
                  <SelectItem value="social">Social post</SelectItem>
                  <SelectItem value="newsletter">Newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Tone</Label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>What do you want to say?</Label>
            <Textarea
              value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} className="mt-1.5"
              placeholder="e.g., Field is closed tonight due to lightning. Practice moves to indoor facility at 7pm. Bring sneakers."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Include any specific dates, times, locations, prices, or links — the AI uses only what you give it.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={generating}>
            {generating ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Drafting…</> : <>Draft it <Sparkles className="h-3 w-3 ml-2" /></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft drawer (review / edit / approve / mark sent)

function DraftDrawer({ draftId, onClose, onChanged }: {
  draftId: string; onClose: () => void; onChanged: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("commv2_drafts").select("*").eq("id", draftId).maybeSingle();
    setDraft(data as any);
    setSubject((data as any)?.subject ?? "");
    setBody((data as any)?.body ?? "");
    setLoading(false);
  };
  useEffect(() => { load(); }, [draftId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("commv2_drafts").update({ subject, body }).eq("id", draftId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved.");
    await load();
  };

  const approve = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("commv2_drafts").update({
      status: "approved", subject, body,
      approved_at: new Date().toISOString(), approved_by: userRes.user!.id,
    }).eq("id", draftId);
    if (error) { toast.error(error.message); return; }
    toast.success("Approved — ready for the org user to send.");
    await load(); onChanged();
  };

  const markSent = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("commv2_drafts").update({
      status: "sent", subject, body,
      sent_at: new Date().toISOString(), sent_by: userRes.user!.id,
    }).eq("id", draftId);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as sent.");
    await load(); onChanged();
  };

  const regenerate = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("commv2-auto-draft", {
      body: { draft_id: draftId },
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (data?.blocked) { toast.error("Missing facts: " + data.missing_facts.join(", ")); return; }
    toast.success("Regenerated.");
    await load(); onChanged();
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {loading || !draft ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{draft.draft_mode === "ad_hoc" ? "Ad-hoc" : "Calendar"}</Badge>
                <StatusBadge status={draft.status} />
              </div>
              <SheetTitle>Review draft</SheetTitle>
              <SheetDescription>
                {draft.stakeholder} · {draft.format}
                {draft.generated_at && ` · generated ${format(parseISO(draft.generated_at), "MMM d, h:mma")}`}
              </SheetDescription>
            </SheetHeader>

            {draft.status === "pending_facts" && draft.missing_facts.length > 0 && (
              <Card className="mt-4 border-l-4 border-l-amber-500">
                <CardContent className="py-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" /> Cannot draft — missing required facts:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-1 list-disc pl-6">
                    {draft.missing_facts.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}

            {draft.format === "email" && (
              <div className="mt-4">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" />
              </div>
            )}
            <div className="mt-4">
              <Label>Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} className="mt-1.5 font-mono text-sm" />
            </div>

            <div className="mt-6 pt-4 border-t flex flex-wrap gap-2 justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={regenerate} disabled={saving}>
                  <Sparkles className="h-4 w-4 mr-1" /> Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save edits"}
                </Button>
              </div>
              <div className="flex gap-2">
                {draft.status !== "approved" && draft.status !== "sent" && (
                  <Button size="sm" onClick={approve} disabled={!body}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                )}
                {draft.status !== "sent" && (
                  <Button size="sm" variant="default" onClick={markSent}>
                    <Send className="h-4 w-4 mr-1" /> Mark sent
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
