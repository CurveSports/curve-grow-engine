// Lovable AI-powered communication drafting endpoint
// Round 6B: structured inputs + DSF/Direct outreach tracks
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type DraftBody = {
  orgId: string;
  communicationType: string;
  prompt: string;             // pre-built user prompt from structured inputs
  tone: string;
  format: string;
  // "dsf" | "direct" | undefined (only meaningful for sponsor outreach)
  outreachTrack?: "dsf" | "direct";
  isAffiliateDeck?: boolean;  // multi-section document mode
  personalization?: {
    recipient?: string;
    eventOrDate?: string;
    additionalContext?: string;
  };
  log?: boolean;
};

type RefineBody = {
  orgId: string;
  originalDraft: string;
  refinementRequest: string;
  communicationType: string;
  tone: string;
  format: string;
};

function formatGuidance(format: string): string {
  switch (format) {
    case "Email":
      return 'Include a subject line at the top labeled "Subject:".';
    case "Text message":
      return "Keep under 160 words. No subject line. Conversational but professional.";
    case "Social post":
      return "Keep under 280 characters for short platforms or under 150 words for longer ones. Engaging and on-brand.";
    case "In-person script":
      return "Format as bullet-point talking points with natural transition phrases. Not prose.";
    default:
      return "";
  }
}

