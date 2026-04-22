import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
const UNIVERSAL_ENGINES = ["Platform", "Marketing"] as const;

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

    const { data: org } = await admin.from("organizations").select("id, name, plan_activated_at").eq("id", org_id).maybeSingle();
    if (!org) return json({ error: "org not found" }, 404);

    const { data: intake } = await admin.from("organization_intake").select("org_type").eq("org_id", org_id).maybeSingle();
    const { data: metrics } = await admin.from("derived_metrics").select("*").eq("org_id", org_id).maybeSingle();
    if (!metrics) return json({ error: "no derived metrics — complete intake first" }, 400);

    const isFacilityOrg = !!intake?.org_type && FACILITY_ORG_TYPES.has(intake.org_type);

    const { data: existing } = await admin.from("org_tasks").select("id, template_id, engine").eq("org_id", org_id);
    const existingTemplateIds = new Set((existing ?? []).map((t: any) => t.template_id).filter(Boolean));
    const hasUniversalTasks: Record<string, boolean> = {
      Platform: (existing ?? []).some((t: any) => t.engine === "Platform"),
      Marketing: (existing ?? []).some((t: any) => t.engine === "Marketing"),
    };

    const { data: templates } = await admin.from("task_templates").select("*");
    if (!templates) return json({ error: "no templates" }, 500);

    const today = new Date();
    const tasksToInsert: any[] = [];

    // ── Revenue engine tasks (score-driven) ─────────────────────────────────
    for (const engine of Object.keys(ENGINE_SCORE_FIELDS)) {
      if (engine === "Facility" && !isFacilityOrg) continue;
      const scoreField = ENGINE_SCORE_FIELDS[engine];
      const score = (metrics as any)[scoreField] ?? null;
      if (score === null || score >= 9) continue;

      const engineTemplates = (templates as any[]).filter((t: any) => t.engine === engine);
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
        if (existingTemplateIds.has(t.id)) continue;
        const due = new Date(today);
        due.setDate(due.getDate() + (t.suggested_days_to_complete ?? 30));
        tasksToInsert.push({
          org_id,
          template_id: t.id,
          title: t.title,
          description: t.description,
          engine: t.engine,
          task_type: t.task_type,
          owner_type: t.owner_type ?? "org_user",
          status: "not_started",
          plan_status: "draft",
          priority,
          suggested_due_date: due.toISOString().slice(0, 10),
          due_date: due.toISOString().slice(0, 10),
          assigned_by: uid,
        });
      }
    }

    // ── Universal Platform & Marketing tasks (always, every org) ────────────
    // These go straight to plan_status='active' because they will live inside
    // auto-released projects (created below).
    for (const universalEngine of UNIVERSAL_ENGINES) {
      if (hasUniversalTasks[universalEngine]) continue; // never duplicate
      const universalTemplates = (templates as any[])
        .filter((t: any) => t.engine === universalEngine && t.is_system_template)
        .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
      for (const t of universalTemplates) {
        const due = new Date(today);
        due.setDate(due.getDate() + (t.suggested_days_to_complete ?? 30));
        tasksToInsert.push({
          org_id,
          template_id: t.id,
          title: t.title,
          description: t.description,
          engine: t.engine,
          task_type: t.task_type,
          owner_type: t.owner_type ?? "curve_team",
          status: "not_started",
          plan_status: "active",
          priority: "high",
          suggested_due_date: due.toISOString().slice(0, 10),
          due_date: due.toISOString().slice(0, 10),
          assigned_by: uid,
        });
      }
    }

    let inserted_count = 0;
    let inserted_rows: any[] = [];
    if (tasksToInsert.length > 0) {
      const { data: inserted, error } = await admin.from("org_tasks").insert(tasksToInsert).select("id, engine, plan_status");
      if (error) return json({ error: error.message }, 500);
      inserted_count = inserted?.length ?? 0;
      inserted_rows = inserted ?? [];
      const activityRows = inserted_rows.map((t: any) => ({
        task_id: t.id, org_id, action: "created", performed_by: uid,
        new_value: t.plan_status === "active" ? "auto-generated (universal)" : "draft (admin re-run)",
      }));
      if (activityRows.length) await admin.from("task_activity_log").insert(activityRows);
      await admin.from("derived_metrics").update({ tasks_generated_at: new Date().toISOString() }).eq("org_id", org_id);
    }

    if (mode === "topup") {
      return json({ success: true, mode: "topup", added: inserted_count });
    }

    // ── Approve plan: stamp plan_activated_at ──────────────────────────────
    const activated_at = new Date().toISOString();
    const isFirstActivation = !org.plan_activated_at;
    if (isFirstActivation) {
      await admin.from("organizations").update({ plan_activated_at: activated_at }).eq("id", org_id);
    }

    // ── Auto-create Platform Setup + Marketing Foundation projects ─────────
    // Only on first activation, only if not already present.
    let auto_projects_created = 0;
    if (isFirstActivation) {
      const { data: existingProjects } = await admin
        .from("org_projects")
        .select("id, engine, auto_created")
        .eq("org_id", org_id);
      const existingByEngine = new Map<string, string>();
      for (const p of (existingProjects ?? []) as any[]) {
        if (p.auto_created && p.engine) existingByEngine.set(p.engine, p.id);
      }

      const autoProjectsSpec = [
        {
          engine: "Platform" as const,
          name: "Platform Setup",
          description: "Activating the Curve Sports Platform and partner network for your organization.",
          display_order: 0,
        },
        {
          engine: "Marketing" as const,
          name: "Marketing Foundation",
          description: "Building your organization's brand presence and digital marketing infrastructure.",
          display_order: 1,
        },
      ];

      for (const spec of autoProjectsSpec) {
        if (existingByEngine.has(spec.engine)) continue;
        const { data: created, error: pErr } = await admin
          .from("org_projects")
          .insert({
            org_id,
            name: spec.name,
            description: spec.description,
            engine: spec.engine,
            status: "active",
            released_at: activated_at,
            released_by: uid,
            auto_created: true,
            display_order: spec.display_order,
            created_by: uid,
          })
          .select("id")
          .single();
        if (pErr || !created) continue;
        auto_projects_created++;
        // Assign every existing task in that engine to this project
        await admin
          .from("org_tasks")
          .update({ project_id: created.id, plan_status: "active" })
          .eq("org_id", org_id)
          .eq("engine", spec.engine)
          .is("project_id", null);
      }
    }

    // Count drafts still waiting for project assignment
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
      auto_projects_created,
      plan_activated_at: org.plan_activated_at ?? activated_at,
    });
  } catch (e: any) {
    return json({ error: e.message ?? "unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
