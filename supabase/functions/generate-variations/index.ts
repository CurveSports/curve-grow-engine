// Generate N variations of an existing design.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function stripFences(s: string): string {
  return s.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { design_id, count } = await req.json();
    const n = Math.min(Math.max(Number(count) || 3, 1), 4);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: original } = await admin.from("designs").select("*").eq("id", design_id).single();
    if (!original) {
      return new Response(JSON.stringify({ error: "Design not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variations: string[] = [];
    const ids: string[] = [];

    for (let i = 0; i < n; i++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          max_tokens: 6000,
          messages: [
            {
              role: "system",
              content: "Create a meaningfully different alternative version of this HTML design. Vary the layout, hierarchy, or visual approach while keeping the same brand colors, fonts, dimensions, and content. Return the complete updated HTML document with no fences or commentary.",
            },
            { role: "user", content: original.generated_html },
          ],
        }),
      });
      if (!aiResp.ok) continue;
      const aiJson = await aiResp.json();
      const html = stripFences(aiJson.choices?.[0]?.message?.content || "");
      if (!html.toLowerCase().includes("<html")) continue;
      variations.push(html);
      const ins = await admin.from("designs").insert({
        org_id: original.org_id,
        design_type: original.design_type,
        template_id: original.template_id,
        name: `${original.name} — variation ${i + 1}`,
        prompt_input: original.prompt_input,
        generated_html: html,
        status: "draft",
        created_by: userData.user.id,
        created_by_role: original.created_by_role,
        parent_design_id: original.id,
        ai_model_used: "google/gemini-2.5-pro",
      }).select("id").single();
      if (ins.data?.id) ids.push(ins.data.id);
    }

    return new Response(JSON.stringify({ variation_ids: ids, count: variations.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-variations", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
