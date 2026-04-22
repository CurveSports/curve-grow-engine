import { CurveBadge, ENGINE_CLIENT_FRAMING, ENGINE_HEX, getEngineRows } from "../shared";
import { formatCurrency } from "@/lib/format";

export function KickoffSlide3({ metrics }: { metrics: any }) {
  const oppLow = Number(metrics?.total_opportunity_low ?? 0);
  const oppHigh = Number(metrics?.total_opportunity_high ?? 0);
  const engines = getEngineRows(metrics).filter((e) => e.oppHigh > 0).sort((a, b) => b.oppHigh - a.oppHigh);

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl md:text-4xl font-bold">What's possible</h2>
        <CurveBadge light />
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-10 text-center">
        <p className="font-display text-5xl md:text-7xl font-bold tabular-nums text-emerald-600">
          {formatCurrency(oppLow)} – {formatCurrency(oppHigh)}
        </p>
        <p className="mt-3 text-sm font-semibold text-emerald-800 uppercase tracking-wider">In additional annual revenue</p>
        <p className="text-sm text-foreground/70 mt-3 max-w-xl mx-auto leading-relaxed">
          This isn't a generic estimate. It's calculated from your player count, your market, your current revenue structure,
          and industry benchmarks for organizations like yours.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {engines.map((e) => (
          <div key={e.name} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ENGINE_HEX[e.name] }} />
              <p className="font-semibold text-sm">{e.name}</p>
            </div>
            <p className="font-display text-xl font-bold tabular-nums">{formatCurrency(e.oppLow)} – {formatCurrency(e.oppHigh)}</p>
            <p className="text-xs text-muted-foreground mt-1">{ENGINE_CLIENT_FRAMING[e.name]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
