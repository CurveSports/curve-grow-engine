import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, Copy, Loader2, Settings2, Sparkles, X, RefreshCw, FileText, AlertTriangle, Calendar as CalIcon, ScrollText, Plus, Building2, Send } from "lucide-react";
import {
  getCategoriesForOrg, findCard, buildUserPrompt, validateCard, visibleFields,
  type CommCard, type CommField,
} from "@/lib/communicationCategories";
import CalendarTab from "@/components/communications/CalendarTab";
import StandardsTab from "@/components/communications/StandardsTab";
import SeasonSetupModal from "@/components/communications/SeasonSetupModal";
import SendHandoffModal from "@/components/communications/SendHandoffModal";

type Personalization = { recipient: string; eventOrDate: string; additionalContext: string };
type Track = "dsf" | "direct";
type PageTab = "calendar" | "draft" | "standards";

const TONES = ["Professional", "Conversational", "Formal"] as const;
const FORMATS = ["Email", "Text message", "Social post", "In-person script"] as const;
const REFINE_PILLS = [
  "Make it shorter", "Make it longer", "More formal", "More conversational",
  "Add a call to action", "Friendlier tone", "More specific", "Add urgency",
  "Simplify the language", "Add bullet points",
];

export default function Communications() {
  const { orgId: routeOrgId } = useParams<{ orgId?: string }>();
  const { profile, role, loading: authLoading } = useAuth();
  const effectiveOrgId = role === "admin" ? routeOrgId ?? null : profile?.org_id ?? null;

  if (!authLoading && role === "admin" && !routeOrgId) {
    return <Navigate to="/admin/communications" replace />;
  }
  if (!authLoading && !effectiveOrgId) {
    return <Navigate to="/dashboard" replace />;
  }
  return <CommunicationsInner orgId={effectiveOrgId!} isAdminContext={role === "admin"} userId={profile?.user_id ?? ""} />;
}

