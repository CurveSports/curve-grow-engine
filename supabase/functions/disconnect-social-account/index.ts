import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { account_id } = await req.json();
    if (!account_id) {
      return new Response(JSON.stringify({ error: "account_id required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: account } = await supabase
      .from("org_social_accounts").select("*").eq("id", account_id).single();
    if (!account) throw new Error("account not found");

    const { data: profile } = await supabase
      .from("org_ayrshare_profiles").select("*").eq("org_id", account.org_id).maybeSingle();

    const apiKey = Deno.env.get("AYRSHARE_API_KEY");
    if (apiKey && profile && !profile.is_mock) {
      await fetch("https://app.ayrshare.com/api/profiles/social", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ platform: account.provider, profileKey: profile.ayrshare_profile_key }),
      });
    }
    await supabase.from("org_social_accounts")
      .update({ status: "disconnected" }).eq("id", account_id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
