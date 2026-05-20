import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

type Props = { orgId: string };

type Intake = Record<string, any> | null;
type Presence = Record<string, any> | null;

// Grouped field map for clean rendering of organization_intake
const GROUPS: Array<{ title: string; fields: Array<{ key: string; label: string }> }> = [
  {
    title: "Contact & Identity",
    fields: [
      { key: "organization_name", label: "Organization name" },
      { key: "primary_contact_name", label: "Primary contact" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "city_state", label: "City / State" },
    ],
  },
  {
    title: "Organization Profile",
    fields: [
      { key: "market_type", label: "Market type" },
      { key: "org_type", label: "Org type" },
      { key: "years_in_operation", label: "Years in operation" },
      { key: "current_growth_trend", label: "Growth trend" },
      { key: "player_mix", label: "Player mix" },
      { key: "local_market_competition", label: "Local competition" },
      { key: "organization_focus", label: "Focus" },
      { key: "market_strategy", label: "Market strategy" },
      { key: "operates_multiple_brands", label: "Operates multiple brands" },
      { key: "number_of_brands", label: "# Brands" },
      { key: "brand_descriptions", label: "Brand descriptions" },
      { key: "facility_locations", label: "Facility locations" },
      { key: "active_coaches", label: "Active coaches" },
    ],
  },
  {
    title: "Players & Teams",
    fields: [
      { key: "total_players", label: "Total players" },
      { key: "hs_players", label: "HS players" },
      { key: "youth_players", label: "Youth players" },
      { key: "total_teams", label: "Total teams" },
      { key: "average_roster_size", label: "Avg roster size" },
      { key: "seasons_offered", label: "Seasons offered" },
      { key: "team_structure", label: "Team structure" },
      { key: "typical_player_participation", label: "Typical participation" },
      { key: "player_commitment_level", label: "Commitment level" },
      { key: "demand_for_organization", label: "Demand" },
      { key: "player_selection_approach", label: "Selection approach" },
    ],
  },
  {
    title: "Dues & Pricing",
    fields: [
      { key: "dues_model", label: "Dues model" },
      { key: "dues_inclusions", label: "Dues inclusions" },
      { key: "tiered_packages", label: "Tiered packages" },
      { key: "price_point", label: "Price point" },
      { key: "knows_profit_margin", label: "Knows profit margin" },
      { key: "profit_margin_range", label: "Profit margin range" },
      { key: "avg_months_active", label: "Avg months active" },
      { key: "spring_youth_players", label: "Spring youth players" },
      { key: "spring_youth_fee", label: "Spring youth fee" },
      { key: "summer_hs_players", label: "Summer HS players" },
      { key: "summer_hs_fee", label: "Summer HS fee" },
      { key: "summer_youth_players", label: "Summer youth players" },
      { key: "summer_youth_fee", label: "Summer youth fee" },
      { key: "fall_hs_players", label: "Fall HS players" },
      { key: "fall_hs_fee", label: "Fall HS fee" },
      { key: "fall_youth_players", label: "Fall youth players" },
      { key: "fall_youth_fee", label: "Fall youth fee" },
      { key: "monthly_hs_fee", label: "Monthly HS fee" },
      { key: "monthly_youth_fee", label: "Monthly youth fee" },
      { key: "flat_annual_hs_fee", label: "Flat annual HS fee" },
      { key: "flat_annual_youth_fee", label: "Flat annual youth fee" },
      { key: "mixed_annual_hs_fee", label: "Mixed annual HS fee" },
      { key: "mixed_annual_youth_fee", label: "Mixed annual youth fee" },
    ],
  },
  {
    title: "Tournaments & À-la-carte",
    fields: [
      { key: "tournament_fee_structure", label: "Tournament fee structure" },
      { key: "tournaments_per_hs_player", label: "Tournaments per HS player" },
      { key: "tournaments_per_youth_player", label: "Tournaments per youth player" },
      { key: "tournament_fee_per_player", label: "Tournament fee / player" },
      { key: "alacarte_annual_hs_spend", label: "À-la-carte HS spend" },
      { key: "alacarte_annual_youth_spend", label: "À-la-carte youth spend" },
    ],
  },
  {
    title: "Revenue (verified)",
    fields: [
      { key: "tournaments_revenue", label: "Tournaments" },
      { key: "camps_revenue", label: "Camps" },
      { key: "clinics_revenue", label: "Clinics" },
      { key: "lessons_revenue", label: "Lessons (net)" },
      { key: "lessons_revenue_gross", label: "Lessons (gross)" },
      { key: "lessons_revenue_model", label: "Lessons capture model" },
      { key: "lessons_capture_pct", label: "Lessons capture %" },
      { key: "showcase_revenue", label: "Showcases" },
      { key: "recruiting_events_revenue", label: "Recruiting events" },
      { key: "data_days_revenue", label: "Data days" },
      { key: "tryouts_revenue", label: "Tryouts" },
      { key: "other_events_revenue", label: "Other events" },
      { key: "other_addon_revenue", label: "Other add-ons" },
      { key: "facility_rental_revenue", label: "Facility rental" },
      { key: "annual_facility_rental_revenue", label: "Annual facility rental" },
      { key: "total_event_revenue", label: "Total event revenue" },
      { key: "event_types_offered", label: "Event types offered" },
      { key: "events_per_year", label: "Events per year" },
      { key: "runs_own_events", label: "Runs own events" },
      { key: "revenue_verification", label: "Revenue verification" },
      { key: "revenue_needs_review", label: "Revenue needs review" },
    ],
  },
  {
    title: "Apparel & Hard Goods",
    fields: [
      { key: "uniform_vendor", label: "Uniform vendor" },
      { key: "uniform_package_cost", label: "Uniform package cost" },
      { key: "uniform_markup", label: "Uniform markup" },
      { key: "hard_goods_purchased", label: "Hard goods purchased" },
      { key: "hard_goods_spend", label: "Hard goods spend" },
      { key: "hard_goods_markup", label: "Hard goods markup" },
      { key: "team_store_status", label: "Team store" },
      { key: "addon_soft_goods_spend", label: "Soft goods add-on spend" },
    ],
  },
  {
    title: "Sponsorship",
    fields: [
      { key: "seeks_sponsorships", label: "Seeks sponsorships" },
      { key: "number_of_sponsors", label: "# Sponsors" },
      { key: "total_sponsorship_revenue", label: "Total sponsorship revenue" },
      { key: "sponsorship_approach", label: "Sponsorship approach" },
    ],
  },
  {
    title: "Affiliates",
    fields: [
      { key: "has_affiliates", label: "Has affiliates" },
      { key: "number_of_affiliates", label: "# Affiliates" },
      { key: "affiliate_players_charged", label: "Affiliate players charged" },
      { key: "affiliate_fee_per_player", label: "Affiliate fee / player" },
      { key: "affiliate_apparel_revenue", label: "Affiliate apparel revenue" },
    ],
  },
  {
    title: "Retention & Operations",
    fields: [
      { key: "retention_pct", label: "Retention %" },
      { key: "avg_player_years", label: "Avg player years" },
      { key: "operational_structure", label: "Operational structure" },
      { key: "parent_communication", label: "Parent communication" },
      { key: "coach_alignment", label: "Coach alignment" },
      { key: "coaching_structure", label: "Coaching structure" },
      { key: "pricing_approach", label: "Pricing approach" },
    ],
  },
];

