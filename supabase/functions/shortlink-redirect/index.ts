// Public redirect endpoint for branded shortlinks.
// URL pattern: /functions/v1/shortlink-redirect?s=<slug>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "|curve-shortlink");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("s") || url.pathname.split("/").pop();
  if (!slug) return new Response("Missing slug", { status: 400 });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: link } = await supabase
    .from("org_shortlinks")
    .select("id,target_url,active,expires_at,click_count")
    .eq("slug", slug)
    .maybeSingle();

  if (!link || !link.active) return new Response("Link not found", { status: 404 });
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return new Response("Link expired", { status: 410 });
  }

  // Log click (fire and forget)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const ua = req.headers.get("user-agent") ?? null;
  const referer = req.headers.get("referer") ?? null;
  const country = req.headers.get("cf-ipcountry") ?? null;
  const ipHash = await hashIp(ip);

  // Increment counter and insert click row (best-effort, non-blocking)
  await Promise.all([
    supabase.from("org_shortlinks").update({ click_count: (link.click_count ?? 0) + 1 }).eq("id", link.id),
    supabase.from("shortlink_clicks").insert({
      shortlink_id: link.id,
      user_agent: ua,
      referer,
      ip_hash: ipHash,
      country,
    }),
  ]).catch((e) => console.error("click logging failed", e));

  return Response.redirect(link.target_url, 302);
});
