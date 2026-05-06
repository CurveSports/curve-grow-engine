// Run a digital presence audit: scrape via Firecrawl + analyze via Lovable AI.
// Stores result in org_digital_audits with a comparison_to_previous diff.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type AuditType = "website" | "social" | "combined";

const SOCIAL_FIELDS = [
  ["instagram_handle", "Instagram"],
  ["facebook_url", "Facebook"],
  ["x_handle", "X / Twitter"],
  ["tiktok_handle", "TikTok"],
  ["youtube_url", "YouTube"],
  ["linkedin_url", "LinkedIn"],
] as const;

function normalizeSocialUrl(platform: string, raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim().replace(/^@/, "");
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  switch (platform) {
    case "Instagram": return `https://instagram.com/${v}`;
    case "X / Twitter": return `https://x.com/${v}`;
    case "TikTok": return `https://tiktok.com/@${v}`;
    case "Facebook": return v.includes("facebook.com") ? `https://${v}` : `https://facebook.com/${v}`;
    case "YouTube": return v.includes("youtube.com") ? `https://${v}` : `https://youtube.com/@${v}`;
    case "LinkedIn": return v.includes("linkedin.com") ? `https://${v}` : `https://linkedin.com/company/${v}`;
    default: return v;
  }
}

async function firecrawlScrape(url: string, apiKey: string, formats: any[] = ["markdown", "links"]) {
  try {
    const resp = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats, onlyMainContent: true }),
    });
    if (!resp.ok) return { ok: false, error: `${resp.status}: ${await resp.text()}` };
    const data = await resp.json();
    const payload = data?.data ?? data;
    return {
      ok: true,
      url,
      title: payload?.metadata?.title ?? null,
      markdown: payload?.markdown ?? null,
      links: payload?.links ?? [],
      branding: payload?.branding ?? null,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "scrape failed" };
  }
}

async function firecrawlMap(url: string, apiKey: string) {
  try {
    const resp = await fetch(`${FIRECRAWL_BASE}/map`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, limit: 50, includeSubdomains: false }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data?.links ?? data?.data?.links ?? []) as string[];
  } catch { return []; }
}

const RUBRIC_TOOL = {
  type: "function",
  function: {
    name: "audit_result",
    description: "Return the structured digital presence audit.",
    parameters: {
      type: "object",
      properties: {
        website_score: { type: "number", description: "Overall website score 0-100; null if not audited." },
        social_score: { type: "number", description: "Overall social score 0-100; null if not audited." },
        overall_score: { type: "number", description: "Weighted blend 0-100." },
        scores_breakdown: {
          type: "object",
          description: "Optional per-rubric/per-platform sub-scores. Free-form keys.",
          additionalProperties: { type: "number" },
        },
        ai_summary: { type: "string", description: "2-4 sentence executive narrative." },
        wins: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              detail: { type: "string" },
              source: { type: "string", description: "Page URL or platform name where evidence was observed." },
            },
            required: ["title", "detail"],
          },
        },
        fixes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              detail: { type: "string" },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              type: { type: "string", enum: ["quick_win", "project"] },
            },
            required: ["title", "detail", "severity", "type"],
          },
        },
        sponsor_flags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              detail: { type: "string" },
            },
            required: ["title", "detail"],
          },
        },
      },
      required: ["overall_score", "ai_summary", "wins", "fixes", "sponsor_flags"],
    },
  },
};

function buildSystemPrompt(audit_type: AuditType, intake: any) {
  const positioning = [
    intake?.org_type && `Org type: ${intake.org_type}`,
    intake?.market_type && `Market: ${intake.market_type}`,
    intake?.organization_focus && `Focus: ${intake.organization_focus}`,
    intake?.market_strategy && `Strategy: ${intake.market_strategy}`,
    intake?.player_mix && `Player mix: ${intake.player_mix}`,
    intake?.local_market_competition && `Competition: ${intake.local_market_competition}`,
    intake?.seeks_sponsorships && `Sponsorship posture: ${intake.seeks_sponsorships}`,
    intake?.number_of_sponsors != null && `Current sponsors: ${intake.number_of_sponsors}`,
  ].filter(Boolean).join(" · ");

  const focusLine =
    audit_type === "website" ? "Audit the WEBSITE only. Set social_score to null."
    : audit_type === "social" ? "Audit the SOCIAL MEDIA presence only. Set website_score to null."
    : "Provide an executive summary covering BOTH website and social; emphasize cross-channel cohesion.";

  return [
    "You are a senior brand and revenue strategist auditing a youth/travel sports organization's digital presence on behalf of Curve Sports.",
    `Org context: ${positioning || "(intake context limited)"}.`,
    focusLine,
    "Score on a 0-100 scale where: 0-39 = Poor, 40-59 = Below Standard, 60-74 = OK, 75-89 = Strong, 90-100 = Best-in-class.",
    "Be SPECIFIC. Cite the page URL or platform name in `source` for every win/fix when possible. Generic advice is unacceptable.",
    "Top 5 wins, top 5 fixes (each tagged quick_win or project), and 3 sponsor-readiness flags (issues that would hurt sponsor conversion).",
    "Judge AGAINST the org's stated positioning, not against generic best practices alone.",
    "Return ONLY by calling the audit_result tool. Do not return prose.",
  ].join(" ");
}

