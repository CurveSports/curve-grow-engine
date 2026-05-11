// Public, token-validated endpoint for the staff onboarding page.
// No JWT required — auth is via the 32-char URL token. All access is scoped
// to the single staff member identified by the token.
//
// GET  ?token=...                 → bootstrap data
// POST { token, op:"submit", ... } → submit a compliance item (with optional file)
// POST { token, op:"acknowledge_handbook", item_id } → mark handbook acknowledged
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const validateToken = async (token: string) => {
    if (!token || typeof token !== "string" || token.length < 16) return null;
    const { data: tok } = await admin
      .from("acquisition_staff_tokens")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();
    if (!tok) return null;
    if (tok.expires_at && new Date(tok.expires_at) < new Date()) return null;
    return tok;
  };

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token") ?? "";
      const tok = await validateToken(token);
      if (!tok) return json({ error: "invalid_or_expired" }, 200);

      const [{ data: staff }, { data: acq }, { data: items }, { data: cfg }, { data: content }, { data: handbookDoc }] =
        await Promise.all([
          admin.from("acquisition_staff").select("*").eq("id", tok.staff_id).maybeSingle(),
          admin.from("acquisition_projects").select("*").eq("id", tok.acquisition_id).maybeSingle(),
          admin.from("acquisition_compliance_items").select("*").eq("staff_id", tok.staff_id).order("created_at"),
          admin.from("acquisition_portal_config").select("config_key, config_value, config_label, display_order")
            .eq("acquisition_id", tok.acquisition_id).order("display_order"),
          admin.from("acquisition_portal_content").select("*")
            .eq("acquisition_id", tok.acquisition_id).eq("portal_type", "staff")
            .eq("is_visible", true).order("display_order"),
          admin.from("acquisition_documents").select("id, document_name, file_path, external_url")
            .eq("acquisition_id", tok.acquisition_id).eq("document_type", "handbook")
            .eq("is_current_version", true).maybeSingle(),
        ]);

      // Track view + bump counter
      await admin.from("acquisition_staff_tokens").update({
        last_accessed_at: new Date().toISOString(),
        access_count: (tok.access_count ?? 0) + 1,
      }).eq("id", tok.id);

      const isFirstView = (tok.access_count ?? 0) === 0;
      await admin.from("acquisition_portal_activity").insert({
        acquisition_id: tok.acquisition_id,
        staff_token_id: tok.id,
        actor_name: staff ? `${staff.first_name} ${staff.last_name}` : "Staff",
        action: isFirstView ? "login" : "page_view",
        detail: isFirstView ? "First access to onboarding page" : "Viewed onboarding page",
      });

      const cfgMap: Record<string, string | null> = {};
      for (const c of cfg ?? []) cfgMap[c.config_key] = c.config_value ?? null;

      return json({
        staff: staff ? {
          id: staff.id,
          first_name: staff.first_name,
          last_name: staff.last_name,
          email: staff.email,
          role: staff.role,
        } : null,
        acquisition: acq ? {
          id: acq.id,
          club_name: acq.club_name,
          state: acq.state,
          phase: acq.phase,
        } : null,
        items: items ?? [],
        config: cfgMap,
        content: content ?? [],
        handbook_doc: handbookDoc ?? null,
      });
    }

    if (req.method === "POST") {
      const ct = req.headers.get("content-type") ?? "";
      let token = "";
      let op = "";
      let fields: Record<string, any> = {};
      let file: File | null = null;

      if (ct.includes("multipart/form-data")) {
        const fd = await req.formData();
        token = String(fd.get("token") ?? "");
        op = String(fd.get("op") ?? "");
        for (const [k, v] of fd.entries()) {
          if (k === "token" || k === "op" || k === "file") continue;
          fields[k] = v;
        }
        const f = fd.get("file");
        if (f instanceof File) file = f;
      } else {
        const body = await req.json().catch(() => ({}));
        token = body.token ?? "";
        op = body.op ?? "";
        fields = body;
      }

      const tok = await validateToken(token);
      if (!tok) return json({ error: "invalid_or_expired" }, 200);

      const { data: staff } = await admin.from("acquisition_staff")
        .select("first_name, last_name").eq("id", tok.staff_id).maybeSingle();
      const actorName = staff ? `${staff.first_name} ${staff.last_name}` : "Staff";

      if (op === "submit") {
        const itemId = String(fields.item_id ?? "");
        if (!itemId) return json({ error: "missing item_id" });

        // Confirm the item belongs to this staff member
        const { data: item } = await admin.from("acquisition_compliance_items")
          .select("*").eq("id", itemId).eq("staff_id", tok.staff_id).maybeSingle();
        if (!item) return json({ error: "item_not_found" }, 200);

        let documentUrl: string | null = item.documentation_url ?? null;
        if (file) {
          const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${tok.acquisition_id}/compliance/${safe(staff?.first_name ?? "staff")}-${safe(staff?.last_name ?? "")}/${Date.now()}-${safe(file.name)}`;
          const buf = new Uint8Array(await file.arrayBuffer());
          const { error: upErr } = await admin.storage.from("acquisition-documents")
            .upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: false });
          if (upErr) return json({ error: `upload_failed: ${upErr.message}` });
          documentUrl = path;

          await admin.from("acquisition_documents").insert({
            acquisition_id: tok.acquisition_id,
            document_name: file.name,
            document_type: "compliance",
            workstream: "compliance",
            storage_type: "uploaded",
            file_path: path,
            file_size: file.size,
            file_type: file.type,
            is_seller_visible: false,
          });
        }

        await admin.from("acquisition_compliance_items").update({
          status: "submitted",
          documentation_url: documentUrl,
          reference_number: fields.reference_number ?? item.reference_number,
          vendor: fields.vendor ?? item.vendor,
          documentation_notes: fields.notes ?? item.documentation_notes,
          completed_date: fields.completed_date ?? item.completed_date,
          updated_at: new Date().toISOString(),
        }).eq("id", itemId).eq("staff_id", tok.staff_id);

        await admin.from("acquisition_portal_activity").insert({
          acquisition_id: tok.acquisition_id,
          staff_token_id: tok.id,
          actor_name: actorName,
          action: "submit_compliance_item",
          detail: `Submitted: ${item.requirement_name}`,
        });

        return json({ ok: true });
      }

      if (op === "acknowledge_handbook") {
        const itemId = String(fields.item_id ?? "");
        if (!itemId) return json({ error: "missing item_id" });
        const { data: item } = await admin.from("acquisition_compliance_items")
          .select("*").eq("id", itemId).eq("staff_id", tok.staff_id).maybeSingle();
        if (!item) return json({ error: "item_not_found" });

        await admin.from("acquisition_compliance_items").update({
          status: "complete",
          completed_date: new Date().toISOString().slice(0, 10),
          documentation_notes: "Acknowledged via onboarding portal",
          updated_at: new Date().toISOString(),
        }).eq("id", itemId).eq("staff_id", tok.staff_id);

        await admin.from("acquisition_portal_activity").insert({
          acquisition_id: tok.acquisition_id,
          staff_token_id: tok.id,
          actor_name: actorName,
          action: "acknowledge_handbook",
          detail: `Acknowledged handbook`,
        });
        return json({ ok: true });
      }

      return json({ error: "unknown_op" });
    }

    return json({ error: "method_not_allowed" }, 405);
  } catch (e: any) {
    return json({ error: e?.message ?? "unknown" }, 200);
  }
});
