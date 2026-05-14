// Generates a suggested brand voice for an org using website + socials + intake context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function fetchSiteText(url: string): Promise<string> {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CurveBrandBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // strip scripts/styles, then tags
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.slice(0, 6000);
  } catch (_e) {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { orgId } = await req.json();
    if (!orgId) {
      return new Response(JSON.stringify({ error: "orgId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [orgRes, presenceRes, intakeRes, kitRes] = await Promise.all([
      supabase.from("organizations").select("name, city_state, org_type").eq("id", orgId).maybeSingle(),
      supabase.from("org_digital_presence").select("*").eq("org_id", orgId).maybeSingle(),
      supabase.from("organization_intake").select("organization_focus, market_strategy, player_mix, demand_for_organization, parent_communication, coach_alignment").eq("org_id", orgId).maybeSingle(),
      supabase.from("org_brand_kits").select("tagline, hashtags").eq("org_id", orgId).maybeSingle(),
    ]);

    const org = orgRes.data ?? {};
    const presence = presenceRes.data ?? {};
    const intake = intakeRes.data ?? {};
    const kit = kitRes.data ?? {};

    const websiteText = presence.website_url ? await fetchSiteText(presence.website_url) : "";

    const socials = [
      presence.instagram_handle && `Instagram: @${String(presence.instagram_handle).replace(/^@/, "")}`,
      presence.facebook_url && `Facebook: ${presence.facebook_url}`,
      presence.tiktok_handle && `TikTok: @${String(presence.tiktok_handle).replace(/^@/, "")}`,
      presence.x_handle && `X: @${String(presence.x_handle).replace(/^@/, "")}`,
      presence.youtube_url && `YouTube: ${presence.youtube_url}`,
      presence.linkedin_url && `LinkedIn: ${presence.linkedin_url}`,
    ].filter(Boolean).join("\n");

    const prompt = `You are a brand strategist for youth/amateur sports organizations. Draft a concise, opinionated Brand Voice guide for the organization below.

# Organization
Name: ${org.name ?? "Unknown"}
Location: ${org.city_state ?? "—"}
Type: ${org.org_type ?? "—"}
Tagline: ${kit.tagline ?? "—"}
Player mix: ${intake.player_mix ?? "—"}
Focus: ${intake.organization_focus ?? "—"}
Market strategy: ${intake.market_strategy ?? "—"}
Demand: ${intake.demand_for_organization ?? "—"}
Parent communication: ${(intake.parent_communication ?? []).join?.(", ") ?? ""}
Coach alignment: ${intake.coach_alignment ?? "—"}

# Digital footprint
${socials || "(no handles provided)"}

# Website excerpt
${websiteText || "(website content unavailable)"}

# Output format (markdown, ~200-300 words total)
**Personality:** 3–5 adjectives.
**Tone:** 1–2 sentences describing how we sound.
**We sound like / We don't sound like:** two short bullet lists (3 each).
**Words & phrases to use:** 5–8 examples.
**Words & phrases to avoid:** 4–6 examples.
**Sample line (social caption):** one short on-brand caption.

Be specific to this org — reference their audience, region, or focus where useful. Avoid generic corporate speak.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You write punchy, specific brand voice guides for youth sports brands." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI gateway ${aiRes.status}: ${text}` }), {
        status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    const voice = aiJson.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ voice, usedWebsite: !!websiteText, socialsFound: !!socials }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
