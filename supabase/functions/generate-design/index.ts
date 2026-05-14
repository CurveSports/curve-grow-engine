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

const STYLE_DIRECTIONS: Record<string, string> = {
  bold_sport: `BOLD SPORT — high-energy athletic poster aesthetic.
- Massive italic / condensed display headline that bleeds off one edge of the canvas.
- Diagonal color blocks or angled cuts (skew -8deg to -15deg) running across the canvas.
- Hero photo with hard duotone treatment using brand primary + dark; subject silhouetted, no soft vignettes.
- Big white outline strokes on key numbers (dates, scores). Heavy letter-spacing on labels (uppercase, tracking 0.15em).
- Reference: Nike SNKRS posters, ESPN gameday graphics, college football schedule drops.
- Avoid: centered symmetric layouts, soft drop shadows, beige/pastel anything.`,
  editorial: `EDITORIAL MAGAZINE — premium publication feel.
- Asymmetric grid, generous negative space, content anchored to one side.
- One oversized serif or display headline, set tight (line-height 0.9). Body in clean sans.
- Photo as full-bleed hero on one half; text panel on the other half with high contrast.
- Thin 1px rule lines between sections. Small ALL CAPS eyebrow labels (10-12px, tracking 0.2em).
- Reference: The Players' Tribune, Sports Illustrated covers, Apple keynote slides.
- Avoid: clipart, cartoon icons, gradient text fills.`,
  minimal_modern: `MINIMAL MODERN — restrained, confident, tech-brand polish.
- Single hero element (logo, photo, or massive number) on near-solid background.
- 1-2 typefaces max. Tight type, lots of whitespace.
- Subtle 1-color background (brand light or brand dark — pick the one that reads better with the photo).
- Tiny accent strip of brand accent color (a 4px line, a single dot, a thin underline).
- Reference: Linear, Stripe, Apple product pages.
- Avoid: multiple gradients, decorative borders, busy compositions.`,
  vintage_athletic: `VINTAGE ATHLETIC — collegiate / varsity heritage feel.
- Cream or off-white background with subtle paper texture (use radial-gradient noise or a textured fill).
- Slab-serif or varsity-block headline. Established / EST. YEAR detail somewhere.
- Hard duotone or sepia-tinted photos. Circular crest or shield motif.
- Earthy palette: brand primary used sparingly as the accent, dark navy / forest / maroon dominant.
- Reference: vintage MLB programs, Aimé Leon Dore lookbooks, Yale crew posters.
- Avoid: neon colors, glossy gradients, futuristic sans-serifs.`,
  high_energy: `HIGH-ENERGY NEON — Gen-Z hype / event flyer.
- Saturated brand color used as full-canvas background; secondary as a chunky overlay block.
- Glitch / chromatic-aberration on hero text (3px offset duplicate in accent color).
- Sticker-style elements: rotated chips with content (e.g. age groups, dates) at -6deg and +4deg rotations.
- Star bursts, lightning bolts, or arrow stamps used 1-2 times max as graphic punctuation.
- Reference: Travis Scott merch drops, Red Bull Rampage flyers, NBA City Edition graphics.
- Avoid: corporate-looking white cards, thin elegant fonts, muted colors.`,
};

const TYPE_LAYOUTS: Record<string, string> = {
  social_post_square: `SQUARE LAYOUT (1080x1080):
- Headline should be 110-160px tall, occupying the top or center third.
- Hero photo or color block fills at least 50% of canvas — never a small inset image.
- Logo placed at 80-100px, in a corner with 48px margin.
- Date/time/location grouped as one info block, 36-48px type.
- Bottom 80px reserved for org handle / CTA chip.`,
  flyer: `FLYER LAYOUT (8.5x11 ratio):
- Top 40%: dominant hero (photo with overlay or full-color block) containing the headline.
- Middle 35%: details (date, time, location, age groups) in a 2-column grid.
- Bottom 25%: CTA, QR code area, sponsor row, org logo.
- Headline 120-180px. Body 24-32px. Margins 64px.`,
  email_header: `EMAIL HEADER (600x300 typical):
- Headline + subhead + logo, horizontal layout.
- One hero element max; do not cram.`,
  story: `VERTICAL STORY (1080x1920):
- Stack vertically: logo top, hero photo center (50% height), CTA bottom.
- Massive headline 160-220px.`,
};

