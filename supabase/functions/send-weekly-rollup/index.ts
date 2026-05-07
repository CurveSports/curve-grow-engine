// Emails a weekly roll-up to a list of recipients via Resend.
// POST { rollup_id, recipients: string[] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Curve OS <onboarding@resend.dev>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { rollup_id, recipients } = await req.json();
    if (!rollup_id) return j({ error: "rollup_id required" }, 400);
    const list = Array.isArray(recipients) ? recipients.filter((x: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)) : [];
    if (!list.length) return j({ error: "at least one valid recipient required" }, 400);
    if (!RESEND_API_KEY) return j({ error: "RESEND_API_KEY not configured" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: r } = await admin.from("acquisition_weekly_rollups").select("*").eq("id", rollup_id).maybeSingle();
    if (!r) return j({ error: "rollup not found" }, 404);
    const { data: acq } = await admin.from("acquisition_projects").select("club_name").eq("id", r.acquisition_id).maybeSingle();
    const club = (acq as any)?.club_name ?? "Acquisition";

    const html = render(r, club);
    const subject = `Weekly Integration Report — ${club} — Week ${r.week_number}`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: list, subject, html }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error", res.status, txt);
      return j({ error: `Email send failed: ${txt.slice(0, 300)}` }, 502);
    }
    await admin.from("acquisition_weekly_rollups").update({
      status: r.status === "draft" ? "sent" : r.status,
      sent_at: new Date().toISOString(),
      sent_to: list,
    }).eq("id", rollup_id);
    return j({ success: true, sent_to: list.length });
  } catch (e: any) {
    console.error(e);
    return j({ error: e.message ?? "unknown" }, 500);
  }
});

function render(r: any, club: string): string {
  const wsRows = Object.entries(r.workstream_data ?? {})
    .filter(([_, d]: any) => d.total > 0)
    .map(([ws, d]: any) => `<li><strong>${esc(ws)}</strong> — ${d.pct}% (+${d.completed_this_week.length} done${d.overdue.length ? `, ${d.overdue.length} overdue` : ""})</li>`)
    .join("");
  const risks = (r.risk_flags ?? []).map((rf: any) => `<li>${esc(rf.message)}</li>`).join("");
  const prios = (r.next_week_priorities ?? []).map((p: any) => `<li>${esc(p.title)} — ${esc(p.workstream)} — due ${esc(p.target_date ?? "")}</li>`).join("");
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
    <div style="background:#0f172a;color:#fff;padding:24px;">
      <p style="color:#34d399;font-size:11px;letter-spacing:2px;margin:0;">CURVE CO — WEEKLY INTEGRATION REPORT</p>
      <h2 style="margin:6px 0 4px 0;">${esc(club)}</h2>
      <p style="color:#cbd5e1;font-size:13px;margin:0;">Week ${r.week_number} — ${esc(r.week_start_date)} → ${esc(r.week_end_date)}${r.days_since_close != null ? ` · Day ${r.days_since_close} of 100` : ""}</p>
    </div>
    <div style="padding:20px;">
      <p style="border-left:4px solid #10b981;padding-left:10px;white-space:pre-wrap;">${esc(r.executive_summary ?? "")}</p>
      <p><strong>${r.tasks_completed_this_week}</strong> tasks completed this week · <strong>${Number(r.completion_pct).toFixed(0)}%</strong> overall · ${r.overdue_tasks} overdue · ${r.blocked_tasks} blocked</p>
      ${wsRows ? `<h3>Workstreams</h3><ul>${wsRows}</ul>` : ""}
      ${risks ? `<h3 style="color:#dc2626;">Risk Flags</h3><ul>${risks}</ul>` : ""}
      ${prios ? `<h3>Next Week Priorities</h3><ol>${prios}</ol>` : ""}
    </div>
  </div>`;
}
function esc(s: any) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
function j(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
