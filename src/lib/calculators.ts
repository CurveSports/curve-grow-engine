// Calculator math + helpers shared across all five calculators.
// All functions are pure; UI components own input state.

export type CalculatorType =
  | "pricing_sensitivity"
  | "sponsorship_value"
  | "family_wallet_share"
  | "roster_growth"
  | "retention_impact";

export const CALCULATOR_LABELS: Record<CalculatorType, string> = {
  pricing_sensitivity: "Pricing Sensitivity",
  sponsorship_value: "Sponsorship Value",
  family_wallet_share: "Family Wallet Share",
  roster_growth: "Roster Growth",
  retention_impact: "Retention Impact",
};

export const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const round = (n: number, step = 1) => Math.round(n / step) * step;

export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/* ──────────────────  CALCULATOR 1 — PRICING SENSITIVITY  ────────────────── */

export interface PricingInputs {
  hsFeeIncreasePct: number;       // 0 - 50
  youthFeeIncreasePct: number;    // 0 - 50
  hsAttritionPct: number;         // 0 - 40
  youthAttritionPct: number;      // 0 - 40
}

export interface PricingContext {
  currentHsFee: number;
  currentYouthFee: number;
  hsPlayers: number;
  youthPlayers: number;
  currentDuesRevenue: number;
}

export function calcPricing(ctx: PricingContext, inputs: PricingInputs) {
  const newHsFee = ctx.currentHsFee * (1 + inputs.hsFeeIncreasePct / 100);
  const newYouthFee = ctx.currentYouthFee * (1 + inputs.youthFeeIncreasePct / 100);

  const hsLost = Math.round(ctx.hsPlayers * (inputs.hsAttritionPct / 100));
  const youthLost = Math.round(ctx.youthPlayers * (inputs.youthAttritionPct / 100));
  const remainingHs = Math.max(0, ctx.hsPlayers - hsLost);
  const remainingYouth = Math.max(0, ctx.youthPlayers - youthLost);
  const remainingPlayers = remainingHs + remainingYouth;
  const totalPlayers = ctx.hsPlayers + ctx.youthPlayers;

  const newDuesRevenue = remainingHs * newHsFee + remainingYouth * newYouthFee;
  const netImpact = newDuesRevenue - ctx.currentDuesRevenue;

  const currentRevPerPlayer = totalPlayers > 0 ? ctx.currentDuesRevenue / totalPlayers : 0;
  const newRevPerPlayer = remainingPlayers > 0 ? newDuesRevenue / remainingPlayers : 0;

  // Break-even attrition: at the new fee, what % loss makes total = current?
  // remaining * newFee = current  →  remaining = current / newFee
  const beHs = newHsFee > 0
    ? clamp(1 - (ctx.currentDuesRevenue * (ctx.currentHsFee * ctx.hsPlayers / Math.max(1, ctx.currentDuesRevenue))) / (newHsFee * ctx.hsPlayers), 0, 1)
    : 0;
  // Simpler per-segment break-even (fee-only, segment in isolation):
  const beHsSimple = inputs.hsFeeIncreasePct > 0
    ? clamp(1 - 1 / (1 + inputs.hsFeeIncreasePct / 100), 0, 1)
    : 0;
  const beYouthSimple = inputs.youthFeeIncreasePct > 0
    ? clamp(1 - 1 / (1 + inputs.youthFeeIncreasePct / 100), 0, 1)
    : 0;

  return {
    newHsFee,
    newYouthFee,
    hsLost,
    youthLost,
    remainingHs,
    remainingYouth,
    remainingPlayers,
    totalPlayers,
    newDuesRevenue,
    netImpact,
    currentRevPerPlayer,
    newRevPerPlayer,
    breakEvenHsPct: beHsSimple * 100,
    breakEvenYouthPct: beYouthSimple * 100,
    _beHs: beHs, // unused, kept for future
  };
}

/* ──────────────────  CALCULATOR 2 — SPONSORSHIP VALUE  ────────────────── */

export interface SponsorshipInputs {
  marketMultiplier: number;       // 0.7 / 1.0 / 1.15 / 1.45 / 1.6
  audienceMultiplier: number;     // 2 - 6
  assetScore: number;             // 0.7 / 1.0 / 1.3
  numberOfSponsors: number;       // 1 - 30
  baseValue: number;              // 1500 / 2000 / 2500
}

export interface SponsorshipContext {
  totalPlayers: number;
  currentSponsorshipRevenue: number;
  currentSponsors: number;
}

