// Extracts business contact info from an image (business card, sign, flyer)
// Uses Lovable AI Gateway with Gemini 2.5 Flash (vision). Returns structured JSON.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You extract business information from photos of business cards, store signs, flyers, vehicles, or any source containing business contact info. Return JSON only — no commentary.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "return_business_info",
    description: "Return extracted business info.",
    parameters: {
      type: "object",
      properties: {
        business_name: { type: "string", description: "Business name, or empty string if not found" },
        contact_name: { type: "string" },
        contact_email: { type: "string" },
        contact_phone: { type: "string" },
        business_type: { type: "string", description: "Inferred category, e.g. Restaurant, Auto Dealer" },
        city_state: { type: "string", description: "City, ST format if visible" },
        additional_notes: { type: "string", description: "Any other useful detail" },
      },
      required: [
        "business_name",
        "contact_name",
        "contact_email",
        "contact_phone",
        "business_type",
        "city_state",
        "additional_notes",
      ],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const { image_data_url } = await req.json();
    if (!image_data_url || typeof image_data_url !== "string" || !image_data_url.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "image_data_url (data URL) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all business information visible in this image. Use empty strings for fields you cannot find. Infer business_type from context (e.g. a restaurant sign suggests 'Restaurant')." },
              { type: "image_url", image_url: { url: image_data_url } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "return_business_info" } },
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

    const extracted = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-business-card error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
