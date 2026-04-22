import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, Copy, Loader2, Settings2, Sparkles, X, RefreshCw, FileText } from "lucide-react";
import { getCategoriesForOrg, findCard, type CommCard } from "@/lib/communicationCategories";

type Personalization = {
  recipient: string;
  playerName: string;
  eventOrDate: string;
  additionalContext: string;
};

const TONES = ["Professional", "Conversational", "Formal"] as const;
const FORMATS = ["Email", "Text message", "Social post", "In-person script"] as const;
const REFINE_PILLS = [
  "Make it shorter", "Make it longer", "More formal", "More conversational",
  "Add a call to action", "Friendlier tone", "More specific", "Add urgency",
  "Simplify the language", "Add bullet points",
];

export default function Communications() {
  const { orgId: routeOrgId } = useParams<{ orgId?: string }>();
  const navigate = useNavigate();
  const { profile, role, loading: authLoading } = useAuth();

  // Resolve effective org id: admin uses route param; org user uses their profile org
  const effectiveOrgId = role === "admin" ? routeOrgId ?? null : profile?.org_id ?? null;

  // Admin without an org id in URL → send to selector
  if (!authLoading && role === "admin" && !routeOrgId) {
    return <Navigate to="/admin/communications" replace />;
  }
  if (!authLoading && !effectiveOrgId) {
    return <Navigate to="/dashboard" replace />;
  }

  return <CommunicationsInner orgId={effectiveOrgId!} isAdminContext={role === "admin"} />;
}

