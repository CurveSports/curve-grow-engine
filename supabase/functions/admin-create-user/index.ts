// Admin-only: create a new user (admin or org_user) and send them a magic-link invite.
// - Requires the caller to have the 'admin' app_role.
// - For role='org_user', org_id is required.
// - For role='admin', org_id is ignored (admins are not bound to an org).
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
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const email: string = (body?.email ?? "").trim().toLowerCase();
    const fullName: string | null = body?.full_name?.trim() || null;
    const role: "admin" | "org_user" = body?.role;
    const orgId: string | null = body?.org_id ?? null;
    const isPrimary: boolean = !!body?.is_primary;
    const moduleAccessIn: string[] = Array.isArray(body?.module_access) ? body.module_access : [];
    const moduleAccess = moduleAccessIn.filter((m) => m === "allegiance" || m === "acquisitions");
    const finalModuleAccess = moduleAccess.length > 0
      ? Array.from(new Set(moduleAccess))
      : (role === "admin" ? ["allegiance", "acquisitions"] : ["allegiance"]);

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (role !== "admin" && role !== "org_user") {
      return new Response(JSON.stringify({ error: "role must be 'admin' or 'org_user'" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (role === "org_user" && !orgId) {
      return new Response(JSON.stringify({ error: "org_id is required for org_user" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify caller is admin
    const { data: rolesRows } = await admin
      .from("user_roles").select("role").eq("user_id", callerId);
    const callerIsAdmin = (rolesRows ?? []).some((r: any) => r.role === "admin");
    if (!callerIsAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the platform owner can create new Curve Admin accounts.
    const OWNER_EMAIL = "matt.gerber@curvesports.com";
    const callerEmail = (userRes.user.email ?? "").toLowerCase();
    if (role === "admin" && callerEmail !== OWNER_EMAIL) {
      return new Response(JSON.stringify({ error: `Only ${OWNER_EMAIL} can create new Curve Admin accounts.` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if a user already exists with this email (via profiles)
    const { data: existingProfile } = await admin
      .from("profiles").select("user_id").eq("email", email).maybeSingle();
    if (existingProfile) {
      return new Response(JSON.stringify({ error: "A user with this email already exists." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a pending invitation row (for record-keeping; handle_new_user trigger will also see it)
    await admin.from("invitations").insert({
      email,
      org_id: role === "admin" ? null : orgId,
      role,
      is_primary: role === "org_user" ? isPrimary : false,
      invited_by: callerId,
    });

    // Generate a magic link / invite via auth admin API. This both creates the user
    // and sends the invitation email.
    const redirectTo = `${req.headers.get("origin") ?? ""}/`;
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo,
    });

    if (inviteErr || !inviteData?.user) {
      return new Response(JSON.stringify({ error: inviteErr?.message ?? "Failed to invite user" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = inviteData.user.id;

    // Ensure profile exists (handle_new_user trigger may have already created it)
    await admin.from("profiles").upsert(
      {
        user_id: newUserId,
        email,
        full_name: fullName,
        org_id: role === "admin" ? null : orgId,
        module_access: finalModuleAccess,
      },
      { onConflict: "user_id" }
    );

    // Ensure role assignment
    await admin.from("user_roles").upsert(
      { user_id: newUserId, role },
      { onConflict: "user_id,role" }
    );

    // If primary org user, set on org
    if (role === "org_user" && isPrimary && orgId) {
      await admin.from("organizations").update({ primary_user_id: newUserId }).eq("id", orgId);
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