const DIGITAL_PRESENCE_FIELDS: Array<{ key: string; label: string; isUrl?: boolean }> = [
  { key: "website_url", label: "Website URL", isUrl: true },
  { key: "instagram_handle", label: "Instagram" },
  { key: "facebook_url", label: "Facebook", isUrl: true },
  { key: "x_handle", label: "X / Twitter" },
  { key: "tiktok_handle", label: "TikTok" },
  { key: "youtube_url", label: "YouTube", isUrl: true },
  { key: "linkedin_url", label: "LinkedIn", isUrl: true },
  { key: "posting_frequency", label: "Posting frequency" },
  { key: "primary_audience_notes", label: "Primary audience notes" },
];

function formatVal(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function isMissing(v: any): boolean {
  if (v === null || v === undefined || v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

export default function IntakeAnswersTab({ orgId }: Props) {
  const [loading, setLoading] = useState(true);
  const [intake, setIntake] = useState<Intake>(null);
  const [presence, setPresence] = useState<Presence>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: i }, { data: p }] = await Promise.all([
        supabase.from("organization_intake").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("org_digital_presence").select("*").eq("org_id", orgId).maybeSingle(),
      ]);
      setIntake((i as any) ?? null);
      setPresence((p as any) ?? null);
      setLoading(false);
    })();
  }, [orgId]);

  if (loading) {
    return (
      <div className="curve-card flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading intake…
      </div>
    );
  }

  const recentPostUrls = (presence?.recent_post_urls ?? {}) as Record<string, string[]>;
  const hasAnyPostUrls = Object.values(recentPostUrls).some((arr) => Array.isArray(arr) && arr.some(Boolean));
  const hasWebsite = !!presence?.website_url;
  const hasAnySocial = DIGITAL_PRESENCE_FIELDS.slice(1, 7).some((f) => !isMissing(presence?.[f.key]));
  const auditReady = hasWebsite || hasAnyPostUrls;

  return (
    <div className="space-y-6">
      {!intake && (
        <div className="curve-card flex items-start gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
          <div>
            <div className="font-medium">No intake submitted yet.</div>
            <div className="text-muted-foreground">This org hasn't completed the Revenue Assessment.</div>
          </div>
        </div>
      )}

      {/* Digital presence / audit readiness */}
      <div className="curve-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Website & Social Audit Inputs</h2>
          <Link
            to={`/admin/presentations?org=${orgId}`}
            className="text-sm text-accent hover:underline inline-flex items-center gap-1"
          >
            Run audit <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {!presence && (
          <div className="text-sm text-muted-foreground mb-3">No digital presence data on file.</div>
        )}

        {presence && (
          <>
            <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${auditReady ? "border-health/30 bg-health-soft/40 text-health" : "border-warning/30 bg-warning-soft/40 text-warning"}`}>
              {auditReady ? (
                <>Audit ready — at least one website or post URL is on file.</>
              ) : (
                <>
                  Audit can't be meaningfully run yet. Needs a <strong>website URL</strong> and/or{" "}
                  <strong>recent post URLs</strong>{hasAnySocial ? " (social handles alone aren't enough — the audit needs direct post URLs to read brand voice)" : ""}.
                </>
              )}
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {DIGITAL_PRESENCE_FIELDS.map((f) => {
                const v = (presence as any)[f.key];
                const missing = isMissing(v);
                return (
                  <div key={f.key} className="flex justify-between gap-3 border-b border-border/40 py-1.5">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className={`text-right max-w-[60%] truncate ${missing ? "italic text-muted-foreground/60" : "text-foreground font-medium"}`}>
                      {missing ? "—" : f.isUrl ? (
                        <a href={String(v).startsWith("http") ? String(v) : `https://${v}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                          {formatVal(v)}
                        </a>
                      ) : formatVal(v)}
                    </dd>
                  </div>
                );
              })}
            </dl>

            <div className="mt-5">
              <h3 className="text-sm font-semibold mb-2">Recent post URLs (used to infer brand voice)</h3>
              {!hasAnyPostUrls && (
                <p className="text-sm italic text-muted-foreground">No recent post URLs provided.</p>
              )}
              {hasAnyPostUrls && (
                <div className="space-y-3">
                  {Object.entries(recentPostUrls).map(([platform, urls]) => {
                    const list = (Array.isArray(urls) ? urls : []).filter(Boolean);
                    if (!list.length) return null;
                    return (
                      <div key={platform} className="text-sm">
                        <div className="font-medium capitalize">{platform}</div>
                        <ul className="ml-4 list-disc text-muted-foreground">
                          {list.map((u, i) => (
                            <li key={i}>
                              <a href={u} target="_blank" rel="noreferrer" className="text-accent hover:underline break-all">
                                {u}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Intake answers grouped */}
      {intake && (
        <>
          {GROUPS.map((g) => (
            <div className="curve-card" key={g.title}>
              <h2 className="font-display text-lg font-semibold mb-3">{g.title}</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {g.fields.map((f) => {
                  const v = (intake as any)[f.key];
                  const missing = isMissing(v);
                  return (
                    <div key={f.key} className="flex justify-between gap-3 border-b border-border/40 py-1.5">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className={`text-right max-w-[60%] ${missing ? "italic text-muted-foreground/60" : "text-foreground font-medium"}`}>
                        {formatVal(v)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}

          {intake.submitted_at && (
            <div className="text-xs text-muted-foreground">
              Submitted {new Date(intake.submitted_at).toLocaleString()} · Last updated{" "}
              {intake.updated_at ? new Date(intake.updated_at).toLocaleString() : "—"}
            </div>
          )}
        </>
      )}
    </div>
  );
}
