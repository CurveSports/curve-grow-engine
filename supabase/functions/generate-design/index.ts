// Generate a design. Two execution paths:
//   1. Stability AI background (when STABILITY_API_KEY set AND template uses 'stability_sharp')
//      → calls Stability v2beta, uploads raw background to design-renders bucket,
//        sets it as preview_url. Compositing (logo/text/CTA overlays) happens in a
//        follow-up step (composite-image function, Phase 4).
//   2. Existing HTML/CSS via Lovable AI Gateway (default fallback).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callStabilityAI, ASPECT_RATIOS, removeBackground, fetchImageBytes, STABILITY_NEGATIVE_PROMPT, type StabilityModel } from "../_shared/stability.ts";
import { buildStabilityPrompt, buildStabilitySportNegative } from "../_shared/buildStabilityPrompt.ts";
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

function buildTokens(opts: {
  orgName: string;
  brandKit: any;
  template: any;
  promptInput: Record<string, any>;
  styleDirection: string;
}): Record<string, string> {
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

  return {
    org_name: orgName,
    org_tagline: brandKit?.tagline || "(none)",
    brand_voice: brandKit?.brand_voice_notes || "Energetic, family-focused, professional.",
    color_primary: brandKit?.color_primary || "#0F172A",
    color_secondary: brandKit?.color_secondary || "#475569",
    color_accent: brandKit?.color_accent || "#22C55E",
    color_dark: brandKit?.color_dark || "#0F172A",
    color_light: brandKit?.color_light || "#FFFFFF",
    font_heading: fontHeading,
    font_body: fontBody,
    font_heading_url: fontHeading.replace(/ /g, "+"),
    font_body_url: fontBody.replace(/ /g, "+"),
    logo_primary_url: brandKit?.logo_primary_url || "(none — use a styled wordmark of the org name instead)",
    style_spec: styleSpec,
    layout_spec: layoutSpec,
    template_intent: template.base_prompt || "",
    hero_photo_url: promptInput.hero_photo_url || "(none)",
    secondary_photo_url: promptInput.secondary_photo_url || "(none)",
    sponsor_logo_url: promptInput.sponsor_logo_url || "(none)",
    fields_list: fieldsList || "(no content provided — use only org name + tagline)",
    canvas_width: String(dims.width || 1080),
    canvas_height: String(dims.height || 1080),
  };
}

function interpolatePrompt(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => tokens[k] ?? `{{${k}}}`);
}

