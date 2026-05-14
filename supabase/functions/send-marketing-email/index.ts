// Send a marketing email blast via Resend to a contact segment.
// Per project memory: uses onboarding@resend.dev (no DNS access yet) — UI captures from_email but actual sends use the verified address.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function resolveContactIdsByTeams(admin: any, orgId: string, teamIds: string[], role?: string): Promise<Set<string>> {
  let q = admin.from("org_team_memberships").select("contact_id, role, team:org_teams!inner(org_id)")
    .in("team_id", teamIds);
  if (role) q = q.eq("role", role);
  const { data } = await q;
  const ids = new Set<string>();
  (data || []).forEach((m: any) => {
    if (m.team?.org_id === orgId && m.contact_id) ids.add(m.contact_id);
  });
  return ids;
}

function buildContactQuery(rules: any) {
  return (q: any) => {
    if (rules?.contact_type) q = q.eq("contact_type", rules.contact_type);
    if (rules?.contact_types) q = q.in("contact_type", rules.contact_types);
    if (rules?.season) q = q.eq("season", rules.season);
    if (rules?.team_assignments) q = q.overlaps("team_assignments", rules.team_assignments);
    if (rules?.sms_opt_in !== undefined) q = q.eq("sms_opt_in", rules.sms_opt_in === "true" || rules.sms_opt_in === true);
    if (rules?.unsubscribed !== undefined) q = q.eq("unsubscribed", rules.unsubscribed === "true" || rules.unsubscribed === true);
    if (rules?.grad_year) q = q.eq("player_grad_year", Number(rules.grad_year));
    return q;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { send_id } = await req.json();
    if (!send_id) {
      return new Response(JSON.stringify({ error: "send_id required" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: send, error } = await admin.from("org_email_sends").select("*").eq("id", send_id).single();
    if (error || !send) {
      return new Response(JSON.stringify({ error: "Send not found" }), { status: 404, headers: corsHeaders });
    }
    if (send.status !== "draft" && send.status !== "scheduled") {
      return new Response(JSON.stringify({ error: `Cannot send (status=${send.status})` }), { status: 409, headers: corsHeaders });
    }

    // Resolve recipients
    const { data: segment } = await admin.from("org_contact_segments").select("*").eq("id", send.segment_id).single();
    const rules = segment?.filter_rules ?? {};
    let q = admin.from("org_contacts").select("id, email, first_name, last_name")
      .eq("org_id", send.org_id).eq("unsubscribed", false).eq("hard_bounce", false).not("email", "is", null);
    q = buildContactQuery(rules)(q);

    // team_id (single) and team_ids (multi-team union) — apply via membership lookup
    const teamIds: string[] = Array.isArray(rules.team_ids) ? rules.team_ids : (rules.team_id ? [rules.team_id] : []);
    if (teamIds.length > 0) {
      const allowed = await resolveContactIdsByTeams(admin, send.org_id, teamIds, rules.team_role);
      if (allowed.size === 0) {
        await admin.from("org_email_sends").update({ status: "sent", sent_at: new Date().toISOString(), recipient_count: 0, delivered_count: 0 }).eq("id", send_id);
        return new Response(JSON.stringify({ recipient_count: 0, delivered: 0, failures: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      q = q.in("id", Array.from(allowed));
    }

    const { data: contacts } = await q;
    const recipients = (contacts || []).filter((c: any) => c.email);

    await admin.from("org_email_sends").update({
      status: "sending", recipient_count: recipients.length,
    }).eq("id", send_id);

    // Send via Resend (in batches of 100)
    let delivered = 0, failures = 0;
    const fromAddress = send.from_email && send.from_email.includes("@") ? send.from_email : "onboarding@resend.dev";
    const fromHeader = send.from_name ? `${send.from_name} <${fromAddress}>` : fromAddress;

    for (let i = 0; i < recipients.length; i += 100) {
      const batch = recipients.slice(i, i + 100);
      await Promise.all(batch.map(async (c: any) => {
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: fromHeader,
              to: [c.email],
              subject: send.subject || "(no subject)",
              html: send.html_body || "<p>(empty)</p>",
              text: send.text_body || undefined,
              reply_to: send.reply_to || undefined,
              tags: [{ name: "send_id", value: send_id }, { name: "contact_id", value: c.id }],
            }),
          });
          if (r.ok) {
            delivered++;
            await admin.from("org_email_events").insert({
              send_id, contact_id: c.id, email: c.email, event_type: "delivered",
            });
          } else {
            failures++;
            const t = await r.text();
            await admin.from("org_email_events").insert({
              send_id, contact_id: c.id, email: c.email, event_type: "failed",
              event_data: { status: r.status, body: t.slice(0, 500) },
            });
          }
        } catch (e) {
          failures++;
          console.error("send error for", c.email, e);
        }
      }));
    }

    await admin.from("org_email_sends").update({
      status: "sent", sent_at: new Date().toISOString(),
      delivered_count: delivered, bounced_count: failures,
    }).eq("id", send_id);

    return new Response(JSON.stringify({ recipient_count: recipients.length, delivered, failures }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-marketing-email", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
