// Cron-triggered: finds orgs whose latest combined audit is >=90 days old (or never run)
// and triggers a fresh combined audit for each. Skips orgs with no digital presence info.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Find orgs with digital presence on file
    const { data: presences } = await admin
      .from("org_digital_presence")
      .select("org_id, website_url, instagram_handle, facebook_url, x_handle, tiktok_handle, youtube_url, linkedin_url");

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const triggered: string[] = [];
    const skipped: string[] = [];

    for (const p of presences ?? []) {
      const hasAny = p.website_url || p.instagram_handle || p.facebook_url || p.x_handle ||
                     p.tiktok_handle || p.youtube_url || p.linkedin_url;
      if (!hasAny) { skipped.push(p.org_id); continue; }

      const { data: latest } = await admin
        .from("org_digital_audits")
        .select("completed_at")
        .eq("org_id", p.org_id).eq("audit_type", "combined").eq("status", "completed")
        .order("completed_at", { ascending: false }).limit(1).maybeSingle();

      if (latest?.completed_at && latest.completed_at > ninetyDaysAgo) {
        skipped.push(p.org_id); continue;
      }

      // Fire-and-forget invoke. Function will write its own pending+completed rows.
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/run-digital-audit`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ org_id: p.org_id, audit_type: "combined", trigger_source: "auto_quarterly" }),
        });
        triggered.push(p.org_id);
      } catch (e) {
        console.error("dispatch failed for", p.org_id, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, triggered, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? "failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