function CommunicationsInner({ orgId, isAdminContext, userId }: { orgId: string; isAdminContext: boolean; userId: string }) {
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("Organization");
  const [intake, setIntake] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [tracks, setTracks] = useState<{ has_youth_track: boolean; has_hs_track: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageTab, setPageTab] = useState<PageTab>("calendar");
  const [trackSetupStep, setTrackSetupStep] = useState<"closed" | "select_tracks" | "first_season">("closed");
  const [selYouth, setSelYouth] = useState(false);
  const [selHs, setSelHs] = useState(false);
  const [allOrgs, setAllOrgs] = useState<{ id: string; name: string }[]>([]);

  // Load org list for admin switcher
  useEffect(() => {
    if (!isAdminContext) return;
    (async () => {
      const { data } = await supabase.from("organizations").select("id, name").order("name", { ascending: true });
      setAllOrgs((data ?? []) as { id: string; name: string }[]);
    })();
  }, [isAdminContext]);

  async function loadAll() {
    setLoading(true);
    const [{ data: org }, { data: i }, { data: m }, { data: t }] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      supabase.from("organization_intake").select("*").eq("org_id", orgId).maybeSingle(),
      supabase.from("derived_metrics").select("monetization_tier, priority_engine").eq("org_id", orgId).maybeSingle(),
      supabase.from("org_communication_tracks").select("has_youth_track, has_hs_track").eq("org_id", orgId).maybeSingle(),
    ]);
    setOrgName(org?.name ?? "Organization");
    setIntake(i);
    setMetrics(m);
    setTracks(t as any);
    setLoading(false);
    if (!t) setTrackSetupStep("select_tracks");
  }

  useEffect(() => { loadAll(); }, [orgId]);

  async function saveTracks() {
    const has_youth_track = selYouth;
    const has_hs_track = selHs;
    const { error } = await supabase.from("org_communication_tracks").upsert({
      org_id: orgId,
      has_youth_track,
      has_hs_track,
      tracks_configured_at: new Date().toISOString(),
      tracks_configured_by: userId,
    }, { onConflict: "org_id" });
    if (error) return alert(error.message);
    setTracks({ has_youth_track, has_hs_track });
    setTrackSetupStep("first_season");
  }

  // Draft tab state
  const categories = useMemo(() => getCategoriesForOrg(intake?.org_type), [intake?.org_type]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [tone, setTone] = useState<typeof TONES[number]>("Professional");
  const [format, setFormat] = useState<typeof FORMATS[number]>("Email");
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState<Track>(isAdminContext ? "dsf" : "direct");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [refined, setRefined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [personal, setPersonal] = useState<Personalization>({ recipient: "", eventOrDate: "", additionalContext: "" });
  const personalActive = !!(personal.recipient || personal.eventOrDate || personal.additionalContext);
  const [refining, setRefining] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [refineText, setRefineText] = useState("");
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [handoffOpen, setHandoffOpen] = useState(false);

  const selectedCard: CommCard | null = useMemo(() => {
    if (!selectedCardId) return null;
    const found = findCard(categories, selectedCardId);
    return found?.card ?? null;
  }, [selectedCardId, categories]);

  const isSponsorCard = !!(selectedCardId && selectedCardId.startsWith("sponsor_"));
  const isAffiliateDeck = selectedCardId === "affiliate_sales_deck";

  function selectCardByLabel(label: string, prefill?: Partial<Personalization>) {
    for (const cat of categories) {
      const c = cat.cards.find((x) => x.label.toLowerCase() === label.toLowerCase());
      if (c) {
        setSelectedCardId(c.id);
        setFieldValues({});
        setMissingKeys([]); setDraft(null); setRefined(false); setError(null);
        setShowRefine(false); setRefineText("");
        if (prefill) {
          setPersonal((p) => ({ ...p, ...prefill }));
          setPersonalOpen(true);
        }
        setPageTab("draft");
        setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        return;
      }
    }
  }

  function handleSelectCard(card: CommCard) {
    setSelectedCardId(card.id);
    setFieldValues({});
    setMissingKeys([]); setDraft(null); setRefined(false); setError(null);
    setShowRefine(false); setRefineText("");
    setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function startOver() {
    setSelectedCardId(null);
    setFieldValues({}); setMissingKeys([]); setDraft(null); setRefined(false);
    setError(null); setShowRefine(false); setRefineText("");
  }

  async function generate() {
    if (!selectedCard) return;
    const missing = validateCard(selectedCard, fieldValues);
    if (missing.length > 0) {
      setMissingKeys(missing);
      setError("Please fill in the required fields above.");
      return;
    }
    setMissingKeys([]);
    const promptText = buildUserPrompt(selectedCard, fieldValues, personalActive ? personal : undefined);
    const typeLabel = isSponsorCard ? `${track === "dsf" ? "DSF" : "Direct"} ${selectedCard.label}` : selectedCard.label;
    setGenerating(true); setError(null); setDraft(null); setRefined(false);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("draft-communication", {
        body: {
          orgId, communicationType: typeLabel, prompt: promptText, tone, format,
          outreachTrack: isSponsorCard ? track : undefined,
          isAffiliateDeck,
          personalization: personalActive ? personal : undefined,
        },
      });
      if (fnErr) throw fnErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDraft((data as any)?.draft ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong generating your draft.");
    } finally {
      setGenerating(false);
    }
  }

  async function refine() {
    if (!draft || !selectedCard || !refineText.trim()) return;
    setRefining(true); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("draft-communication/refine", {
        body: { orgId, originalDraft: draft, refinementRequest: refineText, communicationType: selectedCard.label, tone, format },
      });
      if (fnErr) throw fnErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDraft((data as any)?.draft ?? "");
      setRefined(true); setShowRefine(false); setRefineText("");
    } catch (e: any) {
      setError(e?.message ?? "Refinement failed.");
    } finally {
      setRefining(false);
    }
  }

  async function copyToClipboard() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.map((cat) => ({
      ...cat, cards: cat.cards.filter((c) => c.label.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)),
    })).filter((cat) => cat.cards.length > 0);
  }, [categories, search]);

  const wordCount = draft ? draft.trim().split(/\s+/).filter(Boolean).length : 0;
  const totalPlayers = intake?.total_players ?? 0;
  const marketType = intake?.market_type ?? "—";
  const tier = metrics?.monetization_tier ?? "—";
  const priorityEngine = metrics?.priority_engine ?? "—";

  // ── First-time setup wizard (org users + admins acting on behalf) ──
  if (!loading && trackSetupStep !== "closed") {
    return (
      <AppShell title="Communications">
        <div className="max-w-2xl mx-auto">
          {isAdminContext && (
            <div className="mb-4 rounded-lg border-2 border-warning/40 bg-warning-soft text-foreground px-4 py-3 text-sm">
              <strong className="text-warning">Setting up calendar on behalf of {orgName}.</strong>
            </div>
          )}
          {trackSetupStep === "select_tracks" && (
            <div className="curve-card text-center">
              <CalIcon className="h-10 w-10 text-accent mx-auto mb-3" />
              <h1 className="font-display text-2xl font-semibold tracking-tight">Let's set up the Communication Calendar</h1>
              <p className="text-sm text-muted-foreground mt-2 mb-6">
                We'll build a personalized communication schedule based on seasons and program structure.
              </p>
              <p className="text-sm font-semibold mb-3">Which age groups does the program serve?</p>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {[
                  { key: "youth", label: "Youth (14U and below)", get: () => selYouth, set: () => setSelYouth(!selYouth) },
                  { key: "hs", label: "High School (15U and above)", get: () => selHs, set: () => setSelHs(!selHs) },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={opt.set}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold border transition-colors",
                      opt.get() ? "bg-accent text-accent-foreground border-accent" : "bg-card border-border hover:border-accent/50",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button
                onClick={saveTracks}
                disabled={!selYouth && !selHs}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Continue →
              </Button>
            </div>
          )}

          {trackSetupStep === "first_season" && tracks && (
            <>
              <div className="curve-card text-center">
                <h2 className="font-display text-xl font-semibold">Great — let's add the first season</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  More seasons can be added at any time as they get confirmed.
                </p>
              </div>
              <SeasonSetupModal
                open={true}
                onOpenChange={(o) => { if (!o) setTrackSetupStep("closed"); }}
                orgId={orgId}
                userId={userId}
                hasYouth={tracks.has_youth_track}
                hasHs={tracks.has_hs_track}
                onCreated={() => { setTrackSetupStep("closed"); loadAll(); }}
              />
            </>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Communications">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Communications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the communication calendar, draft messages, and operate to the Curve standard.
        </p>
      </div>

      {isAdminContext && (
        <div className="mb-4 rounded-lg border-2 border-warning/40 bg-warning-soft text-foreground px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-warning">Acting on behalf of {orgName}.</strong> Calendar changes, drafts, and sent markings will be saved to this organization.
          </div>
          {allOrgs.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-warning" />
              <Select
                value={orgId}
                onValueChange={(newId) => { if (newId !== orgId) navigate(`/communications/${newId}`); }}
              >
                <SelectTrigger className="h-8 w-[240px] bg-card text-xs">
                  <SelectValue placeholder="Switch organization…" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {allOrgs.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <Tabs value={pageTab} onValueChange={(v) => setPageTab(v as PageTab)}>
        <TabsList className="bg-card border border-border h-auto p-1">
          <TabsTrigger value="calendar" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
            <CalIcon className="h-3.5 w-3.5" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="draft" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Draft Assistant
          </TabsTrigger>
          <TabsTrigger value="standards" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">
            <ScrollText className="h-3.5 w-3.5" /> Standards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          {!tracks ? (
            <div className="curve-card text-center py-12">
              <CalIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Calendar not configured yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                {isAdminContext ? "This org hasn't set up tracks yet — set them up on their behalf." : "Let's set up your tracks to begin."}
              </p>
              <Button onClick={() => setTrackSetupStep("select_tracks")} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Set up calendar
              </Button>
            </div>
          ) : (
            <CalendarTab
              orgId={orgId}
              userId={userId}
              hasYouth={tracks.has_youth_track}
              hasHs={tracks.has_hs_track}
              onDraftItem={(item, season) => {
                if (!item.ai_communication_type) return;
                selectCardByLabel(item.ai_communication_type, {
                  eventOrDate: season?.season_name ?? "",
                  additionalContext: `For ${season?.track === "youth" ? "Youth" : "High School"} ${season?.season_name ?? ""} — stakeholder: ${item.stakeholder}`,
                });
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="draft" className="mt-6">
          {/* Context bar */}
          <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading organization context…</p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-foreground min-w-0 flex-wrap">
                  <span className="font-semibold">Writing for: {orgName}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{totalPlayers} players</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{marketType} market</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{tier} tier</span>
                  <span className="text-muted-foreground">·</span>
                  <span>Priority engine: {priorityEngine}</span>
                  {personalActive && (
                    <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent px-2 py-0.5 text-xs font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Personalized
                    </span>
                  )}
                </div>
                <button onClick={() => setPersonalOpen((v) => !v)} className="text-sm font-medium text-accent hover:underline inline-flex items-center gap-1">
                  <Settings2 className="h-3.5 w-3.5" /> Personalize
                </button>
              </div>
            )}

            {personalOpen && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Personalization</p>
                  <button onClick={() => setPersonalOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input placeholder="Recipient name or team" value={personal.recipient} onChange={(e) => setPersonal({ ...personal, recipient: e.target.value })} />
                  <Input placeholder="Specific event or date" value={personal.eventOrDate} onChange={(e) => setPersonal({ ...personal, eventOrDate: e.target.value })} />
                  <Input placeholder="Additional context" value={personal.additionalContext} onChange={(e) => setPersonal({ ...personal, additionalContext: e.target.value })} className="md:col-span-2" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
            {/* LEFT: categories */}
            <div className="space-y-4">
              <Input placeholder="What do you need to write?" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="space-y-5">
                {filteredCategories.map((cat) => (
                  <div key={cat.id}>
                    <p className="curve-eyebrow mb-1">{cat.label}</p>
                    {cat.description && <p className="text-xs text-muted-foreground mb-2">{cat.description}</p>}
                    {cat.hasTrackSelector && (
                      <div className="mb-3 flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button onClick={() => setTrack("dsf")} className={cn("flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", track === "dsf" ? "border-warning bg-warning-soft text-warning" : "border-border bg-card text-foreground hover:border-warning/50")}>DSF Outreach</button>
                          <button onClick={() => setTrack("direct")} className={cn("flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", track === "direct" ? "border-info bg-info-soft text-info" : "border-border bg-card text-foreground hover:border-info/50")}>Direct Org Outreach</button>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {track === "dsf" ? "Written from the Diamond Sports Foundation on behalf of your organization." : "Written from your organization directly."}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {cat.cards.map((card) => {
                        const active = selectedCardId === card.id;
                        return (
                          <button key={card.id} onClick={() => handleSelectCard(card)} className={cn("text-left rounded-full border px-3 py-2 text-xs font-medium transition-all min-h-[40px] flex items-center justify-between gap-2", active ? "border-accent bg-accent text-accent-foreground" : card.highlight ? "border-accent/30 bg-accent-soft text-foreground hover:border-accent" : "border-border bg-card text-foreground hover:border-accent/50")}>
                            <span className="truncate">{card.label}</span>
                            {card.badge && (
                              <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", active ? "bg-white/20 text-white" : "bg-accent/15 text-accent")}>
                                <FileText className="h-2.5 w-2.5 inline mr-0.5" /> {card.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {filteredCategories.length === 0 && <p className="text-sm text-muted-foreground">No matching communication types.</p>}
              </div>
            </div>

            {/* RIGHT: workspace */}
            <div ref={workspaceRef}>
              {!selectedCard ? (
                <div className="curve-card text-center py-16">
                  <Sparkles className="h-10 w-10 text-accent mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">Select a communication type to get started.</p>
                </div>
              ) : draft === null ? (
                <div className="curve-card space-y-5">
                  {isSponsorCard && track === "dsf" && (
                    <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-foreground flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <p>These communications are written from the Diamond Sports Foundation on behalf of <strong>{orgName}</strong>. Add your signature block after copying — these will be sent by Owen Brittle or Dave Bultema, Assistant Directors at DSF.</p>
                    </div>
                  )}
                  <div>
                    <h2 className="font-display text-lg font-semibold">{selectedCard.label}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below to generate your draft.</p>
                  </div>
                  <StructuredFieldRenderer card={selectedCard} values={fieldValues} onChange={setFieldValues} missingKeys={missingKeys} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tone</p>
                      <div className="flex flex-wrap gap-2">
                        {TONES.map((t) => (
                          <button key={t} onClick={() => setTone(t)} className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors", tone === t ? "bg-accent text-accent-foreground border-accent" : "bg-card text-foreground border-border hover:border-accent/50")}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Format</p>
                      <div className="flex flex-wrap gap-2">
                        {FORMATS.map((f) => (
                          <button key={f} onClick={() => setFormat(f)} className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors", format === f ? "bg-accent text-accent-foreground border-accent" : "bg-card text-foreground border-border hover:border-accent/50")}>{f}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {error && <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-foreground">{error}</div>}
                  <Button onClick={generate} disabled={generating} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Drafting your message…</> : <>Generate Draft</>}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button onClick={startOver} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">← Start Over</button>
                    <span className="text-xs text-muted-foreground">~{wordCount} words</span>
                  </div>
                  {isSponsorCard && track === "dsf" && (
                    <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-foreground flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <p>This draft is written from the Diamond Sports Foundation. Add your signature block before sending.</p>
                    </div>
                  )}
                  <div className="curve-card relative">
                    {refined && <span className="absolute top-3 right-3 rounded-full bg-accent-soft text-accent px-2 py-0.5 text-[10px] font-semibold">Refined</span>}
                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-foreground">{draft}</pre>
                  </div>
                  {error && <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-foreground">{error}</div>}
                  <div className="space-y-3">
                    <Button onClick={() => setHandoffOpen(true)} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                      <Send className="h-4 w-4 mr-2" /> Send this message
                    </Button>
                    <Button onClick={copyToClipboard} variant="outline" className="w-full">
                      {copied ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Just copy text</>}
                    </Button>
                    {!refined && !showRefine && (
                      <Button variant="outline" onClick={() => setShowRefine(true)} className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" /> Refine this draft
                      </Button>
                    )}
                    {!refined && <button onClick={startOver} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">Start Over</button>}
                    {refined && <p className="text-center text-xs text-muted-foreground">Need more changes? <button onClick={startOver} className="underline">Start over</button> and regenerate.</p>}
                  </div>
                  {showRefine && !refined && (
                    <div className="curve-card space-y-3">
                      <p className="text-sm font-semibold">What would you like to change?</p>
                      <div className="flex flex-wrap gap-2">
                        {REFINE_PILLS.map((pill) => (
                          <button key={pill} onClick={() => setRefineText(pill)} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:border-accent/50">{pill}</button>
                        ))}
                      </div>
                      <Textarea placeholder="Describe what you'd like to change about this draft" value={refineText} onChange={(e) => setRefineText(e.target.value)} className="min-h-[80px]" />
                      <div className="flex gap-2">
                        <Button onClick={refine} disabled={refining || !refineText.trim()} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                          {refining ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refining your draft…</> : "Apply Refinement"}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowRefine(false); setRefineText(""); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="standards" className="mt-6">
          <StandardsTab onDraftTemplate={(label) => selectCardByLabel(label)} />
        </TabsContent>
      </Tabs>

      {draft && selectedCard && (
        <SendHandoffModal
          open={handoffOpen}
          onOpenChange={setHandoffOpen}
          orgId={orgId}
          userId={userId}
          draft={draft}
          communicationType={isSponsorCard ? `${track === "dsf" ? "DSF" : "Direct"} ${selectedCard.label}` : selectedCard.label}
          defaultRecipient={personal.recipient}
        />
      )}
    </AppShell>
  );
}

function StructuredFieldRenderer({ card, values, onChange, missingKeys }: { card: CommCard; values: Record<string, string>; onChange: (next: Record<string, string>) => void; missingKeys: string[]; }) {
  const fields = visibleFields(card, values);
  function setField(key: string, val: string) { onChange({ ...values, [key]: val }); }
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <FieldRow key={f.key} field={f} value={values[f.key] || ""} onChange={(v) => setField(f.key, v)} missing={missingKeys.includes(f.key)} />
      ))}
    </div>
  );
}

function FieldRow({ field, value, onChange, missing }: { field: CommField; value: string; onChange: (v: string) => void; missing: boolean; }) {
  const labelEl = (
    <label className="text-xs font-semibold mb-1 block">
      {field.label}{field.required && <span className="text-warning ml-0.5">*</span>}
    </label>
  );
  const errorClass = missing ? "border-warning ring-1 ring-warning/40" : "";
  if (field.kind === "pill" && field.options) {
    return (
      <div>
        {labelEl}
        <div className={cn("flex flex-wrap gap-2", missing && "rounded-md p-1 ring-1 ring-warning/40")}>
          {field.options.map((opt) => (
            <button key={opt} type="button" onClick={() => onChange(opt)} className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors", value === opt ? "bg-accent text-accent-foreground border-accent" : "bg-card text-foreground border-border hover:border-accent/50")}>{opt}</button>
          ))}
        </div>
      </div>
    );
  }
  if (field.kind === "textarea") {
    return (<div>{labelEl}<Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={cn("min-h-[80px]", errorClass)} /></div>);
  }
  return (<div>{labelEl}<Input type={field.kind === "date" ? "date" : "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={cn(errorClass)} /></div>);
}
