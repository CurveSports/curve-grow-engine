// Communications 2.0 — Auto-draft generator
// Modes:
//   1. calendar  — generate from a commv2_calendar_items + commv2_event_facts row
//   2. ad_hoc    — generate from a free-text prompt (no calendar item required)
// Hard rule: if mode=calendar and required facts are missing, refuse to draft.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type ReqBody = {
  draft_id: string; // existing commv2_drafts row to populate
};

type FactField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  help_text?: string;
};

function findMissingRequired(schema: FactField[], shared: any, occurrences: any[], multi: boolean): string[] {
  const missing: string[] = [];
  const required = (schema || []).filter((f) => f.required);

  for (const f of required) {
    if (multi) {
      // For multi-occurrence types: required occurrence-level fields (date/time/location)
      // are checked per occurrence; everything else is shared.
      const isOccurrenceField = ["date", "time", "location"].includes(f.type);
      if (isOccurrenceField) {
        if (!occurrences || occurrences.length === 0) {
          missing.push(`At least one occurrence (${f.label})`);
          continue;
        }
        const anyMissing = occurrences.some((o: any) => !o?.[f.key] || String(o[f.key]).trim() === "");
        if (anyMissing) missing.push(`${f.label} on every occurrence`);
      } else {
        if (!shared?.[f.key] || String(shared[f.key]).trim() === "") missing.push(f.label);
      }
    } else {
      // Single-occurrence: facts may live in shared OR occurrences[0]
      const fromShared = shared?.[f.key];
      const fromFirst = occurrences?.[0]?.[f.key];
      if ((!fromShared || String(fromShared).trim() === "") && (!fromFirst || String(fromFirst).trim() === "")) {
        missing.push(f.label);
      }
    }
  }
  return missing;
}

function buildSystemPrompt(orgName: string, brandVoice: string | null): string {
  return `You are a youth sports organization communications writer.

Organization: ${orgName}
${brandVoice ? `Brand voice: ${brandVoice}` : ""}

Rules — these are absolute:
1. NEVER invent dates, times, locations, prices, URLs, names, or any fact not provided in the FACTS block.
2. If a fact would normally appear in this kind of message but is not in FACTS, OMIT it. Do not write "TBD" or "to be announced" unless explicitly told to.
3. Keep the message concise and ready-to-send. No preamble, no meta-commentary.
4. For email format, start with "Subject: ..." on the first line.
5. List multiple occurrences clearly (one line per occurrence with date · time · location).
6. Match the tone requested. Default is warm, professional, parent-friendly.

Return ONLY the finished message body.`;
}

function buildFactsBlock(shared: any, occurrences: any[], multi: boolean): string {
  const parts: string[] = [];
  if (shared && Object.keys(shared).length > 0) {
    parts.push("Shared facts:");
    for (const [k, v] of Object.entries(shared)) {
      if (v == null || String(v).trim() === "") continue;
      parts.push(`- ${k}: ${v}`);
    }
  }
  if (occurrences && occurrences.length > 0) {
    parts.push(multi ? "\nOccurrences:" : "\nEvent details:");
    occurrences.forEach((o: any, i: number) => {
      const label = o.label ? ` (${o.label})` : "";
      parts.push(`${multi ? `Occurrence ${i + 1}${label}` : "Details"}:`);
      for (const [k, v] of Object.entries(o)) {
        if (v == null || String(v).trim() === "" || k === "label") continue;
        parts.push(`  - ${k}: ${v}`);
      }
    });
  }
  return parts.join("\n");
}

async function callAI(system: string, user: string): Promise<{ ok: boolean; text: string; error?: string }> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    return { ok: false, text: "", error: `AI ${resp.status}: ${t}` };
  }
  const data = await resp.json();
  return { ok: true, text: data?.choices?.[0]?.message?.content ?? "" };
}

