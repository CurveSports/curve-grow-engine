// Sends an email through the user's connected Gmail or Outlook inbox.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "";
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID") ?? "";
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_OAUTH_CLIENT_SECRET") ?? "";

function decryptToken(t: string): string {
  return decodeURIComponent(escape(atob(t)));
}
function encryptToken(t: string): string {
  return btoa(unescape(encodeURIComponent(t)));
}

async function refreshGmailAccess(refreshToken: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken, grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new Error(`Gmail refresh failed: ${await r.text()}`);
  return r.json() as Promise<{ access_token: string; expires_in: number }>;
}

async function refreshOutlookAccess(refreshToken: string) {
  const r = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID, client_secret: MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshToken, grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Mail.Send offline_access",
    }),
  });
  if (!r.ok) throw new Error(`Outlook refresh failed: ${await r.text()}`);
  return r.json() as Promise<{ access_token: string; expires_in: number; refresh_token?: string }>;
}

function base64UrlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendGmail(accessToken: string, from: string, to: string, subject: string, body: string) {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");
  const raw = base64UrlEncode(message);
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!r.ok) throw new Error(`Gmail send failed: ${await r.text()}`);
  const j = await r.json() as { id: string };
  return j.id;
}

async function sendOutlook(accessToken: string, to: string, subject: string, body: string) {
  const r = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });
  if (!r.ok) throw new Error(`Outlook send failed: ${await r.text()}`);
  return null; // Microsoft Graph sendMail returns 202 with no body
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: u } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = u?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      connectionId: string;
      orgId: string;
      to: string;
      subject: string;
      body: string;
      calendarItemId?: string | null;
      communicationType: string;
    };

    if (!body.connectionId || !body.to || !body.body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch connection (must belong to caller)
    const { data: conn, error: connErr } = await supa
      .from("user_email_connections")
      .select("*")
      .eq("id", body.connectionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refreshToken = decryptToken(conn.refresh_token_encrypted);
    let accessToken: string;
    let newAccess: string | null = null;
    let newExpiresAt: string | null = null;
    let newRefresh: string | null = null;

    // Always refresh — short-lived access tokens need it
    if (conn.provider === "gmail") {
      const r = await refreshGmailAccess(refreshToken);
      accessToken = r.access_token;
      newAccess = r.access_token;
      newExpiresAt = new Date(Date.now() + (r.expires_in - 60) * 1000).toISOString();
    } else if (conn.provider === "outlook") {
      const r = await refreshOutlookAccess(refreshToken);
      accessToken = r.access_token;
      newAccess = r.access_token;
      newExpiresAt = new Date(Date.now() + (r.expires_in - 60) * 1000).toISOString();
      if (r.refresh_token) newRefresh = r.refresh_token;
    } else {
      throw new Error("Unknown provider");
    }

    let externalId: string | null = null;
    try {
      if (conn.provider === "gmail") {
        externalId = await sendGmail(accessToken, conn.email_address, body.to, body.subject, body.body);
      } else {
        await sendOutlook(accessToken, body.to, body.subject, body.body);
      }
    } catch (sendErr) {
      const msg = sendErr instanceof Error ? sendErr.message : "Send failed";
      await supa.from("user_email_connections").update({ last_error: msg.slice(0, 500) }).eq("id", conn.id);
      throw sendErr;
    }

    // Update connection with refreshed tokens + last_used
    const updates: Record<string, any> = {
      access_token_encrypted: encryptToken(newAccess!),
      token_expires_at: newExpiresAt,
      last_used_at: new Date().toISOString(),
      last_error: null,
    };
    if (newRefresh) updates.refresh_token_encrypted = encryptToken(newRefresh);
    await supa.from("user_email_connections").update(updates).eq("id", conn.id);

    // Log the send to org_communication_log
    await supa.from("org_communication_log").insert({
      org_id: body.orgId,
      generated_by: user.id,
      generated_on_behalf_of_org: false,
      communication_type: body.communicationType ?? "Personal email",
      sent_at: new Date().toISOString(),
      send_channel: conn.provider,
      send_recipient: body.to,
      send_subject: body.subject ?? null,
      send_body_excerpt: body.body.slice(0, 500),
      calendar_item_id: body.calendarItemId ?? null,
      external_message_id: externalId,
    });

    if (body.calendarItemId) {
      await supa.from("org_calendar_items").update({
        is_sent: true,
        sent_at: new Date().toISOString(),
        sent_by: user.id,
      }).eq("id", body.calendarItemId);
    }

    return new Response(JSON.stringify({ ok: true, externalId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("email-send error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
