import { useEffect, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
// formatCurrency reserved for future use
import {
  STAGES, STAGE_LABELS, STAGE_PILL, SOURCES, SOURCE_LABELS, TIERS,
  type SponsorshipLead, type Stage, type Source, type Tier, fireConfetti,
} from "@/lib/sponsorship";
import { cn } from "@/lib/utils";
import { Eye, Lock, Trash2, Flame } from "lucide-react";

type Admin = { user_id: string; full_name: string | null; email: string };
type Note = { id: string; note_text: string; is_client_visible: boolean; created_at: string; created_by: string };
type Activity = { id: string; from_stage: string | null; to_stage: string; changed_at: string; changed_by: string; notes: string | null };

export default function LeadDetailPanel({
  leadId, orgName, onClose, onChanged,
}: {
  leadId: string | null;
  orgName?: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const open = !!leadId;
  const { user } = useAuth();
  const [lead, setLead] = useState<SponsorshipLead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [history, setHistory] = useState<Activity[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, { full_name: string | null; email: string }>>(new Map());
  const [loading, setLoading] = useState(false);

  // editing state
  const [draft, setDraft] = useState<Partial<SponsorshipLead>>({});

  // notes
  const [noteText, setNoteText] = useState("");
  const [noteVisible, setNoteVisible] = useState(false);
  const [noteFilter, setNoteFilter] = useState<"all" | "client" | "internal">("all");

  useEffect(() => {
    if (!leadId) { setLead(null); return; }
    setLoading(true);
    (async () => {
      const [{ data: l }, { data: n }, { data: h }, adminRes] = await Promise.all([
        supabase.from("sponsorship_leads").select("*").eq("id", leadId).maybeSingle(),
        supabase.from("sponsorship_lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
        supabase.from("sponsorship_lead_stage_history").select("*").eq("lead_id", leadId).order("changed_at", { ascending: false }),
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      setLead(l as SponsorshipLead);
      setDraft((l ?? {}) as Partial<SponsorshipLead>);
      setNotes((n ?? []) as Note[]);
      setHistory((h ?? []) as Activity[]);

      const adminIds = (adminRes.data ?? []).map((r: any) => r.user_id);
      const allUserIds = new Set<string>(adminIds);
      (n ?? []).forEach((x: any) => allUserIds.add(x.created_by));
      (h ?? []).forEach((x: any) => allUserIds.add(x.changed_by));
      if (l?.created_by) allUserIds.add(l.created_by);
      const ids = Array.from(allUserIds);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const map = new Map<string, { full_name: string | null; email: string }>();
      (profs ?? []).forEach((p: any) => map.set(p.user_id, { full_name: p.full_name, email: p.email }));
      setProfileMap(map);
      setAdmins((profs ?? []).filter((p: any) => adminIds.includes(p.user_id)) as Admin[]);
      setLoading(false);
    })();
  }, [leadId]);

  const reload = async () => {
    if (!leadId) return;
    const { data: l } = await supabase.from("sponsorship_leads").select("*").eq("id", leadId).maybeSingle();
    setLead(l as SponsorshipLead);
    setDraft((l ?? {}) as Partial<SponsorshipLead>);
    onChanged?.();
  };

  const updateField = async (patch: Partial<SponsorshipLead>) => {
    if (!leadId) return;
    setDraft({ ...draft, ...patch });
    const { error } = await supabase.from("sponsorship_leads").update(patch as any).eq("id", leadId);
    if (error) { toast.error(error.message); return; }
    onChanged?.();
  };

  const moveStage = async (to: Stage) => {
    if (!lead || !user) return;
    if (to === lead.stage) return;
    const wasNotClosed = lead.stage !== "closed_won";
    const { error } = await supabase
      .from("sponsorship_leads")
      .update({ stage: to } as any)
      .eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("sponsorship_lead_stage_history").insert({
      lead_id: lead.id,
      org_id: lead.org_id,
      from_stage: lead.stage,
      to_stage: to,
      changed_by: user.id,
    });
    if (to === "closed_won" && wasNotClosed) {
      fireConfetti();
      // Fire-and-forget notification
      supabase.functions.invoke("sponsorship-deal-closed", { body: { lead_id: lead.id } }).catch(() => {});
    }
    toast.success(`Moved to ${STAGE_LABELS[to]}`);
    reload();
    const { data: h } = await supabase.from("sponsorship_lead_stage_history").select("*").eq("lead_id", lead.id).order("changed_at", { ascending: false });
    setHistory((h ?? []) as Activity[]);
  };

  const addNote = async () => {
    if (!lead || !user || !noteText.trim()) return;
    const { error } = await supabase.from("sponsorship_lead_notes").insert({
      lead_id: lead.id,
      org_id: lead.org_id,
      note_text: noteText.trim(),
      is_client_visible: noteVisible,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    setNoteText("");
    setNoteVisible(false);
    const { data } = await supabase.from("sponsorship_lead_notes").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false });
    setNotes((data ?? []) as Note[]);
  };

  const deleteNote = async (id: string) => {
    await supabase.from("sponsorship_lead_notes").delete().eq("id", id);
    setNotes(notes.filter((n) => n.id !== id));
  };

  const deleteLead = async () => {
    if (!lead) return;
    const { error } = await supabase.from("sponsorship_leads").delete().eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead deleted");
    onChanged?.();
    onClose();
  };

  const filteredNotes = notes.filter((n) =>
    noteFilter === "all" ? true : noteFilter === "client" ? n.is_client_visible : !n.is_client_visible,
  );

  const userLabel = (uid: string) => {
    const p = profileMap.get(uid);
    return p?.full_name ?? p?.email ?? uid.slice(0, 8);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {!lead || loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div>
            <div className="px-6 py-5 border-b border-border bg-card sticky top-0 z-10">
              <SheetHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="text-2xl font-display font-semibold">{lead.business_name}</SheetTitle>
                    {orgName && <p className="text-sm text-muted-foreground mt-0.5">{orgName}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lead.is_warm && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-warning-soft text-warning border border-warning/30">
                        <Flame className="h-3 w-3" /> Warm
                      </span>
                    )}
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border", STAGE_PILL[lead.stage])}>
                      {STAGE_LABELS[lead.stage]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Select value={lead.stage} onValueChange={(v) => moveStage(v as Stage)}>
                    <SelectTrigger className="h-9 text-xs w-44"><SelectValue placeholder="Move stage" /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Permanently removes the lead, its notes, and stage history. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </SheetHeader>
            </div>

            <Tabs defaultValue="overview" className="px-6 py-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <section className="space-y-3">
                    <p className="curve-eyebrow">Business</p>
                    <FieldRow label="Name">
                      <Input value={draft.business_name ?? ""} onChange={(e) => setDraft({ ...draft, business_name: e.target.value })} onBlur={() => updateField({ business_name: draft.business_name })} />
                    </FieldRow>
                    <FieldRow label="Contact name">
                      <Input value={draft.contact_name ?? ""} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} onBlur={() => updateField({ contact_name: draft.contact_name ?? null })} />
                    </FieldRow>
                    <FieldRow label="Email">
                      <Input value={draft.contact_email ?? ""} onChange={(e) => setDraft({ ...draft, contact_email: e.target.value })} onBlur={() => updateField({ contact_email: draft.contact_email ?? null })} />
                    </FieldRow>
                    <FieldRow label="Phone">
                      <Input value={draft.contact_phone ?? ""} onChange={(e) => setDraft({ ...draft, contact_phone: e.target.value })} onBlur={() => updateField({ contact_phone: draft.contact_phone ?? null })} />
                    </FieldRow>
                    <FieldRow label="Business type">
                      <Input value={draft.business_type ?? ""} onChange={(e) => setDraft({ ...draft, business_type: e.target.value })} onBlur={() => updateField({ business_type: draft.business_type ?? null })} />
                    </FieldRow>
                    <FieldRow label="City / State">
                      <Input value={draft.city_state ?? ""} onChange={(e) => setDraft({ ...draft, city_state: e.target.value })} onBlur={() => updateField({ city_state: draft.city_state ?? null })} />
                    </FieldRow>
                    <FieldRow label="Source">
                      <Select value={draft.source ?? lead.source} onValueChange={(v) => updateField({ source: v as Source })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}</SelectContent>
                      </Select>
                    </FieldRow>
                    {(draft.source ?? lead.source) === "other" && (
                      <FieldRow label="Source detail">
                        <Input value={draft.source_other ?? ""} onChange={(e) => setDraft({ ...draft, source_other: e.target.value })} onBlur={() => updateField({ source_other: draft.source_other ?? null })} />
                      </FieldRow>
                    )}
                  </section>

                  <section className="space-y-3">
                    <p className="curve-eyebrow">Deal</p>
                    <FieldRow label="Assigned to">
                      <Select value={draft.assigned_to ?? ""} onValueChange={(v) => updateField({ assigned_to: v })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          {admins.map((a) => <SelectItem key={a.user_id} value={a.user_id}>{a.full_name ?? a.email}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Sponsorship tier">
                      <Select value={draft.sponsorship_tier ?? "none"} onValueChange={(v) => updateField({ sponsorship_tier: (v === "none" ? null : v as Tier) })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Proposed value ($)">
                      <Input type="number" value={draft.proposed_value ?? ""} onChange={(e) => setDraft({ ...draft, proposed_value: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => updateField({ proposed_value: draft.proposed_value ?? null })} />
                    </FieldRow>
                    {lead.stage === "closed_won" && (
                      <FieldRow label="Closed value ($)">
                        <Input type="number" value={draft.closed_value ?? ""} onChange={(e) => setDraft({ ...draft, closed_value: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => updateField({ closed_value: draft.closed_value ?? null })} />
                      </FieldRow>
                    )}

                    <div className="rounded-md border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-warning" /> Warm lead</Label>
                        <Switch checked={!!draft.is_warm} onCheckedChange={(v) => updateField({ is_warm: v, warm_flagged_by_dsf: v || lead.warm_flagged_by_dsf })} />
                      </div>
                      {draft.is_warm && (
                        <Textarea
                          rows={2}
                          placeholder="Why is this a warm lead?"
                          value={draft.warm_notes ?? ""}
                          onChange={(e) => setDraft({ ...draft, warm_notes: e.target.value })}
                          onBlur={() => updateField({ warm_notes: draft.warm_notes ?? null })}
                        />
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span>Org: <strong className={lead.warm_flagged_by_org ? "text-foreground" : ""}>{lead.warm_flagged_by_org ? "Yes" : "No"}</strong></span>
                        <span>DSF: <strong className={lead.warm_flagged_by_dsf ? "text-foreground" : ""}>{lead.warm_flagged_by_dsf ? "Yes" : "No"}</strong></span>
                      </div>
                    </div>
                  </section>
                </div>

                <section>
                  <p className="curve-eyebrow mb-3">Stage history</p>
                  <ol className="space-y-2 text-sm">
                    {history.length === 0 && <li className="text-muted-foreground text-xs">No transitions yet.</li>}
                    {history.map((h) => (
                      <li key={h.id} className="flex items-start gap-3 pl-3 border-l-2 border-border">
                        <div className="min-w-0">
                          <p>
                            {h.from_stage ? <span className="text-muted-foreground">{STAGE_LABELS[h.from_stage as Stage] ?? h.from_stage} →</span> : null}{" "}
                            <span className="font-semibold">{STAGE_LABELS[h.to_stage as Stage] ?? h.to_stage}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(h.changed_at).toLocaleString()} · {userLabel(h.changed_by)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </TabsContent>

              <TabsContent value="notes" className="mt-5 space-y-4">
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <Textarea rows={3} placeholder="Add a note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={noteVisible} onCheckedChange={setNoteVisible} />
                      <span>Client visible</span>
                    </label>
                    <Button size="sm" onClick={addNote} disabled={!noteText.trim()} className="bg-health text-health-foreground hover:bg-health/90">Add Note</Button>
                  </div>
                  {noteVisible && (
                    <p className="rounded-md bg-health-soft border border-health/30 text-health text-xs p-2">
                      This note will be visible to {orgName ?? "the organization"}. Make sure it's professional and appropriate.
                    </p>
                  )}
                </div>

                <div className="flex gap-1.5">
                  {(["all","client","internal"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setNoteFilter(f)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-semibold border",
                        noteFilter === f ? "bg-accent text-accent-foreground border-accent" : "bg-background text-muted-foreground border-border",
                      )}
                    >
                      {f === "all" ? "All Notes" : f === "client" ? "Client Visible" : "Internal"}
                    </button>
                  ))}
                </div>

                <ul className="space-y-3">
                  {filteredNotes.length === 0 && <li className="text-xs text-muted-foreground">No notes yet.</li>}
                  {filteredNotes.map((n) => (
                    <li key={n.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-3 mb-1.5 text-xs text-muted-foreground">
                        <span>
                          <strong className="text-foreground">{userLabel(n.created_by)}</strong>{" "}· {new Date(n.created_at).toLocaleString()}
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px]",
                          n.is_client_visible ? "bg-health-soft text-health border-health/30" : "bg-muted text-muted-foreground border-border",
                        )}>
                          {n.is_client_visible ? <><Eye className="h-2.5 w-2.5" /> Client</> : <><Lock className="h-2.5 w-2.5" /> Internal</>}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{n.note_text}</p>
                      {n.created_by === user?.id && (
                        <button onClick={() => deleteNote(n.id)} className="text-xs text-destructive hover:underline mt-2">Delete</button>
                      )}
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="activity" className="mt-5">
                <ol className="space-y-2 text-sm">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-start gap-3 pl-3 border-l-2 border-border">
                      <div>
                        <p>
                          Stage{" "}
                          {h.from_stage ? <><span className="text-muted-foreground">{STAGE_LABELS[h.from_stage as Stage] ?? h.from_stage}</span> →</> : "set to"}{" "}
                          <span className="font-semibold">{STAGE_LABELS[h.to_stage as Stage] ?? h.to_stage}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(h.changed_at).toLocaleString()} · {userLabel(h.changed_by)}</p>
                      </div>
                    </li>
                  ))}
                  {notes.map((n) => (
                    <li key={`n-${n.id}`} className="flex items-start gap-3 pl-3 border-l-2 border-border">
                      <div>
                        <p>Note added <span className="text-xs text-muted-foreground">({n.is_client_visible ? "client visible" : "internal"})</span></p>
                        <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()} · {userLabel(n.created_by)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
