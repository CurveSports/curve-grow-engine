// Generate a design via Lovable AI Gateway. Returns HTML and stores design row.
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

function buildSystemPrompt(opts: {
  orgName: string;
  brandKit: any;
  template: any;
  promptInput: Record<string, any>;
}) {
  const { orgName, brandKit, template, promptInput } = opts;
  const dims = template.dimensions || {};
  const fieldsList = Object.entries(promptInput || {})
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("\n");

  return `You are a senior designer creating marketing assets for a youth sports organization.

ORGANIZATION:
- Name: ${orgName}
- Tagline: ${brandKit?.tagline || "(none)"}

BRAND KIT:
- Primary color: ${brandKit?.color_primary || "#0F172A"}
- Secondary color: ${brandKit?.color_secondary || "#475569"}
- Accent color: ${brandKit?.color_accent || "#22C55E"}
- Dark color: ${brandKit?.color_dark || "#0F172A"}
- Light color: ${brandKit?.color_light || "#FFFFFF"}
- Heading font: ${brandKit?.font_heading || "Inter"}
- Body font: ${brandKit?.font_body || "Inter"}
- Brand voice: ${brandKit?.brand_voice_notes || "Energetic, family-focused, professional."}
- Primary logo URL: ${brandKit?.logo_primary_url || "(no logo provided)"}

DESIGN SPECIFICATION:
- Type: ${template.design_type}
- Dimensions: ${dims.width}px × ${dims.height}px (EXACT — critical for export quality)
- Purpose: ${template.base_prompt}

CONTENT FROM USER:
${fieldsList || "(no content provided)"}

OUTPUT REQUIREMENTS:
- Return ONLY a complete HTML document with embedded <style> tag in <head>.
- No markdown code fences, no commentary, no explanation — just HTML starting with <!DOCTYPE html>.
- <body> must be exactly ${dims.width}px × ${dims.height}px with no margin or padding on body itself.
- Use Google Fonts CDN: <link href="https://fonts.googleapis.com/css2?family=${(brandKit?.font_heading || "Inter").replace(/ /g, "+")}:wght@400;700;900&family=${(brandKit?.font_body || "Inter").replace(/ /g, "+")}:wght@400;600&display=swap" rel="stylesheet">
- If a logo URL is provided, use it as <img src="..."> with crossorigin="anonymous".
- Modern CSS allowed: flexbox, grid, gradients, shadows, transforms.
- All text must come from CONTENT FROM USER — do not invent details.
- Design should feel premium and polished.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { template_id, org_id, prompt_input, parent_design_id, name } = await req.json();
    if (!template_id || !org_id) {
      return new Response(JSON.stringify({ error: "template_id and org_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [templateRes, brandRes, orgRes, roleRes] = await Promise.all([
      admin.from("design_templates").select("*").eq("id", template_id).single(),
      admin.from("org_brand_kits").select("*").eq("org_id", org_id).maybeSingle(),
      admin.from("organizations").select("name").eq("id", org_id).single(),
      admin.from("user_roles").select("role").eq("user_id", userData.user.id),
    ]);

    if (templateRes.error || !templateRes.data) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const role = (roleRes.data || []).find((r: any) => r.role === "admin") ? "admin" : "org_user";
    const created_by_role = role === "admin" ? "curve_admin" : "org_user";

    const systemPrompt = buildSystemPrompt({
      orgName: orgRes.data?.name || "Organization",
      brandKit: brandRes.data,
      template: templateRes.data,
      promptInput: prompt_input || {},
    });

    // Call Lovable AI Gateway
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 6000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the design now. Return only the complete HTML document." },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const html = stripFences(aiJson.choices?.[0]?.message?.content || "");

    if (!html.toLowerCase().includes("<html")) {
      return new Response(JSON.stringify({ error: "AI returned invalid HTML" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usage = aiJson.usage || {};
    const cost_cents = Math.ceil(((usage.prompt_tokens || 0) * 0.0000125 + (usage.completion_tokens || 0) * 0.00005) * 100);

    const insertRes = await admin.from("designs").insert({
      org_id,
      design_type: templateRes.data.design_type,
      template_id,
      name: name || `${templateRes.data.name} — ${new Date().toLocaleDateString()}`,
      prompt_input: prompt_input || {},
      generated_html: html,
      status: "draft",
      created_by: userData.user.id,
      created_by_role,
      parent_design_id: parent_design_id || null,
      ai_model_used: "google/gemini-2.5-pro",
      generation_cost_cents: cost_cents,
    }).select().single();

    if (insertRes.error) {
      console.error("Insert error", insertRes.error);
      return new Response(JSON.stringify({ error: insertRes.error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ design_id: insertRes.data.id, html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-design exception", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
