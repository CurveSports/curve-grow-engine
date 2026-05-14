import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Curve platform codes -> Ayrshare platform codes
const PLATFORM_MAP: Record<string, string> = {
  instagram: "instagram", facebook: "facebook", x: "twitter",
  twitter: "twitter", tiktok: "tiktok", linkedin: "linkedin", youtube: "youtube",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { post_id } = await req.json();
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: post, error } = await supabase
      .from("org_social_posts").select("*").eq("id", post_id).single();
    if (error || !post) throw new Error("post not found");

    const { data: account } = await supabase
      .from("org_social_accounts").select("provider").eq("id", post.social_account_id).single();

    const { data: profile } = await supabase
      .from("org_ayrshare_profiles").select("*").eq("org_id", post.org_id).maybeSingle();

    const apiKey = Deno.env.get("AYRSHARE_API_KEY");
    const platform = PLATFORM_MAP[account?.provider ?? "instagram"] ?? "instagram";

    // STUB MODE
    if (!apiKey || !profile || profile.is_mock) {
      const mockId = `mock_${crypto.randomUUID()}`;
      await supabase.from("org_social_posts").update({
        ayrshare_post_id: mockId,
        status: post.scheduled_for ? "scheduled" : "posted",
        posted_at: post.scheduled_for ? null : new Date().toISOString(),
      }).eq("id", post_id);
      console.log(`[stub] would post to ${platform} for org ${post.org_id}`);
      return new Response(JSON.stringify({ ok: true, mock: true, ayrshare_post_id: mockId }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const body: Record<string, unknown> = {
      post: post.body,
      platforms: [platform],
      profileKey: profile.ayrshare_profile_key,
    };
    if (post.media_urls?.length) body.mediaUrls = post.media_urls;
    if (post.scheduled_for) body.scheduleDate = post.scheduled_for;

    const r = await fetch("https://app.ayrshare.com/api/post", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) {
      await supabase.from("org_social_posts").update({
        status: "failed", error_message: j?.message ?? `HTTP ${r.status}`,
      }).eq("id", post_id);
      throw new Error(j?.message ?? `HTTP ${r.status}`);
    }

    const platformUrls: Record<string, string> = {};
    if (Array.isArray(j.postIds)) {
      for (const p of j.postIds) {
        if (p?.platform && p?.postUrl) platformUrls[p.platform] = p.postUrl;
      }
    }

    await supabase.from("org_social_posts").update({
      ayrshare_post_id: j.id ?? null,
      status: post.scheduled_for ? "scheduled" : "posted",
      posted_at: post.scheduled_for ? null : new Date().toISOString(),
      platform_urls: platformUrls,
    }).eq("id", post_id);

    return new Response(JSON.stringify({ ok: true, ayrshare_post_id: j.id, response: j }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
