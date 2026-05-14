import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const apiKey = Deno.env.get("AYRSHARE_API_KEY");

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await supabase
    .from("org_social_posts")
    .select("id, org_id, ayrshare_post_id, posted_at")
    .not("ayrshare_post_id", "is", null)
    .gte("posted_at", cutoff);

  let updated = 0;
  for (const p of posts ?? []) {
    const { data: profile } = await supabase
      .from("org_ayrshare_profiles").select("ayrshare_profile_key, is_mock").eq("org_id", p.org_id).maybeSingle();

    let metrics: Record<string, unknown>;
    if (!apiKey || !profile || profile.is_mock || (p.ayrshare_post_id ?? "").startsWith("mock_")) {
      metrics = { mock: true, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };
    } else {
      const r = await fetch("https://app.ayrshare.com/api/analytics/post", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ id: p.ayrshare_post_id, profileKey: profile.ayrshare_profile_key }),
      });
      if (!r.ok) { console.error(`metrics fetch failed for ${p.id}: HTTP ${r.status}`); continue; }
      metrics = await r.json();
    }

    await supabase.from("org_social_posts").update({
      engagement_data: metrics,
      last_metric_sync: new Date().toISOString(),
    }).eq("id", p.id);
    updated++;
  }

  return new Response(JSON.stringify({ ok: true, updated, total: posts?.length ?? 0 }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
