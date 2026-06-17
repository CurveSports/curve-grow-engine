// Public-facing Revenue Audit submission.
// - Validates input
// - Honeypot + per-IP rate limit
// - Computes opportunity numbers server-side
// - Inserts lead with a shareable token
// - Sends internal alert + lead confirmation emails via Lovable Cloud
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { sendLovableEmail } from "npm:@lovable.dev/email-js";

const SITE_NAME = "Curve Sports";
const SENDER_DOMAIN = "notify.os.curvesports.com";
const FROM_DOMAIN = "os.curvesports.com";
const PUBLIC_APP_BASE = "https://os.curvesports.com";
const INTERNAL_RECIPIENTS = [
  "hello@curvesports.com",
  "tom.judge@curvesports.com",
  "matt.gerber@curvesports.com",
];

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const fmt$ = (n: number) =>
  "$" + Math.round(Math.max(0, n)).toLocaleString("en-US");

type EngineState = { active?: boolean; revenue?: number; maturity?: number };

type AuditInputs = {
  totalPlayers?: number;
  avgFeePerPlayer?: number;
  currentRetentionPct?: number;
  apparelRevenue?: number;
  sponsorshipRevenue?: number;
  campsClinicsRevenue?: number;
  feeIncreasePct?: number;
  apparelToggle?: boolean;
  sponsorshipToggle?: boolean;
  retentionToggle?: boolean;
  campsToggle?: boolean;
  // extended
  sport?: string;
  numTeams?: number;
  outsideSpendPerFamily?: number;
  engines?: Record<string, EngineState>;
  priorities?: string[];
};

