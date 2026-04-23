// Admin-only: generate a curated list of REAL local sponsor candidates for a city/state.
// Uses Gemini 2.5 Pro with Google Search grounding so businesses, phones, addresses, and
// websites come from real Google results — not LLM hallucination.
// Emails are typically NOT findable via search; admin verifies on the website.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are a local-business researcher. You use Google Search to find REAL local businesses that would be strong sponsorship candidates for a youth/high-school travel sports organization.

CRITICAL RULES:
1. Every business MUST be a real establishment you found via Google Search in the requested city.
2. Phone numbers, addresses, and websites MUST come from actual Google search results — never invent them.
3. If you cannot confirm a phone via search, leave contact_phone as an empty string. NEVER fabricate.
4. Emails are rarely on Google — leave contact_email empty unless it appears in a search snippet.
5. Owner/manager names: only include if found in search results, otherwise empty.
6. Prefer locally-owned businesses (independent restaurants, family auto dealers, local realtors, dentists, orthodontists, pediatricians, financial advisors, contractors, fitness studios) over national chains.
7. Spread across categories — no more than ~25% in any one category.

After searching, output ONLY a single JSON code block matching this exact shape:
\`\`\`json
{
  "candidates": [
    {
      "business_name": "string",
      "business_type": "string",
      "contact_name": "string (empty if unknown)",
      "contact_phone": "string (empty if not found in search)",
      "contact_email": "string (empty if not found in search)",
      "website": "string (empty if not found)",
      "address": "string (street address if found)",
      "city_state": "string",
      "rationale": "1 sentence on sponsor fit"
    }
  ]
}
\`\`\`
No prose before or after the JSON block.`;

function extractJson(text: string): any | null {
  // Try fenced ```json ... ``` first
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  // Find the outermost { ... }
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

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
      ? `Bias toward these categories: ${categories.join(", ")}.`
      : `Mix of restaurants, auto dealers, real estate agents, dentists/orthodontists, pediatricians, financial advisors, fitness studios, retail, contractors.`;

    const userPrompt = `Use Google Search to find ${targetCount} REAL local businesses in ${city_state.trim()} that would be sponsorship candidates for a youth travel sports organization.

${catLine}

For each business: search Google for the name + city, pull the phone number, address, and website from the actual search results / Google Business listing. Leave any field empty if you can't confirm it from search. Do NOT invent contact info.

Return the JSON block only.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        // Enable Google Search grounding so Gemini queries real listings.
        tools: [{ type: "google_search" } as any],
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
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);

    if (!parsed?.candidates || !Array.isArray(parsed.candidates)) {
      console.error("Could not parse candidates from response", content?.slice(0, 500));
      return new Response(JSON.stringify({ error: "AI did not return parseable lead data. Try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize: ensure all expected fields exist as strings
    const candidates = parsed.candidates.map((c: any) => ({
      business_name: String(c.business_name ?? "").trim(),
      business_type: String(c.business_type ?? "").trim(),
      contact_name: String(c.contact_name ?? "").trim(),
      contact_phone: String(c.contact_phone ?? "").trim(),
      contact_email: String(c.contact_email ?? "").trim(),
      website: String(c.website ?? "").trim(),
      address: String(c.address ?? "").trim(),
      city_state: String(c.city_state ?? city_state).trim(),
      rationale: String(c.rationale ?? "").trim(),
    })).filter((c: any) => c.business_name);

    return new Response(JSON.stringify({ candidates }), {
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
