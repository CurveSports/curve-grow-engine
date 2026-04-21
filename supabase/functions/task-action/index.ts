import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action =
  | { type: "set_status"; task_id: string; status: "not_started" | "in_progress" | "completed"; completion_note?: string }
  | { type: "set_priority"; task_id: string; priority: "high" | "medium" | "low" }
  | { type: "set_due_date"; task_id: string; due_date: string }
  | { type: "add_note"; task_id: string; note_text: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);
    const uid = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const action = (await req.json()) as Action;
    if (!action?.type || !action?.task_id) return json({ error: "invalid request" }, 400);

    const { data: task, error: tErr } = await admin.from("org_tasks").select("*").eq("id", action.task_id).maybeSingle();
    if (tErr || !task) return json({ error: "task not found" }, 404);

    // Authorization: must be admin OR member of task's org
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
    const isAdmin = roleRow?.role === "admin";
    if (!isAdmin) {
      const { data: prof } = await admin.from("profiles").select("org_id").eq("user_id", uid).maybeSingle();
      if (prof?.org_id !== task.org_id) return json({ error: "forbidden" }, 403);
    }

    const now = new Date().toISOString();

    if (action.type === "set_status") {
      const updates: any = { status: action.status, last_activity_at: now };
      if (action.status === "completed") {
        if (!action.completion_note || action.completion_note.trim().length < 20) {
          return json({ error: "completion note required (min 20 chars)" }, 400);
        }
        updates.completed_at = now;
        updates.completed_by = uid;
      } else {
        updates.completed_at = null;
        updates.completed_by = null;
      }
      const { error: uErr } = await admin.from("org_tasks").update(updates).eq("id", task.id);
      if (uErr) return json({ error: uErr.message }, 500);

      await admin.from("task_activity_log").insert({
        task_id: task.id, org_id: task.org_id, action: action.status === "completed" ? "completed" : "status_changed",
        old_value: task.status, new_value: action.status, performed_by: uid,
      });

      if (action.status === "completed" && action.completion_note) {
        await admin.from("task_notes").insert({
          task_id: task.id, org_id: task.org_id, note_text: action.completion_note, created_by: uid,
        });
        // Log completion notification (email integration: future)
        await admin.from("notification_log").insert({
          org_id: task.org_id, notification_type: "task_completed", recipient_role: "admin", task_ids: [task.id],
        });
      }
    } else if (action.type === "set_priority") {
      if (!isAdmin) return json({ error: "admin only" }, 403);
      const { error } = await admin.from("org_tasks").update({ priority: action.priority, last_activity_at: now }).eq("id", task.id);
      if (error) return json({ error: error.message }, 500);
      await admin.from("task_activity_log").insert({
        task_id: task.id, org_id: task.org_id, action: "status_changed", old_value: task.priority, new_value: action.priority, performed_by: uid,
      });
    } else if (action.type === "set_due_date") {
      if (!isAdmin) return json({ error: "admin only" }, 403);
      const { error } = await admin.from("org_tasks").update({ due_date: action.due_date, last_activity_at: now }).eq("id", task.id);
      if (error) return json({ error: error.message }, 500);
      await admin.from("task_activity_log").insert({
        task_id: task.id, org_id: task.org_id, action: "due_date_changed", old_value: task.due_date, new_value: action.due_date, performed_by: uid,
      });
    } else if (action.type === "add_note") {
      if (!action.note_text?.trim()) return json({ error: "note text required" }, 400);
      const { error } = await admin.from("task_notes").insert({
        task_id: task.id, org_id: task.org_id, note_text: action.note_text.trim(), created_by: uid,
      });
      if (error) return json({ error: error.message }, 500);
      await admin.from("task_activity_log").insert({
        task_id: task.id, org_id: task.org_id, action: "note_added", performed_by: uid,
      });
    } else {
      return json({ error: "unknown action" }, 400);
    }

    return json({ success: true });
  } catch (e: any) {
    return json({ error: e.message ?? "unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
