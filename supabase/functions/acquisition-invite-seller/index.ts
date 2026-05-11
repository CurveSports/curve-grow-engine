// Admin-only: invite a seller to an acquisition portal.
// Creates an auth user (or reuses existing), assigns the seller_portal role,
// inserts an acquisition_portal_users row, and sends a magic-link invite.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" });

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Unauthorized" });
  const callerId = u.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: rolesRows } = await admin.from("user_roles").select("role").eq("user_id", callerId);
  const callerIsAdmin = (rolesRows ?? []).some((r: any) => r.role === "admin");
  if (!callerIsAdmin) {
    // also allow acquisitions module users
    const { data: prof } = await admin.from("profiles").select("module_access").eq("user_id", callerId).maybeSingle();
    const ok = prof?.module_access?.includes("acquisitions");
    if (!ok) return json({ error: "Forbidden" });
  }

  const body = await req.json().catch(() => ({}));
  const acquisition_id = body.acquisition_id as string;
  const email = String(body.email ?? "").trim().toLowerCase();
  const display_name = (body.display_name ?? "").toString().trim() || null;
  const expires_at = body.expires_at ?? null;

  if (!acquisition_id || !/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: "acquisition_id and a valid email are required" });
  }

  // Find or create the auth user
  let userId: string | null = null;
  const { data: existing } = await admin.from("profiles").select("user_id").eq("email", email).maybeSingle();
  if (existing?.user_id) {
    userId = existing.user_id;
  } else {
    const redirectTo = `${req.headers.get("origin") ?? ""}/`;
    const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: display_name, role_hint: "seller_portal" },
      redirectTo,
    });
    if (invErr || !inv?.user) return json({ error: invErr?.message ?? "invite_failed" });
    userId = inv.user.id;
    await admin.from("profiles").upsert(
      { user_id: userId, email, full_name: display_name, module_access: [] },
      { onConflict: "user_id" }
    );
  }

  await admin.from("user_roles").upsert(
    { user_id: userId, role: "seller_portal" },
    { onConflict: "user_id,role" }
  );

  const { error: pErr } = await admin.from("acquisition_portal_users").upsert({
    acquisition_id,
    user_id: userId,
    portal_type: "seller",
    display_name,
    email,
    is_active: true,
    access_expires_at: expires_at,
    invited_by: callerId,
  }, { onConflict: "acquisition_id,user_id" });
  if (pErr) return json({ error: pErr.message });

  return json({ ok: true, user_id: userId });
});
