import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { org_id } = await req.json();
    if (!org_id) {
      return new Response(JSON.stringify({ error: "org_id required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = Deno.env.get("AYRSHARE_API_KEY");
    const jwtKey = Deno.env.get("AYRSHARE_JWT_PRIVATE_KEY");

    // Fetch org for display title
    const { data: org } = await supabase
      .from("organizations").select("name").eq("id", org_id).maybeSingle();
    const title = org?.name ?? `Org ${org_id.slice(0, 8)}`;

    // Existing profile?
    let { data: profile } = await supabase
      .from("org_ayrshare_profiles").select("*").eq("org_id", org_id).maybeSingle();

    // STUB MODE — no API key
    if (!apiKey) {
      if (!profile) {
        const { data: created } = await supabase.from("org_ayrshare_profiles").insert({
          org_id,
          ayrshare_profile_key: `mock_${crypto.randomUUID()}`,
          ayrshare_ref_id: org_id,
          display_title: title,
        }).select().single();
        profile = created;
      }
      return new Response(JSON.stringify({
        url: `https://app.ayrshare.com/mock-connect?org=${org_id}`,
        mock: true, profile,
      }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    // LIVE MODE — create profile if missing
    if (!profile) {
      const r = await fetch("https://app.ayrshare.com/api/profiles", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ title, refId: org_id }),
      });
      if (!r.ok) throw new Error(`Ayrshare profile create failed: HTTP ${r.status} ${await r.text()}`);
      const j = await r.json();
      const { data: created, error } = await supabase.from("org_ayrshare_profiles").insert({
        org_id,
        ayrshare_profile_key: j.profileKey,
        ayrshare_ref_id: org_id,
        display_title: title,
      }).select().single();
      if (error) throw error;
      profile = created;
    }

    // Generate JWT-signed connection URL
    if (!jwtKey) {
      // Without JWT key, fall back to a generic Ayrshare connection URL.
      return new Response(JSON.stringify({
        url: `https://app.ayrshare.com/social-accounts?profileKey=${profile.ayrshare_profile_key}`,
        profile,
        warning: "AYRSHARE_JWT_PRIVATE_KEY not configured — using fallback connection URL",
      }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    const domain = new URL(req.url).hostname;
    const r2 = await fetch("https://app.ayrshare.com/api/profiles/generateJWT", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ domain, privateKey: jwtKey, profileKey: profile.ayrshare_profile_key }),
    });
    if (!r2.ok) throw new Error(`Ayrshare JWT generate failed: HTTP ${r2.status} ${await r2.text()}`);
    const j2 = await r2.json();
    return new Response(JSON.stringify({ url: j2.url, profile }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
