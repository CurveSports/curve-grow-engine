// Parse uploaded CSV and create org_contacts in batches.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Naive CSV parser supporting quoted fields and commas
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0, field = "", row: string[] = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\n" || c === "\r") {
        if (field !== "" || row.length > 0) { row.push(field); rows.push(row); row = []; field = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
        i++; continue;
      }
      field += c; i++;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { org_id, csv_text, column_mapping, sms_default, duplicate_strategy, filename } = await req.json();
    if (!org_id || !csv_text || !column_mapping) {
      return new Response(JSON.stringify({ error: "org_id, csv_text, column_mapping required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rows = parseCsv(csv_text);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "CSV is empty" }), { status: 400, headers: corsHeaders });
    }
    const header = rows[0].map((h) => h.trim());
    const dataRows = rows.slice(1);

    // Insert upload record
    const uploadIns = await admin.from("org_contact_uploads").insert({
      org_id, filename: filename || "upload.csv", uploaded_by: userData.user.id,
      total_rows: dataRows.length, status: "processing",
    }).select().single();
    const upload_id = uploadIns.data?.id;

    let imported = 0, merged = 0, errors = 0;
    const errorDetails: any[] = [];

    // column_mapping: { source_column: target_field }
    const mapping = column_mapping as Record<string, string>;
    const sourceIdx: Record<string, number> = {};
    header.forEach((h, i) => { sourceIdx[h] = i; });

    for (const row of dataRows) {
      const contact: Record<string, any> = { org_id, source: "csv_upload", source_batch_id: upload_id };
      let smsOptIn = sms_default === "true" || sms_default === true;
      for (const [src, tgt] of Object.entries(mapping)) {
        const idx = sourceIdx[src];
        if (idx === undefined) continue;
        const val = (row[idx] || "").trim();
        if (!val) continue;
        if (tgt === "sms_opt_in") {
          smsOptIn = ["true", "yes", "y", "1"].includes(val.toLowerCase());
        } else if (tgt === "team_assignments") {
          contact[tgt] = val.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
        } else if (tgt === "player_grad_year") {
          const n = parseInt(val); if (!isNaN(n)) contact[tgt] = n;
        } else if (tgt.startsWith("custom.")) {
          contact.custom_fields = contact.custom_fields || {};
          contact.custom_fields[tgt.slice(7)] = val;
        } else {
          contact[tgt] = val;
        }
      }
      contact.sms_opt_in = smsOptIn;
      if (smsOptIn) contact.sms_opt_in_date = new Date().toISOString();
      if (!contact.contact_type) contact.contact_type = "family";

      if (!contact.email && !contact.phone) {
        errors++; errorDetails.push({ row, reason: "missing email and phone" });
        continue;
      }

      try {
        if (contact.email) {
          const { data: existing } = await admin.from("org_contacts")
            .select("id").eq("org_id", org_id).ilike("email", contact.email).maybeSingle();
          if (existing) {
            if (duplicate_strategy === "skip") continue;
            if (duplicate_strategy === "overwrite" || duplicate_strategy === "merge") {
              await admin.from("org_contacts").update(contact).eq("id", existing.id);
              merged++; continue;
            }
          }
        }
        const ins = await admin.from("org_contacts").insert(contact);
        if (ins.error) { errors++; errorDetails.push({ row, reason: ins.error.message }); }
        else imported++;
      } catch (e) {
        errors++; errorDetails.push({ row, reason: String(e) });
      }
    }

    await admin.from("org_contact_uploads").update({
      successful_imports: imported, duplicates_merged: merged, errors,
      error_details: errorDetails.slice(0, 50), status: "complete",
    }).eq("id", upload_id);

    return new Response(JSON.stringify({ upload_id, imported, merged, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-csv-upload", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
