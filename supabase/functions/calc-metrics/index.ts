// Curve OS Revenue Assessment — server-side calculation engine
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const num = (v: any) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const MARKET_MULTIPLIERS: Record<string, number> = {
  "Rural": 0.7,
  "Suburban": 1.0,
  "Mid-size Metro": 1.15,
  "Major Metro": 1.45,
  "High-income Suburban": 1.6,
};

const APPAREL_MARGIN: Record<string, number> = {
  "Strong 30%+": 0.30,
  "Moderate 15-30%": 0.22,
  "Moderate 15–30%": 0.22,
  "Minimal under 15%": 0.12,
  "Not Sure": 0.20,
};

const NEXT_STEPS: Record<string, string[]> = {
  Pricing: [
    "Audit your current fee structure against the top 3 competitors in your market.",
    "Build a tiered package option that bundles high-value services at a premium price point.",
    "Define a clear pricing strategy document that all staff can reference and communicate.",
  ],
  Sponsorship: [
    "Identify 10–15 local businesses with natural alignment to youth sports and families.",
    "Build a sponsorship package with three tiers: presenting, supporting, and community.",
    "Assign one person as the sponsorship point of contact and set a 30-day outreach goal.",
  ],
  Apparel: [
    "Audit your current apparel process and calculate your actual margin per player.",
    "Explore moving to an in-house or direct vendor model to capture full margin.",
    "Create a required gear package bundled into registration to guarantee baseline revenue.",
  ],
  Events: [
    "Identify one showcase or tournament format you can own and run annually.",
    "Build a simple event P&L template to understand your true revenue per event.",
    "Survey current families on interest in a showcase or recruiting-focused event.",
  ],
  "Add-Ons": [
    "Survey current families on interest in private lessons, small group training, and camps.",
    "Launch one structured off-season camp as a low-risk test of add-on demand.",
    "Create a simple program menu families can reference year-round.",
  ],
  Retention: [
    "Implement a weekly communication standard for all coaches immediately.",
    "Build a formal re-enrollment process with early commitment incentives.",
    "Conduct brief exit interviews with any family that does not re-enroll this cycle.",
  ],
  Facility: [
    "Build a structured private instruction program that runs through your organization rather than through individual coaches independently.",
    "Audit your current facility schedule and identify unused blocks — mornings, weekday afternoons, and off-season windows are typically the highest opportunity.",
    "Build a rental rate card for cage time, field time, and full facility use and begin outreach to local high schools, rec leagues, and other travel clubs.",
  ],
};

