import { CurveBadge, getEngineRows, ENGINE_HEX } from "../shared";
import { formatCurrency } from "@/lib/format";

function StreamRow({ name, value, total, hex }: { name: string; value: number; total: number; hex: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  if (value <= 0) return null;
  return (
    <div style={{ width: `${Math.max(2, pct)}%`, backgroundColor: hex }} className="h-full" title={`${name}: ${formatCurrency(value)}`} />
  );
}

export function Slide4Revenue({ metrics }: { metrics: any }) {
  const dues = Number(metrics?.dues_revenue ?? 0);
  const events = Number(metrics?.total_event_revenue ?? metrics?.event_revenue_target ?? 0);
  const sponsorship = Number(metrics?.affiliate_total_revenue ?? 0); // placeholder mapping
  const apparel = 0; // not stored — included as gap
  const facility = Number(metrics?.facility_revenue_pct ?? 0);
  const addOns = Number(metrics?.add_on_revenue ?? 0);
  const affiliate = Number(metrics?.affiliate_fee_revenue ?? 0);
  const otherTotal = Number(metrics?.calculated_total_revenue ?? 0)
    - (dues + events + addOns + affiliate);
  const other = Math.max(0, otherTotal);
  const totalRev = Number(metrics?.calculated_total_revenue ?? (dues + events + addOns + affiliate + other));

  const streams: { name: string; value: number; hex: string }[] = [
    { name: "Dues", value: dues, hex: "#94a3b8" },
    { name: "Events", value: events, hex: ENGINE_HEX.Events },
    { name: "Sponsorship", value: sponsorship, hex: ENGINE_HEX.Sponsorship },
    { name: "Apparel", value: apparel, hex: ENGINE_HEX.Apparel },
    { name: "Facility", value: facility, hex: ENGINE_HEX.Facility },
    { name: "Add-Ons", value: addOns, hex: ENGINE_HEX["Add-Ons"] },
    { name: "Affiliate", value: affiliate, hex: ENGINE_HEX.Affiliate },
    { name: "Other", value: other, hex: "#475569" },
  ];

  const duesPct = Number(metrics?.dues_revenue_pct ?? (totalRev > 0 ? (dues / totalRev) * 100 : 0));
  const highDues = duesPct >= 85 || metrics?.high_dues_concentration === true;

  const rpp = Number(metrics?.revenue_per_player ?? 0);
  const rppBench = Number(metrics?.revenue_benchmark ?? 0);
  const rppGap = Number(metrics?.revenue_gap ?? Math.max(0, rppBench - rpp));

  const annualHs = Number(metrics?.annual_hs_equivalent ?? 0);
  const annualYouth = Number(metrics?.annual_youth_equivalent ?? 0);
  const hsLow = Number(metrics?.pricing_benchmark_hs_low ?? 0);
  const hsHigh = Number(metrics?.pricing_benchmark_hs_high ?? 0);
  const yLow = Number(metrics?.pricing_benchmark_youth_low ?? 0);
  const yHigh = Number(metrics?.pricing_benchmark_youth_high ?? 0);
  const hsStatus = metrics?.hs_fee_vs_market as string | null;
  const youthStatus = metrics?.youth_fee_vs_market as string | null;

  const engines = getEngineRows(metrics);
  const totalLow = Number(metrics?.total_opportunity_low ?? 0);
  const totalHigh = Number(metrics?.total_opportunity_high ?? 0);
  const totalScore = Number(metrics?.total_engine_score ?? 0);

  const internalNotes: Record<string, string> = {
    Pricing: metrics?.pricing_strategy_note ?? "",
    Sponsorship: `FMV ${formatCurrency(metrics?.fmv_per_sponsor_low ?? 0)}–${formatCurrency(metrics?.fmv_per_sponsor_high ?? 0)} per sponsor; audience ${metrics?.audience_score ?? "—"}/10, asset ${metrics?.asset_score ?? "—"}/10.`,
    Apparel: `Hard goods margin ${formatCurrency(metrics?.hard_goods_margin_per_player_low ?? 0)}–${formatCurrency(metrics?.hard_goods_margin_per_player_high ?? 0)}/player; uniform gap ${formatCurrency(metrics?.uniform_margin_gap_per_player ?? 0)}/player.`,
    Events: `Target ${formatCurrency(metrics?.event_revenue_target ?? 0)} (~$500/player benchmark).`,
    "Add-Ons": `${formatCurrency(metrics?.add_on_revenue_per_player ?? 0)}/player today; remote training adoption potential.`,
    Retention: `${formatCurrency(metrics?.revenue_protected_per_pct ?? 0)} protected per +1% retention; referral upside on top.`,
    Facility: `${formatCurrency(metrics?.facility_revenue_benchmark ?? 0)} benchmark vs ${formatCurrency(metrics?.facility_revenue_gap ?? 0)} current gap.`,
    Affiliate: `Per-affiliate revenue ${formatCurrency(metrics?.affiliate_revenue_per_affiliate ?? 0)}; fee rate gap if applicable.`,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold">Revenue Intelligence</p>
        <CurveBadge />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-3">Revenue Mix</p>
        <div className="flex h-8 w-full rounded-md overflow-hidden bg-white/5">
          {streams.map((s) => (
            <StreamRow key={s.name} name={s.name} value={s.value} total={totalRev} hex={s.hex} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
          {streams.filter((s) => s.value > 0).map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.hex }} />
              <span className="text-white/70">{s.name}</span>
              <span className="ml-auto tabular-nums text-white/90">{formatCurrency(s.value)}</span>
            </div>
          ))}
        </div>
        {highDues && (
          <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            ⚠️ {Math.round(duesPct)}% dues concentration — diversification is critical.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Revenue Per Player</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-white/60">Current</span><span className="font-semibold tabular-nums">{formatCurrency(rpp)}</span></div>
            <div className="flex justify-between"><span className="text-white/60">Target</span><span className="font-semibold tabular-nums">{formatCurrency(rppBench)}</span></div>
            <div className="flex justify-between"><span className="text-white/60">Gap / player</span><span className="font-semibold tabular-nums" style={{ color: rppGap > 0 ? "#f59e0b" : "#10b981" }}>{formatCurrency(rppGap)}</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-2 text-sm">
          <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Pricing Benchmark</p>
          <div>
            <div className="flex justify-between"><span className="text-white/60">HS Fee</span><span className="font-semibold tabular-nums">{formatCurrency(annualHs)}</span></div>
            <p className="text-xs text-white/50">Market: {formatCurrency(hsLow)}–{formatCurrency(hsHigh)} · <span className="text-white/80">{hsStatus ?? "—"}</span></p>
          </div>
          <div>
            <div className="flex justify-between"><span className="text-white/60">Youth Fee</span><span className="font-semibold tabular-nums">{formatCurrency(annualYouth)}</span></div>
            <p className="text-xs text-white/50">Market: {formatCurrency(yLow)}–{formatCurrency(yHigh)} · <span className="text-white/80">{youthStatus ?? "—"}</span></p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-3">Opportunity Breakdown</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/50 uppercase">
              <tr>
                <th className="text-left py-2 pr-2">Engine</th>
                <th className="text-right py-2 px-2">Opp Low</th>
                <th className="text-right py-2 px-2">Opp High</th>
                <th className="text-right py-2 px-2">Score</th>
                <th className="text-left py-2 pl-2">Internal Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {engines.map((e) => (
                <tr key={e.name}>
                  <td className="py-2 pr-2 font-semibold" style={{ color: ENGINE_HEX[e.name] }}>{e.name}</td>
                  <td className="text-right tabular-nums px-2">{formatCurrency(e.oppLow)}</td>
                  <td className="text-right tabular-nums px-2">{formatCurrency(e.oppHigh)}</td>
                  <td className="text-right tabular-nums px-2">{e.score}/10</td>
                  <td className="pl-2 text-white/70">{internalNotes[e.name]}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-white/20 font-bold">
                <td className="py-2 pr-2">Total</td>
                <td className="text-right tabular-nums px-2">{formatCurrency(totalLow)}</td>
                <td className="text-right tabular-nums px-2">{formatCurrency(totalHigh)}</td>
                <td className="text-right tabular-nums px-2">{totalScore}/60</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
