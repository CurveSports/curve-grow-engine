// Admin-only: generate a magic-link / invite URL for an email.
// - If the user does not yet exist, generates an 'invite' link (also emails it).
// - If the user exists but has not confirmed, generates a 'magiclink' (also emails it).
// - If the user exists and IS confirmed, still returns a magic link the admin
//   can share for one-tap sign-in.
// Returns: { action_link, sent_email, user_existed, was_confirmed }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { sendLovableEmail } from "npm:@lovable.dev/email-js";

const SITE_NAME = "Curve OS";
const SENDER_DOMAIN = "notify.os.curvesports.com";
const FROM_DOMAIN = "os.curvesports.com";

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
    const origin = req.headers.get("origin") ?? "";
    const callerRedirect: string = body?.redirect_to || `${origin}/`;

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

    // For new invites, force the landing page to /set-password so the user
    // creates a password instead of being silently signed in with none.
    const redirectTo = linkType === "invite"
      ? `${(callerRedirect.match(/^https?:\/\/[^/]+/)?.[0]) ?? origin}/set-password`
      : callerRedirect;

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: linkType,
      email,
      options: { redirectTo },
    });


    if (linkErr) return json({ error: linkErr.message });
    const actionLink = (linkData as any)?.properties?.action_link ?? null;
    if (!actionLink) return json({ error: "Failed to generate link" });

    // Send the invitation email through Lovable Cloud's verified email domain.
    // generateLink only creates the URL; this function owns delivery so admins
    // get a fresh single-use link even when an invite already exists.
    let emailSent = false;
    let emailError: string | null = null;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableApiKey) {
      const isInvite = linkType === "invite";
      const subject = isInvite
        ? "You're invited to Curve OS"
        : "Your Curve OS sign-in link";
      const heading = isInvite ? "Welcome to Curve OS" : "Sign in to Curve OS";
      const intro = isInvite
        ? "Your organization has been set up on Curve OS. Click below to accept the invitation and finish creating your account."
        : "Click the button below for one-tap sign-in to your Curve OS account.";
      const html = `
<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;padding:24px;background:#fff;">
  <h2 style="font-weight:600;margin:0 0 12px;">${heading}</h2>
  <p style="color:#475569;margin:0 0 24px;line-height:1.5;">${intro}</p>
  <p style="margin:24px 0;">
    <a href="${actionLink}" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">${isInvite ? "Accept invitation" : "Sign in"}</a>
  </p>
  <p style="color:#94a3b8;font-size:12px;margin:32px 0 8px;">If the button doesn't work, copy and paste this link:</p>
  <p style="color:#64748b;font-size:12px;word-break:break-all;">${actionLink}</p>
  <p style="color:#94a3b8;font-size:12px;margin-top:24px;">This link is single-use and will expire.</p>
</body></html>`.trim();

      try {
        const messageId = crypto.randomUUID();
        await sendLovableEmail({
          to: email,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: `${intro}\n\n${actionLink}`,
          purpose: "transactional",
          label: "admin_invite_link",
          idempotency_key: `admin-invite-${messageId}`,
          message_id: messageId,
        }, {
          apiKey: lovableApiKey,
        });
        emailSent = true;
      } catch (e: any) {
        emailError = e?.message ?? String(e);
        console.error("Invite email send threw:", emailError);
      }
    } else {
      emailError = "LOVABLE_API_KEY not configured";
      console.warn(emailError);
    }

    // Best-effort: try to associate this attempt with an org via invitations
    // (so admins can filter the diagnostics log by org).
    let orgIdForLog: string | null = (body?.org_id as string | null) ?? null;
    if (!orgIdForLog) {
      const { data: inv } = await admin
        .from("invitations")
        .select("org_id")
        .ilike("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      orgIdForLog = (inv as any)?.org_id ?? null;
    }

    // Persist a diagnostics row for admin-facing UI. Never block the response.
    try {
      await admin.from("invite_send_log").insert({
        email,
        org_id: orgIdForLog,
        link_type: linkType,
        action_link: actionLink,
        sent_email: emailSent,
        email_error: emailError,
        user_existed: !!existingUser,
        was_confirmed: wasConfirmed,
        triggered_by: userRes.user.id,
      });
    } catch (logErr) {
      console.error("Failed to write invite_send_log:", logErr);
    }

    return json({
      action_link: actionLink,
      sent_email: emailSent,
      email_error: emailError,
      user_existed: !!existingUser,
      was_confirmed: wasConfirmed,
      link_type: linkType,
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "Unknown error" });
  }
});
