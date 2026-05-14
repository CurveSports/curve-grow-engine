import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Optional signature check
  const secret = Deno.env.get("AYRSHARE_WEBHOOK_SECRET");
  const sig = req.headers.get("x-ayrshare-signature") ?? req.headers.get("x-webhook-signature");
  if (secret && sig && sig !== secret) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let payload: Record<string, unknown>;
  try { payload = await req.json(); } catch { payload = {}; }

  const event = (payload.event as string) ?? (payload.action as string) ?? "";
  const profileKey = (payload.profileKey as string) ?? "";
  console.log(`[ayrshare-webhook] event=${event} profileKey=${profileKey ? "***" : "<none>"}`);

  // Look up org from profile key
  let orgId: string | null = null;
  if (profileKey) {
    const { data } = await supabase
      .from("org_ayrshare_profiles").select("org_id").eq("ayrshare_profile_key", profileKey).maybeSingle();
    orgId = data?.org_id ?? null;
  }

  try {
    switch (event) {
      case "social.connected":
      case "account.connected": {
        if (!orgId) break;
        const platform = (payload.platform as string) ?? "instagram";
        const handle = (payload.accountName as string) ?? (payload.username as string) ?? platform;
        const accountId = (payload.accountId as string) ?? null;
        await supabase.from("org_social_accounts").upsert({
          org_id: orgId, provider: platform, handle, display_name: handle,
          ayrshare_account_id: accountId, status: "connected",
        }, { onConflict: "org_id,provider,handle" });
        break;
      }
      case "social.disconnected":
      case "account.disconnected": {
        if (!orgId) break;
        const platform = (payload.platform as string) ?? "";
        await supabase.from("org_social_accounts")
          .update({ status: "disconnected" })
          .eq("org_id", orgId).eq("provider", platform);
        break;
      }
      case "post.success":
      case "post.published": {
        const postId = (payload.id as string) ?? (payload.postId as string) ?? "";
        if (!postId) break;
        await supabase.from("org_social_posts").update({
          status: "posted",
          posted_at: (payload.postedAt as string) ?? new Date().toISOString(),
          platform_urls: (payload.postUrls as Record<string, string>) ?? {},
        }).eq("ayrshare_post_id", postId);
        break;
      }
      case "post.failure":
      case "post.failed": {
        const postId = (payload.id as string) ?? (payload.postId as string) ?? "";
        if (!postId) break;
        await supabase.from("org_social_posts").update({
          status: "failed",
          error_message: (payload.message as string) ?? (payload.error as string) ?? "Post failed",
        }).eq("ayrshare_post_id", postId);
        break;
      }
      default:
        console.log(`[ayrshare-webhook] unhandled event: ${event}`);
    }
  } catch (e) {
    console.error("[ayrshare-webhook] handler error:", e);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
