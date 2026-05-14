// Admin-only: look up users to diagnose sign-in problems.
// Returns auth.users metadata (email_confirmed_at, last_sign_in_at, has_password)
// joined with profile + roles. Available to any user with the 'admin' app_role.
// Optional: search filter (email substring, case-insensitive).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", userRes.user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const search: string = ((body?.search ?? "") as string).trim().toLowerCase();

    // Page through auth users (admins-only API).
    const allUsers: any[] = [];
    for (let page = 1; page <= 25; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const batch = data?.users ?? [];
      allUsers.push(...batch);
      if (batch.length < 200) break;
    }

    // Filter by email substring if provided
    const filtered = search
      ? allUsers.filter((u) => (u.email ?? "").toLowerCase().includes(search))
      : allUsers;

    const userIds = filtered.map((u) => u.id);
    const [profilesRes, rolesRes, orgsRes] = await Promise.all([
      admin.from("profiles").select("user_id, full_name, org_id, module_access").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("user_roles").select("user_id, role").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
      admin.from("organizations").select("id, name"),
    ]);
    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));
    const orgMap = new Map((orgsRes.data ?? []).map((o: any) => [o.id, o.name]));
    const roleMap = new Map<string, string[]>();
    for (const r of (rolesRes.data ?? []) as any[]) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }

    const rows = filtered.map((u) => {
      const profile = profileMap.get(u.id) as any;
      const providers = (u.identities ?? []).map((i: any) => i.provider).join(",") || "—";
      return {
        user_id: u.id,
        email: u.email,
        full_name: profile?.full_name ?? null,
        org_id: profile?.org_id ?? null,
        org_name: profile?.org_id ? (orgMap.get(profile.org_id) ?? null) : null,
        module_access: Array.isArray(profile?.module_access) ? profile.module_access : [],
        roles: roleMap.get(u.id) ?? [],
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        recovery_sent_at: u.recovery_sent_at ?? null,
        invited_at: u.invited_at ?? null,
        banned_until: (u as any).banned_until ?? null,
        has_password: !!(u as any).encrypted_password ||
          (u.identities ?? []).some((i: any) => i.provider === "email"),
        providers,
      };
    });

    rows.sort((a, b) => {
      const ax = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
      const bx = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
      return bx - ax;
    });

    return json({ users: rows, total: rows.length });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" }, 200);
  }
});
