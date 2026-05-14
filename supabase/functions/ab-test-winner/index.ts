// Cron-friendly: picks the A/B winner once decision_window has passed.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: runs, error } = await supabase
    .from("org_ab_test_runs")
    .select("*")
    .eq("status", "running");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  let picked = 0;

  for (const r of runs ?? []) {
    const created = new Date(r.created_at).getTime();
    if (now - created < (r.decision_window_hours ?? 24) * 3_600_000) continue;
    if (!r.variant_a_email_send_id || !r.variant_b_email_send_id) continue;

    const { data: sends } = await supabase
      .from("org_email_sends")
      .select("id, recipient_count, opened_count, clicked_count")
      .in("id", [r.variant_a_email_send_id, r.variant_b_email_send_id]);

    if (!sends || sends.length < 2) continue;
    const a = sends.find((s: any) => s.id === r.variant_a_email_send_id);
    const b = sends.find((s: any) => s.id === r.variant_b_email_send_id);
    if (!a || !b) continue;

    const score = (s: any) => {
      const rc = Math.max(s.recipient_count || 1, 1);
      return r.winner_metric === "click_rate"
        ? (s.clicked_count || 0) / rc
        : (s.opened_count || 0) / rc;
    };

    const winner = score(a) >= score(b) ? "A" : "B";
    await supabase
      .from("org_ab_test_runs")
      .update({
        winner_variant: winner,
        winner_picked_at: new Date().toISOString(),
        status: "complete",
      })
      .eq("id", r.id);
    picked++;
  }

  return new Response(JSON.stringify({ checked: runs?.length ?? 0, picked }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
