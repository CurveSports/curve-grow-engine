import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TextField, NumberField, SelectField, PillSelectField, MultiCheckField } from "@/components/intake/Fields";
import { cn } from "@/lib/utils";
import {
  MARKET_TYPES, ORG_TYPES, YEARS_OPTIONS, GROWTH_TRENDS, PLAYER_MIX, COMPETITION,
  ORG_FOCUS, MARKET_STRATEGY, SEASONS, TEAM_STRUCTURE, PLAYER_PARTICIPATION,
  COMMITMENT, DEMAND, SELECTION, DUES_INCLUSIONS, TIERED, PRICE_POINT, KNOWS_MARGIN,
  MARGIN_RANGES, SPONSORSHIPS,
  OPS_STRUCTURE, PARENT_COMMS, COACH_ALIGNMENT, COACHING_STRUCTURE, PRICING_APPROACH,
  SPONSORSHIP_APPROACH, SECTION_TITLES, EVENT_TYPES, LESSONS_CAPTURE_MODEL,
  UNIFORM_PACKAGE_COST, UNIFORM_MARKUP, HARD_GOODS_PURCHASED, HARD_GOODS_SPEND,
  HARD_GOODS_MARKUP, TEAM_STORE_STATUS, ADDON_SOFT_GOODS_SPEND,
  DUES_MODELS, MONTHS_ACTIVE, TOURNAMENT_FEE_STRUCTURES, TOURNAMENTS_PER_PLAYER,
  REVENUE_VERIFICATION,
} from "@/lib/intakeOptions";
import { formatCurrency } from "@/lib/format";

type Form = Record<string, any>;

const SECTION_DESCRIPTIONS = [
  "Tell us the basics about your club and the market you operate in.",
  "Help us understand the size and shape of your player and team base.",
  "Help us understand your current revenue structure across all sources.",
  "A quick look at how well your organization keeps players year over year.",
  "How your day-to-day systems, communication, and pricing decisions are run.",
];

const empty: Form = {
  organization_name: "", primary_contact_name: "", email: "", phone: "", city_state: "",
  market_type: "", org_type: "", years_in_operation: "", current_growth_trend: "",
  player_mix: "", local_market_competition: "", organization_focus: "", market_strategy: "",
  total_players: "", hs_players: "", youth_players: "", total_teams: "", average_roster_size: "",
  seasons_offered: [], team_structure: "", typical_player_participation: "",
  player_commitment_level: "", demand_for_organization: "", player_selection_approach: "",
  // Dues model
  dues_model: "",
  spring_youth_players: "", spring_youth_fee: "",
  summer_hs_players: "", summer_hs_fee: "", summer_youth_players: "", summer_youth_fee: "",
  fall_hs_players: "", fall_hs_fee: "", fall_youth_players: "", fall_youth_fee: "",
  monthly_hs_fee: "", monthly_youth_fee: "", avg_months_active: "",
  tournament_fee_structure: "",
  tournaments_per_hs_player: "", tournaments_per_youth_player: "",
  tournament_fee_per_player: "",
  alacarte_annual_hs_spend: "", alacarte_annual_youth_spend: "",
  flat_annual_hs_fee: "", flat_annual_youth_fee: "",
  mixed_annual_hs_fee: "", mixed_annual_youth_fee: "",
  revenue_verification: "",
  dues_inclusions: [], tiered_packages: "", price_point: "",
  knows_profit_margin: "", profit_margin_range: "",
  seeks_sponsorships: "", number_of_sponsors: "", total_sponsorship_revenue: "",
  uniform_vendor: "", uniform_package_cost: "", uniform_markup: "",
  hard_goods_purchased: "", hard_goods_spend: "", hard_goods_markup: "",
  team_store_status: "", addon_soft_goods_spend: "",
  runs_own_events: "", events_per_year: "", total_event_revenue: "",
  event_types_offered: [],
  tournaments_revenue: "", camps_revenue: "", clinics_revenue: "", showcase_revenue: "",
  recruiting_events_revenue: "", data_days_revenue: "", tryouts_revenue: "", other_events_revenue: "",
  other_addon_revenue: "",
  lessons_revenue: "", lessons_revenue_gross: "", lessons_revenue_model: "", lessons_capture_pct: "",
  annual_facility_rental_revenue: "",
  facility_rental_revenue: "",
  retention_pct: "", avg_player_years: "",
  operational_structure: "", parent_communication: [], coach_alignment: "",
  coaching_structure: "", pricing_approach: "", sponsorship_approach: "",
};

