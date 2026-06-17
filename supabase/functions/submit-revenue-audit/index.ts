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
  facilityRevenue?: number;
  trainingRevenue?: number;
  numSponsors?: number;
  feeIncreasePct?: number;
  apparelToggle?: boolean;
  sponsorshipToggle?: boolean;
  retentionToggle?: boolean;
  campsToggle?: boolean;
  sport?: string;
  numTeams?: number;
  outsideSpendPerFamily?: number;
  marketType?: "small" | "mid" | "major";
  engines?: Record<string, EngineState>;
  priorities?: string[];
};

const MARKET_MULT: Record<string, number> = { small: 0.8, mid: 1.0, major: 1.3 };

function computeReport(raw: AuditInputs) {
  const totalPlayers = num(raw.totalPlayers);
  const avgFee = num(raw.avgFeePerPlayer);
  const currentRetention = Math.min(100, num(raw.currentRetentionPct));
  const apparelRev = num(raw.apparelRevenue);
  const sponsorshipRev = num(raw.sponsorshipRevenue);
  const campsRev = num(raw.campsClinicsRevenue);
  const facilityRev = num(raw.facilityRevenue);
  const numSponsors = num(raw.numSponsors);
  const mult = MARKET_MULT[raw.marketType ?? "mid"] ?? 1.0;

  const currentDuesRevenue = totalPlayers * avgFee;
  const currentTotal =
    currentDuesRevenue + apparelRev + sponsorshipRev + campsRev + facilityRev + num(raw.trainingRevenue);

  // 1) Pricing — 5% fee lift net of 2% attrition
  const feeLiftPct = raw.feeIncreasePct ? num(raw.feeIncreasePct) : 5;
  const attritionPct = 2;
  const remainingPlayers = totalPlayers * (1 - attritionPct / 100);
  const newDues = remainingPlayers * avgFee * (1 + feeLiftPct / 100);
  const pricingOpportunity = Math.max(0, newDues - currentDuesRevenue);

  // 2) Retention & Referrals — +5pt × fee + 10% referral boost
  const targetRetention = Math.min(95, currentRetention + 5);
  const retainedExtra = totalPlayers * Math.max(0, (targetRetention - currentRetention) / 100);
  const retentionBase = retainedExtra * avgFee;
  const retentionOpportunity = retentionBase + retentionBase * 0.1;

  // 3) Apparel — $150/player benchmark
  const apparelPotential = totalPlayers * 150;
  const apparelOpportunity = Math.max(0, apparelPotential - apparelRev);

  // 4) Sponsorship — max of $150/player or $2,000/sponsor, × market multiplier
  const sponsorPotentialPerPlayer = totalPlayers * 150 * mult;
  const sponsorPotentialPerDeal = numSponsors > 0 ? numSponsors * 2000 * mult : 0;
  const sponsorshipPotential = Math.max(sponsorPotentialPerPlayer, sponsorPotentialPerDeal);
  const sponsorshipOpportunity = Math.max(0, sponsorshipPotential - sponsorshipRev);

  // 5) Events & Facility — $40/player events + $20/player facility
  const campsPotential = totalPlayers * 40;
  const facilityPotential = totalPlayers * 20;
  const campsOpportunity = Math.max(0, campsPotential - campsRev) + Math.max(0, facilityPotential - facilityRev);

  // 6) Training — $100/month × 12 = $1,200/player/year
  const engines = raw.engines ?? {};
  const trainingRev = num(raw.trainingRevenue) || num(engines.training?.revenue);
  const trainingPotential = totalPlayers * 100 * 12;
  const trainingOpportunity = Math.max(0, trainingPotential - trainingRev);

  // 7) Share of Wallet — 3% of outside spend per family
  const outsideSpend = num(raw.outsideSpendPerFamily) || 15000;
  const walletOpportunity = totalPlayers * outsideSpend * 0.03;

  const totalOpportunity =
    pricingOpportunity + retentionOpportunity + apparelOpportunity +
    sponsorshipOpportunity + campsOpportunity + trainingOpportunity + walletOpportunity;

  const projectedTotal = currentTotal + totalOpportunity;
  const upliftPct = currentTotal > 0 ? (totalOpportunity / currentTotal) * 100 : 0;

  // Share of wallet captured today
  const walletPool = totalPlayers * outsideSpend;
  const walletCapturedPct = walletPool > 0 ? Math.min(100, Math.round((currentTotal / walletPool) * 100)) : 0;


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
      detail: `Industry benchmark: $150 per player in apparel & hard-goods revenue brought in-house.`,
    },
    {
      key: "sponsorships",
      label: "Sponsorships — unlock your reach",
      amount: sponsorshipOpportunity,
      amountFormatted: fmt$(sponsorshipOpportunity),
      detail: `Industry benchmark: $150 per player in sponsorship revenue.`,
    },
    {
      key: "events",
      label: "Events & Facility",
      amount: campsOpportunity,
      amountFormatted: fmt$(campsOpportunity),
      detail: `Add ~$40/player in events plus ~$20/player in facility usage.`,
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
      walletCapturedPct,
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

    // ----- Action: email-me-my-report (from the report page) -----
    if (body?.action === "email_report") {
      const token = strField(body?.token, 200);
      if (!token) return json({ error: "Missing token" }, 400);
      const { data: lead, error: leadErr } = await admin
        .from("public_audit_leads")
        .select("id, email, contact_name, org_name, report_payload, report_token")
        .eq("report_token", token)
        .maybeSingle();
      if (leadErr || !lead) return json({ error: "Report not found" }, 404);
      if (!LOVABLE_API_KEY) return json({ error: "Email not configured" }, 500);
      const reportUrl = `${PUBLIC_APP_BASE}/revenue-audit/report/${lead.report_token}`;
      try {
        const unsub = await ensureUnsubscribeToken(admin, lead.email);
        const messageId = crypto.randomUUID();
        await sendLovableEmail({
          to: lead.email,
          from: `${SITE_NAME} <hello@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: "Your Curve Revenue Audit (re-sent)",
          html: confirmEmailHtml(lead.contact_name, reportUrl, (lead.report_payload as any)?.totals ?? {}),
          text: `Hi ${lead.contact_name}, your Curve Revenue Audit is here: ${reportUrl}`,
          purpose: "transactional",
          label: "revenue_audit_resend",
          idempotency_key: `revenue-audit-resend-${lead.id}-${Date.now()}`,
          message_id: messageId,
          unsubscribe_token: unsub,
        }, { apiKey: LOVABLE_API_KEY });
        return json({ ok: true, email: lead.email });
      } catch (e: any) {
        console.error("resend email failed:", e);
        return json({ error: "Could not send email" }, 500);
      }
    }

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