function formatCurrency(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function calculate(intake: any) {
  const total_players = Math.max(num(intake.total_players), 1);
  const hs_players = num(intake.hs_players);
  const youth_players = num(intake.youth_players);
  const total_revenue = num(intake.total_annual_revenue);
  const hs_fee = num(intake.avg_hs_player_fee);
  const youth_fee = num(intake.avg_youth_player_fee);
  const sponsors = num(intake.number_of_sponsors);
  const sponsor_rev = num(intake.total_sponsorship_revenue);
  const apparel_rev = num(intake.apparel_revenue);
  const events_per_year = num(intake.events_per_year);
  const camps = num(intake.camps_revenue);
  const clinics = num(intake.clinics_revenue);
  const showcase = num(intake.showcase_revenue);
  const tournaments = num(intake.tournaments_revenue);
  const recruiting_events = num(intake.recruiting_events_revenue);
  const data_days = num(intake.data_days_revenue);
  const other_events = num(intake.other_events_revenue);
  const other_addon = num(intake.other_addon_revenue);
  const retention_pct = num(intake.retention_pct);
  const avg_years = num(intake.avg_player_years);

  const orgType = intake.org_type;
  const isFacility = orgType === "Facility + Teams" || orgType === "Facility Only";

  // Event types
  const event_types: string[] = Array.isArray(intake.event_types_offered) ? intake.event_types_offered : [];
  const runs_events = event_types.length > 0;
  const event_revenue_total = runs_events
    ? tournaments + camps + clinics + showcase + recruiting_events + data_days + other_events
    : 0;
  const revenue_per_event = events_per_year > 0 && runs_events ? event_revenue_total / events_per_year : 0;

  // Lessons revenue
  const lessons_revenue_gross = num(intake.lessons_revenue_gross ?? intake.lessons_revenue);
  let lessons_revenue_model: string;
  if (isFacility) {
    lessons_revenue_model = "org";
  } else {
    const m = intake.lessons_revenue_model;
    if (m === "We capture it directly") lessons_revenue_model = "org";
    else if (m === "It goes to individual coaches") lessons_revenue_model = "coaches";
    else if (m === "Mixed — we capture some" || m === "Mixed - we capture some" || m === "mixed") lessons_revenue_model = "mixed";
    else lessons_revenue_model = "org";
  }
  let lessons_revenue_org = 0;
  if (lessons_revenue_model === "org") lessons_revenue_org = lessons_revenue_gross;
  else if (lessons_revenue_model === "coaches") lessons_revenue_org = 0;
  else if (lessons_revenue_model === "mixed") lessons_revenue_org = lessons_revenue_gross * (num(intake.lessons_capture_pct) / 100);

  const facility_rev = isFacility ? num(intake.annual_facility_rental_revenue ?? intake.facility_rental_revenue) : 0;

  // Step 1
  const market_multiplier = MARKET_MULTIPLIERS[intake.market_type] ?? 1.0;

  // Step 2
  let revenue_benchmark: number;
  if (orgType === "Facility + Teams") revenue_benchmark = 10000;
  else if (hs_players / total_players >= 0.6) revenue_benchmark = 8000;
  else revenue_benchmark = 5000;

  // Step 3
  const revenue_per_player = total_revenue / total_players;
  const hs_player_pct = hs_players / total_players;
  const dues_revenue = hs_players * hs_fee + youth_players * youth_fee;
  const non_dues_revenue = total_revenue - dues_revenue;
  const non_dues_revenue_per_player = non_dues_revenue / total_players;
  const dues_revenue_pct = total_revenue > 0 ? dues_revenue / total_revenue : 0;
  const sponsorship_revenue_per_sponsor = sponsors > 0 ? sponsor_rev / sponsors : 0;
  const add_on_revenue = camps + clinics + lessons_revenue_org + showcase + other_addon;
  const add_on_revenue_per_player = add_on_revenue / total_players;
  const estimated_returning_players = total_players * (retention_pct / 100);
  const estimated_churned_players = total_players - estimated_returning_players;
  const revenue_gap = Math.max(0, revenue_benchmark - revenue_per_player);
  const at_benchmark = revenue_per_player >= revenue_benchmark;
  const apparel_margin_pct = APPAREL_MARGIN[intake.apparel_margin] ?? 0.20;
  const apparel_profit = apparel_rev * apparel_margin_pct;
  const apparel_revenue_per_player = apparel_rev / total_players;
  const facility_revenue_pct =
    isFacility && total_revenue > 0 ? facility_rev / total_revenue : null;

  // Step 4 — opportunities
  const pricing_opportunity_low = Math.max(0, (revenue_benchmark - revenue_per_player) * total_players * 0.5);
  const pricing_opportunity_high = Math.max(0, (revenue_benchmark - revenue_per_player) * total_players * 0.9);
  const sponsorship_opportunity_low =
    (sponsors === 0 ? 10000 : Math.max(7500, sponsors * 1500)) * market_multiplier;
  const sponsorship_opportunity_high =
    (sponsors === 0 ? 30000 : Math.max(25000, sponsors * 5000)) * market_multiplier;
  const apparel_opportunity_low = total_players * 75;
  const apparel_opportunity_high = total_players * 200;

  // New event opportunity
  const event_revenue_mature_low = total_players * 150;
  const event_revenue_mature_high = total_players * 400;
  const event_opportunity_low = Math.max(0, event_revenue_mature_low - event_revenue_total);
  const event_opportunity_high = Math.max(0, event_revenue_mature_high - event_revenue_total);

  const addon_opportunity_low = total_players * 150;
  const addon_opportunity_high = total_players * 500;
  const retention_opportunity_low = (total_players * 0.03) * revenue_per_player;
  const retention_opportunity_high = (total_players * 0.08) * revenue_per_player;

  // Facility opportunity
  let facility_revenue_benchmark: number | null = null;
  let facility_revenue_gap: number | null = null;
  let facility_at_benchmark: boolean | null = null;
  let facility_opportunity_low = 0;
  let facility_opportunity_high = 0;
  if (isFacility) {
    facility_revenue_benchmark = total_players * 1200;
    facility_revenue_gap = Math.max(0, facility_revenue_benchmark - facility_rev);
    facility_at_benchmark = facility_rev >= facility_revenue_benchmark;
    facility_opportunity_low = facility_revenue_gap * 0.4;
    facility_opportunity_high = facility_revenue_gap * 0.8;
  }

  const total_opportunity_low =
    pricing_opportunity_low + sponsorship_opportunity_low + apparel_opportunity_low +
    event_opportunity_low + addon_opportunity_low + retention_opportunity_low + facility_opportunity_low;
  const total_opportunity_high =
    pricing_opportunity_high + sponsorship_opportunity_high + apparel_opportunity_high +
    event_opportunity_high + addon_opportunity_high + retention_opportunity_high + facility_opportunity_high;

  // Step 5 — scores
  let pricing = 5;
  if (intake.tiered_packages === "Yes") pricing += 2;
  if (intake.tiered_packages === "Somewhat") pricing += 1;
  if (intake.price_point === "Above Market") pricing += 2;
  if (intake.price_point === "Below Market") pricing -= 2;
  if (revenue_per_player > 4000) pricing += 1;
  if (revenue_per_player > 6000) pricing += 2;
  if (revenue_per_player < 1500) pricing -= 1;
  if (intake.pricing_approach === "Structured") pricing += 1;
  if (intake.pricing_approach === "Not defined") pricing -= 1;
  if (intake.profit_margin_range === "20-30%" || intake.profit_margin_range === "20–30%") pricing += 1;
  if (intake.profit_margin_range === "30%+") pricing += 2;
  if (intake.knows_profit_margin === "Yes" && intake.profit_margin_range === "Under 10%") pricing -= 1;
  const pricing_score = clamp(pricing, 1, 10);

  let sponsorship = 3;
  if (intake.sponsorship_approach === "Structured") sponsorship += 2;
  if (intake.sponsorship_approach === "Somewhat") sponsorship += 1;
  sponsorship += Math.min(3, Math.floor(sponsors / 3));
  if (sponsorship_revenue_per_sponsor > 3000) sponsorship += 2;
  if (sponsorship_revenue_per_sponsor > 1500) sponsorship += 1;
  if (intake.seeks_sponsorships === "No") sponsorship -= 1;
  const sponsorship_score = clamp(sponsorship, 1, 10);

  let apparel = 3;
  if (intake.apparel_model === "Fully controlled in-house") apparel += 3;
  if (intake.apparel_model === "Outsourced with markup") apparel += 1;
  if (apparel_revenue_per_player > 150) apparel += 2;
  if (apparel_revenue_per_player > 75) apparel += 1;
  if (intake.apparel_model === "Minimal") apparel -= 1;
  const apparel_score = clamp(apparel, 1, 10);

  let event = 2;
  if (runs_events) {
    if (events_per_year >= 3) event += 2;
    if (events_per_year >= 6) event += 2;
    if (revenue_per_event > 2000) event += 2;
    if (revenue_per_event > 1000) event += 1;
  } else {
    event -= 1;
  }
  const event_score = clamp(event, 1, 10);

  let addon = 2;
  if (add_on_revenue_per_player > 200) addon += 2;
  if (add_on_revenue_per_player > 500) addon += 2;
  if (camps >= 500) addon += 1;
  if (clinics >= 500) addon += 1;
  if (lessons_revenue_org >= 500) addon += 1;
  if (showcase >= 500) addon += 1;
  const addon_score = clamp(addon, 1, 10);

  let retention = 3;
  if (retention_pct >= 85) retention += 2;
  if (retention_pct >= 75) retention += 1;
  if (retention_pct < 60) retention -= 1;
  if (retention_pct < 45) retention -= 2;
  if (avg_years >= 3) retention += 2;
  if (avg_years >= 2) retention += 1;
  const pc = intake.parent_communication ?? [];
  if (Array.isArray(pc) && pc.includes("Standardized") && pc.includes("Proactive")) retention += 1;
  if (intake.operational_structure === "Clear systems") retention += 1;
  const retention_score = clamp(retention, 1, 10);

  // Facility score
  let facility_score: number | null = null;
  if (isFacility && facility_revenue_benchmark !== null) {
    let f = 3;
    if (facility_rev >= facility_revenue_benchmark) f += 2;
    if (facility_rev >= facility_revenue_benchmark * 0.5) f += 1;
    if (facility_revenue_pct !== null && facility_revenue_pct > 0.20) f += 2;
    if (facility_revenue_pct !== null && facility_revenue_pct > 0.10) f += 1;
    if (lessons_revenue_org > total_players * 200) f += 1;
    if (facility_rev === 0) f -= 2;
    facility_score = clamp(f, 1, 10);
  }

  // Step 6
  const total_engine_score =
    pricing_score + sponsorship_score + apparel_score + event_score + addon_score + retention_score +
    (facility_score ?? 0);

  let monetization_tier: string;
  if (total_engine_score <= 20) monetization_tier = "Foundational";
  else if (total_engine_score <= 32) monetization_tier = "Emerging";
  else if (total_engine_score <= 44) monetization_tier = "Growth";
  else if (total_engine_score <= 52) monetization_tier = "Advanced";
  else monetization_tier = "Elite";

  // priority engine — tiebreak order
  const order = ["Sponsorship", "Pricing", "Retention", "Add-Ons", "Events", "Apparel"];
  const scoreMap: Record<string, number> = {
    Pricing: pricing_score,
    Sponsorship: sponsorship_score,
    Apparel: apparel_score,
    Events: event_score,
    "Add-Ons": addon_score,
    Retention: retention_score,
  };
  if (facility_score !== null) {
    order.push("Facility");
    scoreMap["Facility"] = facility_score;
  }
  let minScore = 11;
  let priority_engine = order[0];
  for (const k of order) {
    if (scoreMap[k] < minScore) {
      minScore = scoreMap[k];
      priority_engine = k;
    }
  }

  // Step 7
  const high_dues_concentration = dues_revenue_pct > 0.85;
  const high_sponsorship_dependency = total_revenue > 0 && sponsor_rev / total_revenue > 0.30;

  // Step 8 — diagnosis
  let diagnosis: string;
  if (total_engine_score <= 20) {
    diagnosis = "Your organization has significant untapped revenue across every major area. The good news — this means the opportunity ahead is substantial. The priority is building foundational systems in pricing, sponsorships, and retention before expanding into events and add-ons.";
  } else if (sponsorship_score <= 3 && total_engine_score <= 35) {
    diagnosis = `Your core program is solid, but sponsorship revenue is nearly absent. Organizations your size in your market typically generate ${formatCurrency(sponsorship_opportunity_low)}–${formatCurrency(sponsorship_opportunity_high)} annually from local business partnerships. This is your clearest and fastest path to meaningful revenue growth.`;
  } else if (pricing_score <= 4 && revenue_per_player < revenue_benchmark) {
    diagnosis = "Pricing is the primary drag on your revenue per player. Your current structure is leaving money on the table relative to what your market and program quality can support. A structured pricing and packaging strategy is the highest-leverage first move.";
  } else if (retention_score <= 4) {
    diagnosis = "Retention is the multiplier on everything else you build. With a retention rate below average, every dollar you invest in new player acquisition is partially offset by churn. Strengthening the family experience and re-enrollment systems should be the first priority.";
  } else if (addon_score <= 3 && pricing_score >= 6 && sponsorship_score >= 5) {
    diagnosis = `Your core revenue engines are performing well. The primary gap is in add-on programming — camps, clinics, lessons, and showcases — where organizations your size typically capture an additional ${formatCurrency(addon_opportunity_low)}–${formatCurrency(addon_opportunity_high)} annually.`;
  } else if (total_engine_score >= 45) {
    diagnosis = "You're operating at a high level across most revenue categories. The focus at this stage is optimization and expansion — tightening the engines that score below 8 and layering in more sophisticated monetization strategies.";
  } else {
    diagnosis = "Your organization shows strength in some areas and clear opportunity in others. The priority engines below represent the fastest path to meaningful revenue growth based on your current structure and market.";
  }

  if (pricing_score <= 4 && intake.knows_profit_margin === "Yes" && intake.profit_margin_range === "Under 10%") {
    diagnosis += " Note: your reported margin suggests pricing pressure that compounds the revenue per player gap.";
  }
  if (high_dues_concentration) {
    diagnosis += " Note: over 85% of your revenue currently comes from player fees. Diversifying into sponsorships, apparel, and programming will reduce your exposure to enrollment volatility.";
  }
  if (high_sponsorship_dependency) {
    diagnosis += " Note: sponsorships represent a significant share of your total revenue. Ensuring those relationships are on multi-year agreements with renewal processes in place will protect this revenue base.";
  }

  const next_steps = NEXT_STEPS[priority_engine] ?? NEXT_STEPS["Pricing"];

  return {
    market_multiplier, revenue_benchmark, revenue_per_player, hs_player_pct,
    dues_revenue, non_dues_revenue, non_dues_revenue_per_player, dues_revenue_pct,
    sponsorship_revenue_per_sponsor, add_on_revenue, add_on_revenue_per_player,
    revenue_per_event, estimated_returning_players, estimated_churned_players,
    revenue_gap, at_benchmark,
    apparel_margin_pct, apparel_profit, apparel_revenue_per_player, facility_revenue_pct,
    pricing_opportunity_low, pricing_opportunity_high,
    sponsorship_opportunity_low, sponsorship_opportunity_high,
    apparel_opportunity_low, apparel_opportunity_high,
    event_opportunity_low, event_opportunity_high,
    event_revenue_mature_low, event_revenue_mature_high,
    addon_opportunity_low, addon_opportunity_high,
    retention_opportunity_low, retention_opportunity_high,
    facility_revenue_benchmark, facility_revenue_gap, facility_at_benchmark,
    facility_opportunity_low, facility_opportunity_high, facility_score,
    lessons_revenue_org,
    total_opportunity_low, total_opportunity_high,
    pricing_score, sponsorship_score, apparel_score, event_score, addon_score, retention_score,
    total_engine_score, monetization_tier, priority_engine,
    high_dues_concentration, high_sponsorship_dependency,
    diagnosis_text: diagnosis,
    next_steps,
    calculated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { org_id, intake } = await req.json();
    if (!org_id || !intake) {
      return new Response(JSON.stringify({ error: "org_id and intake required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase.from("profiles").select("org_id").eq("user_id", userData.user.id).maybeSingle();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin && profile?.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Derive runs_own_events / total_event_revenue from event_types_offered
    const event_types: string[] = Array.isArray(intake.event_types_offered) ? intake.event_types_offered : [];
    const runs_own_events_str = event_types.length > 0 ? "Yes" : "No";
    const event_revenue_total = event_types.length > 0
      ? num(intake.tournaments_revenue) + num(intake.camps_revenue) + num(intake.clinics_revenue) +
        num(intake.showcase_revenue) + num(intake.recruiting_events_revenue) +
        num(intake.data_days_revenue) + num(intake.other_events_revenue)
      : 0;

    // Mirror lessons_revenue_gross into legacy lessons_revenue for backward compat
    const lessons_gross = intake.lessons_revenue_gross ?? intake.lessons_revenue ?? null;

    const intakeRow = {
      ...intake,
      org_id,
      runs_own_events: runs_own_events_str,
      total_event_revenue: event_revenue_total,
      lessons_revenue: lessons_gross,
      lessons_revenue_gross: lessons_gross,
    };
    const { error: intakeErr } = await supabase
      .from("organization_intake")
      .upsert(intakeRow, { onConflict: "org_id" });
    if (intakeErr) throw intakeErr;

    const metrics = calculate(intakeRow);

    const { error: metErr } = await supabase
      .from("derived_metrics")
      .upsert({ org_id, ...metrics }, { onConflict: "org_id" });
    if (metErr) throw metErr;

    return new Response(JSON.stringify({ ok: true, metrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("calc-metrics error", e);
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
