import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a sports-team marketing asset tagger. Look at the image and return JSON with:
- "tags": 5-10 short lowercase tags (one or two words each). Cover: setting (indoor/outdoor/field/court/gym), shot type (action/headshot/group/wide/closeup), people count (solo/group/crowd), mood (celebration/focus/intense/casual), and any visible context (uniform, equipment, scoreboard, banner).
- "alt_text": one sentence describing the image for accessibility.
- "suggested_title": 3-5 word descriptive title.
Return ONLY valid JSON, no prose.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { asset_id } = await req.json();
    if (!asset_id) {
      return new Response(JSON.stringify({ error: "asset_id required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: asset } = await supabase.from("org_brand_assets")
      .select("id, url, thumbnail_url, poster_url, media_type, alt_text, title")
      .eq("id", asset_id).single();
    if (!asset) throw new Error("asset not found");

    const imageUrl = asset.thumbnail_url || asset.poster_url || asset.url;
    if (!imageUrl) throw new Error("no image to analyze");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: [
            { type: "text", text: "Tag this asset." },
            { type: "image_url", image_url: { url: imageUrl } },
          ]},
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`AI gateway: HTTP ${r.status} ${t.slice(0, 200)}`);
    }
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: { tags?: string[]; alt_text?: string; suggested_title?: string } = {};
    try { parsed = JSON.parse(content); } catch { /* keep empty */ }

    const patch: Record<string, unknown> = {};
    if (Array.isArray(parsed.tags)) {
      patch.ai_tags = parsed.tags.map((t) => String(t).toLowerCase().slice(0, 40)).slice(0, 12);
    }
    if (parsed.alt_text && !asset.alt_text) patch.alt_text = parsed.alt_text;
    if (parsed.suggested_title && !asset.title) patch.title = parsed.suggested_title;

    if (Object.keys(patch).length) {
      await supabase.from("org_brand_assets").update(patch).eq("id", asset_id);
    }
    return new Response(JSON.stringify({ ok: true, ...patch }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
