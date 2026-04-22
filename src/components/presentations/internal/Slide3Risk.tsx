import { CurveBadge } from "../shared";

const RISK_COLOR: Record<string, string> = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444" };
const COMPLEXITY_COLOR: Record<string, string> = { Straightforward: "#10b981", Moderate: "#f59e0b", Complex: "#ef4444" };

const TIMELINE: Record<string, string> = {
  Straightforward: "15–30 days",
  Moderate: "30–60 days",
  Complex: "60–90 days",
};
const CADENCE: Record<string, string> = {
  Straightforward: "Bi-weekly throughout",
  Moderate: "Weekly for first 30 days, bi-weekly after",
  Complex: "Weekly for first 60 days",
};

function RiskCard({ label, value, drivers, meaning, action }: {
  label: string; value: string | null; drivers: string[]; meaning: string; action: string;
}) {
  const v = value ?? "Medium";
  const hex = RISK_COLOR[v] ?? "#94a3b8";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">{label}</p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border" style={{ borderColor: hex + "66", backgroundColor: hex + "22", color: hex }}>{value ?? "—"}</span>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">What's driving this</p>
        <ul className="mt-1 space-y-0.5 text-xs text-white/80">{drivers.map((d, i) => <li key={i}>• {d}</li>)}</ul>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">What this means</p>
        <p className="text-xs text-white/80 leading-relaxed mt-1">{meaning}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">What to do</p>
        <p className="text-xs text-white/80 leading-relaxed mt-1">{action}</p>
      </div>
    </div>
  );
}

export function Slide3Risk({ metrics, intake }: { metrics: any; intake: any }) {
  const exec = metrics?.execution_risk as string | null;
  const market = metrics?.market_risk as string | null;
  const ret = metrics?.retention_risk as string | null;
  const complexity = metrics?.engagement_complexity as string | null;
  const recommendation = metrics?.engagement_approach_recommendation as string | null;
  const pricingNote = metrics?.pricing_strategy_note as string | null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold">Risk Assessment</p>
        <CurveBadge />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <RiskCard label="Execution Risk" value={exec}
          drivers={[
            `Operations Health: ${metrics?.operations_health_score ?? "—"}/10`,
            `Coach Alignment: ${intake?.coach_alignment ?? "—"}`,
            `Operational Structure: ${intake?.operational_structure ?? "—"}`,
          ]}
          meaning={exec === "High" ? "Operational gaps will derail revenue work if not addressed first."
            : exec === "Medium" ? "Some operational risk — set checkpoints to catch slippage early."
            : "Strong operational foundation — execution should be smooth."}
          action={exec === "High" ? "Lead with operations cleanup. Avoid recommendations requiring heavy coach behavior change in first 30 days."
            : exec === "Medium" ? "Run ops and revenue in parallel; monitor coach buy-in weekly."
            : "Execute freely — multiple workstreams can run simultaneously."}
        />
        <RiskCard label="Market Risk" value={market}
          drivers={[
            `Market Type: ${intake?.market_type ?? "—"}`,
            `Local Competition: ${intake?.local_market_competition ?? "—"}`,
            `Demand: ${intake?.demand_for_organization ?? "—"}`,
          ]}
          meaning={market === "High" ? "Difficult market conditions — pricing power is constrained."
            : market === "Medium" ? "Competitive market — differentiation is the lever."
            : "Favorable market — pricing and sponsorship leverage is real."}
          action={market === "High" ? "Frame all revenue strategies around value and differentiation, not rate increases."
            : market === "Medium" ? "Position around quality and outcomes; tiered pricing over flat increases."
            : "Push pricing and sponsorship aggressively — market supports it."}
        />
        <RiskCard label="Retention Risk" value={ret}
          drivers={[
            `Retention: ${intake?.retention_pct ? `${intake.retention_pct}%` : "—"}`,
            `Avg Player Years: ${intake?.avg_player_years ?? "—"}`,
            `Player Commitment: ${intake?.player_commitment_level ?? "—"}`,
          ]}
          meaning={ret === "High" ? "Critical retention issues — churn will offset any new revenue."
            : ret === "Medium" ? "Retention gaps present — address alongside revenue work."
            : "Strong retention — revenue base is stable."}
          action={ret === "High" ? "Do not let the client deprioritize retention work. Re-enrollment system must be live in first 30 days."
            : ret === "Medium" ? "Implement re-enrollment process and early commitment incentives."
            : "Maintain retention systems while expanding monetization."}
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Engagement Complexity</p>
          {complexity && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border"
              style={{ borderColor: (COMPLEXITY_COLOR[complexity] ?? "#94a3b8") + "66", backgroundColor: (COMPLEXITY_COLOR[complexity] ?? "#94a3b8") + "22", color: COMPLEXITY_COLOR[complexity] ?? "#94a3b8" }}>
              {complexity}
            </span>
          )}
        </div>
        {recommendation && <p className="text-sm text-white/80 leading-relaxed">{recommendation}</p>}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Timeline to first win</p>
            <p className="text-sm font-semibold mt-1">{complexity ? TIMELINE[complexity] : "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Recommended cadence</p>
            <p className="text-sm font-semibold mt-1">{complexity ? CADENCE[complexity] : "—"}</p>
          </div>
        </div>
      </div>

      {pricingNote && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">Market Competition Context</p>
          <p className="text-sm text-white/80 mt-1 leading-relaxed">{pricingNote}</p>
        </div>
      )}
    </div>
  );
}
