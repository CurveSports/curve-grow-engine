// Delete an organization and all its associated data.
// Authorization: only Curve admins (app_role = 'admin').
// This is destructive and irreversible — also deletes all member auth accounts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Tables with an org_id column whose rows should be removed when the org is deleted.
const ORG_SCOPED_TABLES = [
  "admin_alert_dismissals",
  "admin_org_assignments",
  "admin_org_reviews",
  "derived_metrics",
  "invitations",
  "notification_log",
  "org_branding",
  "org_calculator_scenarios",
  "org_calendar_items",
  "org_communication_log",
  "org_communication_seasons",
  "org_communication_standards",
  "org_communication_tracks",
  "org_contract_installments",
  "org_digital_audits",
  "org_digital_presence",
  "org_engagement_baselines",
  "org_engagement_contracts",
  "org_notes",
  "org_presentation_edits",
  "org_projects",
  "org_revenue_entries",
  "org_revenue_share_invoices",
  "org_revenue_share_summary",
  "org_send_platforms",
  "org_sponsorship_summary",
  "org_sponsorship_tiers",
  "org_task_assignees",
  "org_tasks",
  "org_tier_history",
  "org_weekly_focus",
  "organization_intake",
  "sponsorship_lead_notes",
  "sponsorship_lead_stage_history",
  "sponsorship_leads",
  "task_activity_log",
  "task_notes",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const orgId: string | undefined = body?.org_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "org_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: rolesRows } = await admin
      .from("user_roles").select("role").eq("user_id", callerId);
    const isAdmin = (rolesRows ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up profiles in this org
    const { data: orgProfiles } = await admin
      .from("profiles").select("user_id").eq("org_id", orgId);
    const memberUserIds = (orgProfiles ?? []).map((p: any) => p.user_id);

    // Clear org primary reference
    await admin.from("organizations").update({ primary_user_id: null }).eq("id", orgId);

    // Delete org-scoped data (best effort — log but don't abort)
    const errors: string[] = [];
    for (const t of ORG_SCOPED_TABLES) {
      const { error } = await admin.from(t as any).delete().eq("org_id", orgId);
      if (error) errors.push(`${t}: ${error.message}`);
    }

    // Delete member auth accounts (and their profile/roles/onboarding)
    for (const uid of memberUserIds) {
      await admin.from("user_roles").delete().eq("user_id", uid);
      await admin.from("user_onboarding").delete().eq("user_id", uid);
      await admin.from("profiles").delete().eq("user_id", uid);
      const { error: delErr } = await admin.auth.admin.deleteUser(uid);
      if (delErr) errors.push(`auth ${uid}: ${delErr.message}`);
    }

    // Finally delete the organization itself
    const { error: orgErr } = await admin.from("organizations").delete().eq("id", orgId);
    if (orgErr) {
      return new Response(JSON.stringify({ error: orgErr.message, partial_errors: errors }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, deleted_users: memberUserIds.length, partial_errors: errors }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
