// Generates a weekly meeting agenda from current acquisition data with AI talking points.
// POST { acquisition_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const WORKSTREAMS = ["integration","financial","legal","hr_culture","marketing","testing","it","data_assets","compliance"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { acquisition_id } = await req.json();
    if (!acquisition_id) return j({ error: "acquisition_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userId = await getUserId(req, admin);

    const { data: acq } = await admin.from("acquisition_projects").select("*").eq("id", acquisition_id).maybeSingle();
    if (!acq) return j({ error: "not found" }, 404);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString();

    const [{ data: activity }, { data: allTasks }, { data: staff }, { data: docs }, { data: followUps }, { data: lastTranscript }] = await Promise.all([
      admin.from("acquisition_task_activity").select("*").eq("acquisition_id", acquisition_id).gte("created_at", weekAgo).order("created_at", { ascending: false }),
      admin.from("acquisition_tasks").select("*").eq("acquisition_id", acquisition_id),
      admin.from("acquisition_staff").select("compliance_status").eq("acquisition_id", acquisition_id).eq("is_active", true),
      admin.from("acquisition_documents").select("document_name, workstream, created_at").eq("acquisition_id", acquisition_id).is("reviewed_at", null).limit(50),
      admin.from("acquisition_communications").select("subject, contact_name, follow_up_date, follow_up_notes").eq("acquisition_id", acquisition_id).eq("follow_up_needed", true).eq("follow_up_completed", false).order("follow_up_date"),
      admin.from("acquisition_meeting_transcripts").select("id, action_items").eq("acquisition_id", acquisition_id).eq("ai_status", "complete").order("meeting_date", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const tasks = allTasks ?? [];
    const taskById = new Map(tasks.map((t: any) => [t.id, t]));

    const status_updates = (activity ?? []).filter((a: any) => a.action === "status_changed" || a.action === "note_added").map((a: any) => {
      const t: any = taskById.get(a.task_id) ?? {};
      return { task_title: t.title, workstream: t.workstream, action: a.action, old_value: a.old_value, new_value: a.new_value, date: a.created_at };
    });

    const blocked = tasks.filter((t: any) => t.status === "blocked");
    const overdue = tasks.filter((t: any) => t.target_date && t.target_date < todayStr && t.status !== "done" && t.status !== "blocked");
    const stalled = tasks.filter((t: any) => t.status !== "done" && t.updated_at && (Date.now() - new Date(t.updated_at).getTime()) / 86400000 >= 14);

    const items_needing_discussion = [
      ...blocked.map((t: any) => ({ task_title: t.title, workstream: t.workstream, reason: "Blocked", lead: t.lead_person_name })),
      ...overdue.map((t: any) => ({ task_title: t.title, workstream: t.workstream, reason: `Overdue by ${Math.floor((Date.now() - new Date(t.target_date).getTime()) / 86400000)} days`, lead: t.lead_person_name })),
      ...stalled.map((t: any) => ({ task_title: t.title, workstream: t.workstream, reason: `No activity ${Math.floor((Date.now() - new Date(t.updated_at).getTime()) / 86400000)} days`, lead: t.lead_person_name })),
    ];

    const workstream_status: Record<string, any> = {};
    for (const ws of WORKSTREAMS) {
      const ws_tasks = tasks.filter((t: any) => t.workstream === ws);
      const done = ws_tasks.filter((t: any) => t.status === "done").length;
      workstream_status[ws] = {
        total: ws_tasks.length,
        done,
        pct: ws_tasks.length ? Math.round((done / ws_tasks.length) * 100) : 0,
        in_progress: ws_tasks.filter((t: any) => t.status === "started").length,
        overdue: ws_tasks.filter((t: any) => t.target_date && t.target_date < todayStr && t.status !== "done").length,
      };
    }

    const decisions_needed = tasks.filter((t: any) => t.priority === "needs_input" && t.status !== "done").map((t: any) => ({ task_title: t.title, workstream: t.workstream, lead: t.lead_person_name }));

    const compliance_status = {
      total: staff?.length ?? 0,
      compliant: staff?.filter((s: any) => s.compliance_status === "compliant").length ?? 0,
      overdue: staff?.filter((s: any) => s.compliance_status === "overdue").length ?? 0,
    };

    const nextWeekEnd = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const next_week_priorities = tasks
      .filter((t: any) => t.target_date && t.target_date >= todayStr && t.target_date <= nextWeekEnd && t.status !== "done")
      .sort((a: any, b: any) => a.target_date.localeCompare(b.target_date))
      .slice(0, 7)
      .map((t: any) => ({ task_title: t.title, workstream: t.workstream, target_date: t.target_date, lead: t.lead_person_name }));

    // AI talking points
    let ai_talking_points: string | null = null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      const day = acq.close_date ? Math.floor((Date.now() - new Date(acq.close_date).getTime()) / 86400000) : 0;
      const tp = `You're preparing an integration meeting for ${acq.club_name} (Day ${day} of 100).
Stalled (14+d): ${stalled.map((t: any) => `${t.title} (${t.workstream}, ${t.lead_person_name ?? "—"})`).join("; ") || "None"}
Blocked: ${blocked.map((t: any) => `${t.title} (${t.dependency ?? "no dep"})`).join("; ") || "None"}
Overdue: ${overdue.map((t: any) => `${t.title} due ${t.target_date}`).join("; ") || "None"}
Compliance: ${compliance_status.compliant}/${compliance_status.total} compliant, ${compliance_status.overdue} overdue.

Generate 3-5 SPECIFIC talking points (numbered list, plain text, names + tasks). Be direct, not generic.`;
      try {
        const r = await fetch(LOVABLE_AI_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: tp }] }),
        });
        if (r.ok) {
          const d = await r.json();
          ai_talking_points = d.choices?.[0]?.message?.content ?? null;
        }
      } catch (e) { console.error("talking points fail", e); }
    }

    const week_number = acq.close_date ? Math.max(1, Math.ceil(Math.floor((Date.now() - new Date(acq.close_date).getTime()) / 86400000) / 7)) : null;

    const { data: agenda, error } = await admin.from("acquisition_meeting_agendas").insert({
      acquisition_id,
      meeting_date: todayStr,
      week_number,
      status_updates,
      items_needing_discussion,
      workstream_status,
      decisions_needed,
      compliance_status,
      documents_for_review: docs ?? [],
      pending_follow_ups: followUps ?? [],
      next_week_priorities,
      ai_talking_points,
      previous_transcript_id: lastTranscript?.id ?? null,
      previous_action_items: lastTranscript?.action_items ?? null,
      custom_items: [],
      status: "draft",
      generated_by: userId,
    }).select().single();

    if (error) return j({ error: error.message }, 500);
    return j({ success: true, agenda });
  } catch (e: any) {
    console.error(e);
    return j({ error: e.message ?? "unknown" }, 500);
  }
});

async function getUserId(req: Request, admin: any): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  try {
    const { data } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    return data?.user?.id ?? null;
  } catch { return null; }
}

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
