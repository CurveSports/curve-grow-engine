// Generate a design. Two execution paths:
//   1. Stability AI background (when STABILITY_API_KEY set AND template uses 'stability_sharp')
//      → calls Stability v2beta, uploads raw background to design-renders bucket,
//        sets it as preview_url. Compositing (logo/text/CTA overlays) happens in a
//        follow-up step (composite-image function, Phase 4).
//   2. Existing HTML/CSS via Lovable AI Gateway (default fallback).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callStabilityAI, ASPECT_RATIOS, type StabilityModel } from "../_shared/stability.ts";
import { buildStabilityPrompt } from "../_shared/buildStabilityPrompt.ts";
import { buildSpecContext, interpolateSpec } from "../_shared/interpolateSpec.ts";

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

IMAGE ASSETS (use VERBATIM URLs with crossorigin="anonymous"; if a slot is empty, do NOT invent an image — fall back to typography or a brand-color block)
- hero_photo_url: ${promptInput.hero_photo_url || "(none)"} — full-bleed background or dominant half-panel. Apply the style's photo treatment (duotone, sepia, etc.).
- secondary_photo_url: ${promptInput.secondary_photo_url || "(none)"} — used as a sidebar inset, rotated sticker (-6deg), or collage element. Smaller than the hero.
- sponsor_logo_url: ${promptInput.sponsor_logo_url || "(none)"} — render as a "PRESENTED BY" lockup in a corner with 14px ALL CAPS tracking-0.2em label above. Max 120px wide.

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

    // 1. Insert placeholder row immediately so the UI can show a generating card
    const insertRes = await admin.from("designs").insert({
      org_id,
      design_type: templateRes.data.design_type,
      template_id,
      name: name || `${templateRes.data.name} — ${new Date().toLocaleDateString()}`,
      prompt_input: prompt_input || {},
      generated_html: null,
      status: "generating",
      created_by: userData.user.id,
      created_by_role,
      parent_design_id: parent_design_id || null,
      ai_model_used: "google/gemini-2.5-pro",
      generation_started_at: new Date().toISOString(),
    }).select().single();

    if (insertRes.error) {
      console.error("Insert error", insertRes.error);
      return new Response(JSON.stringify({ error: insertRes.error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const designId = insertRes.data.id;

    // 2. Decide engine: Stability (when key present + template opts in) or HTML/CSS fallback.
    const stabilityKey = Deno.env.get("STABILITY_API_KEY");
    const useStability = !!stabilityKey && templateRes.data.generation_engine === "stability_sharp";

    const runStabilityGeneration = async () => {
      const t0 = Date.now();
      try {
        const prompt = buildStabilityPrompt(
          templateRes.data as any,
          (brandRes.data || {}) as any,
          prompt_input || {},
        );
        const aspect = ASPECT_RATIOS[templateRes.data.design_type] || "1:1";
        const model = (prompt_input?.use_premium ? "sd3.5-large" : (templateRes.data.stability_model || "core")) as StabilityModel;

        const result = await callStabilityAI({ prompt, aspectRatio: aspect, model });

        // Upload raw background to design-renders bucket
        const bgPath = `${org_id}/${designId}/background.png`;
        const up = await admin.storage.from("design-renders").upload(bgPath, result.imageBytes, {
          contentType: "image/png",
          upsert: true,
        });
        if (up.error) throw new Error(`storage upload: ${up.error.message}`);
        const { data: signed } = await admin.storage.from("design-renders").createSignedUrl(bgPath, 86400 * 7);
        const bgUrl = signed?.signedUrl || "";

        // Phase 3: composite via Fly.io worker if configured
        let finalUrl = bgUrl;
        let totalCost = result.costCents;
        const workerUrl = Deno.env.get("COMPOSITE_WORKER_URL");
        const workerToken = Deno.env.get("COMPOSITE_WORKER_TOKEN");
        const rawSpec = templateRes.data.composition_config || null;
        const compositionSpec = rawSpec
          ? interpolateSpec(
              rawSpec,
              buildSpecContext({
                orgName: orgRes.data?.name || "Organization",
                brandKit: brandRes.data,
                promptInput: prompt_input || {},
              }),
            )
          : null;

        if (workerUrl && compositionSpec) {
          try {
            const compResp = await fetch(`${workerUrl.replace(/\/$/, "")}/composite`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(workerToken ? { Authorization: `Bearer ${workerToken}` } : {}),
              },
              body: JSON.stringify({
                background_url: bgUrl,
                composition_spec: compositionSpec,
                brand_kit: brandRes.data || {},
                output_format: "png",
              }),
            });
            if (!compResp.ok) {
              const errTxt = await compResp.text();
              console.warn("composite worker failed", compResp.status, errTxt);
            } else {
              const compBytes = new Uint8Array(await compResp.arrayBuffer());
              const finalPath = `${org_id}/${designId}/final.png`;
              const fup = await admin.storage.from("design-renders").upload(finalPath, compBytes, {
                contentType: "image/png",
                upsert: true,
              });
              if (!fup.error) {
                const { data: fsigned } = await admin.storage.from("design-renders").createSignedUrl(finalPath, 86400 * 7);
                if (fsigned?.signedUrl) finalUrl = fsigned.signedUrl;
              }
            }
          } catch (e) {
            console.warn("composite worker exception", e);
          }
        }

        await admin.from("designs").update({
          status: "ready",
          generation_engine: model === "sd3.5-large" ? "stability_sharp_premium" : "stability_sharp",
          stability_prompt: prompt,
          stability_image_url: bgUrl,
          stability_seed: result.seed,
          composition_spec: compositionSpec,
          generation_cost_cents: totalCost,
          generation_time_ms: Date.now() - t0,
          preview_url: finalUrl,
          ai_model_used: `stability/${model}`,
          generation_error: null,
        }).eq("id", designId);
      } catch (err) {
        console.error("Stability generation exception", err);
        await admin.from("designs").update({
          status: "failed",
          generation_error: `Stability AI: ${String(err).slice(0, 400)}`,
          generation_time_ms: Date.now() - t0,
        }).eq("id", designId);
      }
    };

    const runHtmlGeneration = async () => {
      try {
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
          let msg = "Generation failed. Try again.";
          if (aiResp.status === 429) msg = "Rate limit reached. Try again in a moment.";
          else if (aiResp.status === 402) msg = "AI credits exhausted. Add credits in Workspace settings.";
          await admin.from("designs").update({ status: "failed", generation_error: msg }).eq("id", designId);
          return;
        }

        const aiJson = await aiResp.json();
        const html = stripFences(aiJson.choices?.[0]?.message?.content || "");

        if (!html.toLowerCase().includes("<html")) {
          await admin.from("designs").update({
            status: "failed",
            generation_error: "AI returned invalid HTML. Try a different style or retry.",
          }).eq("id", designId);
          return;
        }

        const usage = aiJson.usage || {};
        const cost_cents = Math.ceil(((usage.prompt_tokens || 0) * 0.0000125 + (usage.completion_tokens || 0) * 0.00005) * 100);

        await admin.from("designs").update({
          generated_html: html,
          status: "ready",
          generation_engine: "html_css",
          generation_cost_cents: cost_cents,
          generation_error: null,
          assets_used: [
            prompt_input?.hero_photo_url,
            prompt_input?.secondary_photo_url,
            prompt_input?.sponsor_logo_url,
          ].filter(Boolean),
        }).eq("id", designId);

        // Bump used_count / last_used_at on any picked library assets
        const usedUrls = [prompt_input?.hero_photo_url, prompt_input?.secondary_photo_url, prompt_input?.sponsor_logo_url].filter(Boolean);
        if (usedUrls.length) {
          const { data: assets } = await admin
            .from("org_brand_assets")
            .select("id, used_count")
            .eq("org_id", org_id)
            .in("url", usedUrls);
          for (const a of (assets ?? [])) {
            await admin.from("org_brand_assets")
              .update({ used_count: (a.used_count ?? 0) + 1, last_used_at: new Date().toISOString() })
              .eq("id", a.id);
          }
        }
      } catch (err) {
        console.error("Background generation exception", err);
        await admin.from("designs").update({
          status: "failed",
          generation_error: String(err).slice(0, 500),
        }).eq("id", designId);
      }
    };

    const runGeneration = useStability ? runStabilityGeneration : runHtmlGeneration;

    // @ts-ignore Deno EdgeRuntime global
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runGeneration());
    } else {
      // Fallback: fire-and-forget
      runGeneration();
    }

    return new Response(JSON.stringify({ design_id: designId, status: "generating" }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-design exception", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
