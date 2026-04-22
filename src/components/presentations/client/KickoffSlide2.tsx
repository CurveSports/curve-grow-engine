import { CurveBadge, ENGINE_HEX } from "../shared";
import { formatCurrency } from "@/lib/format";

const WALLET_HIGH = 20000;

export function KickoffSlide2({ metrics, intake }: { metrics: any; intake: any }) {
  const totalRev = Number(metrics?.calculated_total_revenue ?? 0);
  const rpp = Number(metrics?.revenue_per_player ?? 0);
  const totalPlayers = intake?.total_players ?? 0;

  const dues = Number(metrics?.dues_revenue ?? 0);
  const events = Number(metrics?.total_event_revenue ?? metrics?.event_revenue_target ?? 0);
  const addOns = Number(metrics?.add_on_revenue ?? 0);
  const affiliate = Number(metrics?.affiliate_fee_revenue ?? 0);
  const facility = Number(metrics?.facility_revenue_pct ?? 0);
  const otherRaw = Math.max(0, totalRev - (dues + events + addOns + affiliate + facility));
  const segments = [
    { name: "Dues", value: dues, hex: "#94a3b8" },
    { name: "Events", value: events, hex: ENGINE_HEX.Events },
    { name: "Add-Ons", value: addOns, hex: ENGINE_HEX["Add-Ons"] },
    { name: "Affiliate", value: affiliate, hex: ENGINE_HEX.Affiliate },
    { name: "Facility", value: facility, hex: ENGINE_HEX.Facility },
    { name: "Other", value: otherRaw, hex: "#cbd5e1" },
  ].filter((s) => s.value > 0);

  // SVG donut
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 60, cx = 80, cy = 80, c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((s) => {
    const len = (s.value / total) * c;
    const seg = (
      <circle
        key={s.name}
        cx={cx} cy={cy} r={r}
        fill="transparent" stroke={s.hex} strokeWidth={28}
        strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
      />
    );
    offset += len;
    return seg;
  });

  const duesPct = totalRev > 0 ? Math.round((dues / totalRev) * 100) : 0;
  const insight = duesPct >= 70
    ? `${duesPct}% of revenue comes from player fees — there's a significant diversification opportunity ahead.`
    : "You have a diversified revenue base — a strong foundation to build from.";

  // Wallet capture
  const familySpend = WALLET_HIGH * totalPlayers;
  const capturePct = familySpend > 0 ? Math.round((totalRev / familySpend) * 100) : 0;

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl md:text-4xl font-bold">Where you are today</h2>
        <CurveBadge light />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Revenue</p>
          <p className="font-display text-4xl font-bold mt-2 tabular-nums">{formatCurrency(totalRev)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue Per Player</p>
          <p className="font-display text-4xl font-bold mt-2 tabular-nums">{formatCurrency(rpp)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">Revenue Mix</p>
        <div className="flex items-center gap-8">
          <svg viewBox="0 0 160 160" width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
            <circle cx={cx} cy={cy} r={r} fill="transparent" stroke="#f1f5f9" strokeWidth={28} />
            {arcs}
          </svg>
          <ul className="flex-1 space-y-2 text-sm">
            {segments.map((s) => (
              <li key={s.name} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.hex }} />
                <span className="flex-1">{s.name}</span>
                <span className="tabular-nums text-muted-foreground">{Math.round((s.value / total) * 100)}%</span>
                <span className="tabular-nums font-semibold ml-3">{formatCurrency(s.value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground mt-4 italic">{insight}</p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">Wallet Share Context</p>
        <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
          Families in your program spend <span className="font-semibold">$15,000–$20,000 per year</span> on their athlete.
          You currently capture <span className="font-bold text-emerald-700">{capturePct}%</span> of that wallet.
        </p>
        <div className="mt-3 h-3 w-full bg-emerald-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, capturePct)}%` }} />
        </div>
      </div>
    </div>
  );
}
