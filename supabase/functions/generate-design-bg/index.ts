// Generate an "explosive" 1080x1080 design background using Lovable AI.
// Returns a data URL the client drops onto the Fabric canvas as the bg layer.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Body = {
  style: "stadium" | "halftone" | "gradient_mesh";
  color_primary?: string;
  color_secondary?: string;
  sport?: string;
};

const STYLE_PROMPTS: Record<Body["style"], string> = {
  stadium:
    "dynamic sports poster background, dramatic stadium light streaks, lens flare, motion blur, arena energy, cinematic depth",
  halftone:
    "bold graphic design background, halftone dot pattern, comic book grit, screen-print texture, high-impact retro sports poster",
  gradient_mesh:
    "smooth modern gradient mesh background, abstract flowing color blends, soft glow, premium minimal sports brand aesthetic",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    const style = body.style ?? "stadium";
    const c1 = body.color_primary || "#E85D3A";
    const c2 = body.color_secondary || "#0F172A";
    const sport = body.sport ? ` ${body.sport} themed,` : "";

    const prompt =
      `${STYLE_PROMPTS[style]},${sport} dominant colors ${c1} and ${c2}, ` +
      `square 1:1 composition, NO TEXT, NO LETTERS, NO PEOPLE, NO LOGOS, ` +
      `pure abstract background only, leave center area visually open for foreground subject, ` +
      `high resolution, ultra detailed, professional sports graphic design`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI gateway error", res.status, errText);
      return new Response(
        JSON.stringify({ error: res.status === 402 ? "Out of AI credits" : res.status === 429 ? "Rate limited — try again in a moment" : "AI generation failed" }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await res.json();
    const imageUrl = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ image_url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-design-bg fatal", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
