import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Curve OS <onboarding@resend.dev>";
const APP_URL = "https://curve-grow-engine.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { lead_id } = await req.json();
    if (!lead_id) return json({ error: "lead_id required" }, 400);

    const { data: lead } = await admin
      .from("sponsorship_leads")
      .select("*, organizations(name)")
      .eq("id", lead_id)
      .maybeSingle();
    if (!lead) return json({ error: "lead not found" }, 404);

    const orgName = (lead as any).organizations?.name ?? "Organization";
    const repName = await getRepName(admin, lead.assigned_to);
    const closedValue = Number((lead as any).closed_value ?? 0);
    const share = closedValue * 0.25;

    // Recipients: all curve admins
    const { data: roleRows } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (roleRows ?? []).map((r: any) => r.user_id);
    const { data: profiles } = await admin.from("profiles").select("email").in("user_id", adminIds.length ? adminIds : ["00000000-0000-0000-0000-000000000000"]);
    const recipients = (profiles ?? []).map((p: any) => p.email).filter(Boolean);

    const subject = `🎉 Deal closed — ${(lead as any).business_name} for ${orgName}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#0f5132;">🎉 Sponsorship deal closed</h2>
      <p>${esc(repName)} closed a sponsorship deal.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#666;">Business</td><td style="padding:6px 0;"><strong>${esc((lead as any).business_name)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Organization</td><td style="padding:6px 0;">${esc(orgName)}</td></tr>
        ${(lead as any).sponsorship_tier ? `<tr><td style="padding:6px 0;color:#666;">Tier</td><td style="padding:6px 0;">${esc((lead as any).sponsorship_tier)}</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#666;">Value</td><td style="padding:6px 0;"><strong>$${closedValue.toLocaleString()}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Curve share (25%)</td><td style="padding:6px 0;"><strong>$${share.toLocaleString()}</strong></td></tr>
      </table>
      <p><a href="${APP_URL}/admin/pipeline" style="background:#0f5132;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;">View pipeline</a></p>
    </div>`;

    let emailed = false;
    if (RESEND_API_KEY && recipients.length) {
      emailed = await sendEmail(recipients, subject, html);
    }

    await admin.from("notification_log").insert({
      org_id: lead.org_id,
      notification_type: "sponsorship_closed" as any,
      recipient_role: "admin" as any,
      task_ids: [lead_id],
    });

    return json({ success: true, emailed });
  } catch (e: any) {
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});

async function getRepName(admin: any, uid: string | null): Promise<string> {
  if (!uid) return "A Curve admin";
  const { data } = await admin.from("profiles").select("full_name, email").eq("user_id", uid).maybeSingle();
  return data?.full_name || data?.email || "A Curve admin";
}

async function sendEmail(to: string[], subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) { console.error("Resend error", res.status, await res.text()); return false; }
    return true;
  } catch (e) {
    console.error("Resend exception", e);
    return false;
  }
}

function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
