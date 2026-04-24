// Starts OAuth flow for Gmail or Outlook personal-inbox connection.
// Returns { authUrl } — the client redirects the user to this URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? "";
const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_OAUTH_CLIENT_ID") ?? "";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

const OUTLOOK_SCOPES = [
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/User.Read",
  "offline_access",
  "openid",
  "email",
].join(" ");

function callbackUrl() {
  return `${SUPABASE_URL}/functions/v1/email-oauth-callback`;
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

    const { provider, redirectTo } = await req.json() as { provider: "gmail" | "outlook"; redirectTo: string };
    if (provider !== "gmail" && provider !== "outlook") {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (provider === "gmail" && !GOOGLE_CLIENT_ID) {
      return new Response(JSON.stringify({ error: "Gmail OAuth not configured. Ask Curve admin to add GOOGLE_OAUTH_CLIENT_ID." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (provider === "outlook" && !MICROSOFT_CLIENT_ID) {
      return new Response(JSON.stringify({ error: "Outlook OAuth not configured. Ask Curve admin to add MICROSOFT_OAUTH_CLIENT_ID." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = crypto.randomUUID();
    await supa.from("user_email_oauth_states").insert({
      state,
      user_id: user.id,
      provider,
      redirect_to: redirectTo || "",
    });

    let authUrl: string;
    if (provider === "gmail") {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: callbackUrl(),
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        scope: GMAIL_SCOPES,
        state,
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } else {
      const params = new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        redirect_uri: callbackUrl(),
        response_type: "code",
        response_mode: "query",
        scope: OUTLOOK_SCOPES,
        state,
        prompt: "select_account",
      });
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
    }

    return new Response(JSON.stringify({ authUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