function buildOrgSystemPrompt(intake: any, metrics: any, body: DraftBody, orgName: string): string {
  const cityState = intake?.city_state ?? "—";
  const marketType = intake?.market_type ?? "—";
  const orgType = intake?.org_type ?? "—";
  const totalPlayers = intake?.total_players ?? 0;
  const hsPlayers = intake?.hs_players ?? 0;
  const youthPlayers = intake?.youth_players ?? 0;
  const tier = metrics?.monetization_tier ?? "—";
  const marketStrategy = intake?.market_strategy ?? "—";
  const hasAffiliates = intake?.has_affiliates === true;
  const numberOfAffiliates = intake?.number_of_affiliates ?? 0;
  const operatesMultipleBrands = intake?.operates_multiple_brands === true;
  const brandDescriptions = intake?.brand_descriptions ?? "";

  const isDeck = body.isAffiliateDeck === true;

  return `You are a professional communications assistant for ${orgName}, a travel baseball organization based in ${cityState}.

Organization context:
- Market type: ${marketType}
- Organization type: ${orgType}
- Total players: ${totalPlayers} (${hsPlayers} HS, ${youthPlayers} Youth)
- Monetization tier: ${tier}
- Growth stage: ${marketStrategy}
${hasAffiliates ? `- Affiliate network: ${numberOfAffiliates} affiliates` : ""}
${operatesMultipleBrands ? `- Multiple brands: ${brandDescriptions}` : ""}

Voice and tone requirements:
- Clear over clever
- Structured over long
- Confident over apologetic
- Professional but approachable
- Direct, not robotic
- Short sections and spacing
- Bullet points when appropriate
- Avoid long paragraphs
- Never emotional or reactive
- Never defensive
- Specific not generic
- Set clear expectations

Tone modifier: ${body.tone}
Format: ${body.format}
${formatGuidance(body.format)}

${
  isDeck
    ? `This is a multi-section sales document, NOT a single message.
Use clear markdown headers (##) for each of these six sections in order:
1. About ${orgName}
2. The Affiliate Opportunity
3. What's Included
4. Investment Structure
5. What Success Looks Like
6. Next Steps

Make it compelling, specific to ${orgName}'s profile, and professional enough to send to a serious prospect.`
    : ""
}

Only return the finished communication. No preamble, no explanation, no meta-commentary.`;
}

function buildDsfSystemPrompt(intake: any, body: DraftBody, orgName: string): string {
  const cityState = intake?.city_state ?? "—";
  const totalPlayers = intake?.total_players ?? 0;

  return `You are drafting a communication on behalf of the Diamond Sports Foundation (DSF), the 501(c)3 nonprofit arm of Curve Sports.

DSF Mission:
Transforming lives, leveling the playing field, reshaping the future. DSF provides diamond sport scholarships for talented student-athletes and addresses the issue of access and diversity in youth sports by funding the training, coaching, and development of talented student-athletes who cannot afford the pay-to-play model.

This communication is being sent by an Assistant Director at the Diamond Sports Foundation on behalf of ${orgName}, one of the organizations DSF supports.

Organization being represented: ${orgName}
Location: ${cityState}
Players in program: ${totalPlayers}

Key points to incorporate naturally where relevant:
- DSF is a registered 501(c)3 nonprofit
- Sponsorships through DSF are tax-deductible charitable contributions
- The sponsor is not just supporting a baseball club — they are funding access and opportunity for student-athletes who could not otherwise afford to play
- DSF connects local businesses to meaningful community impact through youth sports

Voice and tone:
- Professional and mission-driven
- Warm but not salesy
- Lead with community impact, follow with business value
- Specific to the business being contacted
- Clear call to action

Tone modifier: ${body.tone}
Format: ${body.format}
${formatGuidance(body.format)}

End the communication with:
[SIGNATURE]

(The sender will replace this with their own signature block before sending.)

Only return the finished communication. No preamble, no explanation, no meta-commentary.`;
}

async function callLovableAI(systemPrompt: string, userPrompt: string): Promise<{ ok: boolean; status: number; text: string }> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    return { ok: false, status: resp.status, text: t };
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { ok: true, status: 200, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const isRefine = url.pathname.endsWith("/refine");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Refine ──
    if (isRefine) {
      const body = (await req.json()) as RefineBody;
      if (!body.orgId || !body.originalDraft || !body.refinementRequest) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const refinementSystem = `You are a professional communications assistant. Rewrite the draft incorporating the user's requested change while maintaining the same voice, tone (${body.tone}), format (${body.format}), and organizational context. Only return the revised draft — no explanation or preamble.`;
      const refinementUser = `Here is the original draft:\n\n${body.originalDraft}\n\nThe user wants this change:\n${body.refinementRequest}\n\nRewrite incorporating this change. Return only the revised draft.`;
      const result = await callLovableAI(refinementSystem, refinementUser);

      if (!result.ok) {
        if (result.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (result.status === 402) {
          return new Response(JSON.stringify({ error: "AI usage limit reached. Please add workspace credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI refine error", result.status, result.text);
        return new Response(JSON.stringify({ error: "AI generation failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ draft: result.text }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Draft ──
    const body = (await req.json()) as DraftBody;
    if (!body.orgId || !body.communicationType) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: org }, { data: intake }, { data: metrics }, { data: profile }, { data: rolesData }] = await Promise.all([
      admin.from("organizations").select("name").eq("id", body.orgId).maybeSingle(),
      admin.from("organization_intake").select("*").eq("org_id", body.orgId).maybeSingle(),
      admin.from("derived_metrics").select("monetization_tier, priority_engine").eq("org_id", body.orgId).maybeSingle(),
      admin.from("profiles").select("org_id").eq("user_id", user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const isAdmin = (rolesData ?? []).some((r: any) => r.role === "admin");
    const userOrgId = profile?.org_id ?? null;
    if (!isAdmin && userOrgId !== body.orgId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgName = org?.name ?? "your organization";

    // Pick voice based on outreach track
    const useDsf = body.outreachTrack === "dsf";
    const systemPrompt = useDsf
      ? buildDsfSystemPrompt(intake, body, orgName)
      : buildOrgSystemPrompt(intake, metrics, body, orgName);

    const userPrompt = body.prompt?.trim() || `Please draft a ${body.communicationType}.`;

    const result = await callLovableAI(systemPrompt, userPrompt);

    if (!result.ok) {
      if (result.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (result.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add workspace credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI generate error", result.status, result.text);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.log !== false) {
      await admin.from("org_communication_log").insert({
        org_id: body.orgId,
        generated_by: user.id,
        generated_on_behalf_of_org: isAdmin && userOrgId !== body.orgId,
        communication_type: body.communicationType,
        tone: body.tone,
        format: body.format,
        prompt_text: userPrompt.slice(0, 2000),
        outreach_track: body.outreachTrack ?? null,
      });
    }

    return new Response(JSON.stringify({ draft: result.text }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("draft-communication error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
