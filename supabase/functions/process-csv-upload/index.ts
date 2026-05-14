// Parse uploaded CSV → contacts + team memberships + parent linking, with dedupe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

// Top-level import buckets → contact_type
// "staff" = any non-playing adult on a team (head coach, asst, manager) → contact_type "coach"
// Team Manager designation is assigned in-app after upload, not at import time.
const ROLE_TO_CONTACT_TYPE: Record<string, string> = {
  player: "player",
  player_parent: "player",
  staff: "coach",
  coach: "coach",
  assistant_coach: "coach",
  team_manager: "coach",
  parent: "family",
};

// Maps a role value to the team_membership.role column.
// We collapse all staff variants to "coach" — Team Manager is assigned in-app later.
const ROLE_TO_MEMBERSHIP: Record<string, string> = {
  player: "player",
  player_parent: "player",
  staff: "coach",
  coach: "coach",
  assistant_coach: "coach",
  team_manager: "coach",
  parent: "parent",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      org_id,
      csv_text,
      csv,            // legacy alias
      column_mapping = {},
      sms_default,
      duplicate_strategy = "merge",
      filename,
      season_id,      // optional
      team_id,        // optional
      role,           // optional: player|coach|assistant_coach|team_manager|parent
    } = body;
    const text = csv_text || csv;
    if (!org_id || !text) {
      return new Response(JSON.stringify({ error: "org_id and csv_text required" }), {
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

    const rows = parseCsv(text);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "CSV is empty" }), { status: 400, headers: corsHeaders });
    }
    const header = rows[0].map((h) => h.trim());
    const dataRows = rows.slice(1);

    const uploadIns = await admin.from("org_contact_uploads").insert({
      org_id, filename: filename || "upload.csv", uploaded_by: userData.user.id,
      total_rows: dataRows.length, status: "processing",
    }).select().single();
    const upload_id = uploadIns.data?.id;

    let imported = 0, merged = 0, parentsLinked = 0, errors = 0;
    const errorDetails: any[] = [];

    const mapping = column_mapping as Record<string, string>;
    const sourceIdx: Record<string, number> = {};
    header.forEach((h, i) => { sourceIdx[h] = i; });

    const primaryContactType = role ? (ROLE_TO_CONTACT_TYPE[role] || "family") : null;

    async function findOrCreateContact(c: Record<string, any>): Promise<{ id: string; created: boolean } | null> {
      const { data: dupId } = await admin.rpc("find_duplicate_contact", {
        _org_id: org_id,
        _email: c.email || null,
        _phone: c.phone || null,
        _first_name: c.first_name || null,
        _last_name: c.last_name || null,
      });
      if (dupId) {
        if (duplicate_strategy === "skip") return { id: dupId as string, created: false };
        // Merge: only fill missing fields; don't overwrite non-empty
        const { data: existing } = await admin.from("org_contacts").select("*").eq("id", dupId).maybeSingle();
        if (existing) {
          const patch: Record<string, any> = {};
          for (const k of Object.keys(c)) {
            if (c[k] === undefined || c[k] === null || c[k] === "") continue;
            if (existing[k] === null || existing[k] === undefined || existing[k] === "" ||
                (Array.isArray(existing[k]) && existing[k].length === 0)) {
              patch[k] = c[k];
            }
          }
          if (Object.keys(patch).length) await admin.from("org_contacts").update(patch).eq("id", dupId);
        }
        return { id: dupId as string, created: false };
      }
      const ins = await admin.from("org_contacts").insert(c).select("id").single();
      if (ins.error) throw ins.error;
      return { id: ins.data!.id, created: true };
    }

    // In-process cache: team name (lowercased) → team_id, scoped to season_id
    const teamCache = new Map<string, string>();
    async function findOrCreateTeam(name: string, forSeasonId: string | null): Promise<string | null> {
      if (!name || !forSeasonId) return null;
      const key = `${forSeasonId}::${name.toLowerCase()}`;
      const cached = teamCache.get(key);
      if (cached) return cached;
      const { data: existing } = await admin.from("org_teams")
        .select("id").eq("season_id", forSeasonId).ilike("name", name).maybeSingle();
      if (existing?.id) { teamCache.set(key, existing.id); return existing.id; }
      const ins = await admin.from("org_teams").insert({
        org_id, season_id: forSeasonId, name: name.trim(),
      }).select("id").single();
      if (ins.error || !ins.data?.id) return null;
      teamCache.set(key, ins.data.id);
      return ins.data.id;
    }

    const ROLE_NORMALIZE: Record<string, string> = {
      player: "player", players: "player",
      coach: "coach", "head coach": "coach", "head_coach": "coach",
      "assistant coach": "assistant_coach", assistant_coach: "assistant_coach", asst: "assistant_coach",
      "team manager": "team_manager", team_manager: "team_manager", manager: "team_manager",
      parent: "parent", guardian: "parent",
    };

    for (const row of dataRows) {
      try {
        const primary: Record<string, any> = {
          org_id, source: "csv_upload", source_batch_id: upload_id,
          contact_type: primaryContactType || "family",
        };
        const parent: Record<string, any> = {
          org_id, source: "csv_upload", source_batch_id: upload_id,
          contact_type: "family",
        };
        let smsOptIn = sms_default === "true" || sms_default === true;
        let rowTeamName: string | null = null;
        let rowRole: string | null = null;

        for (const [src, tgt] of Object.entries(mapping)) {
          if (!tgt) continue;
          const idx = sourceIdx[src];
          if (idx === undefined) continue;
          const val = (row[idx] || "").trim();
          if (!val) continue;

          if (tgt === "sms_opt_in") {
            smsOptIn = ["true", "yes", "y", "1"].includes(val.toLowerCase());
          } else if (tgt === "player_grad_year") {
            const n = parseInt(val); if (!isNaN(n)) primary[tgt] = n;
          } else if (tgt === "team_name") {
            rowTeamName = val;
          } else if (tgt === "role") {
            rowRole = ROLE_NORMALIZE[val.toLowerCase()] || val.toLowerCase();
          } else if (tgt.startsWith("parent_")) {
            parent[tgt.replace("parent_", "")] = val;
          } else if (tgt === "jersey_number" || tgt === "position") {
            primary[`__${tgt}`] = val;
          } else {
            primary[tgt] = val;
          }
        }
        primary.sms_opt_in = smsOptIn;
        if (smsOptIn) primary.sms_opt_in_date = new Date().toISOString();

        // Per-row role overrides body-level role
        const effectiveRole = rowRole || role || null;
        if (effectiveRole) {
          primary.contact_type = ROLE_TO_CONTACT_TYPE[effectiveRole] || primary.contact_type;
        }

        if (!primary.email && !primary.phone && !primary.first_name) {
          errors++; errorDetails.push({ row, reason: "row has no identifying data" });
          continue;
        }

        const jersey = primary.__jersey_number; delete primary.__jersey_number;
        const position = primary.__position; delete primary.__position;

        const result = await findOrCreateContact(primary);
        if (!result) { errors++; continue; }
        if (result.created) imported++; else merged++;

        // Resolve target team: row-level wins, otherwise the one passed in body
        let effectiveTeamId: string | null = team_id || null;
        if (rowTeamName) {
          const created = await findOrCreateTeam(rowTeamName, season_id || null);
          if (created) effectiveTeamId = created;
        }

        if (effectiveTeamId && effectiveRole && result.id) {
          await admin.from("org_team_memberships").upsert({
            org_id, team_id: effectiveTeamId, contact_id: result.id, role: effectiveRole,
            jersey_number: jersey || null,
            position: position || null,
          }, { onConflict: "team_id,contact_id,role", ignoreDuplicates: false });
        }

        // Parent linking
        if (parent.first_name || parent.email || parent.phone) {
          const parentResult = await findOrCreateContact(parent);
          if (parentResult?.id) {
            parentsLinked++;
            await admin.from("org_contacts").update({ parent_of_contact_id: result.id }).eq("id", parentResult.id);
            if (effectiveTeamId) {
              await admin.from("org_team_memberships").upsert({
                org_id, team_id: effectiveTeamId, contact_id: parentResult.id, role: "parent",
                is_primary_parent: true,
              }, { onConflict: "team_id,contact_id,role", ignoreDuplicates: true });
            }
          }
        }
      } catch (e: any) {
        errors++; errorDetails.push({ row, reason: String(e?.message || e) });
      }
    }

    await admin.from("org_contact_uploads").update({
      successful_imports: imported, duplicates_merged: merged, errors,
      error_details: errorDetails.slice(0, 50), status: "complete",
    }).eq("id", upload_id);

    return new Response(JSON.stringify({
      upload_id, imported, merged, parents_linked: parentsLinked, errors,
      successful_imports: imported, duplicates_merged: merged,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-csv-upload", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
