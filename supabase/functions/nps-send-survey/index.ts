// Sends an NPS survey email to all contacts in the survey's audience segment.
// Creates one magic_link per recipient (token + survey_id + contact_id) and
// emails them via Resend with 0–10 buttons that link to /nps/:token?score=N.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]!));
}

function buildEmailHtml(opts: {
  question: string;
  orgName: string;
  publicBase: string;
  token: string;
}) {
  const q = escapeHtml(opts.question.replace("{org_name}", opts.orgName));
  const buttons = Array.from({ length: 11 }, (_, i) => {
    const color = i <= 6 ? "#ef4444" : i <= 8 ? "#f59e0b" : "#22c55e";
    const url = `${opts.publicBase}/nps/${opts.token}?score=${i}`;
    return `<a href="${url}" style="display:inline-block;width:38px;height:38px;line-height:38px;text-align:center;background:${color};color:#fff;text-decoration:none;font-weight:700;font-family:Arial,sans-serif;border-radius:6px;margin:2px;">${i}</a>`;
  }).join("");
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#111;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
      <table width="560" style="max-width:560px;background:#fff;border-radius:12px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 12px;font-size:22px;">A quick favor from ${escapeHtml(opts.orgName)}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#444;">${q}</p>
          <div style="text-align:center;line-height:0;">${buttons}</div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#777;margin-top:8px;"><span>Not at all likely</span><span>Extremely likely</span></div>
          <p style="margin:32px 0 0;font-size:12px;color:#999;">Tap a number to share your feedback. Thank you!</p>
        </td></tr>
      </table>
    </td></tr></table></body></html>`;
}

function applySegmentFilters(query: any, rules: any) {
  if (!rules || typeof rules !== "object") return query;
  if (rules.contact_type) query = query.eq("contact_type", rules.contact_type);
  if (rules.unsubscribed === "false") query = query.eq("unsubscribed", false);
  if (rules.sms_opt_in === "true") query = query.eq("sms_opt_in", true);
  if (rules.season) query = query.eq("season", rules.season);
  if (rules.grad_year) query = query.eq("player_grad_year", parseInt(rules.grad_year));
  return query;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { survey_id, test_email } = await req.json();
    if (!survey_id) return new Response(JSON.stringify({ error: "survey_id required" }), { status: 400, headers: corsHeaders });

    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: survey } = await admin.from("org_nps_surveys").select("*, organizations(name)").eq("id", survey_id).single();
    if (!survey) return new Response(JSON.stringify({ error: "Survey not found" }), { status: 404, headers: corsHeaders });

    const orgName = (survey as any).organizations?.name || "our club";
    const publicBase = req.headers.get("origin") || "https://os.curvesports.com";

    // Determine recipients
    let recipients: Array<{ id: string | null; email: string; first_name?: string | null }> = [];

    if (test_email) {
      recipients = [{ id: null, email: test_email }];
    } else {
      if (!survey.audience_segment_id) {
        return new Response(JSON.stringify({ error: "No audience segment selected. Edit the survey to choose an audience first." }), { status: 400, headers: corsHeaders });
      }
      const { data: seg } = await admin.from("org_contact_segments").select("*").eq("id", survey.audience_segment_id).single();
      if (!seg) return new Response(JSON.stringify({ error: "Segment not found" }), { status: 404, headers: corsHeaders });

      let q = admin.from("org_contacts").select("id, email, first_name, unsubscribed, archived_at")
        .eq("org_id", survey.org_id)
        .not("email", "is", null)
        .eq("unsubscribed", false)
        .is("archived_at", null);
      q = applySegmentFilters(q, seg.filter_rules);
      const { data: cs } = await q;
      recipients = (cs ?? []).filter((c: any) => c.email).map((c: any) => ({ id: c.id, email: c.email, first_name: c.first_name }));
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients matched. Check segment filters or contact list." }), { status: 400, headers: corsHeaders });
    }

    let sent = 0, failed = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      try {
        const token = crypto.randomUUID().replace(/-/g, "");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(); // 60 days

        await admin.from("magic_links").insert({
          org_id: survey.org_id,
          token,
          action: "nps_response",
          payload: { survey_id: survey.id, contact_id: r.id },
          contact_id: r.id,
          expires_at: expiresAt,
          created_by: userData.user.id,
        });

        const html = buildEmailHtml({ question: survey.question, orgName, publicBase, token });
        const subject = `A quick favor from ${orgName}`;

        const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: `${orgName} <onboarding@resend.dev>`,
            to: [r.email],
            subject,
            html,
          }),
        });
        if (!resp.ok) {
          const errBody = await resp.text();
          failed++;
          errors.push(`${r.email}: ${errBody.slice(0, 200)}`);
        } else {
          sent++;
        }
      } catch (e) {
        failed++;
        errors.push(`${r.email}: ${String(e).slice(0, 200)}`);
      }
    }

    if (!test_email) {
      await admin.from("org_nps_surveys").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: sent,
      }).eq("id", survey.id);
    }

    return new Response(JSON.stringify({ sent, failed, total: recipients.length, errors: errors.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nps-send-survey", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