function buildUserPayload(audit_type: AuditType, presence: any, scraped: any) {
  const lines: string[] = [];
  lines.push(`AUDIT_TYPE: ${audit_type}`);
  if (presence?.website_url) lines.push(`WEBSITE_URL: ${presence.website_url}`);
  if (presence?.posting_frequency) lines.push(`SELF_REPORTED_POSTING_FREQUENCY: ${presence.posting_frequency}`);
  if (presence?.primary_audience_notes) lines.push(`PRIMARY_AUDIENCE_NOTES: ${presence.primary_audience_notes}`);
  lines.push("\nNOTE: Brand voice is NOT self-reported. Infer it from the recent post content scraped below — quote real language, hashtags, and CTA patterns as evidence.");

  if (scraped?.website?.length) {
    lines.push("\n=== WEBSITE PAGES SCRAPED ===");
    for (const p of scraped.website) {
      lines.push(`\n--- ${p.url} ---`);
      if (p.title) lines.push(`TITLE: ${p.title}`);
      if (p.markdown) lines.push(p.markdown.slice(0, 6000));
    }
  }

  if (scraped?.social?.length) {
    lines.push("\n=== SOCIAL PROFILES (scraped where possible) ===");
    for (const s of scraped.social) {
      lines.push(`\n--- ${s.platform} :: ${s.url} ---`);
      if (!s.ok) {
        lines.push(`SCRAPE_FAILED: ${s.error ?? "unknown"} (use self-reported samples below if relevant).`);
      } else {
        if (s.title) lines.push(`TITLE: ${s.title}`);
        if (s.markdown) lines.push(s.markdown.slice(0, 3500));
      }
    }
  }

  if (presence?.social_post_samples?.length) {
    lines.push("\n=== SELF-REPORTED POST SAMPLES ===");
    for (const sample of presence.social_post_samples) {
      lines.push(`[${sample.platform ?? "?"}] ${sample.text ?? ""}`);
    }
  }

  return lines.join("\n");
}

