import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Daily 8am job. Marks overdue tasks, finds stalled tasks, and logs digest entries
// in notification_log. Email delivery is intentionally not wired yet — connect a
// provider (Resend) later and read from notification_log to send.
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

    // 5. Log per-org digests + admin digest
    const logs: any[] = [];
    for (const [orgId, list] of byOrg.entries()) {
      logs.push({
        org_id: orgId,
        notification_type: "no_activity_digest",
        recipient_role: "org_all",
        task_ids: list.map((t: any) => t.id),
      });
    }
    logs.push({
      org_id: null,
      notification_type: "no_activity_digest",
      recipient_role: "admin",
      task_ids: fresh.map((t: any) => t.id),
    });
    await admin.from("notification_log").insert(logs);

    return json({ success: true, alerts: fresh.length, orgs_notified: byOrg.size });
  } catch (e: any) {
    return json({ error: e.message ?? "unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