function computeReport(raw: AuditInputs) {
  const totalPlayers = num(raw.totalPlayers);
  const avgFee = num(raw.avgFeePerPlayer);
  const currentRetention = Math.min(100, num(raw.currentRetentionPct));
  const apparelRev = num(raw.apparelRevenue);
  const sponsorshipRev = num(raw.sponsorshipRevenue);
  const campsRev = num(raw.campsClinicsRevenue);

  const currentDuesRevenue = totalPlayers * avgFee;
  const currentTotal = currentDuesRevenue + apparelRev + sponsorshipRev + campsRev;

  // 1) Pricing — small, conservative fee lift (5%) net of typical attrition (2%)
  const feeLiftPct = raw.feeIncreasePct ? num(raw.feeIncreasePct) : 5;
  const attritionPct = 2;
  const remainingPlayers = totalPlayers * (1 - attritionPct / 100);
  const newDues = remainingPlayers * avgFee * (1 + feeLiftPct / 100);
  const pricingOpportunity = Math.max(0, newDues - currentDuesRevenue);

  // 2) Retention — every 5pt retention improvement = recovered fee revenue
  const retentionToggle = raw.retentionToggle !== false;
  const targetRetention = Math.min(95, currentRetention + 5);
  const retainedExtra = totalPlayers * Math.max(0, (targetRetention - currentRetention) / 100);
  const retentionOpportunity = retentionToggle ? retainedExtra * avgFee : 0;

  // 3) Wallet share — apparel capture: assume potential = $120 per player at 30% capture
  const apparelToggle = raw.apparelToggle !== false;
  const apparelPotential = totalPlayers * 120 * 0.3;
  const apparelOpportunity = apparelToggle ? Math.max(0, apparelPotential - apparelRev) : 0;

  // 4) Sponsorship — typical org our size lands ~$50 per player in sponsorship
  const sponsorshipToggle = raw.sponsorshipToggle !== false;
  const sponsorshipPotential = totalPlayers * 50;
  const sponsorshipOpportunity = sponsorshipToggle
    ? Math.max(0, sponsorshipPotential - sponsorshipRev)
    : 0;

  // 5) Events (camps, tournaments, showcases) — typical org adds ~$40 per player annually
  const campsToggle = raw.campsToggle !== false;
  const campsPotential = totalPlayers * 40;
  const campsOpportunity = campsToggle ? Math.max(0, campsPotential - campsRev) : 0;

  // 6) Training / Player Development — ~$60 per player captured in-house
  const engines = raw.engines ?? {};
  const trainingState = engines.training ?? {};
  const trainingToggle = trainingState.active !== false;
  const trainingRev = num(trainingState.revenue);
  const trainingPotential = totalPlayers * 60;
  const trainingOpportunity = trainingToggle ? Math.max(0, trainingPotential - trainingRev) : 0;

  // 7) Share of Wallet — capture an additional 3% of outside spend per family
  const walletState = engines.wallet ?? {};
  const walletToggle = walletState.active !== false;
  const outsideSpend = num(raw.outsideSpendPerFamily) || 15000;
  // Family count ≈ players (1 family per player as an approximation)
  const walletOpportunity = walletToggle ? totalPlayers * outsideSpend * 0.03 : 0;

  const totalOpportunity =
    pricingOpportunity +
    retentionOpportunity +
    apparelOpportunity +
    sponsorshipOpportunity +
    campsOpportunity +
    trainingOpportunity +
    walletOpportunity;

  const projectedTotal = currentTotal + totalOpportunity;
  const upliftPct = currentTotal > 0 ? (totalOpportunity / currentTotal) * 100 : 0;

  const allOpps = [
    {
      key: "pricing",
      label: "Pricing — right-size your fees",
      amount: pricingOpportunity,
      amountFormatted: fmt$(pricingOpportunity),
      detail: `A ${feeLiftPct}% fee adjustment, net of ${attritionPct}% attrition.`,
    },
    {
      key: "retention",
      label: "Retention & Referrals — keep 5 more points",
      amount: retentionOpportunity,
      amountFormatted: fmt$(retentionOpportunity),
      detail: `Holding on to ${Math.round(retainedExtra)} more players at $${Math.round(avgFee)}/player.`,
    },
    {
      key: "apparel",
      label: "Apparel & Hard Goods — capture wallet share",
      amount: apparelOpportunity,
      amountFormatted: fmt$(apparelOpportunity),
      detail: `30% of players buying a $120 apparel package, brought in-house.`,
    },
    {
      key: "sponsorships",
      label: "Sponsorships — unlock your reach",
      amount: sponsorshipOpportunity,
      amountFormatted: fmt$(sponsorshipOpportunity),
      detail: `Industry benchmark: $50 per player in sponsorship revenue.`,
    },
    {
      key: "events",
      label: "Events — camps, tournaments, showcases",
      amount: campsOpportunity,
      amountFormatted: fmt$(campsOpportunity),
      detail: `Add ~$40/player in incremental program revenue.`,
    },
    {
      key: "training",
      label: "Training / Player Development",
      amount: trainingOpportunity,
      amountFormatted: fmt$(trainingOpportunity),
      detail: `Capture ~$60/player in private training that's leaving the building today.`,
    },
    {
      key: "wallet",
      label: "Share of Wallet — bring spend in-house",
      amount: walletOpportunity,
      amountFormatted: fmt$(walletOpportunity),
      detail: `Recapture 3% of the ~${fmt$(outsideSpend)}/year an average family spends across youth sports.`,
    },
  ];

  // Order opportunities by user priority if provided, then by amount desc
  const priorities = Array.isArray(raw.priorities) ? raw.priorities : [];
  const opportunities = allOpps
    .filter((o) => o.amount > 0)
    .sort((a, b) => {
      const ai = priorities.indexOf(a.key);
      const bi = priorities.indexOf(b.key);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b.amount - a.amount;
    });

  return {
    inputs: {
      totalPlayers,
      avgFee,
      currentRetention,
      apparelRev,
      sponsorshipRev,
      campsRev,
      trainingRev,
      outsideSpendPerFamily: outsideSpend,
      priorities,
    },
    current: {
      duesRevenue: currentDuesRevenue,
      total: currentTotal,
      duesRevenueFormatted: fmt$(currentDuesRevenue),
      totalFormatted: fmt$(currentTotal),
    },
    opportunities,
    totals: {
      totalOpportunity,
      totalOpportunityFormatted: fmt$(totalOpportunity),
      projectedTotal,
      projectedTotalFormatted: fmt$(projectedTotal),
      upliftPct: Math.round(upliftPct),
    },
  };
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function strField(v: unknown, max = 255): string {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

async function ensureUnsubscribeToken(admin: any, email: string): Promise<string> {
  const { data: existing } = await admin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", email)
    .maybeSingle();
  if (existing?.token) return existing.token;
  const token = crypto.randomUUID();
  await admin.from("email_unsubscribe_tokens").insert({ email, token });
  return token;
}

function internalEmailHtml(orgName: string, contact: any, totals: any, reportUrl: string, adminUrl: string) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;background:#fff;padding:24px;">
    <h2 style="margin:0 0 8px 0;">New Revenue Audit submission</h2>
    <p style="margin:0 0 16px 0;color:#444;">${escapeHtml(orgName)} — projected opportunity <strong>${escapeHtml(totals.totalOpportunityFormatted)}</strong> (+${totals.upliftPct}%)</p>
    <table cellpadding="6" style="border-collapse:collapse;border:1px solid #eee;margin-bottom:16px;">
      <tr><td><strong>Contact</strong></td><td>${escapeHtml(contact.contact_name)}</td></tr>
      <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></td></tr>
      <tr><td><strong>Phone</strong></td><td>${escapeHtml(contact.phone ?? "—")}</td></tr>
      <tr><td><strong>Role</strong></td><td>${escapeHtml(contact.role ?? "—")}</td></tr>
      <tr><td><strong>City/State</strong></td><td>${escapeHtml(contact.city_state ?? "—")}</td></tr>
    </table>
    <p><a href="${reportUrl}" style="background:#0a8a4e;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">View report</a> &nbsp; <a href="${adminUrl}" style="color:#0a8a4e;">Open in admin</a></p>
  </body></html>`;
}

function confirmEmailHtml(contactName: string, reportUrl: string, totals: any) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111;background:#fff;padding:24px;">
    <h2 style="margin:0 0 12px 0;">Your Curve Revenue Audit is ready</h2>
    <p>Hi ${escapeHtml(contactName)},</p>
    <p>Thanks for completing the Curve Revenue Audit. Based on what you shared, we've identified <strong>${escapeHtml(totals.totalOpportunityFormatted)}</strong> in untapped revenue opportunity for your organization.</p>
    <p style="margin:24px 0;"><a href="${reportUrl}" style="background:#0a8a4e;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">View your report</a></p>
    <p>A member of our team will reach out shortly to walk you through the numbers and how Curve can help you unlock them.</p>
    <p style="color:#666;font-size:13px;margin-top:32px;">— The Curve Sports team</p>
  </body></html>`;
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));

    // Honeypot: silently accept and discard
    if (body?.website || body?.honeypot) {
      return json({ ok: true, leadId: null, reportToken: null });
    }

    const orgName = strField(body?.org_name, 200);
    const contactName = strField(body?.contact_name, 200);
    const email = strField(body?.email, 255).toLowerCase();
    const phone = strField(body?.phone, 50);
    const role = strField(body?.role, 100);
    const cityState = strField(body?.city_state, 120);

    if (!orgName) return json({ error: "Organization name is required" }, 400);
    if (!contactName) return json({ error: "Your name is required" }, 400);
    if (!isEmail(email)) return json({ error: "A valid email is required" }, 400);

    const inputs: AuditInputs = body?.inputs ?? {};

    // Rate limit: 3 per IP per hour
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      null;
    if (ip) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("public_audit_leads")
        .select("id", { count: "exact", head: true })
        .eq("ip_address", ip)
        .gte("created_at", oneHourAgo);
      if ((count ?? 0) >= 3) {
        return json({ error: "Too many submissions. Please try again later." }, 429);
      }
    }

    const report = computeReport(inputs);
    const reportToken = crypto.randomUUID() + "-" + crypto.randomUUID();

    const { data: inserted, error: insErr } = await admin
      .from("public_audit_leads")
      .insert({
        report_token: reportToken,
        org_name: orgName,
        contact_name: contactName,
        email,
        phone: phone || null,
        role: role || null,
        city_state: cityState || null,
        inputs,
        report_payload: report,
        ip_address: ip,
        user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      console.error("insert lead failed", insErr);
      return json({ error: "Could not save submission" }, 500);
    }

    const reportUrl = `${PUBLIC_APP_BASE}/revenue-audit/report/${reportToken}`;
    const adminUrl = `${PUBLIC_APP_BASE}/admin/revenue-audits/${inserted.id}`;

    // Send emails (best-effort; do not fail the submission if email fails).
    if (LOVABLE_API_KEY) {
      // Internal alert
      try {
        const internalSubject = `New Revenue Audit — ${orgName} — ${report.totals.totalOpportunityFormatted}`;
        const internalHtml = internalEmailHtml(orgName, { contact_name: contactName, email, phone, role, city_state: cityState }, report.totals, reportUrl, adminUrl);
        for (const recipient of INTERNAL_RECIPIENTS) {
          const unsub = await ensureUnsubscribeToken(admin, recipient);
          const messageId = crypto.randomUUID();
          await sendLovableEmail({
            to: recipient,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: internalSubject,
            html: internalHtml,
            text: `New Revenue Audit from ${orgName} (${contactName} <${email}>). Projected opportunity ${report.totals.totalOpportunityFormatted}. Report: ${reportUrl}`,
            purpose: "transactional",
            label: "revenue_audit_internal_alert",
            idempotency_key: `revenue-audit-internal-${inserted.id}-${recipient}`,
            message_id: messageId,
            unsubscribe_token: unsub,
          }, { apiKey: LOVABLE_API_KEY });
        }
        await admin
          .from("public_audit_leads")
          .update({ internal_alert_sent_at: new Date().toISOString() })
          .eq("id", inserted.id);
      } catch (e) {
        console.error("internal alert email failed:", e);
      }

      // Confirmation to lead
      try {
        const unsub = await ensureUnsubscribeToken(admin, email);
        const messageId = crypto.randomUUID();
        await sendLovableEmail({
          to: email,
          from: `${SITE_NAME} <hello@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: "Your Curve Revenue Audit is ready",
          html: confirmEmailHtml(contactName, reportUrl, report.totals),
          text: `Hi ${contactName}, your Curve Revenue Audit is ready. View it here: ${reportUrl}`,
          purpose: "transactional",
          label: "revenue_audit_confirmation",
          idempotency_key: `revenue-audit-confirm-${inserted.id}`,
          message_id: messageId,
          unsubscribe_token: unsub,
        }, { apiKey: LOVABLE_API_KEY });
        await admin
          .from("public_audit_leads")
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq("id", inserted.id);
      } catch (e) {
        console.error("confirmation email failed:", e);
      }
    } else {
      console.warn("LOVABLE_API_KEY missing — skipping email send");
    }

    return json({ ok: true, leadId: inserted.id, reportToken });
  } catch (e: any) {
    console.error("submit-revenue-audit error:", e);
    return json({ error: e?.message ?? "Unexpected error" }, 500);
  }
});
