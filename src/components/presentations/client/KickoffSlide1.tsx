import { CurveBadge } from "../shared";

const TIER_DESC: Record<string, string> = {
  Foundational: "Building the base — early stage with room to grow into stronger systems.",
  Emerging: "Momentum is real — foundational systems coming together quickly.",
  Growth: "Established and scaling — strong program ready for monetization upgrades.",
  Advanced: "High-performing — operating with discipline and clear strategy.",
  Elite: "Best-in-class — refining the edges of an already strong operation.",
};

const TIER_HEX: Record<string, string> = {
  Foundational: "#94a3b8", Emerging: "#3b82f6", Growth: "#10b981", Advanced: "#8b5cf6", Elite: "#f59e0b",
};

export function KickoffSlide1({ org, intake, metrics, daysIn }: {
  org: any; intake: any; metrics: any; daysIn?: number | null;
}) {
  const name = org?.name ?? intake?.organization_name ?? "Your Organization";
  const totalPlayers = intake?.total_players ?? 0;
  const totalTeams = intake?.total_teams ?? 0;
  const seasons = intake?.seasons_offered;
  const seasonsCount = Array.isArray(seasons) ? seasons.length : 0;
  const tier = (metrics?.monetization_tier as string) ?? null;
  const yearsInOp = intake?.years_in_operation;
  const market = intake?.market_type;

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex items-center justify-between">
        <CurveBadge light />
        {daysIn != null && (
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{daysIn} days into your Allegiance engagement</span>
        )}
      </div>

      <div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{name}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {[org?.city_state, market, yearsInOp ? `${yearsInOp} in operation` : null].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <CelebStat label="Players in your program" value={totalPlayers.toLocaleString()} />
        <CelebStat label="Teams across" value={`${totalTeams}`} sub={`${seasonsCount} seasons`} />
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Monetization Tier</p>
          {tier ? (
            <>
              <p className="font-display text-3xl font-bold mt-2" style={{ color: TIER_HEX[tier] }}>{tier}</p>
              <p className="text-xs text-muted-foreground mt-2 leading-snug">{TIER_DESC[tier]}</p>
            </>
          ) : <p className="font-display text-3xl font-bold mt-2 text-muted-foreground">—</p>}
        </div>
      </div>

      <p className="font-display text-2xl text-foreground/80 max-w-2xl">
        Here's what we found — <span className="text-emerald-600 font-semibold">and what's possible.</span>
      </p>
    </div>
  );
}

function CelebStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="font-display text-4xl md:text-5xl font-bold mt-3 tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
