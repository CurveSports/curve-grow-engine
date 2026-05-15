import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const MIN_LONG_EDGE_LOW = 512;
const MIN_LONG_EDGE_HIGH = 1024;

type Body = {
  org_id: string;
  original_url: string;
  width?: number;
  height?: number;
  format?: string;
  is_vector?: boolean;
};

async function callImageAI(prompt: string, imageDataUrl: string): Promise<string | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    console.error("AI gateway error", res.status, await res.text());
    return null;
  }
  const json = await res.json();
  const images = json?.choices?.[0]?.message?.images;
  return images?.[0]?.image_url?.url ?? null;
}

async function urlToDataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  const buf = new Uint8Array(await r.arrayBuffer());
  const mime = r.headers.get("content-type") || "image/png";
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return `data:${mime};base64,${btoa(bin)}`;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("bad data url");
  const mime = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.org_id || !body?.original_url) {
      return new Response(JSON.stringify({ error: "org_id and original_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const longEdge = Math.max(body.width ?? 0, body.height ?? 0);

    let quality: "vector" | "high" | "medium" | "low" = "medium";
    if (body.is_vector || body.format === "svg") quality = "vector";
    else if (longEdge >= 1500) quality = "high";
    else if (longEdge >= MIN_LONG_EDGE_HIGH) quality = "medium";
    else quality = "low";

    // Vector logos skip AI processing entirely
    if (quality === "vector") {
      await admin.from("org_branding").upsert(
        {
          org_id: body.org_id,
          logo_url: body.original_url,
          logo_original_url: body.original_url,
          logo_quality: "vector",
          logo_processing_status: "skipped",
          logo_width: body.width ?? null,
          logo_height: body.height ?? null,
          logo_format: body.format ?? "svg",
        },
        { onConflict: "org_id" }
      );
      return new Response(JSON.stringify({ ok: true, quality: "vector", processed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as pending so UI can show spinner
    await admin
      .from("org_branding")
      .upsert(
        {
          org_id: body.org_id,
          logo_original_url: body.original_url,
          logo_processing_status: "pending",
          logo_quality: quality,
          logo_width: body.width ?? null,
          logo_height: body.height ?? null,
          logo_format: body.format ?? null,
        },
        { onConflict: "org_id" }
      );

    const dataUrl = await urlToDataUrl(body.original_url);

    // Single-pass enhancement: remove background + upscale if low res
    const needsUpscale = longEdge < MIN_LONG_EDGE_HIGH;
    const prompt = needsUpscale
      ? "Output ONLY the cleaned logo with a fully transparent background (alpha channel). Remove any solid or near-solid background. Upscale to at least 2048px on the long edge. Preserve sharp edges, original colors, and exact letterforms. Do not add effects, shadows, or change the design."
      : "Output ONLY the cleaned logo with a fully transparent background (alpha channel). Remove any solid or near-solid background. Preserve sharp edges, original colors, and exact letterforms. Do not add effects, shadows, or change the design.";

    const enhanced = await callImageAI(prompt, dataUrl);

    if (!enhanced) {
      await admin
        .from("org_branding")
        .update({
          logo_url: body.original_url,
          logo_processing_status: "failed",
          logo_processing_error: "AI enhancement failed; using original",
        })
        .eq("org_id", body.org_id);
      return new Response(
        JSON.stringify({ ok: false, error: "enhancement_failed", fallback: body.original_url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bytes, mime } = dataUrlToBytes(enhanced);
    const path = `${body.org_id}/logo-enhanced-${Date.now()}.png`;
    const up = await admin.storage.from("org-logos").upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (up.error) throw up.error;
    const { data: pub } = admin.storage.from("org-logos").getPublicUrl(path);

    await admin
      .from("org_branding")
      .update({
        logo_url: pub.publicUrl,
        logo_processing_status: "ready",
        logo_processing_error: null,
        logo_quality: quality,
      })
      .eq("org_id", body.org_id);

    return new Response(
      JSON.stringify({ ok: true, quality, processed: true, logo_url: pub.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-org-logo error", err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
