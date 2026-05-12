// Public one-click action handler for magic links (RSVP, confirm, unsubscribe).
// URL pattern: /functions/v1/magic-link-action?t=<token>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const html = (title: string, body: string, color = "#0F172A") => new Response(
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
   <meta name="viewport" content="width=device-width,initial-scale=1">
   <style>body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:48px 24px;display:flex;align-items:center;justify-content:center;min-height:100vh}
   .card{background:#fff;border-radius:16px;padding:40px;max-width:480px;box-shadow:0 10px 30px rgba(15,23,42,.08);text-align:center}
   h1{margin:0 0 12px;font-size:24px;color:${color}}p{margin:0;color:#64748b;line-height:1.5}</style></head>
   <body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`,
  { headers: { "content-type": "text/html; charset=utf-8" } },
);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (!token) return html("Invalid link", "This link is missing required information.");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: link } = await supabase
    .from("magic_links")
    .select("id,org_id,action,payload,contact_id,campaign_id,expires_at,used_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) return html("Link not found", "This link is no longer valid.");
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return html("Link expired", "Please request a new one from the organization.");
  }
  if (link.used_at) {
    return html("Already used", "This one-click link has already been used.");
  }

  const email = url.searchParams.get("email") || null;

  // Perform the action
  let title = "Done!";
  let body = "Your action was recorded.";

  try {
    switch (link.action) {
      case "rsvp_yes":
      case "rsvp_no":
      case "rsvp_maybe": {
        const status = link.action.replace("rsvp_", "");
        if (link.contact_id) {
          await supabase.from("org_contacts").update({
            custom_fields: { rsvp: { status, campaign_id: link.campaign_id, at: new Date().toISOString() } },
            last_engaged_at: new Date().toISOString(),
          }).eq("id", link.contact_id);
        }
        title = status === "yes" ? "You're in 🎉" : status === "no" ? "Got it" : "Marked as maybe";
        body = `Thanks for letting us know. We've recorded your response.`;
        break;
      }
      case "unsubscribe": {
        if (link.contact_id) {
          await supabase.from("org_contacts").update({
            unsubscribed: true,
            unsubscribed_at: new Date().toISOString(),
          }).eq("id", link.contact_id);
        }
        title = "Unsubscribed";
        body = "You will no longer receive marketing emails from this organization.";
        break;
      }
      case "confirm_attendance": {
        if (link.contact_id) {
          await supabase.from("org_contacts").update({
            custom_fields: { attendance_confirmed: true, confirmed_at: new Date().toISOString() },
          }).eq("id", link.contact_id);
        }
        title = "Attendance confirmed";
        body = "We can't wait to see you there.";
        break;
      }
      default:
        title = "Action recorded";
        body = "Thank you.";
    }

    await supabase.from("magic_links").update({
      used_at: new Date().toISOString(),
      used_by_email: email,
    }).eq("id", link.id);
  } catch (e) {
    console.error("magic-link-action error", e);
    return html("Something went wrong", "Please try again or contact the organization.");
  }

  return html(title, body);
});
