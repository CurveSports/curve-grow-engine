// Render a design to PNG/JPG/PDF using a swappable provider (puppeteer stub | browserless).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PuppeteerProvider } from "./providers/puppeteer.ts";
import { BrowserlessProvider } from "./providers/browserless.ts";
import type { RenderProvider } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getProvider(): RenderProvider {
  const token = Deno.env.get("BROWSERLESS_API_TOKEN");
  if (token) return new BrowserlessProvider(token);
  return new PuppeteerProvider();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { design_id, format = "png", scale = 1 } = await req.json();
    if (!design_id) {
      return new Response(JSON.stringify({ error: "design_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["png", "jpg", "pdf"].includes(format)) {
      return new Response(JSON.stringify({ error: "invalid format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const scaleN = [1, 2, 3].includes(Number(scale)) ? Number(scale) : 1;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: design, error } = await admin.from("designs")
      .select("id, org_id, generated_html, template_id, design_type")
      .eq("id", design_id).single();
    if (error || !design) {
      return new Response(JSON.stringify({ error: "Design not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let width = 1080, height = 1080;
    if (design.template_id) {
      const { data: tpl } = await admin.from("design_templates").select("dimensions").eq("id", design.template_id).single();
      const d = tpl?.dimensions as any;
      if (d?.width) width = d.width;
      if (d?.height) height = d.height;
    }

    const provider = getProvider();
    let result;
    try {
      result = await provider.render({
        html: design.generated_html || "",
        width, height,
        format: format as "png" | "jpg" | "pdf",
        scale: scaleN as 1 | 2 | 3,
        waitForFonts: true,
      });
    } catch (e) {
      const msg = String(e);
      console.error("render error", msg);
      const userMsg = msg.toLowerCase().includes("memory")
        ? "Export failed — this design is too complex. Try a simpler version or contact support."
        : `Export failed via ${provider.name}.`;
      return new Response(JSON.stringify({ error: userMsg, provider: provider.name }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = format === "pdf" ? "pdf" : format;
    const path = `${design.org_id}/${design_id}/${format}_${scaleN}x.${ext}`;
    const upload = await admin.storage.from("design-renders").upload(path, result.buffer, {
      contentType: result.contentType,
      upsert: true,
    });
    if (upload.error) {
      console.error("upload error", upload.error);
      return new Response(JSON.stringify({ error: upload.error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed } = await admin.storage.from("design-renders").createSignedUrl(path, 86400);
    const url = signed?.signedUrl || "";

    // Update design.export_urls and preview_url (1x png)
    const { data: existing } = await admin.from("designs").select("export_urls").eq("id", design_id).single();
    const existingUrls = (existing?.export_urls as Record<string, string>) || {};
    existingUrls[`${format}_${scaleN}x`] = url;
    const updates: any = { export_urls: existingUrls };
    if (format === "png" && scaleN === 1) updates.preview_url = url;
    await admin.from("designs").update(updates).eq("id", design_id);

    return new Response(JSON.stringify({
      url,
      sizeBytes: result.sizeBytes,
      renderTimeMs: result.renderTimeMs,
      provider: provider.name,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("render-design exception", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
