// Generates a thumbnail for a design template using placeholder org/brand
// context and dummy input values. Runs the same Stability + composite-worker
// pipeline as generate-design, then writes the result back to
// design_templates.thumbnail_url.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callStabilityAI, ASPECT_RATIOS, type StabilityModel } from "../_shared/stability.ts";
import { buildStabilityPrompt } from "../_shared/buildStabilityPrompt.ts";
import { buildSpecContext, interpolateSpec } from "../_shared/interpolateSpec.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Generic brand kit for placeholder rendering
const SAMPLE_BRAND = {
  color_primary: "#1E3A5F",
  color_secondary: "#475569",
  color_accent: "#22C55E",
  color_dark: "#0F172A",
  color_light: "#FFFFFF",
  font_heading: "Inter",
  font_body: "Inter",
  logo_primary_url: "https://api.dicebear.com/9.x/initials/png?seed=Sample%20Sports%20Club&backgroundColor=1E3A5F&textColor=ffffff",
};

const SAMPLE_ORG_NAME = "Sample Sports Club";

function sampleValueForField(f: any): any {
  const t = (f.type || "text") as string;
  const name = (f.name || "").toLowerCase();
  if (name.includes("headline") || name.includes("title")) return "BIG MOMENT";
  if (name.includes("eyebrow") || name.includes("label")) return "PRESENTS";
  if (name.includes("subhead") || name.includes("sub_head")) return "AGES 10-14";
  if (name.includes("cta")) return "REGISTER NOW";
  if (name.includes("date") || t === "date") return "SAT, JUN 15";
  if (name.includes("time")) return "10:00 AM";
  if (name.includes("location")) return "Sample Park, Field 3";
  if (name.includes("detail")) return "SAT, JUN 15  •  10:00 AM";
  if (name.includes("age")) return "10-14";
  if (name.includes("photo") || t === "photo_selector") return "";
  if (name.includes("logo")) return "";
  if (t === "number") return "5";
  if (t === "url") return "https://example.com";
  if (t === "select" && Array.isArray(f.options) && f.options.length) return f.options[0];
  if (t === "multi_select" && Array.isArray(f.options) && f.options.length) return [f.options[0]];
  return "Sample Text";
}

function placeholderInputs(template: any): Record<string, any> {
  const out: Record<string, any> = {
    // Common slot tokens used by default presets
    headline: "BIG MOMENT",
    eyebrow: "PRESENTS",
    subhead: "AGES 10-14",
    detail_line: "SAT, JUN 15  •  10:00 AM",
    location: "Sample Park, Field 3",
    cta: "REGISTER NOW",
  };
  for (const f of (template.input_fields || [])) {
    out[f.name] = sampleValueForField(f);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { template_id } = await req.json();
    if (!template_id) {
      return new Response(JSON.stringify({ error: "template_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: admin only
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

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    if (!(roles || []).find((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: template, error: tErr } = await admin
      .from("design_templates").select("*").eq("id", template_id).single();
    if (tErr || !template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stabilityKey = Deno.env.get("STABILITY_API_KEY");
    if (!stabilityKey) {
      return new Response(JSON.stringify({ error: "STABILITY_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promptInput = placeholderInputs(template);

    // 1. Stability background
    const prompt = buildStabilityPrompt(template as any, SAMPLE_BRAND as any, promptInput);
    const aspect = ASPECT_RATIOS[template.design_type] || "1:1";
    const model = (template.stability_model || "core") as StabilityModel;
    const result = await callStabilityAI({ prompt, aspectRatio: aspect, model });

    // 2. Upload raw background
    const bgPath = `_thumbnails/${template_id}/background.png`;
    await admin.storage.from("design-renders").upload(bgPath, result.imageBytes, {
      contentType: "image/png", upsert: true,
    });
    const { data: bgSigned } = await admin.storage.from("design-renders").createSignedUrl(bgPath, 86400 * 30);
    const bgUrl = bgSigned?.signedUrl || "";

    // 3. Composite overlay if worker + spec available
    let finalUrl = bgUrl;
    const workerUrl = Deno.env.get("COMPOSITE_WORKER_URL");
    const workerToken = Deno.env.get("COMPOSITE_WORKER_TOKEN");
    const rawSpec = template.composition_config || null;
    const compositionSpec = rawSpec
      ? interpolateSpec(rawSpec, buildSpecContext({
          orgName: SAMPLE_ORG_NAME, brandKit: SAMPLE_BRAND, promptInput,
        }))
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
            brand_kit: SAMPLE_BRAND,
            output_format: "png",
          }),
        });
        if (compResp.ok) {
          const compBytes = new Uint8Array(await compResp.arrayBuffer());
          const finalPath = `_thumbnails/${template_id}/thumbnail.png`;
          const up = await admin.storage.from("design-renders").upload(finalPath, compBytes, {
            contentType: "image/png", upsert: true,
          });
          if (!up.error) {
            const { data: signed } = await admin.storage.from("design-renders").createSignedUrl(finalPath, 86400 * 365);
            if (signed?.signedUrl) finalUrl = signed.signedUrl;
          }
        } else {
          console.warn("composite worker failed", compResp.status, await compResp.text());
        }
      } catch (e) {
        console.warn("composite worker exception", e);
      }
    }

    await admin.from("design_templates")
      .update({ thumbnail_url: finalUrl })
      .eq("id", template_id);

    return new Response(JSON.stringify({ thumbnail_url: finalUrl, composited: finalUrl !== bgUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-template-thumbnail exception", e);
    return new Response(JSON.stringify({ error: String(e).slice(0, 500) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
