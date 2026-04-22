import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  org_id: string;
  calculator_type: string;
  calculator_label: string;
  key_output_label: string;
  key_output_value: string;
  output_values: Record<string, unknown>;
  note: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body.org_id || !body.calculator_type) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify the caller belongs to this org
    const { data: profile } = await admin
      .from("profiles")
      .select("org_id, full_name, email")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!profile || profile.org_id !== body.org_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Org name for context
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", body.org_id)
      .maybeSingle();
    const orgName = org?.name ?? "An organization";

    // Log to notification_log
    await admin.from("notification_log").insert({
      org_id: body.org_id,
      recipient_role: "admin",
      notification_type: "calculator_share",
      task_ids: [
        {
          calculator_type: body.calculator_type,
          calculator_label: body.calculator_label,
          key_output_label: body.key_output_label,
          key_output_value: body.key_output_value,
          note: body.note,
          shared_by: profile.full_name ?? profile.email,
        },
      ],
    });

    // Send Resend email to all admins
    if (resendKey) {
      const { data: adminRoles } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const adminIds = (adminRoles ?? []).map((r: any) => r.user_id);
      if (adminIds.length) {
        const { data: adminProfiles } = await admin
          .from("profiles")
          .select("email")
          .in("user_id", adminIds);
        const recipients = (adminProfiles ?? []).map((p: any) => p.email).filter(Boolean);

        if (recipients.length) {
          const subject = `${orgName} shared a calculator scenario`;
          const noteHtml = body.note
            ? `<p style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #22c55e;color:#334155;font-style:italic;">"${escapeHtml(body.note)}"</p>`
            : "";
          const html = `
<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="font-weight:600;margin:0 0 8px;">${escapeHtml(orgName)} shared a scenario</h2>
  <p style="color:#64748b;margin:0 0 20px;">${escapeHtml(profile.full_name ?? profile.email ?? "Someone")} ran a <strong>${escapeHtml(body.calculator_label)}</strong> scenario and wanted to share it with you.</p>
  <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px 20px;margin:20px 0;">
    <p style="margin:0;color:#065f46;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">${escapeHtml(body.key_output_label)}</p>
    <p style="margin:4px 0 0;font-size:24px;font-weight:600;color:#064e3b;">${escapeHtml(body.key_output_value)}</p>
  </div>
  ${noteHtml}
  <p style="color:#64748b;font-size:14px;margin:24px 0 12px;">This might be worth discussing in your next check-in.</p>
  <a href="https://curve-grow-engine.lovable.app/admin/org/${body.org_id}" style="display:inline-block;background:#22c55e;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:500;">View organization</a>
</body></html>`.trim();

          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Curve OS <onboarding@resend.dev>",
              to: recipients,
              subject,
              html,
            }),
          });
          if (!resp.ok) {
            const text = await resp.text();
            console.error("Resend error:", resp.status, text);
          }
        }
      }
    } else {
      console.warn("RESEND_API_KEY not set — skipping email");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("share-calculator-scenario error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