export function calcSponsorship(ctx: SponsorshipContext, inputs: SponsorshipInputs) {
  // FMV per sponsor = base × market × audience-quality × asset score
  // Audience score: scale spectators-per-player to a normalized factor (~ 1.0 at 4)
  const audienceQuality = inputs.audienceMultiplier / 4;
  const fmvCenter =
    inputs.baseValue * inputs.marketMultiplier * audienceQuality * inputs.assetScore;
  const fmvLow = fmvCenter * 0.8;
  const fmvHigh = fmvCenter * 1.2;

  const totalLow = fmvLow * inputs.numberOfSponsors;
  const totalHigh = fmvHigh * inputs.numberOfSponsors;

  const currentPerSponsor =
    ctx.currentSponsors > 0 ? ctx.currentSponsorshipRevenue / ctx.currentSponsors : 0;

  const gapLow = Math.max(0, totalLow - ctx.currentSponsorshipRevenue);
  const gapHigh = Math.max(0, totalHigh - ctx.currentSponsorshipRevenue);

  const totalAudience = ctx.totalPlayers * inputs.audienceMultiplier;

  return {
    fmvLow,
    fmvHigh,
    totalLow,
    totalHigh,
    currentPerSponsor,
    gapLow,
    gapHigh,
    totalAudience,
  };
}

/* ──────────────────  CALCULATOR 3 — FAMILY WALLET SHARE  ────────────────── */

export interface WalletInputs {
  duesIncreasePct: number;       // 0-50, % increase applied to current dues revenue
  numSponsors: number;
  eventRevPerPlayer: number;     // $0 - 800
  apparelCapturePct: number;     // 0-100 of apparel package
  apparelPackageAmount: number;  // $/family, default $600
  addonAdoptionPct: number;      // 0-50
  addonPackageAmount: number;    // $/family/year, default $1,200 ($100/mo)
  travelCapturePct: number;      // 0-40, % of outside travel spend redirected to org
  travelSpendPerFamily: number;  // $5,000-$7,000, default $6,000
  facilityCapturePct: number;    // 0-100 of $2,400/player benchmark
}

export interface WalletContext {
  totalPlayers: number;
  currentDues: number;
  currentSponsorship: number;
  currentSponsors: number;
  currentEvents: number;
  currentApparelMargin: number;
  currentAddOns: number;
  currentFacility: number;
  hasFacility: boolean;
  // Sponsorship FMV mid (computed once from intake-derived FMV range)
  fmvPerSponsorMid: number;
}

const FAMILY_WALLET_LOW_PER_PLAYER = 15000;
const FAMILY_WALLET_HIGH_PER_PLAYER = 20000;
const APPAREL_FAMILY_SPEND = 600;
const ADDON_MONTHLY_PACKAGE = 1200; // $100/mo × 12
const FACILITY_PER_PLAYER_BENCHMARK = 2400;

export function calcWallet(ctx: WalletContext, inputs: WalletInputs) {
  const lowWallet = FAMILY_WALLET_LOW_PER_PLAYER * ctx.totalPlayers;
  const highWallet = FAMILY_WALLET_HIGH_PER_PLAYER * ctx.totalPlayers;

  // dues capture is % of high-wallet per family
  const newDues = (inputs.duesCapturePct / 100) * FAMILY_WALLET_HIGH_PER_PLAYER * ctx.totalPlayers;
  const newSponsorship = inputs.numSponsors * ctx.fmvPerSponsorMid;
  const newEvents = inputs.eventRevPerPlayer * ctx.totalPlayers;
  const newApparel = (inputs.apparelCapturePct / 100) * APPAREL_FAMILY_SPEND * ctx.totalPlayers;
  const newAddOns = (inputs.addonAdoptionPct / 100) * ADDON_MONTHLY_PACKAGE * ctx.totalPlayers;
  const newFacility = ctx.hasFacility
    ? (inputs.facilityCapturePct / 100) * FACILITY_PER_PLAYER_BENCHMARK * ctx.totalPlayers
    : 0;

  const projectedTotal =
    newDues + newSponsorship + newEvents + newApparel + newAddOns + newFacility;
  const currentTotal =
    ctx.currentDues +
    ctx.currentSponsorship +
    ctx.currentEvents +
    ctx.currentApparelMargin +
    ctx.currentAddOns +
    (ctx.hasFacility ? ctx.currentFacility : 0);

  const currentCapturePct = highWallet > 0 ? (currentTotal / highWallet) * 100 : 0;
  const projectedCapturePct = highWallet > 0 ? (projectedTotal / highWallet) * 100 : 0;
  const uncaptured = Math.max(0, highWallet - projectedTotal);
  const netGain = projectedTotal - currentTotal;

  return {
    lowWallet,
    highWallet,
    newDues,
    newSponsorship,
    newEvents,
    newApparel,
    newAddOns,
    newFacility,
    projectedTotal,
    currentTotal,
    currentCapturePct,
    projectedCapturePct,
    uncaptured,
    netGain,
  };
}

/* ──────────────────  CALCULATOR 4 — ROSTER GROWTH  ────────────────── */

export type GrowthAssumption = "conservative" | "same" | "improved";

export interface GrowthInputs {
  targetPlayers: number;
  assumption: GrowthAssumption;
  timelineMonths: number; // 6 / 12 / 24
}

export interface GrowthContext {
  currentPlayers: number;
  revPerPlayer: number;
  totalRevenue: number;
  duesRevenue: number;
  eventRevenue: number;
  sponsorshipRevenue: number;
  apparelMargin: number;
}

