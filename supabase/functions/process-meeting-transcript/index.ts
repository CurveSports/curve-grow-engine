// Processes a meeting transcript with Lovable AI, extracts summary/decisions/actions
// and creates task suggestions linked to existing acquisition tasks.
// POST { transcript_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { transcript_id } = await req.json();
    if (!transcript_id) return j({ error: "transcript_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return j({ error: "LOVABLE_API_KEY missing" }, 500);

    const { data: t } = await admin.from("acquisition_meeting_transcripts").select("*").eq("id", transcript_id).maybeSingle();
    if (!t) return j({ error: "not found" }, 404);
    if (!t.acquisition_id) return j({ error: "transcript not tagged to acquisition" }, 400);

    await admin.from("acquisition_meeting_transcripts").update({ ai_status: "processing", ai_error: null }).eq("id", transcript_id);

    const { data: acq } = await admin.from("acquisition_projects").select("*").eq("id", t.acquisition_id).maybeSingle();
    const { data: tasks } = await admin.from("acquisition_tasks").select("id, title, workstream, phase, status, lead_person_name, target_date").eq("acquisition_id", t.acquisition_id);
    const taskList = (tasks ?? []).map((x: any) => `[${x.id}] ${x.title} | ws=${x.workstream} | status=${x.status} | lead=${x.lead_person_name ?? "—"} | due=${x.target_date ?? "—"}`).join("\n");

    const day = acq?.close_date ? Math.floor((Date.now() - new Date(acq.close_date).getTime()) / 86400000) : null;

    const prompt = `You analyze meeting transcripts for post-acquisition integration of sports clubs.

Club: ${acq?.club_name}
Phase: ${acq?.phase}
Day ${day ?? "?"} of 100-day integration.

Current task list:
${taskList || "(none)"}

Meeting transcript:
${(t.raw_transcript ?? "").slice(0, 50000)}

Return ONLY valid JSON, no markdown, with this shape:
{
 "meeting_summary": "3-5 sentences",
 "key_decisions": [{"decision":"","context":""}],
 "action_items": [{"action":"","owner":"","deadline":null,"suggested_task_id":null,"suggested_status_change":null,"confidence":"high|medium|low"}],
 "open_issues": [{"issue":"","workstream":"","severity":"high|medium|low"}],
 "risk_flags": [{"risk":"","workstream":""}],
 "follow_ups": [{"item":"","owner":"","date":null}],
 "task_suggestions": [{"type":"status_update|new_task|add_note|update_date|mark_blocked|mark_complete","existing_task_id":null,"existing_task_title":"","action":"","context":"","confidence":"high|medium|low"}]
}
Rules: Only suggest mark_complete with high confidence when explicitly stated. "working on it" => started. "waiting on/blocked" => mark_blocked. Be conservative.`;

    const resp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      await admin.from("acquisition_meeting_transcripts").update({ ai_status: "failed", ai_error: `${resp.status}: ${txt.slice(0, 500)}` }).eq("id", transcript_id);
      if (resp.status === 429) return j({ error: "Rate limit exceeded, try again shortly." }, 429);
      if (resp.status === 402) return j({ error: "AI credits exhausted." }, 402);
      return j({ error: "AI gateway error" }, 500);
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content.replace(/```json|```/g, "").trim()); } catch (e) {
      await admin.from("acquisition_meeting_transcripts").update({ ai_status: "failed", ai_error: "JSON parse failed" }).eq("id", transcript_id);
      return j({ error: "invalid AI output" }, 500);
    }

    await admin.from("acquisition_meeting_transcripts").update({
      ai_status: "complete",
      meeting_summary: parsed.meeting_summary ?? null,
      key_decisions: parsed.key_decisions ?? [],
      action_items: parsed.action_items ?? [],
      open_issues: parsed.open_issues ?? [],
      risk_flags: parsed.risk_flags ?? [],
      follow_ups: parsed.follow_ups ?? [],
      processed_at: new Date().toISOString(),
    }).eq("id", transcript_id);

    const taskIds = new Set((tasks ?? []).map((x: any) => x.id));
    const sugs = (parsed.task_suggestions ?? []).filter((s: any) => s && s.action).map((s: any) => ({
      transcript_id,
      acquisition_id: t.acquisition_id,
      suggestion_type: s.type ?? "add_note",
      existing_task_id: s.existing_task_id && taskIds.has(s.existing_task_id) ? s.existing_task_id : null,
      existing_task_title: s.existing_task_title ?? null,
      suggested_action: s.action,
      context_from_transcript: s.context ?? null,
      confidence: ["high","medium","low"].includes(s.confidence) ? s.confidence : "medium",
    }));
    if (sugs.length) await admin.from("acquisition_task_suggestions").insert(sugs);

    return j({ success: true, suggestions: sugs.length });
  } catch (e: any) {
    console.error(e);
    return j({ error: e.message ?? "unknown" }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
