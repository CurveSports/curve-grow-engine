// Send compliance reminder emails via Resend.
// Body: { staff_id, item_ids } OR { acquisition_id, bulk: true }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_INSTRUCTIONS: Record<string, string> = {
  background_check: "Please complete your background screening through the membership portal.",
  fingerprinting: "Please schedule a LiveScan fingerprinting appointment at an FDLE-approved vendor. After completion, submit your receipt or TCN number to your Integration Lead.",
  concussion_training: "Please complete your concussion protocol training through the portal.",
  abuse_prevention_training: "Please complete your abuse prevention training through the portal.",
  handbook_acknowledgment: "Please review and acknowledge the employee handbook.",
  other: "Please complete this requirement as soon as possible.",
};

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: "Curve Sports <onboarding@resend.dev>", to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

function buildEmail(staff: any, club: string, items: any[]): { subject: string; html: string } {
  const subject = items.length === 1
    ? `Action Required — ${items[0].requirement_name}`
    : `Action Required — ${items.length} compliance items at ${club}`;
  const itemsHtml = items.map((i) => `
    <li style="margin-bottom:16px">
      <strong>${i.requirement_name}</strong><br>
      Due: ${i.due_date ?? "TBD"} · Status: ${i.status}<br>
      <em style="color:#555;font-size:13px">${REMINDER_INSTRUCTIONS[i.requirement_type] ?? ""}</em>
      ${i.ori_number ? `<br><span style="font-size:13px">ORI: ${i.ori_number}</span>` : ""}
    </li>`).join("");
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">
      <h2>Hi ${staff.first_name},</h2>
      <p>As part of our onboarding process at <strong>${club}</strong>, you have the following compliance requirements outstanding:</p>
      <ul style="padding-left:18px">${itemsHtml}</ul>
      <p>If you have questions, please reply to this email or contact your Integration Lead.</p>
      <p>Thank you,<br>${club} / Curve Sports</p>
    </div>`;
  return { subject, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let staffList: any[] = [];
    let acquisition: any = null;
    let itemFilter: string[] | null = null;

    if (body.bulk && body.acquisition_id) {
      const { data: acq } = await supabase.from("acquisition_projects").select("id, club_name").eq("id", body.acquisition_id).maybeSingle();
      acquisition = acq;
      const { data: ss } = await supabase.from("acquisition_staff").select("*").eq("acquisition_id", body.acquisition_id).eq("is_active", true).neq("compliance_status", "compliant").not("email", "is", null);
      staffList = ss ?? [];
    } else if (body.staff_id) {
      const { data: s } = await supabase.from("acquisition_staff").select("*").eq("id", body.staff_id).maybeSingle();
      if (s) {
        staffList = [s];
        const { data: acq } = await supabase.from("acquisition_projects").select("id, club_name").eq("id", s.acquisition_id).maybeSingle();
        acquisition = acq;
      }
      itemFilter = body.item_ids ?? null;
    } else {
      throw new Error("Missing staff_id or acquisition_id");
    }

    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    let sent = 0;

    for (const staff of staffList) {
      if (!staff.email) continue;
      let q = supabase.from("acquisition_compliance_items").select("*").eq("staff_id", staff.id).not("status", "in", "(complete,waived,submitted)");
      if (itemFilter) q = q.in("id", itemFilter);
      const { data: items } = await q;
      const list = (items ?? []).filter((i) => !i.last_reminder_sent_at || i.last_reminder_sent_at < cutoff);
      if (list.length === 0) continue;
      const { subject, html } = buildEmail(staff, acquisition?.club_name ?? "your club", list);
      try {
        await sendEmail(staff.email, subject, html);
        await supabase.from("acquisition_compliance_items").update({
          last_reminder_sent_at: new Date().toISOString(),
          reminder_count: (list[0].reminder_count ?? 0) + 1,
        }).in("id", list.map((i) => i.id));
        sent += 1;
      } catch (e) {
        console.error("send failed", staff.email, e);
      }
    }

    return new Response(JSON.stringify({ sent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
