import { useEffect, useState } from "react";
import { Check, Lock, Sparkles, X, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const TIERS = ["Foundational", "Emerging", "Growth", "Advanced", "Elite"] as const;
type Tier = typeof TIERS[number];

const THRESHOLDS: Record<Tier, [number, number]> = {
  Foundational: [0, 20],
  Emerging: [21, 32],
  Growth: [33, 44],
  Advanced: [45, 52],
  Elite: [53, 60],
};

const TIER_DESCRIPTIONS_ORG: Record<Tier, string> = {
  Foundational: "You're building the foundation of a stronger business. Every system you put in place now multiplies your results later. The opportunity in front of you is significant — and you're just getting started.",
  Emerging: "You've built something real. Revenue is coming from more than one place and the systems are starting to take shape. The next stage is about activating the engines that are ready to perform.",
  Growth: "Your program is strong and your business is growing. Multiple revenue engines are working. Now it's about optimizing what's working and capturing the remaining opportunity with precision.",
  Advanced: "You're running a sophisticated operation. Most engines are performing well and your revenue per player reflects the quality of your program. The focus now is on fine-tuning and expanding your reach.",
  Elite: "Best in class. You've built what most clubs only dream about — a fully optimized revenue operation that matches the quality of your program. The opportunity now is in expanding your footprint and becoming a model for the industry.",
};

const TIER_DESCRIPTIONS_ADMIN: Record<Tier, string> = {
  Foundational: "Total score 0–20. Most engines underdeveloped. Engagement runway is long; expect 60–90 days before first revenue wins. Sequence operations + first quick-win engine.",
  Emerging: "Total score 21–32. One or two engines starting to perform. Activation focus on lowest-scoring high-opportunity engines. 30–60 day first wins.",
  Growth: "Total score 33–44. Multiple engines online. Optimization phase begins. Apparel/Add-Ons and second-wave revenue engines should activate.",
  Advanced: "Total score 45–52. Sophisticated operation. Fine-tuning, packaging, and expansion plays. Higher-touch advisory.",
  Elite: "Total score 53–60. Best in class. Engagement shifts to footprint expansion, multi-brand, affiliate growth, and community thought leadership.",
};

const TIER_SHORT: Record<Tier, string> = {
  Foundational: "Building the foundation",
  Emerging: "Engines starting to perform",
  Growth: "Multiple engines working",
  Advanced: "Sophisticated operation",
  Elite: "Best in class",
};

const ENGINE_FIELDS: Record<string, string> = {
  Pricing: "pricing_score", Sponsorship: "sponsorship_score", Apparel: "apparel_score",
  Events: "event_score", "Add-Ons": "addon_score", Retention: "retention_score",
  Facility: "facility_score", Affiliate: "affiliate_score",
};

export interface TierLadderProps {
  metrics: any;
  orgId: string;
  showAdminContext?: boolean;
  variant?: "org" | "admin";
}

export function TierLadder({ metrics, orgId, showAdminContext = false, variant = "org" }: TierLadderProps) {
  const [showAdmin, setShowAdmin] = useState(showAdminContext);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("org_tier_history")
        .select("*")
        .eq("org_id", orgId)
        .order("changed_at", { ascending: true });
      setHistory((data ?? []) as any[]);
    })();
  }, [orgId]);

  const currentTier = (metrics?.monetization_tier as Tier) ?? "Foundational";
  const currentScore = Number(metrics?.total_engine_score ?? 0);
  const nextTier = (metrics?.next_tier as Tier | null) ?? null;
  const nextThreshold = metrics?.next_tier_threshold as number | null;
  const pointsToNext = metrics?.points_to_next_tier as number | null;
  const fastestPath = (metrics?.fastest_path_engines as any[] | null) ?? [];
  const fastestTotal = Number(metrics?.fastest_path_total_points ?? 0);
  const canReach = metrics?.can_reach_next_tier === true;
  const activeProjEngines = (metrics?.active_project_engines as string[] | null) ?? [];
  const projAligned = metrics?.project_aligned_with_fastest_path === true;

  const currentIdx = TIERS.indexOf(currentTier);

  // Engine summary dots
  const engineDots = Object.keys(ENGINE_FIELDS)
    .map((eng) => ({ name: eng, score: Number(metrics?.[ENGINE_FIELDS[eng]] ?? 0) }))
    .filter((e) => e.score > 0);

  return (
    <div className="space-y-4">
      {variant === "admin" && (
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showAdmin}
              onChange={(e) => setShowAdmin(e.target.checked)}
              className="rounded border-border"
            />
            Show Admin Context
          </label>
        </div>
      )}

      {/* Ladder — bottom (Foundational) to top (Elite) reads bottom-up */}
      <div className="flex flex-col-reverse gap-2">
        {TIERS.map((t, idx) => {
          const [lo, hi] = THRESHOLDS[t];
          const state =
            idx < currentIdx ? "achieved" :
            idx === currentIdx ? "current" :
            t === nextTier ? "next" : "future";

          if (state === "achieved") {
            return (
              <div key={t} className="rounded-lg border border-border bg-secondary/40 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-muted-foreground">{t}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{lo}–{hi} pts</span>
                </div>
                <div className="flex items-center gap-2 text-accent">
                  <Check className="h-4 w-4" />
                  <span className="text-xs font-semibold">Achieved</span>
                </div>
              </div>
            );
          }

          if (state === "future") {
            return (
              <div key={t} className="rounded-lg border border-border bg-card px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-muted-foreground">{t}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{lo}–{hi} pts</span>
                  <span className="text-xs text-muted-foreground italic hidden sm:inline">— {TIER_SHORT[t]}</span>
                </div>
                <Lock className="h-4 w-4 text-muted-foreground/60" />
              </div>
            );
          }

          if (state === "current") {
            return (
              <div key={t} className="rounded-lg border-2 border-accent bg-accent-soft border-l-[6px] border-l-accent px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">{t}</h3>
                    <span className="text-xs text-accent font-semibold tabular-nums">{lo}–{hi} pts</span>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border border-accent bg-accent text-accent-foreground">
                    YOU ARE HERE
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">{TIER_DESCRIPTIONS_ORG[t]}</p>
                {showAdmin && (
                  <div className="rounded-md bg-background/60 border border-border p-3 mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Admin context</p>
                    <p className="text-xs text-foreground/80">{TIER_DESCRIPTIONS_ADMIN[t]}</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <p className="text-foreground/80"><span className="font-semibold">Your score:</span> <span className="tabular-nums">{currentScore} / 60</span></p>
                  {engineDots.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {engineDots.map((e) => (
                        <span key={e.name} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground" title={`${e.name}: ${e.score}/10`}>
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            e.score >= 7 ? "bg-accent" : e.score >= 4 ? "bg-warning" : "bg-destructive",
                          )} />
                          {e.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // next tier
          return (
            <div key={t} className="rounded-lg border-2 border-warning bg-warning-soft border-l-[6px] border-l-warning px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">{t}</h3>
                  <span className="text-xs text-warning font-semibold tabular-nums">{lo}–{hi} pts</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border border-warning bg-warning text-warning-foreground">
                    NEXT LEVEL
                  </span>
                  {pointsToNext !== null && (
                    <span className="text-[10px] text-warning font-semibold tabular-nums">{pointsToNext} pts away</span>
                  )}
                </div>
              </div>

              {showAdmin && (
                <div className="rounded-md bg-background/60 border border-border p-3 mb-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Admin context</p>
                  <p className="text-xs text-foreground/80">{TIER_DESCRIPTIONS_ADMIN[t]}</p>
                </div>
              )}

              {nextThreshold !== null && pointsToNext !== null && (
                <div className="mb-4">
                  <p className="text-xs text-foreground/80 mb-2">
                    <span className="font-semibold">{t}</span> requires {nextThreshold} points. You need <span className="font-semibold">{pointsToNext} more</span>.
                  </p>
                  <div className="h-2 w-full bg-background/60 rounded-full overflow-hidden border border-border">
                    <div
                      className="h-full bg-accent transition-all duration-700"
                      style={{ width: `${Math.min(100, (currentScore / nextThreshold) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{currentScore} / {nextThreshold}</p>
                </div>
              )}

              {fastestPath.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wider text-warning font-bold mb-2">YOUR FASTEST PATH TO {t.toUpperCase()}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {fastestPath.map((e: any) => (
                      <div key={e.engine} className="rounded-md bg-background border border-border p-2.5">
                        <p className="text-xs font-semibold">{e.engine}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {e.current_score}/10 → {e.target_score}/10 (+{e.points_available})
                        </p>
                        <div className="mt-1.5 h-1 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-warning" style={{ width: `${(e.current_score / 10) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-foreground/80 mt-3">
                    Improving these three engines gives you <span className="font-semibold tabular-nums">+{fastestTotal} points</span> — {canReach ? "enough" : "not quite enough"} to reach {t}.
                  </p>
                </div>
              )}

              {/* Reach callout */}
              {fastestPath.length > 0 && (
                canReach ? (
                  <div className="rounded-md border border-accent/40 bg-accent-soft p-2.5 text-xs text-accent flex items-start gap-2 mb-2">
                    <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Your fastest path gets you there. Focus on these engines and you'll reach {t} tier.</span>
                  </div>
                ) : (
                  <div className="rounded-md border border-warning/40 bg-warning-soft p-2.5 text-xs text-warning mb-2">
                    These are your best opportunities. Keep improving across all engines to reach {t} tier.
                  </div>
                )
              )}

              {/* Project alignment callout */}
              {activeProjEngines.length === 0 ? (
                <div className="rounded-md border border-info/40 bg-info-soft p-2.5 text-xs text-info">
                  Activate your action plan to start moving toward {t} tier. Your Curve team has prepared tasks targeting your fastest path.
                </div>
              ) : projAligned ? (
                <div className="rounded-md border border-accent/40 bg-accent-soft p-2.5 text-xs text-accent flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Your active projects are already targeting your fastest path. Keep executing on {activeProjEngines.join(" and ")} and you'll move up.</span>
                </div>
              ) : (
                <div className="rounded-md border border-warning/40 bg-warning-soft p-2.5 text-xs text-warning">
                  Your active projects are focused on {activeProjEngines.join(", ")}. Your fastest path to {t} runs through {fastestPath[0]?.engine}. Consider aligning your next project with this engine.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Journey timeline */}
      {history.length > 1 && (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> YOUR JOURNEY
          </p>
          <ol className="space-y-2">
            {history.map((h, i) => {
              const moved = h.previous_tier && h.previous_tier !== h.new_tier;
              const up = moved && TIERS.indexOf(h.new_tier) > TIERS.indexOf(h.previous_tier);
              return (
                <li key={h.id} className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground tabular-nums w-24 flex-shrink-0">
                    {new Date(h.changed_at).toLocaleDateString()}
                  </span>
                  <span className="text-foreground">
                    {i === 0 ? "Started at " : moved ? "Moved to " : "Stayed at "}
                    <span className="font-semibold">{h.new_tier}</span>
                    {up && <span className="text-accent ml-1">↑</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Admin progression chart */}
      {variant === "admin" && (
        <AdminProgressionChart history={history} />
      )}
    </div>
  );
}

function AdminProgressionChart({ history }: { history: any[] }) {
  if (history.length <= 1) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
        <p className="text-xs text-muted-foreground">Tier progression will appear here after the second assessment.</p>
      </div>
    );
  }

  const W = 600, H = 160, padL = 30, padR = 10, padT = 10, padB = 20;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const xs = history.map((_, i) => padL + (i / Math.max(1, history.length - 1)) * innerW);
  const ys = history.map((h) => padT + innerH - ((Number(h.new_score) / 60) * innerH));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const thresholds = [21, 33, 45, 53];

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Tier progression</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {thresholds.map((t) => {
          const y = padT + innerH - (t / 60) * innerH;
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
              <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">{t}</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="hsl(var(--accent))" strokeWidth="2" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="3" fill="hsl(var(--accent))" />
        ))}
      </svg>
    </div>
  );
}

/* ───────── Tier Advancement Banner ───────── */

export function TierAdvancementBanner({ orgId, currentTier }: { orgId: string; currentTier: string | null }) {
  const [dismissed, setDismissed] = useState(true);
  const storageKey = `tier-banner-dismissed:${orgId}:${currentTier}`;

  useEffect(() => {
    if (!currentTier) return;
    const seen = localStorage.getItem(storageKey);
    setDismissed(!!seen);
  }, [storageKey, currentTier]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  // Banner only shows when explicitly triggered by parent (history check). For now,
  // parent component shouldShowAdvancement will conditionally render this.
  if (dismissed) return null;

  return (
    <div className="rounded-lg border-2 border-accent bg-accent-soft p-4 flex items-start gap-3 mb-4 animate-in fade-in slide-in-from-top-2">
      <Sparkles className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-display font-bold text-accent">🎉 You've moved up! Welcome to {currentTier} tier.</p>
        <p className="text-sm text-foreground/80 mt-0.5">Your hard work is paying off.</p>
      </div>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useTierAdvancement(orgId: string) {
  const [advanced, setAdvanced] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("org_tier_history")
        .select("*")
        .eq("org_id", orgId)
        .order("changed_at", { ascending: false })
        .limit(1);
      const last = (data ?? [])[0] as any;
      if (last && last.previous_tier && last.previous_tier !== last.new_tier) {
        const order = ["Foundational", "Emerging", "Growth", "Advanced", "Elite"];
        if (order.indexOf(last.new_tier) > order.indexOf(last.previous_tier)) {
          setAdvanced({ from: last.previous_tier, to: last.new_tier });
        }
      }
    })();
  }, [orgId]);

  return advanced;
}
