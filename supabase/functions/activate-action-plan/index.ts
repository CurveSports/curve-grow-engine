import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "Curve OS <onboarding@resend.dev>";
const APP_URL = "https://curve-grow-engine.lovable.app";

const ENGINE_SCORE_FIELDS: Record<string, string> = {
  Pricing: "pricing_score",
  Sponsorship: "sponsorship_score",
  Apparel: "apparel_score",
  Events: "event_score",
  "Add-Ons": "addon_score",
  Retention: "retention_score",
  Facility: "facility_score",
};

const FACILITY_ORG_TYPES = new Set(["Facility + Teams", "Facility Only", "Teams + Facility"]);

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
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const { org_id, mode } = await req.json();
    if (!org_id) return json({ error: "org_id required" }, 400);
    // mode: "activate" (default) flips drafts→active and stamps plan_activated_at;
    //       "topup" only adds missing template tasks (as drafts) without activating

    const { data: org } = await admin.from("organizations").select("id, name, plan_activated_at").eq("id", org_id).maybeSingle();
    if (!org) return json({ error: "org not found" }, 404);

    const { data: intake } = await admin.from("organization_intake").select("org_type").eq("org_id", org_id).maybeSingle();
    const { data: metrics } = await admin.from("derived_metrics").select("*").eq("org_id", org_id).maybeSingle();
    if (!metrics) return json({ error: "no derived metrics — complete intake first" }, 400);

    const isFacilityOrg = !!intake?.org_type && FACILITY_ORG_TYPES.has(intake.org_type);

    // Top-up: only add tasks that don't already exist (matched by template_id)
    const { data: existing } = await admin.from("org_tasks").select("id, template_id").eq("org_id", org_id);
    const existingTemplateIds = new Set((existing ?? []).map((t: any) => t.template_id).filter(Boolean));

    const { data: templates } = await admin.from("task_templates").select("*").eq("is_system_template", true);
    if (!templates) return json({ error: "no templates" }, 500);

    const today = new Date();
    const tasksToInsert: any[] = [];

    for (const engine of Object.keys(ENGINE_SCORE_FIELDS)) {
      if (engine === "Facility" && !isFacilityOrg) continue;
      const scoreField = ENGINE_SCORE_FIELDS[engine];
      const score = (metrics as any)[scoreField] ?? null;
      if (score === null || score >= 9) continue;

      const engineTemplates = templates.filter((t: any) => t.engine === engine);
      let chosen = engineTemplates;
      let priority: "high" | "medium" | "low" = "medium";

      if (score <= 3) priority = "high";
      else if (score <= 6) priority = "medium";
      else if (score === 7) priority = "low";
      else if (score === 8) {
        chosen = engineTemplates.filter((t: any) => t.task_type === "Track");
        priority = "low";
      }

      for (const t of chosen) {
        if (existingTemplateIds.has(t.id)) continue; // never duplicate
        const due = new Date(today);
        due.setDate(due.getDate() + (t.suggested_days_to_complete ?? 30));
        tasksToInsert.push({
          org_id,
          template_id: t.id,
          title: t.title,
          description: t.description,
          engine: t.engine,
          task_type: t.task_type,
          status: "not_started",
          plan_status: "draft", // top-up always lands in draft
          priority,
          suggested_due_date: due.toISOString().slice(0, 10),
          due_date: due.toISOString().slice(0, 10),
          assigned_by: uid,
        });
      }
    }

    let inserted_count = 0;
    if (tasksToInsert.length > 0) {
      const { data: inserted, error } = await admin.from("org_tasks").insert(tasksToInsert).select("id");
      if (error) return json({ error: error.message }, 500);
      inserted_count = inserted?.length ?? 0;
      const activityRows = (inserted ?? []).map((t: any) => ({
        task_id: t.id, org_id, action: "created", performed_by: uid,
        new_value: org.plan_activated_at ? "top-up draft (admin re-run)" : "draft (admin re-run)",
      }));
      if (activityRows.length) await admin.from("task_activity_log").insert(activityRows);
      await admin.from("derived_metrics").update({ tasks_generated_at: new Date().toISOString() }).eq("org_id", org_id);
    }

    if (mode === "topup") {
      return json({ success: true, mode: "topup", added: inserted_count });
    }

    // APPROVE: stamp plan_activated_at as the admin's "recommendation approved"
    // signal. Tasks remain at plan_status='draft' and only become visible to
    // org users when an admin releases a project containing them.
    const activated_at = new Date().toISOString();
    if (!org.plan_activated_at) {
      await admin.from("organizations").update({ plan_activated_at: activated_at }).eq("id", org_id);
    }

    // Count drafts so the admin sees how many tasks are now ready to organize
    // into projects. We do NOT flip plan_status here and we do NOT email org
    // users — release happens at the project level.
    const { data: draftRows } = await admin
      .from("org_tasks")
      .select("id")
      .eq("org_id", org_id)
      .eq("plan_status", "draft");
    const draft_count = draftRows?.length ?? 0;

    return json({
      success: true,
      mode: "approve",
      tasks_added: inserted_count,
      draft_count,
      plan_activated_at: org.plan_activated_at ?? activated_at,
    });
  } catch (e: any) {
    return json({ error: e.message ?? "unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
  } catch (e: any) {
    return json({ error: e.message ?? "unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
