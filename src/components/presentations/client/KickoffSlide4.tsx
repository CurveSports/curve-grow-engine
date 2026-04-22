import { CurveBadge, getEngineRows, scoreBand } from "../shared";

export function KickoffSlide4({ metrics, showScores }: { metrics: any; showScores?: boolean }) {
  const engines = getEngineRows(metrics).sort((a, b) => a.score - b.score);
  const strengths = engines.filter((e) => e.score >= 7).map((e) => e.name);
  const opportunities = engines.filter((e) => e.score <= 4).map((e) => e.name);

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl md:text-4xl font-bold">Where you stand</h2>
        <CurveBadge light />
      </div>

      <ul className="space-y-3">
        {engines.map((e) => {
          const band = scoreBand(e.score);
          return (
            <li key={e.name} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{e.name}</p>
                {showScores && <p className="text-sm tabular-nums text-muted-foreground">{e.score}/10</p>}
              </div>
              <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${(e.score / 10) * 100}%`, backgroundColor: band.hex }} />
              </div>
              <p className="text-xs mt-1.5" style={{ color: band.hex }}>
                {e.name} — {band.label}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Your strengths</p>
          <p className="font-semibold mt-1">{strengths.length ? strengths.join(", ") : "Plenty of room to build wins"}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Your biggest opportunities</p>
          <p className="font-semibold mt-1">{opportunities.length ? opportunities.join(", ") : "Continue optimizing across engines"}</p>
        </div>
      </div>
    </div>
  );
}
