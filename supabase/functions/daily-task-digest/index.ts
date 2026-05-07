import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Curve OS <onboarding@resend.dev>";
const ADMIN_EMAIL = "matt.gerber@curvesports.com";

// Daily 8am job. Marks overdue tasks, finds stalled tasks, logs digest entries
// in notification_log, and sends emails via Resend.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().slice(0, 10);
    const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const fortyEightAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // 1. Mark overdue
    await admin.from("org_tasks").update({ status: "overdue" })
      .lt("due_date", today).neq("status", "completed").neq("status", "overdue");

    // 2. Find stalled / overdue
    const { data: tasks } = await admin.from("org_tasks").select("id, org_id, title, engine, status, last_activity_at, created_at, due_date")
      .neq("status", "completed");
    if (!tasks) return json({ success: true, alerts: 0 });

    const stalled = tasks.filter((t: any) =>
      (t.status === "in_progress" && new Date(t.last_activity_at) < new Date(sevenAgo)) ||
      (t.status === "not_started" && new Date(t.created_at) < new Date(fourteenAgo)) ||
      t.status === "overdue"
    );

    if (stalled.length === 0) return json({ success: true, alerts: 0 });

    // 3. Dedupe: skip task ids already in a notification within 48h
    const { data: recentNotifs } = await admin.from("notification_log").select("task_ids").gt("sent_at", fortyEightAgo);
    const recentlySent = new Set<string>();
    for (const n of recentNotifs ?? []) {
      for (const id of (n.task_ids as string[]) ?? []) recentlySent.add(id);
    }
    const fresh = stalled.filter((t: any) => !recentlySent.has(t.id));
    if (fresh.length === 0) return json({ success: true, alerts: 0, deduped: stalled.length });

    // 4. Group by org
    const byOrg = new Map<string, any[]>();
    for (const t of fresh) {
      const arr = byOrg.get(t.org_id) ?? [];
      arr.push(t);
      byOrg.set(t.org_id, arr);
    }

    // 5. Lookup org names + recipient emails
    const orgIds = Array.from(byOrg.keys());
    const { data: orgs } = await admin.from("organizations").select("id, name").in("id", orgIds);
    const orgNameById = new Map<string, string>((orgs ?? []).map((o: any) => [o.id, o.name]));

    const { data: profiles } = await admin.from("profiles").select("email, org_id").in("org_id", orgIds);
    const emailsByOrg = new Map<string, string[]>();
    for (const p of profiles ?? []) {
      if (!p.email || !p.org_id) continue;
      const arr = emailsByOrg.get(p.org_id) ?? [];
      arr.push(p.email);
      emailsByOrg.set(p.org_id, arr);
    }

    // 6. Log digests + send emails
    const logs: any[] = [];
    let emailsSent = 0;

    for (const [orgId, list] of byOrg.entries()) {
      logs.push({
        org_id: orgId,
        notification_type: "no_activity_digest",
        recipient_role: "org_all",
        task_ids: list.map((t: any) => t.id),
      });

      const recipients = emailsByOrg.get(orgId) ?? [];
      const orgName = orgNameById.get(orgId) ?? "Your organization";
      if (recipients.length && RESEND_API_KEY) {
        const ok = await sendEmail(recipients, `Action Plan update: ${list.length} task${list.length === 1 ? "" : "s"} need attention`, orgDigestHtml(orgName, list));
        if (ok) emailsSent++;
      }
    }

    logs.push({
      org_id: null,
      notification_type: "no_activity_digest",
      recipient_role: "admin",
      task_ids: fresh.map((t: any) => t.id),
    });

    // 7. Sponsorship: stale deals (no stage change in 14 days, not closed)
    const { data: staleSponsorship } = await admin
      .from("sponsorship_leads")
      .select("id, business_name, org_id, stage, last_stage_change_at")
      .eq("is_active", true)
      .not("stage", "in", "(closed_won,closed_lost)")
      .lt("last_stage_change_at", fourteenAgo);
    const stalledDeals = (staleSponsorship ?? []) as any[];

    // 8. Acquisition follow-ups: due today, tomorrow, or overdue
    const todayDate = new Date(today);
    const twoAhead = new Date(todayDate.getTime() + 2 * 86400000).toISOString().slice(0, 10);
    const { data: dueFollowUps } = await admin
      .from("acquisition_communications")
      .select("id, acquisition_id, contact_name, follow_up_date, follow_up_notes")
      .eq("follow_up_needed", true)
      .eq("follow_up_completed", false)
      .lte("follow_up_date", twoAhead);
    const followUps = (dueFollowUps ?? []) as any[];
    let acqNameById = new Map<string, string>();
    if (followUps.length) {
      const acqIds = Array.from(new Set(followUps.map((f) => f.acquisition_id)));
      const { data: acqs } = await admin.from("acquisition_projects").select("id, club_name").in("id", acqIds);
      acqNameById = new Map((acqs ?? []).map((a: any) => [a.id, a.club_name]));
    }

    // 9. Meeting intelligence: pending AI suggestions + untagged transcripts
    const { data: pendingSugRaw } = await admin
      .from("acquisition_task_suggestions")
      .select("id, acquisition_id, suggestion_type, suggested_action, existing_task_title, confidence")
      .eq("resolution", "pending");
    const pendingSuggestions = (pendingSugRaw ?? []) as any[];

    const { data: untaggedRaw } = await admin
      .from("acquisition_meeting_transcripts")
      .select("id, meeting_title, meeting_date, source_type, zoom_meeting_topic")
      .eq("is_archived", false)
      .eq("is_tagged", false);
    const untaggedTranscripts = (untaggedRaw ?? []) as any[];

    const acqNameByIdAll = new Map<string, string>(acqNameById);
    const missingIds = Array.from(new Set(pendingSuggestions.map((s) => s.acquisition_id).filter((x) => x && !acqNameByIdAll.has(x))));
    if (missingIds.length) {
      const { data: more } = await admin.from("acquisition_projects").select("id, club_name").in("id", missingIds);
      for (const a of more ?? []) acqNameByIdAll.set((a as any).id, (a as any).club_name);
    }


    if (RESEND_API_KEY) {
      await sendEmail([ADMIN_EMAIL], `Curve OS digest: ${fresh.length} stalled tasks across ${byOrg.size} orgs`, adminDigestHtml(byOrg, orgNameById, stalledDeals, followUps, acqNameByIdAll, today, pendingSuggestions, untaggedTranscripts));
      emailsSent++;
    }

    await admin.from("notification_log").insert(logs);

    return json({ success: true, alerts: fresh.length, orgs_notified: byOrg.size, emails_sent: emailsSent, stale_deals: stalledDeals.length, follow_ups: followUps.length, pending_suggestions: pendingSuggestions.length, untagged_transcripts: untaggedTranscripts.length });
  } catch (e: any) {
    return json({ error: e.message ?? "unknown error" }, 500);
  }
});