function CommunicationsInner({ orgId, isAdminContext }: { orgId: string; isAdminContext: boolean }) {
  const [orgName, setOrgName] = useState("Organization");
  const [intake, setIntake] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: org }, { data: i }, { data: m }] = await Promise.all([
        supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
        supabase.from("organization_intake").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("derived_metrics").select("monetization_tier, priority_engine").eq("org_id", orgId).maybeSingle(),
      ]);
      if (cancelled) return;
      setOrgName(org?.name ?? "Organization");
      setIntake(i);
      setMetrics(m);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const categories = useMemo(() => getCategoriesForOrg(intake?.org_type), [intake?.org_type]);

  // Selection / workspace state
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<typeof TONES[number]>("Professional");
  const [format, setFormat] = useState<typeof FORMATS[number]>("Email");
  const [search, setSearch] = useState("");

  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [refined, setRefined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Personalization
  const [personalOpen, setPersonalOpen] = useState(false);
  const [personal, setPersonal] = useState<Personalization>({
    recipient: "", playerName: "", eventOrDate: "", additionalContext: "",
  });
  const personalActive = !!(personal.recipient || personal.playerName || personal.eventOrDate || personal.additionalContext);

  // Refinement
  const [refining, setRefining] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [refineText, setRefineText] = useState("");

  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const selectedCard: CommCard | null = useMemo(() => {
    if (!selectedCardId) return null;
    const found = findCard(categories, selectedCardId);
    return found?.card ?? null;
  }, [selectedCardId, categories]);

  function handleSelectCard(card: CommCard) {
    setSelectedCardId(card.id);
    setPrompt(card.prompt);
    setDraft(null);
    setRefined(false);
    setError(null);
    setShowRefine(false);
    setRefineText("");
    // mobile auto-scroll
    setTimeout(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function startOver() {
    setSelectedCardId(null);
    setPrompt("");
    setDraft(null);
    setRefined(false);
    setError(null);
    setShowRefine(false);
    setRefineText("");
  }

  async function generate() {
    if (!selectedCard) return;
    setGenerating(true);
    setError(null);
    setDraft(null);
    setRefined(false);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("draft-communication", {
        body: {
          orgId,
          communicationType: selectedCard.label,
          prompt,
          tone,
          format,
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
    setRefining(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("draft-communication/refine", {
        body: {
          orgId,
          originalDraft: draft,
          refinementRequest: refineText,
          communicationType: selectedCard.label,
          tone,
          format,
        },
      });
      if (fnErr) throw fnErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDraft((data as any)?.draft ?? "");
      setRefined(true);
      setShowRefine(false);
      setRefineText("");
    } catch (e: any) {
      setError(e?.message ?? "Refinement failed.");
    } finally {
      setRefining(false);
    }
  }

  async function copyToClipboard() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        cards: cat.cards.filter(
          (c) => c.label.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.cards.length > 0);
  }, [categories, search]);

  const wordCount = draft ? draft.trim().split(/\s+/).filter(Boolean).length : 0;
  const totalPlayers = intake?.total_players ?? 0;
  const marketType = intake?.market_type ?? "—";
  const tier = metrics?.monetization_tier ?? "—";
  const priorityEngine = metrics?.priority_engine ?? "—";

  return (
    <AppShell title="Communications">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Communication Assistant</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe what you need and we'll draft it for you — informed by your organization, your families, and the Curve communication standards.
        </p>
      </div>

      {isAdminContext && (
        <div className="mb-4 rounded-lg border-2 border-warning/40 bg-warning-soft text-foreground px-4 py-3 text-sm">
          <strong className="text-warning">Drafting on behalf of {orgName}.</strong> The draft will be saved to this organization's communication log.
        </div>
      )}

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
                <span
                  className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent px-2 py-0.5 text-xs font-medium"
                  title="Personalization active — your details are included in the draft"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Personalized
                </span>
              )}
            </div>
            <button
              onClick={() => setPersonalOpen((v) => !v)}
              className="text-sm font-medium text-accent hover:underline inline-flex items-center gap-1"
            >
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
              <Input
                placeholder="Recipient name or team — e.g. 14U Navy families, Coach Rodriguez, ABC Auto Group"
                value={personal.recipient}
                onChange={(e) => setPersonal({ ...personal, recipient: e.target.value })}
              />
              <Input
                placeholder="Specific player name (optional) — e.g. Jake Martinez"
                value={personal.playerName}
                onChange={(e) => setPersonal({ ...personal, playerName: e.target.value })}
              />
              <Input
                placeholder="Specific event or date (optional) — e.g. Fall Showcase, October 15th"
                value={personal.eventOrDate}
                onChange={(e) => setPersonal({ ...personal, eventOrDate: e.target.value })}
              />
              <Input
                placeholder="Additional context (optional)"
                value={personal.additionalContext}
                onChange={(e) => setPersonal({ ...personal, additionalContext: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        {/* LEFT: categories */}
        <div className="space-y-4">
          <Input
            placeholder="What do you need to write?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-5">
            {filteredCategories.map((cat) => (
              <div key={cat.id}>
                <p className="curve-eyebrow mb-1">{cat.label}</p>
                {cat.description && (
                  <p className="text-xs text-muted-foreground mb-2">{cat.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {cat.cards.map((card) => {
                    const active = selectedCardId === card.id;
                    return (
                      <button
                        key={card.id}
                        onClick={() => handleSelectCard(card)}
                        className={cn(
                          "text-left rounded-full border px-3 py-2 text-xs font-medium transition-all min-h-[40px] flex items-center justify-between gap-2",
                          active
                            ? "border-accent bg-accent text-accent-foreground"
                            : card.highlight
                              ? "border-accent/30 bg-accent-soft text-foreground hover:border-accent"
                              : "border-border bg-card text-foreground hover:border-accent/50",
                        )}
                        title={card.highlight ? "Generates a full multi-section sales document rather than a single message" : undefined}
                      >
                        <span className="truncate">{card.label}</span>
                        {card.badge && (
                          <span className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            active ? "bg-white/20 text-white" : "bg-accent/15 text-accent",
                          )}>
                            <FileText className="h-2.5 w-2.5 inline mr-0.5" /> {card.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <p className="text-sm text-muted-foreground">No matching communication types.</p>
            )}
          </div>
        </div>

        {/* RIGHT: workspace */}
        <div ref={workspaceRef}>
          {!selectedCard ? (
            <div className="curve-card text-center py-16">
              <Sparkles className="h-10 w-10 text-accent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Select a communication type to get started or describe what you need in your own words.
              </p>
            </div>
          ) : draft === null ? (
            <div className="curve-card space-y-5">
              <div>
                <label className="text-sm font-semibold mb-2 block">What would you like to say?</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={selectedCard.id === "something_else"
                    ? "Describe what you need and we'll draft it for you"
                    : "Describe what you'd like the message to say…"}
                  className="min-h-[140px]"
                />
                <p className="text-xs text-muted-foreground mt-1">{prompt.length} characters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tone</p>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                          tone === t ? "bg-accent text-accent-foreground border-accent" : "bg-card text-foreground border-border hover:border-accent/50",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Format</p>
                  <div className="flex flex-wrap gap-2">
                    {FORMATS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                          format === f ? "bg-accent text-accent-foreground border-accent" : "bg-card text-foreground border-border hover:border-accent/50",
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-foreground">
                  {error}
                </div>
              )}

              <Button
                onClick={generate}
                disabled={generating}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Drafting your message…</>
                ) : (
                  <>Generate Draft</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={startOver} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  ← Start Over
                </button>
                <span className="text-xs text-muted-foreground">~{wordCount} words</span>
              </div>

              <div className="curve-card relative">
                {refined && (
                  <span className="absolute top-3 right-3 rounded-full bg-accent-soft text-accent px-2 py-0.5 text-[10px] font-semibold">Refined</span>
                )}
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-foreground">
                  {draft}
                </pre>
              </div>

              {error && (
                <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-foreground">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={copyToClipboard}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {copied ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy to Clipboard</>}
                </Button>

                {!refined && !showRefine && (
                  <Button variant="outline" onClick={() => setShowRefine(true)} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" /> Refine this draft
                  </Button>
                )}

                {!refined && (
                  <button onClick={startOver} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
                    Start Over
                  </button>
                )}

                {refined && (
                  <p className="text-center text-xs text-muted-foreground">
                    Need more changes? <button onClick={startOver} className="underline">Start over</button> and regenerate.
                  </p>
                )}
              </div>

              {showRefine && !refined && (
                <div className="curve-card space-y-3">
                  <p className="text-sm font-semibold">What would you like to change?</p>
                  <div className="flex flex-wrap gap-2">
                    {REFINE_PILLS.map((pill) => (
                      <button
                        key={pill}
                        onClick={() => setRefineText(pill)}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:border-accent/50"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Describe what you'd like to change about this draft"
                    value={refineText}
                    onChange={(e) => setRefineText(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={refine}
                      disabled={refining || !refineText.trim()}
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      {refining ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refining your draft…</>
                      ) : (
                        "Apply Refinement"
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => { setShowRefine(false); setRefineText(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
