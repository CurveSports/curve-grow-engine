// Admin-only: generate a curated list of local sponsor candidates for a city/state.
// Uses Lovable AI Gateway with Gemini 2.5 Pro for breadth + reasoning.
// Returns 20-40 candidates with category diversity. Contact info is AI-estimated and must be verified.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You generate curated lists of LOCAL businesses that would be strong sponsorship candidates for a youth/high-school travel sports organization. Focus on businesses that benefit from community visibility to families with disposable income (restaurants, auto dealers, real estate agents, doctors/dentists, financial advisors, fitness centers, retail, contractors, professional services). Return realistic-sounding business names and category-appropriate types. Phone numbers and emails MUST be marked as estimated/unverified (use plausible local-format placeholders).`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "return_lead_candidates",
    description: "Return a curated list of local sponsor candidates.",
    parameters: {
      type: "object",
      properties: {
        candidates: {
          type: "array",
          minItems: 15,
          items: {
            type: "object",
            properties: {
              business_name: { type: "string" },
              business_type: { type: "string" },
              contact_name: { type: "string", description: "Owner/manager name if commonly known, else empty" },
              contact_phone: { type: "string", description: "Plausible local-format phone, marked as estimated" },
              contact_email: { type: "string", description: "Plausible business email, marked as estimated" },
              city_state: { type: "string" },
              rationale: { type: "string", description: "1 sentence on why this is a good sponsor fit" },
            },
            required: ["business_name", "business_type", "contact_name", "contact_phone", "contact_email", "city_state", "rationale"],
            additionalProperties: false,
          },
        },
      },
      required: ["candidates"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { city_state, count, categories } = await req.json();
    if (!city_state || typeof city_state !== "string" || city_state.trim().length < 3) {
      return new Response(JSON.stringify({ error: "city_state required (e.g. 'Dallas, TX')" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetCount = Math.min(40, Math.max(15, Number(count) || 25));
    const catLine = Array.isArray(categories) && categories.length
      ? `Bias selections toward: ${categories.join(", ")}.`
      : `Cover a diverse mix of categories.`;

    const userPrompt = `Generate ${targetCount} sponsorship lead candidates in ${city_state.trim()}.
${catLine}
Spread across categories — no more than ~25% in any one category.
For each, include a one-sentence rationale tying the business to youth/HS travel sports family audiences.
Mark phone/email as estimated (e.g. prefix with "(est) " or note in rationale).`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "return_lead_candidates" } },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("AI gateway error", resp.status, txt);
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 502;
      const msg =
        resp.status === 429
          ? "Rate limit reached. Please wait a moment and try again."
          : resp.status === 402
          ? "AI credits exhausted. Add funds in Lovable Cloud settings."
          : "AI service error.";
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-leads-by-city error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
