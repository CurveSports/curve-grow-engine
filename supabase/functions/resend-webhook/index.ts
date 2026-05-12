// Receive Resend webhook events (delivered, opened, clicked, bounced, complained).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TYPE_MAP: Record<string, string> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "spam_report",
  "email.delivery_delayed": "delivery_delayed",
  "email.failed": "failed",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const payload = await req.json();
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const eventType = TYPE_MAP[payload.type] || payload.type;
    const data = payload.data || {};
    const tags: any[] = data.tags || [];
    const sendIdTag = tags.find((t: any) => t.name === "send_id");
    const contactIdTag = tags.find((t: any) => t.name === "contact_id");
    const send_id = sendIdTag?.value;
    const contact_id = contactIdTag?.value;
    const email = Array.isArray(data.to) ? data.to[0] : data.to;

    if (!send_id) return new Response("ok", { status: 200 });

    await admin.from("org_email_events").insert({
      send_id, contact_id: contact_id || null, email,
      event_type: eventType, event_data: data,
    });

    // Update aggregated counts
    const updates: Record<string, any> = {};
    if (eventType === "opened") updates.opened_count = (await admin.rpc as any) ? undefined : undefined;
    // Use raw increments
    if (["opened", "clicked", "bounced", "unsubscribed"].includes(eventType)) {
      const col = eventType === "opened" ? "opened_count" : eventType === "clicked" ? "clicked_count" : eventType === "bounced" ? "bounced_count" : "unsubscribed_count";
      const { data: cur } = await admin.from("org_email_sends").select(col).eq("id", send_id).single();
      const next = ((cur as any)?.[col] || 0) + 1;
      await admin.from("org_email_sends").update({ [col]: next }).eq("id", send_id);
    }

    if ((eventType === "bounced" || eventType === "spam_report" || eventType === "unsubscribed") && contact_id) {
      const patch: any = {};
      if (eventType === "bounced") patch.hard_bounce = true;
      if (eventType === "unsubscribed" || eventType === "spam_report") {
        patch.unsubscribed = true;
        patch.unsubscribed_at = new Date().toISOString();
      }
      if (Object.keys(patch).length) await admin.from("org_contacts").update(patch).eq("id", contact_id);
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("resend-webhook", e);
    return new Response("error", { status: 500 });
  }
});