async function sendEmail(to: string[], subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend exception", e);
    return false;
  }
}

function orgDigestHtml(orgName: string, tasks: any[]): string {
  const rows = tasks.map((t) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;"><strong>${escape(t.title)}</strong><br/><span style="color:#666;font-size:12px;">${escape(t.engine)} · ${escape(t.status)}</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:12px;">${t.due_date ? `Due ${t.due_date}` : ""}</td>
    </tr>`).join("");
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <h2 style="color:#0f5132;">Action Plan update for ${escape(orgName)}</h2>
    <p>The following tasks need your attention:</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="margin-top:24px;"><a href="https://curve-grow-engine.lovable.app/dashboard" style="background:#0f5132;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;">Open your Action Plan</a></p>
  </div>`;
}

function adminDigestHtml(byOrg: Map<string, any[]>, names: Map<string, string>, stalledDeals: any[] = [], followUps: any[] = [], acqNames: Map<string, string> = new Map(), today: string = "", pendingSuggestions: any[] = [], untaggedTranscripts: any[] = []): string {
  const sections = Array.from(byOrg.entries()).map(([orgId, list]) =>
    `<h3 style="margin-bottom:4px;">${escape(names.get(orgId) ?? orgId)} <span style="color:#666;font-weight:normal;font-size:13px;">(${list.length})</span></h3>
     <ul>${list.map((t) => `<li>${escape(t.title)} <span style="color:#666;font-size:12px;">— ${escape(t.engine)} · ${escape(t.status)}</span></li>`).join("")}</ul>`
  ).join("");
  const sponsorshipBlock = stalledDeals.length
    ? `<h2 style="color:#a16207;margin-top:32px;">Stale Sponsorship Deals</h2>
       <ul>${stalledDeals.map((d) => {
        const days = Math.floor((Date.now() - new Date(d.last_stage_change_at).getTime()) / 86400000);
        return `<li><strong>${escape(d.business_name)}</strong> for ${escape(names.get(d.org_id) ?? d.org_id)} — no activity in ${days} days (currently: ${escape(d.stage)})</li>`;
       }).join("")}</ul>`
    : "";
  const followUpBlock = followUps.length
    ? `<h2 style="color:#0369a1;margin-top:32px;">Acquisition Follow-Ups Due</h2>
       <ul>${followUps.map((f) => {
        const overdueDays = today && f.follow_up_date && f.follow_up_date < today
          ? Math.floor((new Date(today).getTime() - new Date(f.follow_up_date).getTime()) / 86400000) : 0;
        const acq = escape(acqNames.get(f.acquisition_id) ?? "Acquisition");
        return `<li><strong>${acq}</strong>: follow up with ${escape(f.contact_name ?? "contact")} by ${escape(f.follow_up_date ?? "")}${overdueDays > 0 ? ` <span style="color:#dc2626;">(${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue)</span>` : ""}</li>`;
       }).join("")}</ul>`
    : "";

  // Group pending suggestions by acquisition
  const sugsByAcq = new Map<string, any[]>();
  for (const s of pendingSuggestions) {
    if (!s.acquisition_id) continue;
    const arr = sugsByAcq.get(s.acquisition_id) ?? [];
    arr.push(s); sugsByAcq.set(s.acquisition_id, arr);
  }
  const meetingBlock = (sugsByAcq.size || untaggedTranscripts.length)
    ? `<h2 style="color:#7c3aed;margin-top:32px;">Meeting Intelligence</h2>
       ${sugsByAcq.size ? `<h3 style="margin-bottom:4px;">Pending AI Task Suggestions</h3>
         ${Array.from(sugsByAcq.entries()).map(([aid, list]) =>
           `<p style="margin:8px 0 4px 0;"><strong>${escape(acqNames.get(aid) ?? "Acquisition")}</strong> — ${list.length} pending</p>
            <ul>${list.slice(0, 5).map((s) => `<li>${escape((s.suggestion_type ?? "").replace(/_/g, " "))}: ${escape(s.suggested_action ?? "")} ${s.existing_task_title ? `<span style="color:#666;">(${escape(s.existing_task_title)})</span>` : ""}</li>`).join("")}${list.length > 5 ? `<li style="color:#666;">…and ${list.length - 5} more</li>` : ""}</ul>`
         ).join("")}` : ""}
       ${untaggedTranscripts.length ? `<h3 style="margin:16px 0 4px 0;">Untagged Transcripts (${untaggedTranscripts.length})</h3>
         <p style="color:#666;font-size:13px;margin:0 0 6px 0;">These meeting transcripts need to be assigned to an acquisition.</p>
         <ul>${untaggedTranscripts.slice(0, 8).map((u) => `<li>${escape(u.meeting_title ?? u.zoom_meeting_topic ?? "Meeting")} <span style="color:#666;font-size:12px;">${u.meeting_date ? new Date(u.meeting_date).toLocaleDateString() : ""} · ${escape(u.source_type ?? "")}</span></li>`).join("")}${untaggedTranscripts.length > 8 ? `<li style="color:#666;">…and ${untaggedTranscripts.length - 8} more</li>` : ""}</ul>` : ""}`
    : "";

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <h2 style="color:#0f5132;">Curve OS daily digest</h2>
    ${sections}
    ${sponsorshipBlock}
    ${followUpBlock}
    ${meetingBlock}
  </div>`;
}

function escape(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
