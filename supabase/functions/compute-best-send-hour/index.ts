// Computes per-contact best_send_hour from open history.
// Run nightly via cron, or on-demand per org.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const orgId: string | undefined = body.org_id;

  // Pull last 90d of opens. Table: org_email_opens (contact_id, opened_at)
  // Falls back to no-op if table doesn't exist yet.
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  let q: any = supabase.from("org_email_opens").select("contact_id, opened_at").gte("opened_at", since);
  if (orgId) q = q.eq("org_id", orgId);
  const { data: opens, error } = await q.limit(50000);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message, note: "table may not exist; engine ready." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const buckets: Record<string, number[]> = {};
  for (const o of opens ?? []) {
    const cid = (o as any).contact_id;
    if (!cid) continue;
    const h = new Date((o as any).opened_at).getHours();
    (buckets[cid] ||= Array(24).fill(0))[h]++;
  }

  let updated = 0;
  for (const [cid, hours] of Object.entries(buckets)) {
    const best = hours.indexOf(Math.max(...hours));
    if (hours[best] === 0) continue;
    await supabase.from("org_contacts").update({ best_send_hour: best }).eq("id", cid);
    updated++;
  }

  return new Response(JSON.stringify({ updated, contacts_analyzed: Object.keys(buckets).length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
