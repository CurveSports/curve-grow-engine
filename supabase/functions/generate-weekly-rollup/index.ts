// Generates a weekly integration roll-up for an acquisition.
// POST { acquisition_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const WORKSTREAMS = ["integration","financial","legal","hr_culture","marketing","testing","it","data_assets","compliance","value_creation"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { acquisition_id } = await req.json();
    if (!acquisition_id) return json({ error: "acquisition_id required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: project } = await admin.from("acquisition_projects").select("*").eq("id", acquisition_id).maybeSingle();
    if (!project) return json({ error: "not found" }, 404);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const day = today.getDay();
    const monDiff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today); monday.setDate(today.getDate() + monDiff); monday.setHours(0,0,0,0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const weekStart = monday.toISOString().slice(0, 10);
    const weekEnd = sunday.toISOString().slice(0, 10);
    const daysSinceClose = project.close_date ? Math.max(0, Math.floor((today.getTime() - new Date(project.close_date).getTime()) / 86400000)) : null;

    const { count: existingRollups } = await admin.from("acquisition_weekly_rollups").select("id", { count: "exact", head: true }).eq("acquisition_id", acquisition_id);
    const weekNumber = (existingRollups ?? 0) + 1;

    const { data: tasks } = await admin.from("acquisition_tasks").select("*").eq("acquisition_id", acquisition_id);
    const all = tasks ?? [];

    const completedThisWeek = all.filter((t: any) => t.completed_date && t.completed_date >= weekStart && t.completed_date <= weekEnd);
    const startedThisWeek = all.filter((t: any) => t.status === "started" && t.updated_at >= weekStart);
    const overdue = all.filter((t: any) => t.target_date && t.target_date < todayStr && t.status !== "done" && t.status !== "blocked");
    const blocked = all.filter((t: any) => t.status === "blocked");
    const done = all.filter((t: any) => t.status === "done");
    const completionPct = all.length ? (done.length / all.length) * 100 : 0;

    const workstream_data: Record<string, any> = {};
    for (const ws of WORKSTREAMS) {
      const wsT = all.filter((t: any) => t.workstream === ws);
      const wsDone = wsT.filter((t: any) => t.status === "done");
      workstream_data[ws] = {
        total: wsT.length,
        done: wsDone.length,
        pct: wsT.length ? Math.round((wsDone.length / wsT.length) * 100) : 0,
        completed_this_week: completedThisWeek.filter((t: any) => t.workstream === ws).map((t: any) => t.title),
        overdue: wsT.filter((t: any) => t.target_date && t.target_date < todayStr && t.status !== "done").map((t: any) => t.title),
        blocked: wsT.filter((t: any) => t.status === "blocked").map((t: any) => t.title),
      };
    }

    const { data: staff } = await admin.from("acquisition_staff").select("*").eq("acquisition_id", acquisition_id).eq("is_active", true);
    const totalStaff = (staff ?? []).length;
    const compliantStaff = (staff ?? []).filter((s: any) => s.compliance_status === "compliant").length;
    const overdueStaff = (staff ?? []).filter((s: any) => s.compliance_status === "overdue").length;
    const compliancePct = totalStaff ? (compliantStaff / totalStaff) * 100 : 0;

    const sevenAhead = new Date(today); sevenAhead.setDate(today.getDate() + 7);
    const nextPriorities = all
      .filter((t: any) => t.target_date && t.target_date >= todayStr && t.target_date <= sevenAhead.toISOString().slice(0, 10) && t.status !== "done")
      .sort((a: any, b: any) => (a.target_date ?? "").localeCompare(b.target_date ?? ""))
      .slice(0, 5)
      .map((t: any) => ({ title: t.title, workstream: t.workstream, target_date: t.target_date, lead_person_name: t.lead_person_name }));

    const risk_flags: any[] = [];
    if (overdue.length > 3) risk_flags.push({ level: "high", message: `${overdue.length} tasks overdue — integration pace is behind schedule` });
    if (blocked.length > 0) risk_flags.push({ level: "medium", message: `${blocked.length} tasks blocked — ${blocked.slice(0, 3).map((t: any) => t.title).join(", ")}` });
    for (const [ws, data] of Object.entries(workstream_data) as any) {
      if (data.pct === 0 && daysSinceClose && daysSinceClose > 30 && data.total > 0) {
        risk_flags.push({ level: "high", message: `${ws} workstream has not started — 0% completion at Day ${daysSinceClose}` });
      }
      if (data.completed_this_week.length === 0 && data.pct < 100 && data.pct > 0) {
        risk_flags.push({ level: "low", message: `${ws} — no tasks completed this week (${data.pct}% overall)` });
      }
    }
    if (overdueStaff > 0) risk_flags.push({ level: "medium", message: `${overdueStaff} staff members have overdue compliance items` });

    // AI summary
    let executive_summary = "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (apiKey) {
      const prompt = `You are generating a weekly integration report summary for ${project.club_name}, a baseball organization acquired by Curve Sports.

Week ${weekNumber} — Day ${daysSinceClose ?? "?"} of 100-day integration.

Tasks completed this week: ${completedThisWeek.length}
Tasks started: ${startedThisWeek.length}
Overall completion: ${completionPct.toFixed(0)}%
Overdue: ${overdue.length}
Blocked: ${blocked.length}
Compliance: ${compliantStaff} of ${totalStaff} staff compliant

Completed this week:
${completedThisWeek.map((t: any) => `- ${t.title} (${t.workstream})`).join("\n") || "(none)"}

Risk flags:
${risk_flags.map((r) => `- ${r.message}`).join("\n") || "(none)"}

Write a 3-4 sentence executive summary of this week's integration progress. Be direct and specific. Highlight what moved forward, what is at risk, and what needs attention next week. Do not use generic language. Return ONLY the summary text.`;

      const aiResp = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }] }),
      });
      if (aiResp.ok) {
        const j = await aiResp.json();
        executive_summary = j?.choices?.[0]?.message?.content?.trim() ?? "";
      }
    }
    if (!executive_summary) {
      executive_summary = `Week ${weekNumber}: ${completedThisWeek.length} tasks completed; overall integration at ${completionPct.toFixed(0)}%. ${overdue.length} task(s) overdue, ${blocked.length} blocked.`;
    }

    const authHeader = req.headers.get("authorization");
    let generated_by: string | null = null;
    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      generated_by = user?.id ?? null;
    }

    const { data: inserted, error } = await admin.from("acquisition_weekly_rollups").insert({
      acquisition_id, week_number: weekNumber, week_start_date: weekStart, week_end_date: weekEnd,
      days_since_close: daysSinceClose,
      total_tasks: all.length, completed_tasks: done.length, completion_pct: completionPct.toFixed(2),
      overdue_tasks: overdue.length, blocked_tasks: blocked.length,
      tasks_completed_this_week: completedThisWeek.length, tasks_started_this_week: startedThisWeek.length,
      workstream_data,
      total_staff: totalStaff, compliant_staff: compliantStaff, compliance_pct: compliancePct.toFixed(2),
      executive_summary, risk_flags, next_week_priorities: nextPriorities,
      generated_by,
    }).select().maybeSingle();

    if (error) return json({ error: error.message }, 500);
    return json({ success: true, rollup: inserted });
  } catch (e: any) {
    return json({ error: e.message ?? "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
