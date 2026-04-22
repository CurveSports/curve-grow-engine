import { CurveBadge, ENGINE_HEX, type EngineName } from "../shared";
import { formatCurrency } from "@/lib/format";

type Outcome = { title: string; target: string; engine: EngineName | string; timeline: string };

export function KickoffSlide6({ metrics, intake }: { metrics: any; intake: any }) {
  const outcomes: Outcome[] = [];
  const priorityEngine = metrics?.priority_engine as string | null;
  const fmvLow = Number(metrics?.fmv_per_sponsor_low ?? 0);
  const ret = intake?.retention_pct;
  const rppBench = Number(metrics?.revenue_benchmark ?? 0);

  if (priorityEngine === "Sponsorship" || (metrics?.sponsorship_score ?? 10) <= 4) {
    outcomes.push({
      title: "First Sponsorship Partnership",
      target: `Close your first sponsorship deal at ${formatCurrency(fmvLow)}+`,
      engine: "Sponsorship",
      timeline: "Target: 45 days",
    });
  }
  if (priorityEngine === "Pricing" || (metrics?.pricing_score ?? 10) <= 4) {
    outcomes.push({
      title: "Pricing Structure Optimized",
      target: `New tiered package structure live (toward ${formatCurrency(rppBench)}/player)`,
      engine: "Pricing",
      timeline: "Target: 30 days",
    });
  }
  if ((metrics?.retention_score ?? 10) <= 4 && ret) {
    outcomes.push({
      title: "Re-enrollment System Live",
      target: `Formal re-enrollment process across all teams — target ${Math.min(95, Number(ret) + 5)}% retention`,
      engine: "Retention",
      timeline: "Target: 60 days",
    });
  }
  while (outcomes.length < 3) {
    outcomes.push({
      title: "Curve OS Adoption Complete",
      target: "Communication, tracking, and check-in cadences live across the org",
      engine: "Operations",
      timeline: "Target: 30 days",
    });
  }

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl md:text-4xl font-bold">90-day outcomes we're targeting</h2>
        <CurveBadge light />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {outcomes.slice(0, 3).map((o, i) => {
          const hex = ENGINE_HEX[o.engine as EngineName] ?? "#10b981";
          return (
            <div key={i} className="rounded-2xl border-2 p-5 bg-card" style={{ borderColor: hex + "66" }}>
              <p className="font-display text-xl font-bold">{o.title}</p>
              <p className="text-sm text-foreground/80 mt-2 leading-snug">{o.target}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: hex }}>{o.engine}</span>
                <span className="text-muted-foreground">{o.timeline}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-8">
        <p className="font-display text-3xl md:text-4xl font-bold leading-tight">
          Let's build a stronger club.<br />
          <span className="text-emerald-600">Let's build a better business.</span>
        </p>
      </div>
    </div>
  );
}