function extractSubject(body: string): { subject: string | null; body: string } {
  const m = body.match(/^Subject:\s*(.+?)\n([\s\S]*)$/);
  if (m) return { subject: m[1].trim(), body: m[2].trim() };
  return { subject: null, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ReqBody = await req.json();
    if (!body?.draft_id) {
      return new Response(JSON.stringify({ error: "draft_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load draft
    const { data: draft, error: dErr } = await admin
      .from("commv2_drafts").select("*").eq("id", body.draft_id).maybeSingle();
    if (dErr || !draft) {
      return new Response(JSON.stringify({ error: "Draft not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load org for brand context
    const { data: org } = await admin.from("organizations")
      .select("name").eq("id", draft.org_id).maybeSingle();
    const orgName = org?.name ?? "the organization";

    // Optional: brand voice from org_communication_standards
    const { data: standards } = await admin.from("org_communication_standards")
      .select("standards_content").eq("org_id", draft.org_id).maybeSingle();
    const brandVoice = standards?.standards_content
      ? JSON.stringify(standards.standards_content).slice(0, 800)
      : null;

    let userPrompt = "";
    let factsSnapshot: any = null;
    let missingFacts: string[] = [];

    if (draft.draft_mode === "calendar") {
      if (!draft.calendar_item_id) {
        return new Response(JSON.stringify({ error: "Calendar draft missing calendar_item_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: item } = await admin.from("commv2_calendar_items")
        .select("*, commv2_event_types(*)").eq("id", draft.calendar_item_id).maybeSingle();
      if (!item) {
        return new Response(JSON.stringify({ error: "Calendar item not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventType = item.commv2_event_types as any;
      const { data: facts } = await admin.from("commv2_event_facts")
        .select("*").eq("calendar_item_id", item.id).maybeSingle();

      const shared = facts?.shared_facts ?? {};
      const occurrences = facts?.occurrences ?? [];
      const multi = !!eventType.supports_multiple_occurrences;

      missingFacts = findMissingRequired(
        eventType.fact_schema as FactField[], shared, occurrences, multi,
      );

      if (missingFacts.length > 0) {
        // Block — write missing facts back to the draft and refuse
        await admin.from("commv2_drafts").update({
          status: "pending_facts",
          missing_facts: missingFacts,
          last_error: null,
          generation_attempts: (draft.generation_attempts ?? 0) + 1,
        }).eq("id", draft.id);

        return new Response(JSON.stringify({
          ok: false,
          blocked: true,
          missing_facts: missingFacts,
          message: "Cannot draft — required facts are missing.",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      factsSnapshot = { shared, occurrences, event_type_code: eventType.code };

      userPrompt = `Communication type: ${eventType.display_name}
Stakeholder audience: ${draft.stakeholder}
Send date: ${item.current_send_date}
Tone: ${draft.tone ?? "warm and professional"}
Format: ${draft.format ?? "email"}

FACTS (use ONLY these — do not invent anything else):
${buildFactsBlock(shared, occurrences, multi)}

Title for context: ${item.title}
${item.notes ? `Notes from the user: ${item.notes}` : ""}`;
    } else {
      // ad_hoc mode
      if (!draft.ad_hoc_prompt) {
        return new Response(JSON.stringify({ error: "Ad-hoc draft missing ad_hoc_prompt" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userPrompt = `Stakeholder audience: ${draft.stakeholder}
Tone: ${draft.tone ?? "warm and professional"}
Format: ${draft.format ?? "email"}

What the user wants to say:
${draft.ad_hoc_prompt}

If the user mentions any specific dates, times, locations, prices, or URLs above, use them exactly. Do not invent additional facts.`;
    }

    const system = buildSystemPrompt(orgName, brandVoice);
    const ai = await callAI(system, userPrompt);

    if (!ai.ok) {
      await admin.from("commv2_drafts").update({
        status: "drafting",
        last_error: ai.error,
        generation_attempts: (draft.generation_attempts ?? 0) + 1,
      }).eq("id", draft.id);
      return new Response(JSON.stringify({ ok: false, error: ai.error }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, body: bodyText } = extractSubject(ai.text);

    await admin.from("commv2_drafts").update({
      status: "drafted",
      subject,
      body: bodyText,
      missing_facts: [],
      last_error: null,
      facts_snapshot: factsSnapshot,
      generated_at: new Date().toISOString(),
      generation_attempts: (draft.generation_attempts ?? 0) + 1,
    }).eq("id", draft.id);

    return new Response(JSON.stringify({
      ok: true,
      draft_id: draft.id,
      subject,
      body: bodyText,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