function SubsectionHeading({ title }: { title: string }) {
  return (
    <div className="border-l-2 border-accent pl-4 py-1">
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}

function DuesBlock({ form, set }: { form: Form; set: (k: string, v: any) => void }) {
  const isYearRound = Array.isArray(form.seasons_offered) && form.seasons_offered.includes("Year-round");
  // Auto-pin to Monthly Membership when year-round
  useEffect(() => {
    if (isYearRound && form.dues_model !== "Monthly Membership") {
      set("dues_model", "Monthly Membership");
    }
  }, [isYearRound]);

  const model = isYearRound ? "Monthly Membership" : form.dues_model;

  return (
    <>
      {!isYearRound && (
        <PillSelectField
          label="How do you primarily structure player fees?"
          value={form.dues_model}
          onChange={(v) => set("dues_model", v)}
          options={DUES_MODELS}
        />
      )}

      {model === "Per Season" && (
        <div className="space-y-6 rounded-lg border border-border bg-secondary/30 p-5">
          <div>
            <h3 className="font-display text-base font-semibold">Youth Player Seasons</h3>
            <p className="text-xs text-muted-foreground mt-1">Youth players typically participate in Spring, Summer, and/or Fall seasons.</p>
          </div>

          <div className="space-y-4 rounded-md bg-background p-4 border border-border">
            <p className="font-medium text-sm">Spring Season <span className="text-muted-foreground font-normal">(Youth only)</span></p>
            <NumberField label="Approximate Youth players this season" hint="Estimate is fine" value={form.spring_youth_players} onChange={(v) => set("spring_youth_players", v)} min={0} />
            <NumberField label="Youth player fee this season" value={form.spring_youth_fee} onChange={(v) => set("spring_youth_fee", v)} min={0} currency />
          </div>

          <div className="space-y-4 rounded-md bg-background p-4 border border-border">
            <p className="font-medium text-sm">Summer Season</p>
            <NumberField label="Approximate HS players this season" value={form.summer_hs_players} onChange={(v) => set("summer_hs_players", v)} min={0} />
            <NumberField label="HS player fee this season" value={form.summer_hs_fee} onChange={(v) => set("summer_hs_fee", v)} min={0} currency />
            <NumberField label="Approximate Youth players this season" value={form.summer_youth_players} onChange={(v) => set("summer_youth_players", v)} min={0} />
            <NumberField label="Youth player fee this season" value={form.summer_youth_fee} onChange={(v) => set("summer_youth_fee", v)} min={0} currency />
          </div>

          <div className="space-y-4 rounded-md bg-background p-4 border border-border">
            <p className="font-medium text-sm">Fall Season</p>
            <NumberField label="Approximate HS players this season" value={form.fall_hs_players} onChange={(v) => set("fall_hs_players", v)} min={0} />
            <NumberField label="HS player fee this season" value={form.fall_hs_fee} onChange={(v) => set("fall_hs_fee", v)} min={0} currency />
            <NumberField label="Approximate Youth players this season" value={form.fall_youth_players} onChange={(v) => set("fall_youth_players", v)} min={0} />
            <NumberField label="Youth player fee this season" value={form.fall_youth_fee} onChange={(v) => set("fall_youth_fee", v)} min={0} currency />
          </div>

          <p className="text-xs text-muted-foreground">HS players typically participate in Summer and Fall seasons only. Spring is excluded for HS as most play school ball.</p>
        </div>
      )}

      {model === "Monthly Membership" && (
        <div className="space-y-5 rounded-lg border border-border bg-secondary/30 p-5">
          <NumberField label="Monthly membership fee — HS players" hint="The recurring monthly fee families pay, not a per-season or annual fee" value={form.monthly_hs_fee} onChange={(v) => set("monthly_hs_fee", v)} min={0} currency />
          <NumberField label="Monthly membership fee — Youth players" value={form.monthly_youth_fee} onChange={(v) => set("monthly_youth_fee", v)} min={0} currency />
          <PillSelectField label="Average months active per year" value={form.avg_months_active ? String(form.avg_months_active) : ""} onChange={(v) => set("avg_months_active", Number(v))} options={MONTHS_ACTIVE} />
          <PillSelectField label="How do you handle tournament and event fees?" value={form.tournament_fee_structure} onChange={(v) => set("tournament_fee_structure", v)} options={TOURNAMENT_FEE_STRUCTURES} />

          {form.tournament_fee_structure === "Standard fee per tournament" && (
            <>
              <PillSelectField label="Average number of tournaments per HS player per year" value={form.tournaments_per_hs_player} onChange={(v) => set("tournaments_per_hs_player", v)} options={TOURNAMENTS_PER_PLAYER} />
              <PillSelectField label="Average number of tournaments per Youth player per year" value={form.tournaments_per_youth_player} onChange={(v) => set("tournaments_per_youth_player", v)} options={TOURNAMENTS_PER_PLAYER} />
              <NumberField label="Per tournament cost to the player/family" value={form.tournament_fee_per_player} onChange={(v) => set("tournament_fee_per_player", v)} min={0} currency />
            </>
          )}
          {form.tournament_fee_structure === "À la carte — players register and pay per event" && (
            <>
              <NumberField label="Estimated average annual tournament and event spend per HS player" hint="This is separate from events your org hosts — it covers what families pay to participate in external tournaments through your organization" value={form.alacarte_annual_hs_spend} onChange={(v) => set("alacarte_annual_hs_spend", v)} min={0} currency />
              <NumberField label="Estimated average annual tournament and event spend per Youth player" value={form.alacarte_annual_youth_spend} onChange={(v) => set("alacarte_annual_youth_spend", v)} min={0} currency />
            </>
          )}
        </div>
      )}

      {model === "Flat Annual Fee" && (
        <div className="space-y-5 rounded-lg border border-border bg-secondary/30 p-5">
          <NumberField label="Annual HS Player Fee" value={form.flat_annual_hs_fee} onChange={(v) => set("flat_annual_hs_fee", v)} min={0} currency />
          <NumberField label="Annual Youth Player Fee" value={form.flat_annual_youth_fee} onChange={(v) => set("flat_annual_youth_fee", v)} min={0} currency />
        </div>
      )}

      {model === "Mixed" && (
        <div className="space-y-5 rounded-lg border border-border bg-secondary/30 p-5">
          <NumberField label="Blended annual fee per HS player" hint="Include all fees — seasonal, monthly, tournament, and any other recurring charges" value={form.mixed_annual_hs_fee} onChange={(v) => set("mixed_annual_hs_fee", v)} min={0} currency />
          <NumberField label="Blended annual fee per Youth player" value={form.mixed_annual_youth_fee} onChange={(v) => set("mixed_annual_youth_fee", v)} min={0} currency />
        </div>
      )}
    </>
  );
}

// Compute the live revenue total preview (mirrors edge function dues logic)
function computeDuesPreview(form: Form): number {
  const hs = Number(form.hs_players) || 0;
  const youth = Number(form.youth_players) || 0;
  const isYearRound = Array.isArray(form.seasons_offered) && form.seasons_offered.includes("Year-round");
  const model = isYearRound ? "Monthly Membership" : form.dues_model;

  if (model === "Per Season") {
    const n = (k: string) => Number(form[k]) || 0;
    return n("spring_youth_players") * n("spring_youth_fee")
      + n("summer_hs_players") * n("summer_hs_fee")
      + n("summer_youth_players") * n("summer_youth_fee")
      + n("fall_hs_players") * n("fall_hs_fee")
      + n("fall_youth_players") * n("fall_youth_fee");
  }
  if (model === "Monthly Membership") {
    const months = Number(form.avg_months_active) || 12;
    const mHs = Number(form.monthly_hs_fee) || 0;
    const mY = Number(form.monthly_youth_fee) || 0;
    let tHs = 0, tY = 0;
    if (form.tournament_fee_structure === "Standard fee per tournament") {
      const fee = Number(form.tournament_fee_per_player) || 0;
      const mp: Record<string, number> = { "1–2":1.5,"1-2":1.5,"3–4":3.5,"3-4":3.5,"5–6":5.5,"5-6":5.5,"7–8":7.5,"7-8":7.5,"8+":9 };
      tHs = (mp[form.tournaments_per_hs_player] ?? 0) * fee;
      tY = (mp[form.tournaments_per_youth_player] ?? 0) * fee;
    } else if (form.tournament_fee_structure === "À la carte — players register and pay per event") {
      tHs = Number(form.alacarte_annual_hs_spend) || 0;
      tY = Number(form.alacarte_annual_youth_spend) || 0;
    }
    return hs * (mHs * months + tHs) + youth * (mY * months + tY);
  }
  if (model === "Flat Annual Fee") {
    return hs * (Number(form.flat_annual_hs_fee) || 0) + youth * (Number(form.flat_annual_youth_fee) || 0);
  }
  if (model === "Mixed") {
    return hs * (Number(form.mixed_annual_hs_fee) || 0) + youth * (Number(form.mixed_annual_youth_fee) || 0);
  }
  return 0;
}

function LiveRevenueTotal({ form, isFacility }: { form: Form; isFacility: boolean }) {
  const dues = computeDuesPreview(form);
  const sponsor = Number(form.total_sponsorship_revenue) || 0;
  const eventsList = ["tournaments_revenue","camps_revenue","clinics_revenue","showcase_revenue","recruiting_events_revenue","data_days_revenue","tryouts_revenue","other_events_revenue"];
  const events = eventsList.reduce((s, k) => s + (Number(form[k]) || 0), 0);
  const lessons = Number(form.lessons_revenue_gross) || 0;
  const facility = isFacility ? Number(form.annual_facility_rental_revenue) || 0 : 0;
  const other = Number(form.other_addon_revenue) || 0;
  const total = dues + sponsor + events + lessons + facility + other;

  const Row = ({ label, value, show = true }: { label: string; value: number; show?: boolean }) =>
    show ? (
      <div className="flex justify-between text-sm tabular-nums">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatCurrency(value)}</span>
      </div>
    ) : null;

  return (
    <div className="sticky bottom-4 rounded-lg border-2 border-accent bg-background shadow-lg p-5 space-y-2">
      <p className="curve-eyebrow mb-2">Your calculated total revenue</p>
      <Row label="Dues" value={dues} show={dues > 0} />
      <Row label="Sponsorship" value={sponsor} show={sponsor > 0 || form.total_sponsorship_revenue !== ""} />
      <Row label="Events" value={events} show={events > 0} />
      <Row label="Lessons" value={lessons} show={lessons > 0} />
      <Row label="Facility Rental" value={facility} show={isFacility} />
      <Row label="Other" value={other} show={other > 0} />
      <div className="border-t border-border pt-2 mt-2 flex justify-between font-display font-semibold tabular-nums">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}


function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }).map((_, i) => {
        const completed = i < step;
        const current = i === step;
        return (
          <div key={i} className="flex flex-col gap-2">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                completed && "bg-accent",
                current && "bg-accent",
                !completed && !current && "bg-secondary",
              )}
            />
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-wider truncate",
                current ? "text-foreground" : completed ? "text-accent" : "text-muted-foreground",
              )}
            >
              {SECTION_TITLES[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Intake() {
  const { profile } = useAuth();
  const { mark } = useOnboarding();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { mark("intake_started_at"); }, [mark]);

  useEffect(() => {
    (async () => {
      if (!profile?.org_id) { setLoading(false); return; }
      const { data: org } = await supabase.from("organizations").select("*").eq("id", profile.org_id).maybeSingle();
      const { data: existing } = await supabase.from("organization_intake").select("*").eq("org_id", profile.org_id).maybeSingle();
      if (existing) {
        setForm({ ...empty, ...existing });
      } else if (org) {
        setForm((f) => ({
          ...f,
          organization_name: org.name ?? "",
          primary_contact_name: org.contact_name ?? "",
          email: org.email ?? "",
          phone: org.phone ?? "",
          city_state: org.city_state ?? "",
          org_type: org.org_type ?? "",
        }));
      }
      setLoading(false);
    })();
  }, [profile?.org_id]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const isFacility = form.org_type === "Facility + Teams" || form.org_type === "Facility Only";
  const runsEvents = form.runs_own_events === "Yes";

  const submit = async () => {
    if (!profile?.org_id) { toast.error("No organization linked to your account."); return; }
    setSubmitting(true);
    try {
      const payload: Form = {};
      Object.keys(form).forEach((k) => {
        const v = form[k];
        payload[k] = v === "" ? null : v;
      });

      const { data, error } = await supabase.functions.invoke("calc-metrics", {
        body: { org_id: profile.org_id, intake: payload },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Calculation failed");

      await mark("intake_completed_at");
      toast.success("Assessment submitted");
      navigate("/report");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </AppShell>
    );
  }

  const totalSteps = SECTION_TITLES.length;
  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelectorAll("main, [data-scroll-container]").forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
  };
  const goNext = () => {
    setStep((s) => Math.min(totalSteps - 1, s + 1));
    scrollTop();
  };
  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    scrollTop();
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-16">
        {/* Progress */}
        <div className="mb-10">
          <p className="curve-eyebrow mb-3">Revenue Assessment · Section {step + 1} of {totalSteps}</p>
          <StepBar step={step} total={totalSteps} />
        </div>

        {/* Section header */}
        <div className="mb-10">
          <h1 className="font-display text-4xl font-semibold tracking-tight mb-3">{SECTION_TITLES[step]}</h1>
          <p className="text-base text-muted-foreground leading-relaxed">{SECTION_DESCRIPTIONS[step]}</p>
        </div>

        {/* Form */}
        <div className="space-y-8">
          {step === 0 && (
            <>
              <SubsectionHeading title="Contact & location" />
              <TextField label="Organization Name" value={form.organization_name} onChange={(v) => set("organization_name", v)} required />
              <TextField label="Primary Contact Name" value={form.primary_contact_name} onChange={(v) => set("primary_contact_name", v)} />
              <TextField label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
              <TextField label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
              <TextField label="City / State" value={form.city_state} onChange={(v) => set("city_state", v)} />

              <div className="pt-4">
                <SubsectionHeading title="Market & organization" />
              </div>
              <SelectField label="How would you describe your local market?" value={form.market_type} onChange={(v) => set("market_type", v)} options={MARKET_TYPES} />
              <SelectField label="Organization Type" value={form.org_type} onChange={(v) => set("org_type", v)} options={ORG_TYPES} />
              <SelectField label="Years in Operation" value={form.years_in_operation} onChange={(v) => set("years_in_operation", v)} options={YEARS_OPTIONS} />
              <SelectField label="Current Growth Trend" value={form.current_growth_trend} onChange={(v) => set("current_growth_trend", v)} options={GROWTH_TRENDS} />
              <SelectField label="Player Mix" value={form.player_mix} onChange={(v) => set("player_mix", v)} options={PLAYER_MIX} />
              <SelectField label="Local Market Competition" value={form.local_market_competition} onChange={(v) => set("local_market_competition", v)} options={COMPETITION} />
              <SelectField label="Organization Focus" value={form.organization_focus} onChange={(v) => set("organization_focus", v)} options={ORG_FOCUS} />
              <SelectField label="Market Strategy" value={form.market_strategy} onChange={(v) => set("market_strategy", v)} options={MARKET_STRATEGY} />
            </>
          )}

          {step === 1 && (
            <>
              <SubsectionHeading title="Player & team counts" />
              <div>
                <NumberField
                  label="Total Players"
                  value={form.total_players}
                  onChange={(v) => set("total_players", v)}
                  min={0}
                />
                <div className="mt-2 rounded-md border-l-2 border-accent bg-accent-soft/40 px-3 py-2 text-xs text-foreground">
                  <span className="font-semibold">Important:</span> this number must be as accurate as possible. Many of your assessment calculations — revenue per player, opportunity sizing, and benchmarks — depend directly on your organization size.
                </div>
              </div>
              <NumberField label="High School Players" value={form.hs_players} onChange={(v) => set("hs_players", v)} min={0} />
              <NumberField label="Youth Players (14U and below)" value={form.youth_players} onChange={(v) => set("youth_players", v)} min={0} />
              <NumberField label="Total Teams" value={form.total_teams} onChange={(v) => set("total_teams", v)} min={0} />
              <NumberField label="Average Roster Size" value={form.average_roster_size} onChange={(v) => set("average_roster_size", v)} min={0} />

              <div className="pt-4">
                <SubsectionHeading title="Structure & participation" />
              </div>
              <MultiCheckField label="Seasons Offered" values={form.seasons_offered} onChange={(v) => set("seasons_offered", v)} options={SEASONS} />
              <SelectField label="Team Structure" value={form.team_structure} onChange={(v) => set("team_structure", v)} options={TEAM_STRUCTURE} />
              <SelectField label="Typical Player Participation" value={form.typical_player_participation} onChange={(v) => set("typical_player_participation", v)} options={PLAYER_PARTICIPATION} />
              <SelectField label="Player Commitment Level" value={form.player_commitment_level} onChange={(v) => set("player_commitment_level", v)} options={COMMITMENT} />
              <SelectField label="Demand for Organization" value={form.demand_for_organization} onChange={(v) => set("demand_for_organization", v)} options={DEMAND} />
              <SelectField label="Player Selection Approach" value={form.player_selection_approach} onChange={(v) => set("player_selection_approach", v)} options={SELECTION} />
            </>
          )}

          {step === 2 && (
            <>
              <SubsectionHeading title="Dues & top-line revenue" />
              <DuesBlock form={form} set={set} />
              <MultiCheckField label="What is included in dues" values={form.dues_inclusions} onChange={(v) => set("dues_inclusions", v)} options={DUES_INCLUSIONS} />
              <SelectField label="Do you offer tiered or bundled packages" value={form.tiered_packages} onChange={(v) => set("tiered_packages", v)} options={TIERED} />
              <SelectField label="Where is your price point relative to your local market" value={form.price_point} onChange={(v) => set("price_point", v)} options={PRICE_POINT} />
              <SelectField label="Do you have a rough sense of your profit margin" value={form.knows_profit_margin} onChange={(v) => set("knows_profit_margin", v)} options={KNOWS_MARGIN} />
              {form.knows_profit_margin === "Yes" && (
                <SelectField label="Estimated profit margin range" value={form.profit_margin_range} onChange={(v) => set("profit_margin_range", v)} options={MARGIN_RANGES} />
              )}

              <div className="pt-4">
                <SubsectionHeading title="Sponsorships" />
              </div>
              <SelectField label="Do you actively seek sponsorships" value={form.seeks_sponsorships} onChange={(v) => set("seeks_sponsorships", v)} options={SPONSORSHIPS} />
              <NumberField label="Number of Sponsors" value={form.number_of_sponsors} onChange={(v) => set("number_of_sponsors", v)} min={0} />
              <NumberField label="Total Sponsorship Revenue" value={form.total_sponsorship_revenue} onChange={(v) => set("total_sponsorship_revenue", v)} min={0} currency />

              <div className="pt-4">
                <SubsectionHeading title="Apparel & Gear" />
                <p className="text-sm text-muted-foreground mt-2">Help us understand how your organization handles uniforms, hard goods, and add-on gear.</p>
              </div>
              <TextField
                label="Who is your primary uniform and apparel vendor?"
                value={form.uniform_vendor}
                onChange={(v) => set("uniform_vendor", v)}
                hint="e.g. Marucci, Wilson, BSN, Augusta"
              />
              <SelectField
                label="Estimated uniform package cost per player"
                value={form.uniform_package_cost}
                onChange={(v) => set("uniform_package_cost", v)}
                options={UNIFORM_PACKAGE_COST}
              />
              <SelectField
                label="Current markup on uniform package"
                value={form.uniform_markup}
                onChange={(v) => set("uniform_markup", v)}
                options={UNIFORM_MARKUP}
              />
              <SelectField
                label="Do players purchase hard goods through your organization?"
                value={form.hard_goods_purchased}
                onChange={(v) => set("hard_goods_purchased", v)}
                options={HARD_GOODS_PURCHASED}
                hint="Hard goods include bats, helmets, bags, gloves, and accessories"
              />
              {form.hard_goods_purchased && form.hard_goods_purchased !== "No" && (
                <>
                  <SelectField
                    label="Estimated hard goods spend per player annually through your org"
                    value={form.hard_goods_spend}
                    onChange={(v) => set("hard_goods_spend", v)}
                    options={HARD_GOODS_SPEND}
                  />
                  <SelectField
                    label="Current markup on hard goods"
                    value={form.hard_goods_markup}
                    onChange={(v) => set("hard_goods_markup", v)}
                    options={HARD_GOODS_MARKUP}
                  />
                </>
              )}
              <SelectField
                label="Do you have an active team store or add-on catalog beyond the required uniform?"
                value={form.team_store_status}
                onChange={(v) => set("team_store_status", v)}
                options={TEAM_STORE_STATUS}
              />
              {form.team_store_status && form.team_store_status !== "No" && (
                <SelectField
                  label="Estimated add-on soft goods spend per player annually through your org"
                  value={form.addon_soft_goods_spend}
                  onChange={(v) => set("addon_soft_goods_spend", v)}
                  options={ADDON_SOFT_GOODS_SPEND}
                />
              )}

              <div className="pt-4">
                <SubsectionHeading title="Events & Programs" />
              </div>
              <MultiCheckField
                label="Which of the following does your organization run?"
                values={form.event_types_offered}
                onChange={(v) => set("event_types_offered", v)}
                options={EVENT_TYPES}
              />
              {form.event_types_offered?.includes("Tournaments we host") && (
                <NumberField label="Tournaments Annual Revenue" value={form.tournaments_revenue} onChange={(v) => set("tournaments_revenue", v)} min={0} currency />
              )}
              {form.event_types_offered?.includes("Camps") && (
                <NumberField label="Camps Annual Revenue" value={form.camps_revenue} onChange={(v) => set("camps_revenue", v)} min={0} currency />
              )}
              {form.event_types_offered?.includes("Clinics") && (
                <NumberField label="Clinics Annual Revenue" value={form.clinics_revenue} onChange={(v) => set("clinics_revenue", v)} min={0} currency />
              )}
              {form.event_types_offered?.includes("Showcases") && (
                <NumberField label="Showcases Annual Revenue" value={form.showcase_revenue} onChange={(v) => set("showcase_revenue", v)} min={0} currency />
              )}
              {form.event_types_offered?.includes("Recruiting Events") && (
                <NumberField label="Recruiting Events Annual Revenue" value={form.recruiting_events_revenue} onChange={(v) => set("recruiting_events_revenue", v)} min={0} currency />
              )}
              {form.event_types_offered?.includes("Data Days") && (
                <NumberField label="Data Days Annual Revenue" value={form.data_days_revenue} onChange={(v) => set("data_days_revenue", v)} min={0} currency />
              )}
              {form.event_types_offered?.includes("Other Events") && (
                <NumberField label="Other Events Annual Revenue" value={form.other_events_revenue} onChange={(v) => set("other_events_revenue", v)} min={0} currency />
              )}
              <NumberField label="Total Events per Year across all types" value={form.events_per_year} onChange={(v) => set("events_per_year", v)} min={0} />
              <NumberField label="Other Add-On Revenue" value={form.other_addon_revenue} onChange={(v) => set("other_addon_revenue", v)} min={0} currency />

              {form.org_type === "Travel Teams Only" && (
                <>
                  <div className="pt-4">
                    <SubsectionHeading title="Lessons & Individual Training" />
                    <p className="text-sm text-muted-foreground mt-2">Individual or small group instruction outside of team practice.</p>
                  </div>
                  <NumberField
                    label="Lessons and Individual Training Revenue"
                    value={form.lessons_revenue_gross}
                    onChange={(v) => { set("lessons_revenue_gross", v); set("lessons_revenue", v); }}
                    min={0}
                    currency
                  />
                  <SelectField
                    label="Does your organization capture this revenue directly?"
                    value={form.lessons_revenue_model}
                    onChange={(v) => set("lessons_revenue_model", v)}
                    options={LESSONS_CAPTURE_MODEL}
                  />
                  {form.lessons_revenue_model === "Mixed — we capture some" && (
                    <NumberField
                      label="What percentage does the organization capture?"
                      value={form.lessons_capture_pct}
                      onChange={(v) => set("lessons_capture_pct", v)}
                      min={0}
                      hint="0–100"
                    />
                  )}
                </>
              )}

              {isFacility && (
                <>
                  <div className="pt-4">
                    <SubsectionHeading title="Facility Revenue" />
                    <p className="text-sm text-muted-foreground mt-2">Revenue generated from your facility outside of your own team programming and lessons.</p>
                  </div>
                  <NumberField
                    label="Annual Facility Rental Revenue"
                    value={form.annual_facility_rental_revenue}
                    onChange={(v) => { set("annual_facility_rental_revenue", v); set("facility_rental_revenue", v); }}
                    min={0}
                    currency
                    hint="Include third party rentals, open facility time, and outside organizations using your space."
                  />
                </>
              )}

              <div className="pt-6">
                <LiveRevenueTotal form={form} isFacility={isFacility} />
              </div>

              <div className="pt-4">
                <PillSelectField
                  label="Does this total look like an accurate picture of your organization's annual revenue?"
                  value={form.revenue_verification}
                  onChange={(v) => set("revenue_verification", v)}
                  options={REVENUE_VERIFICATION}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <SubsectionHeading title="Player retention" />
              <NumberField label="Estimated Retention Percentage (0–100)" value={form.retention_pct} onChange={(v) => set("retention_pct", v)} min={0} />
              <NumberField label="Average years a player stays with your organization" value={form.avg_player_years} onChange={(v) => set("avg_player_years", v)} min={0} />
            </>
          )}

          {step === 4 && (
            <>
              <SubsectionHeading title="How you operate" />
              <SelectField label="Operational Structure" value={form.operational_structure} onChange={(v) => set("operational_structure", v)} options={OPS_STRUCTURE} />
              <MultiCheckField label="Parent Communication approach" values={form.parent_communication} onChange={(v) => set("parent_communication", v)} options={PARENT_COMMS} />
              <SelectField label="How Aligned are your Coaches to the Revenue Goals of the Company" value={form.coach_alignment} onChange={(v) => set("coach_alignment", v)} options={COACH_ALIGNMENT} />
              <SelectField label="Player Development Structure" value={form.coaching_structure} onChange={(v) => set("coaching_structure", v)} options={COACHING_STRUCTURE} />
              <SelectField label="Pricing Approach" value={form.pricing_approach} onChange={(v) => set("pricing_approach", v)} options={PRICING_APPROACH} />
              <SelectField label="Sponsorship Approach" value={form.sponsorship_approach} onChange={(v) => set("sponsorship_approach", v)} options={SPONSORSHIP_APPROACH} />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-12 space-y-3">
          {step < totalSteps - 1 ? (
            <Button
              onClick={goNext}
              className="w-full h-14 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Continue to {SECTION_TITLES[step + 1]}
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={submitting}
              className="w-full h-14 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {submitting ? "Submitting…" : "Submit assessment"}
            </Button>
          )}
          {step > 0 && (
            <Button
              variant="ghost"
              onClick={goBack}
              className="w-full h-12 text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to previous section
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