// (Master system prompt now lives in DB table `design_system_prompts`; assembled at request time.)

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

    const [templateRes, brandRes, orgRes, roleRes, sysPromptRes] = await Promise.all([
      admin.from("design_templates").select("*").eq("id", template_id).single(),
      admin.from("org_brand_kits").select("*").eq("org_id", org_id).maybeSingle(),
      admin.from("organizations").select("name, sport").eq("id", org_id).single(),
      admin.from("user_roles").select("role").eq("user_id", userData.user.id),
      admin.from("design_system_prompts").select("prompt_template").eq("is_active", true).maybeSingle(),
    ]);

    if (templateRes.error || !templateRes.data) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sysPromptRes.data?.prompt_template) {
      return new Response(JSON.stringify({ error: "No active design_system_prompts row. Set one in Admin → System Prompt." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const role = (roleRes.data || []).find((r: any) => r.role === "admin") ? "admin" : "org_user";
    const created_by_role = role === "admin" ? "curve_admin" : "org_user";

    const tokens = buildTokens({
      orgName: orgRes.data?.name || "Organization",
      brandKit: brandRes.data,
      template: templateRes.data,
      promptInput: prompt_input || {},
      styleDirection: style_direction || "bold_sport",
    });
    const systemPrompt = interpolatePrompt(sysPromptRes.data.prompt_template, tokens);

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

    // 2. Decide engine: Stability pipeline (when key present + template opts in) or HTML/CSS fallback.
    const stabilityKey = Deno.env.get("STABILITY_API_KEY");
    const useStability = !!stabilityKey && templateRes.data.generation_engine === "stability_sharp";

    // Pick the user's hero photo (for user_photo + hybrid modes).
    const findHeroPhoto = (tpl: any, input: Record<string, any>): string | null => {
      const fields = (tpl.input_fields || []) as Array<any>;
      const photoFields = fields.filter((f) => f.type === "photo_selector" || /photo|image/i.test(f.name));
      // Prefer fields whose name hints at hero / player / coach / sponsor
      for (const f of photoFields) {
        if (/hero|player|coach|sponsor|logo|portrait/i.test(f.name) && input[f.name]) return input[f.name];
      }
      for (const f of photoFields) {
        if (input[f.name]) return input[f.name];
      }
      for (const k of ["hero_photo_url", "photo_url", "photo", "hero_photo", "player_photo", "coach_photo"]) {
        if (input[k]) return input[k];
      }
      return null;
    };

    const runStabilitySharpPipeline = async () => {
      const t0 = Date.now();
      const workerUrl = Deno.env.get("COMPOSITE_WORKER_URL");
      const workerToken = Deno.env.get("COMPOSITE_WORKER_TOKEN");
      const tpl = templateRes.data as any;
      const heroSource = (tpl.hero_source || "ai_background") as "ai_background" | "user_photo" | "hybrid";
      const orgSport = (orgRes.data as any)?.sport || null;
      const orgName = orgRes.data?.name || "Organization";
      const brand = (brandRes.data || {}) as any;
      const input = prompt_input || {};

      try {
        if (!workerUrl) throw new Error("COMPOSITE_WORKER_URL not configured");

        const rawSpec = tpl.composition_config || null;
        if (!rawSpec) throw new Error("Template has no composition_config — cannot composite");

        // Interpolate text/colors in the composition spec
        const compositionSpec = interpolateSpec(
          rawSpec,
          buildSpecContext({ orgName, brandKit: brand, promptInput: input }),
        );

        // Hero photo for user_photo + hybrid modes
        const heroPhotoUrl = findHeroPhoto(tpl, input);
        if ((heroSource === "user_photo" || heroSource === "hybrid") && !heroPhotoUrl) {
          throw new Error(`This template requires a hero photo (mode: ${heroSource}). Upload a photo before generating.`);
        }

        let bgUrl: string | null = null;
        let bgColor: string | null = null;
        let stabilityPrompt: string | null = null;
        let stabilitySeed: number | null = null;
        let totalCost = 0;
        let model: StabilityModel = (input.use_premium ? "sd3.5-large" : (tpl.stability_model || "core")) as StabilityModel;

        // ============ MODE: ai_background ============
        if (heroSource === "ai_background") {
          stabilityPrompt = buildStabilityPrompt(tpl, brand, input, orgSport);
          const negativeExtra = buildStabilitySportNegative(orgSport);
          const negativePrompt = negativeExtra
            ? `${STABILITY_NEGATIVE_PROMPT}, ${negativeExtra}`
            : STABILITY_NEGATIVE_PROMPT;
          const aspect = ASPECT_RATIOS[tpl.design_type] || "1:1";
          const r = await callStabilityAI({ prompt: stabilityPrompt, negativePrompt, aspectRatio: aspect, model });
          stabilitySeed = r.seed;
          totalCost += r.costCents;

          const bgPath = `${org_id}/${designId}/background.png`;
          const up = await admin.storage.from("design-renders").upload(bgPath, r.imageBytes, {
            contentType: "image/png", upsert: true,
          });
          if (up.error) throw new Error(`bg upload: ${up.error.message}`);
          const { data: signed } = await admin.storage.from("design-renders").createSignedUrl(bgPath, 86400 * 7);
          bgUrl = signed?.signedUrl || null;
        }

        // ============ MODE: user_photo ============
        // The user's photo IS the hero. Use it as the canvas background (full-bleed),
        // no Stability call. Text overlays composited on top.
        if (heroSource === "user_photo") {
          bgUrl = heroPhotoUrl!;
        }

        // ============ MODE: hybrid ============
        // Stability generates an environment (no people). User photo gets its
        // background removed and is composited as the centered subject layer.
        if (heroSource === "hybrid") {
          // 1. AI environment
          stabilityPrompt = buildStabilityPrompt(tpl, brand, input, orgSport);
          const negativeExtra = buildStabilitySportNegative(orgSport);
          const negativePrompt = [
            STABILITY_NEGATIVE_PROMPT,
            negativeExtra,
            "people, person, athlete, player, human, face, silhouette, figure",
          ].filter(Boolean).join(", ");
          const aspect = ASPECT_RATIOS[tpl.design_type] || "1:1";
          const r = await callStabilityAI({ prompt: stabilityPrompt, negativePrompt, aspectRatio: aspect, model });
          stabilitySeed = r.seed;
          totalCost += r.costCents;
          const bgPath = `${org_id}/${designId}/background.png`;
          const up = await admin.storage.from("design-renders").upload(bgPath, r.imageBytes, {
            contentType: "image/png", upsert: true,
          });
          if (up.error) throw new Error(`bg upload: ${up.error.message}`);
          const { data: signed } = await admin.storage.from("design-renders").createSignedUrl(bgPath, 86400 * 7);
          bgUrl = signed?.signedUrl || null;

          // 2. Remove bg from user photo → cutout
          const photoBytes = await fetchImageBytes(heroPhotoUrl!);
          const cutout = await removeBackground(photoBytes);
          totalCost += cutout.costCents;
          const cutoutPath = `${org_id}/${designId}/hero_cutout.png`;
          const cup = await admin.storage.from("design-renders").upload(cutoutPath, cutout.bytes, {
            contentType: "image/png", upsert: true,
          });
          if (cup.error) throw new Error(`cutout upload: ${cup.error.message}`);
          const { data: csigned } = await admin.storage.from("design-renders").createSignedUrl(cutoutPath, 86400 * 7);
          const cutoutUrl = csigned?.signedUrl || null;
          if (!cutoutUrl) throw new Error("could not sign cutout url");

          // 3. Inject cutout as an image layer in the composition spec.
          // Honor template's hero_zone if defined, else center-cover at 70% of canvas.
          const canvas = compositionSpec.canvas || { width: 1080, height: 1080 };
          const zone = compositionSpec.hero_zone || {
            width: Math.round(canvas.width * 0.70),
            height: Math.round(canvas.height * 0.85),
            x: Math.round(canvas.width * 0.15),
            y: Math.round(canvas.height * 0.10),
          };
          const heroLayer = {
            type: "image",
            url: cutoutUrl,
            x: zone.x, y: zone.y, width: zone.width, height: zone.height,
          };
          // Insert cutout BEFORE rect/text overlays so text reads on top of the subject silhouette
          // but find the right insertion index: after any existing background-rect layer.
          const existingLayers = Array.isArray(compositionSpec.layers) ? compositionSpec.layers : [];
          // Heuristic: insert right after the first full-canvas rect (typical scrim), else at index 0.
          let insertAt = 0;
          for (let i = 0; i < existingLayers.length; i++) {
            const l = existingLayers[i];
            if (l.type === "rect" && (l.width >= canvas.width * 0.9) && (l.height >= canvas.height * 0.9)) {
              insertAt = i + 1;
              break;
            }
          }
          existingLayers.splice(insertAt, 0, heroLayer);
          compositionSpec.layers = existingLayers;
        }

        // For user_photo mode we have no explicit color; for ai_background/hybrid we have bgUrl.
        if (heroSource === "user_photo" && !bgUrl) {
          bgColor = brand.color_dark || "#0F172A";
        }

        // ============ COMPOSITE ============
        const compResp = await fetch(`${workerUrl.replace(/\/$/, "")}/composite`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(workerToken ? { Authorization: `Bearer ${workerToken}` } : {}),
          },
          body: JSON.stringify({
            ...(bgUrl ? { background_url: bgUrl } : {}),
            ...(bgColor ? { background_color: bgColor } : {}),
            composition_spec: compositionSpec,
            brand_kit: brand,
            prompt_input: input,
            output_format: "png",
          }),
        });
        if (!compResp.ok) {
          const errTxt = await compResp.text();
          throw new Error(`composite worker ${compResp.status}: ${errTxt.slice(0, 300)}`);
        }
        const compBytes = new Uint8Array(await compResp.arrayBuffer());
        const finalPath = `${org_id}/${designId}/final.png`;
        const fup = await admin.storage.from("design-renders").upload(finalPath, compBytes, {
          contentType: "image/png", upsert: true,
        });
        if (fup.error) throw new Error(`final upload: ${fup.error.message}`);
        const { data: fsigned } = await admin.storage.from("design-renders").createSignedUrl(finalPath, 86400 * 7);
        const finalUrl = fsigned?.signedUrl || bgUrl || "";

        const engineLabel =
          heroSource === "user_photo" ? "user_photo_sharp" :
          heroSource === "hybrid" ? "stability_sharp_hybrid" :
          (model === "sd3.5-large" ? "stability_sharp_premium" : "stability_sharp");

        await admin.from("designs").update({
          status: "ready",
          generation_engine: engineLabel,
          stability_prompt: stabilityPrompt,
          stability_image_url: bgUrl,
          stability_seed: stabilitySeed,
          composition_spec: compositionSpec,
          generation_cost_cents: totalCost,
          generation_time_ms: Date.now() - t0,
          preview_url: finalUrl,
          ai_model_used: heroSource === "user_photo" ? "user_photo" : `stability/${model}`,
          generation_error: null,
        }).eq("id", designId);
      } catch (err) {
        console.error("Stability/sharp pipeline exception", err);
        await admin.from("designs").update({
          status: "failed",
          generation_error: String(err).slice(0, 500),
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

    const runGeneration = useStability ? runStabilitySharpPipeline : runHtmlGeneration;

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
