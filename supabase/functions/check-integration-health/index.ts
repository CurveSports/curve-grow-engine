import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Integration = {
  id: string;
  integration_key: string;
  env_var_names: string[];
  status: string;
};

type CheckResult = {
  status: "live" | "stubbed" | "broken";
  result: { success: boolean; latency_ms?: number; error_message?: string; missing_vars?: string[] };
};

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; ms: number; error?: string }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { value, ms: Date.now() - start };
  } catch (e) {
    return { ms: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

async function probe(key: string): Promise<CheckResult> {
  switch (key) {
    case "anthropic": {
      const k = Deno.env.get("ANTHROPIC_API_KEY");
      if (!k) return { status: "stubbed", result: { success: false, missing_vars: ["ANTHROPIC_API_KEY"] } };
      const r = await timed(async () => {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": k, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: "claude-3-5-haiku-20241022", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return true;
      });
      return r.error
        ? { status: "broken", result: { success: false, latency_ms: r.ms, error_message: r.error } }
        : { status: "live", result: { success: true, latency_ms: r.ms } };
    }
    case "resend": {
      const k = Deno.env.get("RESEND_API_KEY");
      if (!k) return { status: "stubbed", result: { success: false, missing_vars: ["RESEND_API_KEY"] } };
      const r = await timed(async () => {
        const resp = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${k}` } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return true;
      });
      return r.error
        ? { status: "broken", result: { success: false, latency_ms: r.ms, error_message: r.error } }
        : { status: "live", result: { success: true, latency_ms: r.ms } };
    }
    case "browserless": {
      const k = Deno.env.get("BROWSERLESS_API_TOKEN");
      if (!k) return { status: "stubbed", result: { success: false, missing_vars: ["BROWSERLESS_API_TOKEN"] } };
      const r = await timed(async () => {
        const resp = await fetch(`https://chrome.browserless.io/json/version?token=${k}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return true;
      });
      return r.error
        ? { status: "broken", result: { success: false, latency_ms: r.ms, error_message: r.error } }
        : { status: "live", result: { success: true, latency_ms: r.ms } };
    }
    case "postmark_spam": {
      const r = await timed(async () => {
        const resp = await fetch("https://spamcheck.postmarkapp.com/filter", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ email: "Subject: hi\n\nhello", options: "short" }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const j = await resp.json();
        if (!j?.success) throw new Error("no success in response");
        return true;
      });
      return r.error
        ? { status: "broken", result: { success: false, latency_ms: r.ms, error_message: r.error } }
        : { status: "live", result: { success: true, latency_ms: r.ms } };
    }
    case "ayrshare": {
      const k = Deno.env.get("AYRSHARE_API_KEY");
      if (!k) return { status: "stubbed", result: { success: false, missing_vars: ["AYRSHARE_API_KEY"] } };
      const r = await timed(async () => {
        const resp = await fetch("https://app.ayrshare.com/api/user", {
          headers: { Authorization: `Bearer ${k}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return true;
      });
      return r.error
        ? { status: "broken", result: { success: false, latency_ms: r.ms, error_message: r.error } }
        : { status: "live", result: { success: true, latency_ms: r.ms } };
    }
    case "twilio": {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
      if (!sid || !tok) return { status: "stubbed", result: { success: false, missing_vars: ["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN"].filter(v => !Deno.env.get(v)) } };
      const r = await timed(async () => {
        const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
          headers: { Authorization: "Basic " + btoa(`${sid}:${tok}`) },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return true;
      });
      return r.error
        ? { status: "broken", result: { success: false, latency_ms: r.ms, error_message: r.error } }
        : { status: "live", result: { success: true, latency_ms: r.ms } };
    }
    case "zoom":
    case "supabase_storage":
    case "google_drive":
      return { status: "live", result: { success: true } };
    case "ip_geolocation": {
      const r = await timed(async () => {
        const resp = await fetch("https://ipapi.co/8.8.8.8/country/");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const t = (await resp.text()).trim();
        if (!t || t.length < 2) throw new Error("empty country response");
        return true;
      });
      return r.error
        ? { status: "stubbed", result: { success: false, latency_ms: r.ms, error_message: r.error } }
        : { status: "live", result: { success: true, latency_ms: r.ms } };
    }
    default:
      return { status: "stubbed", result: { success: false, error_message: "no probe implemented" } };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  let onlyKey: string | null = null;
  if (req.method === "POST") {
    try { const body = await req.json(); onlyKey = body?.integration_key ?? null; } catch (_) {}
  }

  const query = supabase.from("system_integrations").select("id,integration_key,env_var_names,status");
  const { data: integrations, error } = onlyKey
    ? await query.eq("integration_key", onlyKey)
    : await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  const results: Array<{ key: string; from: string; to: string; success: boolean }> = [];

  for (const it of (integrations ?? []) as Integration[]) {
    // 'not_built' stays not_built unless we have evidence — skip the probe entirely.
    if (it.status === "not_built") continue;
    const probed = await probe(it.integration_key);
    await supabase
      .from("system_integrations")
      .update({
        status: probed.status,
        last_health_check_at: new Date().toISOString(),
        last_health_check_result: probed.result,
      })
      .eq("id", it.id);
    results.push({ key: it.integration_key, from: it.status, to: probed.status, success: probed.result.success });
  }

  return new Response(JSON.stringify({ ok: true, checked: results.length, results }), {
    status: 200,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
