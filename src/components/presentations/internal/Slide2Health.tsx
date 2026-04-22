import { CurveBadge } from "../shared";
import { Lock } from "lucide-react";

function HealthCard({ label, score, drivers, implication }: {
  label: string; score: number | null; drivers: { field: string; answer: string }[]; implication: string;
}) {
  const pct = score ? (score / 10) * 100 : 0;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">{label}</p>
        <p className="font-display text-2xl font-bold tabular-nums" style={{ color: "#a78bfa" }}>
          {score ?? "—"}<span className="text-white/40 text-sm font-normal">/10</span>
        </p>
      </div>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-3">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: "#a78bfa" }} />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">What drives this</p>
      <ul className="mt-1 space-y-0.5 text-xs text-white/80">
        {drivers.slice(0, 4).map((d, i) => (
          <li key={i}><span className="text-white/50">{d.field}:</span> {d.answer || "—"}</li>
        ))}
      </ul>
      <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mt-3">Implication for engagement</p>
      <p className="text-xs text-white/80 mt-1 leading-relaxed">{implication}</p>
    </div>
  );
}

function arr(v: any): string {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "None";
  return v ?? "—";
}

function implication(score: number | null, low: string, mid: string, high: string) {
  if (score == null) return "Awaiting calculation.";
  if (score >= 7) return high;
  if (score >= 4) return mid;
  return low;
}

export function Slide2Health({ metrics, intake }: { metrics: any; intake: any }) {
  const ops = metrics?.operations_health_score ?? null;
  const market = metrics?.market_position_health_score ?? null;
  const program = metrics?.program_health_score ?? null;
  const strat = metrics?.strategic_clarity_score ?? null;
  const overall = metrics?.overall_health_score ?? ((ops ?? 0) + (market ?? 0) + (program ?? 0) + (strat ?? 0));

  const leakage = metrics?.selection_leakage_flag === true;
  const growth = metrics?.growth_opportunity_direction as string | null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold">Organizational Health Deep Dive</p>
        <CurveBadge />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <HealthCard label="Operations Health" score={ops}
          drivers={[
            { field: "Operational Structure", answer: intake?.operational_structure },
            { field: "Coach Alignment", answer: intake?.coach_alignment },
            { field: "Coaching Structure", answer: intake?.coaching_structure },
            { field: "Parent Communication", answer: arr(intake?.parent_communication) },
          ]}
          implication={implication(ops,
            "Lead with operational fixes; revenue work will struggle without these foundations.",
            "Run ops + revenue tracks in parallel with checkpoints.",
            "Org can handle multiple workstreams simultaneously."
          )}
        />
        <HealthCard label="Market Position" score={market}
          drivers={[
            { field: "Market Type", answer: intake?.market_type },
            { field: "Local Competition", answer: intake?.local_market_competition },
            { field: "Demand", answer: intake?.demand_for_organization },
            { field: "Years in Operation", answer: intake?.years_in_operation },
          ]}
          implication={implication(market,
            "Frame revenue strategies around differentiation and value, not rate increases.",
            "Selective recommendations grounded in market realities.",
            "Leverage market position aggressively — pricing power exists."
          )}
        />
        <HealthCard label="Program Health" score={program}
          drivers={[
            { field: "Player Commitment", answer: intake?.player_commitment_level },
            { field: "Retention %", answer: intake?.retention_pct ? `${intake.retention_pct}%` : "—" },
            { field: "Avg Player Years", answer: intake?.avg_player_years },
            { field: "Team Structure", answer: intake?.team_structure },
          ]}
          implication={implication(program,
            "Stabilize retention before scaling — churn will offset gains.",
            "Strong base; opportunity to deepen family relationships.",
            "Healthy retention creates room to monetize loyalty."
          )}
        />
        <HealthCard label="Strategic Clarity" score={strat}
          drivers={[
            { field: "Org Focus", answer: intake?.organization_focus },
            { field: "Pricing Approach", answer: intake?.pricing_approach },
            { field: "Sponsorship Approach", answer: intake?.sponsorship_approach },
            { field: "Market Strategy", answer: intake?.market_strategy },
          ]}
          implication={implication(strat,
            "Clarify strategy before activating engines — confusion will stall execution.",
            "Tighten focus on top 1–2 engines first.",
            "Org understands its position — execute confidently."
          )}
        />
      </div>

      <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5 text-center">
        <p className="text-[11px] uppercase tracking-wider text-purple-200 font-semibold">Overall Health</p>
        <p className="font-display text-5xl font-bold mt-1 tabular-nums" style={{ color: "#c4b5fd" }}>
          {overall}<span className="text-white/40 text-2xl font-normal">/40</span>
        </p>
      </div>

      {leakage && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="font-semibold text-amber-200">⚠️ Selection Leakage Detected</p>
          <p className="text-sm text-white/80 mt-1">
            This org regularly cuts players with no alternative programming. Families leaving the ecosystem represent lost revenue.
          </p>
          <p className="text-xs text-white/60 mt-2">
            Recommended: Developmental tier conversation in kickoff. Auto-task has been added to plan.
          </p>
        </div>
      )}

      {growth && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">Growth Opportunity Direction</p>
          <p className="font-semibold mt-1">{growth}</p>
          <p className="text-sm text-white/80 mt-1 leading-relaxed">
            This direction shapes how Curve frames the engagement — emphasize the matching narrative in
            kickoff conversations and align the first project to this trajectory.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-5 flex items-center gap-3 text-white/50">
        <Lock className="h-4 w-4" />
        <p className="text-sm">Health trend tracking will appear here after the second assessment.</p>
      </div>
    </div>
  );
}
