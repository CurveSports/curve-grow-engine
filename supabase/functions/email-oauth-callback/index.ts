// OAuth callback — exchanges code for tokens and stores the connection.
// User is redirected back to the app with ?email_oauth=success|error.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? "";
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID") ?? "";
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_OAUTH_CLIENT_SECRET") ?? "";

function callbackUrl() {
  return `${SUPABASE_URL}/functions/v1/email-oauth-callback`;
}

// Simple base64 obfuscation. NOT real encryption — but better than plaintext at rest in the DB.
// TODO: swap for AES-GCM with a key from Vault if/when org policy requires it.
function encryptToken(t: string): string {
  return btoa(unescape(encodeURIComponent(t)));
}

function redirect(to: string, params: Record<string, string>): Response {
  const u = new URL(to);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: u.toString() } });
}

async function exchangeGoogle(code: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(), grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(`Google token exchange failed: ${await r.text()}`);
  return r.json() as Promise<{
    access_token: string; refresh_token?: string; expires_in: number; scope: string;
  }>;
}

async function googleUserInfo(accessToken: string) {
  const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error("Failed to fetch Google user info");
  return r.json() as Promise<{ email: string; name?: string }>;
}

async function exchangeMicrosoft(code: string) {
  const r = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: MICROSOFT_CLIENT_ID, client_secret: MICROSOFT_CLIENT_SECRET,
      redirect_uri: callbackUrl(), grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(`Microsoft token exchange failed: ${await r.text()}`);
  return r.json() as Promise<{
    access_token: string; refresh_token?: string; expires_in: number; scope: string;
  }>;
}

async function msUserInfo(accessToken: string) {
  const r = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error("Failed to fetch Microsoft user info");
  const j = await r.json() as { mail?: string; userPrincipalName?: string; displayName?: string };
  return { email: j.mail || j.userPrincipalName || "", name: j.displayName };
}

Deno.serve(async (req) => {
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // Look up state to find the user + redirect target
  let stateRow: any = null;
  if (state) {
    const { data } = await supa.from("user_email_oauth_states").select("*").eq("state", state).maybeSingle();
    stateRow = data;
  }

  const fallbackRedirect = stateRow?.redirect_to || `${SUPABASE_URL}`;

  if (errorParam) {
    return redirect(fallbackRedirect, { email_oauth: "error", reason: errorParam });
  }
  if (!code || !stateRow) {
    return redirect(fallbackRedirect, { email_oauth: "error", reason: "Invalid_state" });
  }

  try {
    let tokens: { access_token: string; refresh_token?: string; expires_in: number; scope: string };
    let info: { email: string; name?: string };

    if (stateRow.provider === "gmail") {
      tokens = await exchangeGoogle(code);
      info = await googleUserInfo(tokens.access_token);
    } else if (stateRow.provider === "outlook") {
      tokens = await exchangeMicrosoft(code);
      info = await msUserInfo(tokens.access_token);
    } else {
      throw new Error("Unsupported provider");
    }

    if (!tokens.refresh_token) {
      throw new Error("No refresh token returned — please retry and grant offline access.");
    }
    if (!info.email) throw new Error("Could not determine email address.");

    const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString();

    // Upsert (delete then insert to handle the unique constraint cleanly)
    await supa.from("user_email_connections").delete()
      .eq("user_id", stateRow.user_id)
      .eq("provider", stateRow.provider)
      .eq("email_address", info.email.toLowerCase());

    await supa.from("user_email_connections").insert({
      user_id: stateRow.user_id,
      provider: stateRow.provider,
      email_address: info.email.toLowerCase(),
      display_name: info.name ?? null,
      refresh_token_encrypted: encryptToken(tokens.refresh_token),
      access_token_encrypted: encryptToken(tokens.access_token),
      token_expires_at: expiresAt,
      scopes: tokens.scope,
      status: "active",
    });

    // Cleanup state
    await supa.from("user_email_oauth_states").delete().eq("state", state);

    return redirect(fallbackRedirect, { email_oauth: "success", provider: stateRow.provider });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("oauth-callback error", msg);
    return redirect(fallbackRedirect, { email_oauth: "error", reason: encodeURIComponent(msg).slice(0, 200) });
  }
});
