import { Link } from "react-router-dom";
import { ArrowRight, Calculator, Sparkles, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface CalculatorPreviewProps {
  /** Pricing opportunity (mid). */
  pricingOppMid?: number;
  /** Sponsorship opportunity (mid). */
  sponsorshipOppMid?: number;
  /** Retention referral opportunity (mid). */
  retentionOppMid?: number;
}

/**
 * Surfaces 1–2 calculator results inline as "what-if" teasers, driving users
 * into the full calculator suite. Coaching tone.
 */
export function CalculatorPreview({
  pricingOppMid = 0,
  sponsorshipOppMid = 0,
  retentionOppMid = 0,
}: CalculatorPreviewProps) {
  const items = [
    pricingOppMid > 0 && {
      to: "/calculators#pricing",
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Pricing sensitivity",
      copy: "Model what happens when you raise dues 3-10%.",
      number: pricingOppMid,
      label: "annual potential",
    },
    sponsorshipOppMid > 0 && {
      to: "/calculators#sponsorship",
      icon: <Sparkles className="h-4 w-4" />,
      title: "Sponsorship value",
      copy: "See what your sponsorship inventory is really worth.",
      number: sponsorshipOppMid,
      label: "in untapped value",
    },
    retentionOppMid > 0 && {
      to: "/calculators#retention",
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Retention impact",
      copy: "Each 1% retention bump protects real revenue.",
      number: retentionOppMid,
      label: "referral upside",
    },
  ].filter(Boolean) as Array<{ to: string; icon: JSX.Element; title: string; copy: string; number: number; label: string }>;

  // Pick top 2 by number.
  const top = items.sort((a, b) => b.number - a.number).slice(0, 2);

  return (
    <div className="curve-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-accent" />
          <p className="curve-eyebrow">What if you…</p>
        </div>
        <Link to="/calculators" className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1">
          All scenarios <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {top.length === 0 ? (
        <Link
          to="/calculators"
          className="block rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground hover:border-accent/50 hover:text-foreground transition-colors text-center"
        >
          Explore interactive scenarios →
        </Link>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {top.map((it) => (
            <Link
              key={it.title}
              to={it.to}
              className="group rounded-lg border border-border bg-secondary/30 p-4 hover:border-accent hover:bg-accent-soft/40 transition-all"
            >
              <div className="flex items-center gap-2 text-accent mb-2">
                {it.icon}
                <p className="text-xs font-semibold uppercase tracking-wide">{it.title}</p>
              </div>
              <p className="font-display text-2xl font-bold tabular-nums text-foreground leading-tight">
                +{formatCurrency(it.number)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wide">{it.label}</p>
              <p className="text-xs text-foreground/80 mt-2 leading-snug group-hover:text-foreground">{it.copy}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
