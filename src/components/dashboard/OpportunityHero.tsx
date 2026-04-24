import { Link } from "react-router-dom";
import { TrendingUp, Sparkles } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { formatCurrency } from "@/lib/format";

interface OpportunityHeroProps {
  oppLow: number;
  oppHigh: number;
  /** Current monetization tier name. */
  currentTier?: string | null;
  /** Next tier name. */
  nextTier?: string | null;
  /** 0-100 — progress toward next tier. */
  tierProgressPct?: number | null;
  pointsToNext?: number | null;
  /** Optional org first-name salutation. */
  orgName?: string | null;
}

/**
 * The dashboard's reason-for-being. Big opportunity range at the top, soft tier
 * progression strip underneath. Coaching tone — "this is the prize."
 */
export function OpportunityHero({
  oppLow,
  oppHigh,
  currentTier,
  nextTier,
  tierProgressPct,
  pointsToNext,
  orgName,
}: OpportunityHeroProps) {
  const hasOpp = oppHigh > 0;

  return (
    <section className="relative overflow-hidden rounded-[calc(var(--radius)+8px)] border border-foreground/10 bg-card shadow-[0_30px_60px_-30px_rgba(15,23,42,0.25),0_8px_20px_-8px_rgba(15,23,42,0.08)]">
      {/* Decorative lime stripe + subtle gradient */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[hsl(var(--lime))]" />
      <div
        className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "hsl(var(--lime))" }}
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full opacity-[0.06] blur-3xl"
        style={{ background: "hsl(var(--accent))" }}
        aria-hidden
      />

      <div className="relative p-6 md:p-10">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-accent" />
          <p className="curve-eyebrow !text-accent">Your revenue opportunity</p>
        </div>

        {hasOpp ? (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {orgName ? `${orgName}, here's what's on the table this year.` : "Here's what's on the table this year."}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display font-bold tabular-nums tracking-[-0.04em] leading-[0.95] text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
                <CountUp to={oppLow} format={(n) => formatCurrency(n)} duration={900} />
              </span>
              <span className="font-display text-2xl md:text-3xl text-muted-foreground font-semibold">–</span>
              <span className="font-display font-bold tabular-nums tracking-[-0.04em] leading-[0.95] text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
                <CountUp to={oppHigh} format={(n) => formatCurrency(n)} duration={1100} />
              </span>
            </div>
            <p className="text-sm text-foreground/70 mt-4 max-w-2xl leading-relaxed">
              Calculated from your roster, pricing, market, and current revenue mix. Every task you complete moves
              you closer to capturing it.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-3xl font-semibold mb-2">Your assessment is complete.</p>
            <p className="text-sm text-muted-foreground max-w-xl">
              Your opportunity range will appear here once your revenue model is finalized.
            </p>
          </>
        )}

        {/* Tier strip */}
        {currentTier && (
          <div className="mt-7 pt-6 border-t border-border/70 grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="curve-eyebrow !text-[10px] mb-0.5">Current tier</p>
                <p className="font-display text-base font-bold">{currentTier}</p>
              </div>
            </div>

            {nextTier && tierProgressPct !== null && tierProgressPct !== undefined ? (
              <div className="min-w-0">
                <div className="flex items-baseline justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground">
                    {pointsToNext !== null && pointsToNext !== undefined
                      ? <>You're <span className="font-semibold text-foreground tabular-nums">{pointsToNext} points</span> from {nextTier}</>
                      : <>Next: <span className="font-semibold text-foreground">{nextTier}</span></>}
                  </p>
                  <p className="text-xs font-semibold tabular-nums text-accent">
                    {Math.round(tierProgressPct)}%
                  </p>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, tierProgressPct))}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">You're at the top tier — keep optimizing.</div>
            )}

            <Link
              to="/report#tier-progression"
              className="text-xs font-semibold text-accent hover:underline whitespace-nowrap justify-self-start md:justify-self-end"
            >
              View ladder →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
