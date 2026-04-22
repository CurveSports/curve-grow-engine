import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { ExplainButton, type ExplainContent } from "@/components/admin/ExplainDrawer";

type Severity = "Low" | "Medium" | "High";

const RISK_STYLES: Record<Severity, string> = {
  Low: "bg-accent-soft text-accent border-accent/30",
  Medium: "bg-warning-soft text-warning border-warning/30",
  High: "bg-destructive/10 text-destructive border-destructive/30",
};

const EXECUTION_COPY: Record<Severity, string> = {
  Low: "Strong operational foundation — ready to execute",
  Medium: "Some operational gaps — monitor closely",
  High: "Operational issues may derail execution — address first",
};
const MARKET_COPY: Record<Severity, string> = {
  Low: "Favorable market conditions support growth",
  Medium: "Competitive market — differentiation required",
  High: "Difficult market conditions — retention-first approach",
};
const RETENTION_COPY: Record<Severity, string> = {
  Low: "Strong retention — revenue base is stable",
  Medium: "Retention gaps present — monitor and address",
  High: "Critical retention issues — immediate action required",
};

const COMPLEXITY_STYLES: Record<string, string> = {
  Straightforward: "bg-accent-soft text-accent border-accent/30",
  Moderate: "bg-warning-soft text-warning border-warning/30",
  Complex: "bg-destructive/10 text-destructive border-destructive/30",
};

function RiskCard({ label, value, copy }: { label: string; value: Severity | null; copy: Record<Severity, string> }) {
  const v = (value ?? "Medium") as Severity;
  return (
    <div className="curve-card">
      <p className="curve-eyebrow mb-3">{label}</p>
      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border", RISK_STYLES[v])}>
        {value ?? "—"}
      </span>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{value ? copy[v] : "Awaiting assessment"}</p>
    </div>
  );
}

export function RiskAssessmentSection({
  executionRisk,
  marketRisk,
  retentionRisk,
  engagementComplexity,
  engagementRecommendation,
  pricingStrategyNote,
}: {
  executionRisk: Severity | null;
  marketRisk: Severity | null;
  retentionRisk: Severity | null;
  engagementComplexity: string | null;
  engagementRecommendation: string | null;
  pricingStrategyNote: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="curve-eyebrow">Risk Assessment</p>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskCard label="Execution Risk" value={executionRisk} copy={EXECUTION_COPY} />
        <RiskCard label="Market Risk" value={marketRisk} copy={MARKET_COPY} />
        <RiskCard label="Retention Risk" value={retentionRisk} copy={RETENTION_COPY} />
      </div>

      {engagementComplexity && (
        <div className="curve-card">
          <p className="curve-eyebrow mb-3">Engagement Complexity</p>
          <span className={cn("inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border", COMPLEXITY_STYLES[engagementComplexity] ?? "bg-secondary")}>
            {engagementComplexity}
          </span>
          {engagementRecommendation && (
            <p className="text-base text-muted-foreground mt-4 leading-relaxed">{engagementRecommendation}</p>
          )}
        </div>
      )}

      {pricingStrategyNote && (
        <div className="curve-card border-l-4 border-l-info bg-info-soft/30">
          <p className="curve-eyebrow mb-2">Pricing Context</p>
          <p className="text-sm text-foreground leading-relaxed">{pricingStrategyNote}</p>
        </div>
      )}
    </div>
  );
}

export interface AdminAlert {
  type: string;
  severity: "high" | "medium";
  message: string;
}

export function AdminAlertsBanner({ alerts }: { alerts: AdminAlert[] }) {
  const [open, setOpen] = useState(true);
  if (!alerts || alerts.length === 0) return null;

  const hasHigh = alerts.some((a) => a.severity === "high");
  const bannerClass = hasHigh
    ? "border-destructive/40 bg-destructive/5"
    : "border-warning/40 bg-warning-soft";

  return (
    <div className={cn("rounded-lg border-2 p-4 mb-4", bannerClass)}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn("h-5 w-5", hasHigh ? "text-destructive" : "text-warning")} />
          <span className={cn("font-semibold text-sm", hasHigh ? "text-destructive" : "text-warning")}>
            Action Required — {alerts.length} item{alerts.length === 1 ? "" : "s"} need your attention
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <ul className="mt-4 space-y-3">
          {alerts.map((a, i) => (
            <li key={`${a.type}-${i}`} className="flex items-start gap-3">
              <span className={cn(
                "h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5",
                a.severity === "high" ? "bg-destructive" : "bg-warning",
              )} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground leading-relaxed">{a.message}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
                  {a.type.replace(/_/g, " ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TIER_DETAILS = [
  {
    name: "FOUNDATIONAL",
    range: "0–20",
    revenue: "Revenue is primarily dues-based with limited additional streams.",
    engagement: "High opportunity, high lift required. Expect 60–90 day runway before meaningful revenue moves. Focus on foundational systems before revenue activation.",
    firstMove: "Pricing audit + sponsorship package creation",
  },
  {
    name: "EMERGING",
    range: "21–32",
    revenue: "Some revenue diversification in place but significant opportunity remains across most engines.",
    engagement: "Good candidate for quick wins in sponsorship and events. Pricing conversation needed early. 2–3 engines ready to activate.",
    firstMove: "Sponsorship outreach + first owned event",
  },
  {
    name: "GROWTH",
    range: "33–44",
    revenue: "Multiple revenue engines active and producing. Focus shifts to optimization and consistency.",
    engagement: "Ready for full Allegiance engagement. Multiple engines can activate simultaneously. Strong execution capacity.",
    firstMove: "Parallel activation of top 2–3 priority engines",
  },
  {
    name: "ADVANCED",
    range: "45–52",
    revenue: "Strong performance across most engines with sophisticated strategies in place.",
    engagement: "Focus engagement on 2–3 specific engine gaps. High close rate on recommendations. Optimization over activation.",
    firstMove: "Deep dive on lowest-scoring engines only",
  },
  {
    name: "ELITE",
    range: "53–60+",
    revenue: "Best-in-class revenue operation. All major engines optimized.",
    engagement: "Retention and affiliate expansion are primary levers. Strong referral candidate for new Allegiance clients.",
    firstMove: "Affiliate development + national positioning",
  },
];

export function MonetizationTierGuide({ currentTier }: { currentTier: string | null }) {
  const upper = currentTier?.toUpperCase() ?? null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="curve-eyebrow">Monetization Tier Guide</p>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="space-y-3">
        {TIER_DETAILS.map((t) => {
          const isCurrent = upper === t.name;
          return (
            <div
              key={t.name}
              className={cn(
                "curve-card transition-all",
                isCurrent && "border-2 border-accent shadow-md",
              )}
            >
              <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-baseline gap-2">
                  <h4 className="font-display text-base font-bold tracking-wide">{t.name}</h4>
                  <span className="text-xs text-muted-foreground tabular-nums">({t.range})</span>
                </div>
                {isCurrent && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground">
                    Current Tier
                  </span>
                )}
              </div>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Revenue</dt>
                  <dd className="text-foreground mt-0.5">{t.revenue}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Engagement</dt>
                  <dd className="text-foreground mt-0.5">{t.engagement}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Typical first move</dt>
                  <dd className="text-foreground mt-0.5">{t.firstMove}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