export function calcGrowth(ctx: GrowthContext, inputs: GrowthInputs) {
  const factor = inputs.assumption === "conservative" ? 0.9 : inputs.assumption === "improved" ? 1.1 : 1.0;
  const newRevPerPlayer = ctx.revPerPlayer * factor;
  const projectedTotal = newRevPerPlayer * inputs.targetPlayers;
  const additional = projectedTotal - ctx.totalRevenue;
  const playersAdded = inputs.targetPlayers - ctx.currentPlayers;
  const growthRate = ctx.currentPlayers > 0 ? (playersAdded / ctx.currentPlayers) * 100 : 0;
  const playersPerMonth = inputs.timelineMonths > 0 ? playersAdded / inputs.timelineMonths : 0;

  // Per-stream breakdown (proportional to player count, with small audience boost on sponsorship)
  const playerScale = ctx.currentPlayers > 0 ? inputs.targetPlayers / ctx.currentPlayers : 1;
  const audienceBoost = 1 + (playerScale - 1) * 0.3; // sponsorship: 30% of player growth flows to value
  const newDues = ctx.duesRevenue * playerScale * factor;
  const newEvents = ctx.eventRevenue * playerScale;
  const newSponsorship = ctx.sponsorshipRevenue * audienceBoost;
  const newApparel = ctx.apparelMargin * playerScale;

  return {
    newRevPerPlayer,
    projectedTotal,
    additional,
    playersAdded,
    growthRate,
    playersPerMonth,
    duesIncrease: newDues - ctx.duesRevenue,
    eventsIncrease: newEvents - ctx.eventRevenue,
    sponsorshipIncrease: newSponsorship - ctx.sponsorshipRevenue,
    apparelIncrease: newApparel - ctx.apparelMargin,
  };
}

/* ──────────────────  CALCULATOR 5 — RETENTION IMPACT  ────────────────── */

export interface RetentionInputs {
  targetRetentionPct: number;     // currentRetention .. 95
  targetAvgYears: number;          // 1 - 6
  referralAdoptionPct: number;     // 0 - 20
}

export interface RetentionContext {
  currentRetentionPct: number;     // 0-100
  currentAvgYears: number;
  revPerPlayer: number;
  totalPlayers: number;
}

export function calcRetention(ctx: RetentionContext, inputs: RetentionInputs) {
  const currentChurnedPlayers = Math.round(ctx.totalPlayers * (1 - ctx.currentRetentionPct / 100));
  const targetChurnedPlayers = Math.round(ctx.totalPlayers * (1 - inputs.targetRetentionPct / 100));
  const additionalRetained = Math.max(0, currentChurnedPlayers - targetChurnedPlayers);
  const revenueProtected = additionalRetained * ctx.revPerPlayer;
  const revenueAtRisk = currentChurnedPlayers * ctx.revPerPlayer;

  const currentLtv = ctx.currentAvgYears * ctx.revPerPlayer;
  const targetLtv = inputs.targetAvgYears * ctx.revPerPlayer;
  const ltvIncreasePerPlayer = targetLtv - currentLtv;

  const referralPlayers = Math.round((inputs.referralAdoptionPct / 100) * ctx.totalPlayers);
  const referralRevenue = referralPlayers * ctx.revPerPlayer;

  const totalImpact = revenueProtected + ltvIncreasePerPlayer * ctx.totalPlayers + referralRevenue;
  const protectedPerPct = ctx.totalPlayers * 0.01 * ctx.revPerPlayer;

  return {
    currentChurnedPlayers,
    additionalRetained,
    revenueProtected,
    revenueAtRisk,
    currentLtv,
    targetLtv,
    ltvIncreasePerPlayer,
    ltvIncreaseTotal: ltvIncreasePerPlayer * ctx.totalPlayers,
    referralPlayers,
    referralRevenue,
    totalImpact,
    protectedPerPct,
  };
}

/* ──────────────────  KEY OUTPUT FOR SCENARIO CARDS  ────────────────── */

export function keyOutputFor(type: CalculatorType, output: any): { label: string; value: string } {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  switch (type) {
    case "pricing_sensitivity":
      return { label: "Net revenue impact", value: `${output?.netImpact >= 0 ? "+" : ""}${fmt(output?.netImpact ?? 0)}` };
    case "sponsorship_value":
      return { label: "Total sponsorship potential", value: `${fmt(output?.totalLow ?? 0)} – ${fmt(output?.totalHigh ?? 0)}` };
    case "family_wallet_share":
      return { label: "Total wallet capture", value: `${(output?.projectedCapturePct ?? 0).toFixed(1)}%` };
    case "roster_growth":
      return { label: "Additional annual revenue", value: `${output?.additional >= 0 ? "+" : ""}${fmt(output?.additional ?? 0)}` };
    case "retention_impact":
      return { label: "Total combined impact", value: `+${fmt(output?.totalImpact ?? 0)}` };
  }
}
