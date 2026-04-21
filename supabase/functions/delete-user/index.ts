// Delete a user account.
// Authorization rules:
// - Curve admin (app_role = 'admin') can delete ANY user except themselves.
// - Org primary (organizations.primary_user_id) can delete invited members of their org
//   (org_user role, same org_id, not themselves, not another primary).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    // Validate caller
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
    const targetUserId: string | undefined = body?.user_id;
    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (targetUserId === callerId) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account here." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Check caller role
    const { data: rolesRows } = await admin
      .from("user_roles").select("role").eq("user_id", callerId);
    const callerRoles = (rolesRows ?? []).map((r: any) => r.role);
    const isAdmin = callerRoles.includes("admin");

    // Load target profile + roles
    const [{ data: targetProfile }, { data: targetRoles }] = await Promise.all([
      admin.from("profiles").select("user_id, email, org_id").eq("user_id", targetUserId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", targetUserId),
    ]);
    const targetRoleList = (targetRoles ?? []).map((r: any) => r.role);

    let authorized = false;
    if (isAdmin) {
      authorized = true;
    } else {
      // Org primary path
      const { data: callerProfile } = await admin
        .from("profiles").select("org_id").eq("user_id", callerId).maybeSingle();
      const callerOrgId = callerProfile?.org_id;
      if (!callerOrgId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: org } = await admin
        .from("organizations").select("primary_user_id").eq("id", callerOrgId).maybeSingle();
      const isPrimary = org?.primary_user_id === callerId;
      if (!isPrimary) {
        return new Response(JSON.stringify({ error: "Only the organization primary can remove members." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Target must be in same org, be org_user (not admin), and not be the org primary themselves
      if (!targetProfile || targetProfile.org_id !== callerOrgId) {
        return new Response(JSON.stringify({ error: "User is not a member of your organization." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (targetRoleList.includes("admin")) {
        return new Response(JSON.stringify({ error: "Cannot delete an admin." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (org?.primary_user_id === targetUserId) {
        return new Response(JSON.stringify({ error: "Cannot delete the organization primary." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authorized = true;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If target is an org primary and admin is deleting them, clear the primary_user_id
    if (isAdmin && targetProfile?.org_id) {
      await admin
        .from("organizations")
        .update({ primary_user_id: null })
        .eq("id", targetProfile.org_id)
        .eq("primary_user_id", targetUserId);
    }

    // Clean up app data first (in case FKs exist) — best effort.
    await admin.from("user_roles").delete().eq("user_id", targetUserId);
    await admin.from("user_onboarding").delete().eq("user_id", targetUserId);
    await admin.from("profiles").delete().eq("user_id", targetUserId);

    // Mark any pending invitations for this email as revoked
    if (targetProfile?.email) {
      await admin
        .from("invitations")
        .update({ status: "revoked" })
        .eq("email", targetProfile.email)
        .eq("status", "pending");
    }

    // Finally delete the auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
