// Sends a 7am daily digest email to org primaries with marketing snapshot.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const RESEND = Deno.env.get("RESEND_API_KEY");
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, email, primary_user_id");

  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  let sent = 0;

  for (const o of orgs ?? []) {
    if (!o.email) continue;

    const [{ data: pendingApprovals }, { data: detractors }, { data: sends }] = await Promise.all([
      supabase.from("approval_queue").select("id", { count: "exact", head: true })
        .eq("org_id", o.id).eq("current_stage", "org_review").eq("status", "pending"),
      supabase.from("org_nps_responses").select("id", { count: "exact", head: true })
        .eq("flagged_for_followup", true).is("followup_completed_at", null),
      supabase.from("org_email_sends").select("opened_count, clicked_count, recipient_count")
        .eq("org_id", o.id).gte("sent_at", since),
    ]);

    const opens = (sends ?? []).reduce((a: number, s: any) => a + (s.opened_count || 0), 0);
    const clicks = (sends ?? []).reduce((a: number, s: any) => a + (s.clicked_count || 0), 0);
    const recipients = (sends ?? []).reduce((a: number, s: any) => a + (s.recipient_count || 0), 0);

    if (recipients === 0 && (pendingApprovals as any)?.count === 0 && (detractors as any)?.count === 0) continue;

    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h1 style="font-size:20px;margin:0 0 16px;">Good morning, ${o.name}.</h1>
        <p style="color:#555;font-size:14px;">Here's your marketing snapshot for the last 24 hours.</p>
        <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>${recipients}</strong> emails sent · <strong>${opens}</strong> opens · <strong>${clicks}</strong> clicks</p>
          ${(pendingApprovals as any)?.count ? `<p style="margin:0 0 4px;color:#b45309;">⏳ ${(pendingApprovals as any).count} asset(s) awaiting your approval</p>` : ""}
          ${(detractors as any)?.count ? `<p style="margin:0;color:#b91c1c;">⚠️ ${(detractors as any).count} NPS detractor(s) need follow-up</p>` : ""}
        </div>
        <p><a href="https://os.curvesports.com/marketing" style="color:#3b82f6;">Open Marketing Hub →</a></p>
      </div>
    `;

    if (RESEND && LOVABLE) {
      try {
        await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE}`,
            "X-Connection-Api-Key": RESEND,
          },
          body: JSON.stringify({
            from: "Curve Marketing <onboarding@resend.dev>",
            to: [o.email],
            subject: `Daily marketing digest — ${o.name}`,
            html,
          }),
        });
        sent++;
      } catch (_e) { /* swallow */ }
    }
  }

  return new Response(JSON.stringify({ sent, orgs: orgs?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
