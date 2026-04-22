// Shared helpers used across presentation slides.
import { formatCurrency } from "@/lib/format";

export const ENGINE_NAMES = ["Pricing", "Sponsorship", "Apparel", "Events", "Add-Ons", "Retention", "Facility", "Affiliate"] as const;
export type EngineName = typeof ENGINE_NAMES[number];

export const ENGINE_SCORE_FIELD: Record<EngineName, string> = {
  Pricing: "pricing_score",
  Sponsorship: "sponsorship_score",
  Apparel: "apparel_score",
  Events: "event_score",
  "Add-Ons": "addon_score",
  Retention: "retention_score",
  Facility: "facility_score",
  Affiliate: "affiliate_score",
};

export const ENGINE_OPP_LOW: Record<EngineName, string> = {
  Pricing: "pricing_opportunity_low",
  Sponsorship: "sponsorship_opportunity_low",
  Apparel: "apparel_opportunity_low",
  Events: "event_opportunity_low",
  "Add-Ons": "addon_opportunity_low",
  Retention: "retention_opportunity_low",
  Facility: "facility_opportunity_low",
  Affiliate: "affiliate_fee_opportunity_low",
};

export const ENGINE_OPP_HIGH: Record<EngineName, string> = {
  Pricing: "pricing_opportunity_high",
  Sponsorship: "sponsorship_opportunity_high",
  Apparel: "apparel_opportunity_high",
  Events: "event_opportunity_high",
  "Add-Ons": "addon_opportunity_high",
  Retention: "retention_opportunity_high",
  Facility: "facility_opportunity_high",
  Affiliate: "affiliate_fee_opportunity_high",
};

export const ENGINE_HEX: Record<EngineName, string> = {
  Pricing: "#6366f1",
  Sponsorship: "#10b981",
  Apparel: "#f59e0b",
  Events: "#3b82f6",
  "Add-Ons": "#8b5cf6",
  Retention: "#ef4444",
  Facility: "#14b8a6",
  Affiliate: "#f97316",
};

export const ENGINE_CLIENT_FRAMING: Record<EngineName, string> = {
  Pricing: "Fee structure optimization",
  Sponsorship: "Local business partnerships",
  Apparel: "Gear and merchandise margin",
  Events: "Showcases, camps, and clinics",
  "Add-Ons": "Training and development programs",
  Retention: "Family loyalty and referrals",
  Facility: "Facility utilization and instruction",
  Affiliate: "Affiliate program revenue",
};

export type EngineRow = {
  name: EngineName;
  score: number;
  oppLow: number;
  oppHigh: number;
};

export function getEngineRows(metrics: any): EngineRow[] {
  if (!metrics) return [];
  return ENGINE_NAMES.map((name) => ({
    name,
    score: Number(metrics[ENGINE_SCORE_FIELD[name]] ?? 0),
    oppLow: Number(metrics[ENGINE_OPP_LOW[name]] ?? 0),
    oppHigh: Number(metrics[ENGINE_OPP_HIGH[name]] ?? 0),
  })).filter((e) => e.score > 0 || e.oppHigh > 0);
}

export function fmtRange(low: number, high: number): string {
  return `${formatCurrency(low)} – ${formatCurrency(high)}`;
}

export function scoreBand(score: number) {
  if (score <= 3) return { label: "Major opportunity", hex: "#ef4444" };
  if (score <= 6) return { label: "Growth opportunity", hex: "#f59e0b" };
  if (score <= 8) return { label: "Optimization opportunity", hex: "#3b82f6" };
  return { label: "Strong performance", hex: "#10b981" };
}

export function CurveBadge({ light }: { light?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 ${light ? "text-foreground" : "text-white"}`}>
      <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center">
        <span className="font-display font-bold text-white text-xs">C</span>
      </div>
      <span className="font-display font-semibold text-sm tracking-tight">Curve OS</span>
    </div>
  );
}
