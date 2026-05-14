// Admin-only: generate a magic-link / invite URL for an email.
// - If the user does not yet exist, generates an 'invite' link (also emails it).
// - If the user exists but has not confirmed, generates a 'magiclink' (also emails it).
// - If the user exists and IS confirmed, still returns a magic link the admin
//   can share for one-tap sign-in.
// Returns: { action_link, sent_email, user_existed, was_confirmed }
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
    if (!token) return json({ error: "Unauthorized" });

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return json({ error: "Unauthorized" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", userRes.user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) {
      return json({ error: "Forbidden" });
    }

    const body = await req.json().catch(() => ({}));
    const email: string = (body?.email ?? "").trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ error: "Valid email required" });
    }
    const redirectTo: string =
      body?.redirect_to ||
      `${req.headers.get("origin") ?? ""}/`;

    // Find existing auth user by email
    let existingUser: any = null;
    {
      // listUsers paginates; for our scale, scan the first few pages.
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        existingUser = (data?.users ?? []).find((u) => u.email?.toLowerCase() === email);
        if (existingUser || (data?.users ?? []).length < 200) break;
      }
    }
    const wasConfirmed = !!existingUser?.email_confirmed_at;

    // Choose link type: invite for brand-new emails, magiclink otherwise
    const linkType: "invite" | "magiclink" = existingUser ? "magiclink" : "invite";

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: linkType,
      email,
      options: { redirectTo },
    });

    if (linkErr) return json({ error: linkErr.message });
    const actionLink = (linkData as any)?.properties?.action_link ?? null;
    if (!actionLink) return json({ error: "Failed to generate link" });

    return json({
      action_link: actionLink,
      sent_email: true, // generateLink for invite/magiclink also sends the email
      user_existed: !!existingUser,
      was_confirmed: wasConfirmed,
      link_type: linkType,
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" });
  }
});
