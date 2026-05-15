// Refine an existing design: applies a single change while preserving the rest.
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
    const { design_id, refinement_prompt } = await req.json();
    if (!design_id || !refinement_prompt) {
      return new Response(JSON.stringify({ error: "design_id and refinement_prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const { data: design, error } = await admin.from("designs").select("*").eq("id", design_id).single();
    if (error || !design) {
      return new Response(JSON.stringify({ error: "Design not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 6000,
        messages: [
          {
            role: "system",
            content: [
              "You are a surgical HTML editor for an existing marketing design.",
              "ABSOLUTE RULES — violating any of these is a failure:",
              "1. Return the COMPLETE original HTML document. Never rewrite it from scratch.",
              "2. Preserve EVERY <img> tag exactly (same src, same position, same size). Never delete or replace images.",
              "3. Preserve every background-image, background, gradient, and inline style URL exactly.",
              "4. Preserve the overall layout, structure, fonts, colors, and class names.",
              "5. Change ONLY the specific text or styling the user explicitly asked for. If the request is ambiguous, make the smallest possible change.",
              "6. If the user's request is about the BACKGROUND PHOTO, IMAGERY, SUBJECTS in the photo, age/look of people, scene, atmosphere, or anything visual that lives inside the generated background image (not text), DO NOT modify the HTML. Instead return exactly this single line and nothing else: NEEDS_BACKGROUND_REGEN",
              "Return only the raw HTML (or the marker), no fences, no commentary.",
            ].join("\n"),
          },
          {
            role: "user",
            content: `Original HTML:\n\n${design.generated_html}\n\nRequested change: ${refinement_prompt}`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI refine error", aiResp.status, t);
      return new Response(JSON.stringify({ error: aiResp.status === 429 ? "Rate limit" : aiResp.status === 402 ? "AI credits exhausted" : "Refinement failed" }), {
        status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const rawOut = (aiJson.choices?.[0]?.message?.content || "").trim();

    // Model decided this request is about the background imagery, not the HTML.
    if (/^NEEDS_BACKGROUND_REGEN\b/i.test(rawOut)) {
      return new Response(
        JSON.stringify({
          error:
            "This request is about the background image (people, scene, atmosphere). HTML refinement can't change what's inside the photo. Use 'Regenerate background' with this guidance instead.",
          needs_background_regen: true,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newHtml = stripFences(rawOut);
    if (!newHtml.toLowerCase().includes("<html")) {
      return new Response(JSON.stringify({ error: "Invalid HTML returned" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Safety: reject refinements that nuked the original images / structure.
    const origImgs = (design.generated_html.match(/<img\b/gi) || []).length;
    const newImgs = (newHtml.match(/<img\b/gi) || []).length;
    const origBg = (design.generated_html.match(/background-image\s*:/gi) || []).length;
    const newBg = (newHtml.match(/background-image\s*:/gi) || []).length;
    if (newImgs < origImgs || newBg < origBg || newHtml.length < design.generated_html.length * 0.4) {
      console.warn("Refinement rejected: structure shrunk", { origImgs, newImgs, origBg, newBg, origLen: design.generated_html.length, newLen: newHtml.length });
      return new Response(
        JSON.stringify({
          error:
            "The AI tried to remove images or core structure, so the refinement was discarded. Try something more specific like 'change the headline to ...', or use 'Regenerate background' for image changes.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await admin.from("design_refinements").insert({
      design_id,
      refinement_prompt,
      previous_html: design.generated_html,
      new_html: newHtml,
      refined_by: userData.user.id,
    });

    await admin.from("designs").update({ generated_html: newHtml, updated_at: new Date().toISOString() }).eq("id", design_id);

    return new Response(JSON.stringify({ html: newHtml }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refine-design exception", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
