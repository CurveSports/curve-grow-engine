// Zoom webhook receiver for recording.transcript_completed events.
// Public endpoint (no JWT). Validates Zoom URL challenge using ZOOM_WEBHOOK_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const ZOOM_WEBHOOK_SECRET = Deno.env.get("ZOOM_WEBHOOK_SECRET") ?? "";

    // URL validation challenge
    if (body.event === "endpoint.url_validation") {
      const plainToken: string = body.payload?.plainToken ?? "";
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", enc.encode(ZOOM_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(plainToken));
      const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
      return new Response(JSON.stringify({ plainToken, encryptedToken: hex }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (body.event === "recording.transcript_completed") {
      const meeting = body.payload?.object ?? {};
      const downloadToken = body.download_token ?? body.payload?.download_token;
      const transcriptFile = (meeting.recording_files ?? []).find((f: any) => f.file_type === "TRANSCRIPT");
      if (!transcriptFile) return new Response("no transcript", { status: 200 });

      let transcriptText = "";
      try {
        const resp = await fetch(`${transcriptFile.download_url}?access_token=${downloadToken}`);
        transcriptText = await resp.text();
      } catch (e) {
        console.error("download fail", e);
      }
      const parsed = parseVtt(transcriptText);

      const participants = (meeting.participant_audio_files ?? []).map((p: any) => ({ name: p.file_name ?? "Unknown", email: p.email ?? null }));

      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("acquisition_meeting_transcripts").insert({
        source_type: "zoom_webhook",
        zoom_meeting_id: String(meeting.id ?? ""),
        zoom_meeting_topic: meeting.topic ?? null,
        zoom_host_email: meeting.host_email ?? null,
        zoom_recording_url: meeting.share_url ?? null,
        zoom_duration_minutes: meeting.duration ?? null,
        zoom_participants: participants,
        meeting_date: meeting.start_time ?? new Date().toISOString(),
        meeting_title: meeting.topic ?? "Zoom recording",
        raw_transcript: parsed,
        is_tagged: false,
        ai_status: "pending",
      });
      return new Response("ok", { status: 200 });
    }

    return new Response("event not handled", { status: 200 });
  } catch (e: any) {
    console.error("webhook error", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

function parseVtt(vtt: string): string {
  if (!vtt) return "";
  const lines = vtt.split("\n");
  const segments: string[] = [];
  let speaker = "";
  let text = "";
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (line.startsWith("WEBVTT") || line.includes("-->") || line.trim() === "") {
      if (text) { segments.push(`${speaker}: ${text}`.trim()); text = ""; }
      continue;
    }
    const m = line.match(/^([^:]+?):\s*(.+)$/);
    if (m) {
      if (text) segments.push(`${speaker}: ${text}`.trim());
      speaker = m[1].trim();
      text = m[2].trim();
    } else if (line.trim()) {
      text += " " + line.trim();
    }
  }
  if (text) segments.push(`${speaker}: ${text}`.trim());
  return segments.join("\n");
}