function buildSystemPrompt(opts: {
  orgName: string;
  brandKit: any;
  template: any;
  promptInput: Record<string, any>;
  styleDirection: string;
}) {
  const { orgName, brandKit, template, promptInput, styleDirection } = opts;
  const dims = template.dimensions || {};
  const fieldsList = Object.entries(promptInput || {})
    .filter(([_, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("\n");

  const styleSpec = STYLE_DIRECTIONS[styleDirection] || STYLE_DIRECTIONS.bold_sport;
  const layoutSpec = TYPE_LAYOUTS[template.design_type] || TYPE_LAYOUTS.social_post_square;
  const fontHeading = brandKit?.font_heading || "Inter";
  const fontBody = brandKit?.font_body || "Inter";

  return `You are an award-winning art director designing marketing assets for "${orgName}", a youth sports organization. Your work has been featured by Awwwards and SiteInspire. You produce designs that look like they belong on a Nike, Bleacher Report, or Players' Tribune feed — NOT generic Canva templates.

ORGANIZATION
- Name: ${orgName}
- Tagline: ${brandKit?.tagline || "(none)"}
- Brand voice: ${brandKit?.brand_voice_notes || "Energetic, family-focused, professional."}

BRAND KIT (use these EXACT hex values — do not invent new colors)
- Primary: ${brandKit?.color_primary || "#0F172A"}
- Secondary: ${brandKit?.color_secondary || "#475569"}
- Accent: ${brandKit?.color_accent || "#22C55E"}
- Dark: ${brandKit?.color_dark || "#0F172A"}
- Light: ${brandKit?.color_light || "#FFFFFF"}
- Heading font: ${fontHeading}
- Body font: ${fontBody}
- Primary logo URL: ${brandKit?.logo_primary_url || "(none — use a styled wordmark of the org name instead)"}

STYLE DIRECTION — FOLLOW STRICTLY
${styleSpec}

LAYOUT SYSTEM FOR THIS FORMAT
${layoutSpec}

TEMPLATE INTENT
${template.base_prompt}

CONTENT FROM USER (use VERBATIM; if a field is empty, omit it — never invent or use placeholder copy like "Lorem ipsum" or "Your text here")
${fieldsList || "(no content provided — use only org name + tagline)"}

NON-NEGOTIABLE COMPOSITION RULES
1. The canvas MUST feel intentional and art-directed. If your first instinct is a centered white card with a logo on top — STOP and redesign asymmetrically.
2. Establish a clear focal hierarchy: ONE dominant element (headline or hero photo) at 2-3x the visual weight of anything else.
3. Use at least 3 type sizes with a ratio of at least 4:1 between largest and smallest.
4. Color: 60-30-10 rule — one color covers ~60% of canvas, second ~30%, accent ~10%. Never an even split.
5. If a hero photo URL is provided, USE IT as a full-bleed background or large half-panel — never as a small inset thumbnail. Apply the style's photo treatment.
6. Bleed elements off at least ONE edge of the canvas (headline, shape, photo). Avoid a uniform inner margin around everything.
7. All copy MUST come from the user's content fields. Do not invent dates, locations, names, or details.

TECHNICAL OUTPUT
- Return ONLY a complete HTML document starting with <!DOCTYPE html>. No markdown fences, no commentary.
- <body> MUST be exactly ${dims.width}px × ${dims.height}px with margin:0; padding:0; overflow:hidden; position:relative;
- Load fonts with: <link href="https://fonts.googleapis.com/css2?family=${fontHeading.replace(/ /g, "+")}:wght@400;700;800;900&family=${fontBody.replace(/ /g, "+")}:wght@400;500;700&display=swap" rel="stylesheet">
- All images use crossorigin="anonymous" and object-fit:cover.
- Use absolute positioning freely for asymmetric layouts. Use CSS transform for rotations and skews.
- Use background-blend-mode, mix-blend-mode, filter (grayscale, contrast, sepia) for photo treatments.
- No external scripts. No SVG icons from CDNs (you may inline simple SVG for shapes/arrows/stars).

Begin. Output the HTML now.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { template_id, org_id, prompt_input, parent_design_id, name, style_direction } = await req.json();
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
      styleDirection: style_direction || "bold_sport",
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
        max_tokens: 12000,
        temperature: 0.85,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Design now. Style: ${style_direction || "bold_sport"}. Asymmetric composition, dominant hero, brand colors used in 60-30-10 distribution. Output the full HTML document only — start with <!DOCTYPE html>.` },
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
