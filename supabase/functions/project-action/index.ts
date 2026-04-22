// Edge function: project-action
// Handles project release, completion approval, and email notifications via Resend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action =
  | { type: "release"; project_id: string }
  | { type: "approve_completion"; project_id: string; release_next_project_id?: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);
    const uid = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // Must be admin
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
    if (roleRow?.role !== "admin") return json({ error: "admin only" }, 403);

    const action = (await req.json()) as Action;
    if (!action?.type || !action?.project_id) return json({ error: "invalid request" }, 400);

    const { data: project, error: pErr } = await admin
      .from("org_projects")
      .select("*")
      .eq("id", action.project_id)
      .maybeSingle();
    if (pErr || !project) return json({ error: "project not found" }, 404);

    const { data: org } = await admin.from("organizations").select("id, name").eq("id", project.org_id).maybeSingle();
    const orgName = (org as any)?.name ?? "Organization";
    const now = new Date().toISOString();

    if (action.type === "release") {
      if (project.status !== "draft") return json({ error: "only draft projects can be released" }, 400);

      // Activate the project
      const { error: upErr } = await admin
        .from("org_projects")
        .update({ status: "active", released_at: now, released_by: uid, updated_at: now })
        .eq("id", project.id);
      if (upErr) return json({ error: upErr.message }, 500);

      // Activate all draft tasks attached to this project
      const { data: projectTasks } = await admin.from("org_tasks").select("id").eq("project_id", project.id);
      const taskIds = (projectTasks ?? []).map((t: any) => t.id);
      if (taskIds.length > 0) {
        await admin.from("org_tasks").update({ plan_status: "active", last_activity_at: now }).in("id", taskIds);
        const logs = taskIds.map((id) => ({
          task_id: id,
          org_id: project.org_id,
          action: "project_released" as const,
          performed_by: uid,
          new_value: project.name,
        }));
        await admin.from("task_activity_log").insert(logs);
      }

      // First-project: stamp plan_activated_at if missing
      await admin
        .from("organizations")
        .update({ plan_activated_at: (org as any)?.plan_activated_at ?? now, last_activity_at: now })
        .eq("id", project.org_id);

      // Notification log
      await admin.from("notification_log").insert({
        org_id: project.org_id,
        notification_type: "project_released",
        recipient_role: "org_all",
        task_ids: [project.id],
      });

      // Email org users
      const { data: orgProfiles } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("org_id", project.org_id);
      const recipients = (orgProfiles ?? []).map((p: any) => p.email).filter(Boolean);
      if (resendKey && recipients.length > 0) {
        await sendEmail(resendKey, {
          to: recipients,
          subject: `New project available — ${project.name}`,
          html: simpleEmail({
            heading: `New project: ${project.name}`,
            body: `Your Curve team has released a new project for you to work on. Log in to see your new tasks and priorities.`,
            ctaLabel: "Open your dashboard",
            ctaUrl: orgUrl(req, "/dashboard"),
          }),
        });
      }

      return json({ success: true, tasks_activated: taskIds.length });
    }

    if (action.type === "approve_completion") {
      if (project.status !== "active") return json({ error: "only active projects can be approved" }, 400);

      const { error: upErr } = await admin
        .from("org_projects")
        .update({
          status: "completed",
          awaiting_completion_approval: false,
          completion_approved_at: now,
          completion_approved_by: uid,
          suggested_next_project_id: action.release_next_project_id ?? null,
          updated_at: now,
        })
        .eq("id", project.id);
      if (upErr) return json({ error: upErr.message }, 500);

      await admin.from("notification_log").insert({
        org_id: project.org_id,
        notification_type: "project_completed",
        recipient_role: "admin",
        task_ids: [project.id],
      });

      let releasedNext: any = null;
      if (action.release_next_project_id) {
        const { data: nextProj } = await admin
          .from("org_projects")
          .select("*")
          .eq("id", action.release_next_project_id)
          .maybeSingle();
        if (nextProj && nextProj.status === "draft" && nextProj.org_id === project.org_id) {
          await admin
            .from("org_projects")
            .update({ status: "active", released_at: now, released_by: uid, updated_at: now })
            .eq("id", nextProj.id);
          const { data: nextTasks } = await admin.from("org_tasks").select("id").eq("project_id", nextProj.id);
          const nextIds = (nextTasks ?? []).map((t: any) => t.id);
          if (nextIds.length > 0) {
            await admin.from("org_tasks").update({ plan_status: "active", last_activity_at: now }).in("id", nextIds);
          }
          await admin.from("notification_log").insert({
            org_id: project.org_id,
            notification_type: "project_released",
            recipient_role: "org_all",
            task_ids: [nextProj.id],
          });
          releasedNext = nextProj;

          if (resendKey) {
            const { data: orgProfiles } = await admin
              .from("profiles")
              .select("email")
              .eq("org_id", project.org_id);
            const recipients = (orgProfiles ?? []).map((p: any) => p.email).filter(Boolean);
            if (recipients.length > 0) {
              await sendEmail(resendKey, {
                to: recipients,
                subject: `New project available — ${nextProj.name}`,
                html: simpleEmail({
                  heading: `Next project unlocked: ${nextProj.name}`,
                  body: `Great work on completing your last project. Your Curve team has released what's next.`,
                  ctaLabel: "Open your dashboard",
                  ctaUrl: orgUrl(req, "/dashboard"),
                }),
              });
            }
          }
        }
      }

      return json({ success: true, released_next: !!releasedNext });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e.message ?? "unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function orgUrl(req: Request, path: string): string {
  const origin = req.headers.get("origin") ?? "https://curve-grow-engine.lovable.app";
  return `${origin}${path}`;
}

async function sendEmail(apiKey: string, opts: { to: string[]; subject: string; html: string }) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "Curve OS <onboarding@resend.dev>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });
  } catch (_e) {
    // swallow — email failures shouldn't block the action
  }
}

function simpleEmail(opts: { heading: string; body: string; ctaLabel?: string; ctaUrl?: string }): string {
  return `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f8fafc; padding: 40px 16px; color: #0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:32px;">
        <h1 style="font-size:20px;margin:0 0 12px;color:#0f172a;">${escapeHtml(opts.heading)}</h1>
        <p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 24px;">${escapeHtml(opts.body)}</p>
        ${opts.ctaUrl ? `<a href="${opts.ctaUrl}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;">${escapeHtml(opts.ctaLabel ?? "Open Curve OS")}</a>` : ""}
      </td></tr>
    </table>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