function diffAudits(current: any, previous: any) {
  if (!previous) return null;
  const fixesPrev = (previous.fixes ?? []).map((f: any) => f.title?.toLowerCase().trim());
  const fixesCur = (current.fixes ?? []).map((f: any) => f.title?.toLowerCase().trim());
  return {
    score_deltas: {
      website: numDelta(current.website_score, previous.website_score),
      social: numDelta(current.social_score, previous.social_score),
      overall: numDelta(current.overall_score, previous.overall_score),
    },
    resolved: (previous.fixes ?? []).filter((f: any) => !fixesCur.includes(f.title?.toLowerCase().trim())),
    still_outstanding: (current.fixes ?? []).filter((f: any) => fixesPrev.includes(f.title?.toLowerCase().trim())),
    new_issues: (current.fixes ?? []).filter((f: any) => !fixesPrev.includes(f.title?.toLowerCase().trim())),
    previous_run_at: previous.completed_at ?? previous.created_at,
  };
}
function numDelta(cur: number | null | undefined, prev: number | null | undefined) {
  if (cur == null || prev == null) return null;
  return Math.round((cur - prev) * 10) / 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    const isCronCall = !user; // cron uses service role

    const body = await req.json();
    const orgId: string = body.org_id;
    const auditType: AuditType = body.audit_type ?? "combined";
    const triggerSource: string = body.trigger_source ?? (isCronCall ? "auto_quarterly" : "manual");
    if (!orgId) throw new Error("org_id required");

    // Permission check (skip for cron)
    if (!isCronCall) {
      const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user!.id);
      const isAdmin = roleRow?.some((r: any) => r.role === "admin");
      const { data: org } = await admin.from("organizations").select("primary_user_id").eq("id", orgId).maybeSingle();
      const isOrgPrimary = (org as any)?.primary_user_id === user!.id;
      if (!isAdmin && !isOrgPrimary) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Load org context
    const [{ data: presence }, { data: intake }] = await Promise.all([
      admin.from("org_digital_presence").select("*").eq("org_id", orgId).maybeSingle(),
      admin.from("organization_intake").select("*").eq("org_id", orgId).maybeSingle(),
    ]);

    if (!presence?.website_url && !SOCIAL_FIELDS.some(([k]) => (presence as any)?.[k])) {
      return new Response(JSON.stringify({
        error: "No digital presence info on file. Add a website URL or social handle first.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert pending row
    const { data: previous } = await admin
      .from("org_digital_audits")
      .select("*")
      .eq("org_id", orgId).eq("audit_type", auditType).eq("status", "completed")
      .order("completed_at", { ascending: false }).limit(1).maybeSingle();

    const { data: pending, error: pendingErr } = await admin
      .from("org_digital_audits")
      .insert({
        org_id: orgId, audit_type: auditType, status: "running",
        trigger_source: triggerSource,
        triggered_by: user?.id ?? null,
        previous_audit_id: (previous as any)?.id ?? null,
      }).select().single();
    if (pendingErr) throw pendingErr;

    try {
      const scraped: { website: any[]; social: any[] } = { website: [], social: [] };

      // Website scraping
      if ((auditType === "website" || auditType === "combined") && presence?.website_url && FIRECRAWL_API_KEY) {
        const home = await firecrawlScrape(presence.website_url, FIRECRAWL_API_KEY, ["markdown", "links"]);
        if (home.ok) scraped.website.push(home);

        const map = await firecrawlMap(presence.website_url, FIRECRAWL_API_KEY);
        const KEY_HINTS = ["about", "team", "tryout", "register", "program", "sponsor", "contact", "lesson"];
        const candidates = map.filter((u) => KEY_HINTS.some((h) => u.toLowerCase().includes(h))).slice(0, 5);
        for (const u of candidates) {
          if (u === presence.website_url) continue;
          const p = await firecrawlScrape(u, FIRECRAWL_API_KEY, ["markdown"]);
          if (p.ok) scraped.website.push(p);
        }
      }

      // Social scraping (best-effort)
      if ((auditType === "social" || auditType === "combined") && FIRECRAWL_API_KEY) {
        for (const [field, platform] of SOCIAL_FIELDS) {
          const url = normalizeSocialUrl(platform, (presence as any)?.[field]);
          if (!url) continue;
          const r = await firecrawlScrape(url, FIRECRAWL_API_KEY, ["markdown"]);
          scraped.social.push({ platform, url, ...r });
        }
      }

      // Run AI audit
      const aiResp = await fetch(LOVABLE_AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: buildSystemPrompt(auditType, intake) },
            { role: "user", content: buildUserPayload(auditType, presence, scraped) },
          ],
          tools: [RUBRIC_TOOL],
          tool_choice: { type: "function", function: { name: "audit_result" } },
        }),
      });
      if (!aiResp.ok) {
        const txt = await aiResp.text();
        if (aiResp.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
        if (aiResp.status === 402) throw new Error("Lovable AI credits exhausted. Add credits in Workspace > Usage.");
        throw new Error(`AI gateway ${aiResp.status}: ${txt}`);
      }
      const aiJson = await aiResp.json();
      const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
      const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : null;
      if (!args) throw new Error("AI did not return a structured audit.");

      const comparison = diffAudits(args, previous);

      const { data: updated, error: updErr } = await admin
        .from("org_digital_audits")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          website_score: args.website_score ?? null,
          social_score: args.social_score ?? null,
          overall_score: args.overall_score ?? null,
          scores_breakdown: args.scores_breakdown ?? null,
          ai_summary: args.ai_summary ?? null,
          wins: args.wins ?? [],
          fixes: args.fixes ?? [],
          sponsor_flags: args.sponsor_flags ?? [],
          scraped_pages: scraped.website,
          social_evidence: scraped.social,
          comparison_to_previous: comparison,
          model_used: "google/gemini-2.5-pro",
        })
        .eq("id", pending.id).select().single();
      if (updErr) throw updErr;

      return new Response(JSON.stringify({ ok: true, audit: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (innerErr: any) {
      await admin.from("org_digital_audits")
        .update({ status: "failed", error_message: innerErr?.message ?? "unknown error" })
        .eq("id", pending.id);
      throw innerErr;
    }
  } catch (e: any) {
    console.error("run-digital-audit error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "audit failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
