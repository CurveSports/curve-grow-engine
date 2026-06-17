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

type AuditInputs = {
  totalPlayers?: number;
  totalAnnualRevenue?: number;
  outsideSpendPerFamily?: number;
  marketType?: "small" | "mid" | "major";
  sport?: string;
  numTeams?: number;
  priorities?: string[];
  // engine-specific (only meaningful when the engine is picked)
  avgFeePerPlayer?: number;
  lastFeeRaiseYear?: string;
  numSponsors?: number;
  sponsorshipRevenue?: number;
  parentApparelSpendPerPlayer?: number;
  apparelRevenue?: number;
  currentRetentionPct?: number;
  trainingRevenue?: number;
  eventsRevenue?: number;
};

const MARKET_MULT: Record<string, number> = { small: 0.8, mid: 1.0, major: 1.3 };

const ENGINE_META: Record<string, { label: string; teaser: string }> = {
  pricing:      { label: "Pricing",                       teaser: "Right-size fees to the value you deliver — without losing players." },
  sponsorships: { label: "Sponsorships",                  teaser: "Turn your reach into real local & regional sponsor revenue." },
  apparel:      { label: "Apparel & Hard Goods",          teaser: "Capture more of what parents already spend on uniforms and gear." },
  retention:    { label: "Retention & Referrals",         teaser: "Keep more families season-to-season and turn them into recruiters." },
  training:     { label: "Training / Player Development", teaser: "Recapture private training and skills work leaving the ecosystem." },
  events:       { label: "Events",                        teaser: "Camps, clinics, tournaments, showcases — your brand as a revenue engine." },
  wallet:       { label: "Share of Wallet",               teaser: "The meta-engine — capture more while decreasing total family spend." },
};

function computeReport(raw: AuditInputs) {
  const totalPlayers = num(raw.totalPlayers);
  const totalAnnualRevenue = num(raw.totalAnnualRevenue);
  const outsideSpend = num(raw.outsideSpendPerFamily) || 15000;
  const mult = MARKET_MULT[raw.marketType ?? "mid"] ?? 1.0;
  const prioritiesArr = Array.isArray(raw.priorities) ? raw.priorities.slice(0, 3) : [];
  const picked = new Set(prioritiesArr);

  // ----- Hero: Share of Wallet -----
  const walletPool = totalPlayers * outsideSpend;
  const capturedPct = walletPool > 0 ? Math.min(100, Math.round((totalAnnualRevenue / walletPool) * 100)) : 0;
  const leakingDollars = Math.max(0, walletPool - totalAnnualRevenue);

  // ----- Per-engine details (locked unless picked) -----
  const engines: Array<{
    key: string;
    label: string;
    locked: boolean;
    teaser: string;
    benchmark?: number;
    benchmarkFormatted?: string;
    current?: number;
    currentFormatted?: string;
    gap?: number;
    gapFormatted?: string;
    insight?: string;
  }> = [];

  function pushEngine(key: string, detail: Partial<typeof engines[number]> = {}) {
    const meta = ENGINE_META[key];
    engines.push({
      key,
      label: meta.label,
      teaser: meta.teaser,
      locked: !picked.has(key),
      ...detail,
    });
  }

  // Pricing
  if (picked.has("pricing")) {
    const fee = num(raw.avgFeePerPlayer);
    const newDues = totalPlayers * 0.98 * fee * 1.05;
    const dues = totalPlayers * fee;
    const gap = Math.max(0, newDues - dues);
    pushEngine("pricing", {
      benchmark: newDues, benchmarkFormatted: fmt$(newDues),
      current: dues, currentFormatted: fmt$(dues),
      gap, gapFormatted: fmt$(gap),
      insight: raw.lastFeeRaiseYear
        ? `Last raise: ${raw.lastFeeRaiseYear}. A 5% adjustment net of 2% attrition unlocks ~${fmt$(gap)}.`
        : `A 5% fee adjustment net of 2% attrition would unlock ~${fmt$(gap)}.`,
    });
  } else pushEngine("pricing");

  // Sponsorships
  if (picked.has("sponsorships")) {
    const sponsors = num(raw.numSponsors);
    const sponsorshipRev = num(raw.sponsorshipRevenue);
    const perPlayer = totalPlayers * 150 * mult;
    const perDeal = sponsors > 0 ? sponsors * 2000 * mult : 0;
    const benchmark = Math.max(perPlayer, perDeal);
    const gap = Math.max(0, benchmark - sponsorshipRev);
    pushEngine("sponsorships", {
      benchmark, benchmarkFormatted: fmt$(benchmark),
      current: sponsorshipRev, currentFormatted: fmt$(sponsorshipRev),
      gap, gapFormatted: fmt$(gap),
      insight: `Benchmark: ~$150/player or $2,000/sponsor (market-adjusted). Gap to close: ${fmt$(gap)}.`,
    });
  } else pushEngine("sponsorships");

  // Apparel — parent spend, not $150 profit
  if (picked.has("apparel")) {
    const parentSpendPerPlayer = num(raw.parentApparelSpendPerPlayer) || 600;
    const apparelRev = num(raw.apparelRevenue);
    const benchmark = totalPlayers * parentSpendPerPlayer;
    const gap = Math.max(0, benchmark - apparelRev);
    pushEngine("apparel", {
      benchmark, benchmarkFormatted: fmt$(benchmark),
      current: apparelRev, currentFormatted: fmt$(apparelRev),
      gap, gapFormatted: fmt$(gap),
      insight: `Parents spend ~${fmt$(parentSpendPerPlayer)}/player/yr on apparel & gear — ${fmt$(gap)} is flowing outside your club.`,
    });
  } else pushEngine("apparel");

  // Retention
  if (picked.has("retention")) {
    const fee = num(raw.avgFeePerPlayer);
    const retention = Math.min(100, num(raw.currentRetentionPct));
    const target = Math.min(95, retention + 5);
    const retainedExtra = totalPlayers * Math.max(0, (target - retention) / 100);
    const base = retainedExtra * (fee || 0);
    const gap = base + base * 0.1;
    pushEngine("retention", {
      benchmark: target, benchmarkFormatted: `${target}%`,
      current: retention, currentFormatted: `${retention}%`,
      gap, gapFormatted: fmt$(gap),
      insight: `Holding ${Math.round(retainedExtra)} more players + a 10% referral boost is worth ~${fmt$(gap)}/yr.`,
    });
  } else pushEngine("retention");

  // Training
  if (picked.has("training")) {
    const trainingRev = num(raw.trainingRevenue);
    const benchmark = totalPlayers * 100 * 12;
    const gap = Math.max(0, benchmark - trainingRev);
    pushEngine("training", {
      benchmark, benchmarkFormatted: fmt$(benchmark),
      current: trainingRev, currentFormatted: fmt$(trainingRev),
      gap, gapFormatted: fmt$(gap),
      insight: `Benchmark: ~$100/player/month in private training that's leaving the building today.`,
    });
  } else pushEngine("training");

  // Events
  if (picked.has("events")) {
    const eventsRev = num(raw.eventsRevenue);
    const benchmark = totalPlayers * 450;
    const gap = Math.max(0, benchmark - eventsRev);
    pushEngine("events", {
      benchmark, benchmarkFormatted: fmt$(benchmark),
      current: eventsRev, currentFormatted: fmt$(eventsRev),
      gap, gapFormatted: fmt$(gap),
      insight: `Benchmark: ~$450/player/yr in event spend across camps, clinics, tournaments and showcases.`,
    });
  } else pushEngine("events");

  // Wallet (meta)
  pushEngine("wallet", picked.has("wallet") ? {
    benchmark: walletPool, benchmarkFormatted: fmt$(walletPool),
    current: totalAnnualRevenue, currentFormatted: fmt$(totalAnnualRevenue),
    gap: leakingDollars, gapFormatted: fmt$(leakingDollars),
    insight: `You currently capture ${capturedPct}% of the ~${fmt$(outsideSpend)}/yr each family spends across youth sports.`,
  } : {});

  // Order: picked engines first (in user order), then locked engines
  engines.sort((a, b) => {
    const ai = prioritiesArr.indexOf(a.key);
    const bi = prioritiesArr.indexOf(b.key);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

  // Keep a `totalOpportunity` summary for legacy emails — sum picked-engine gaps
  const totalOpportunity = engines
    .filter((e) => !e.locked && typeof e.gap === "number" && e.key !== "wallet")
    .reduce((s, e) => s + (e.gap || 0), 0);

  return {
    inputs: {
      totalPlayers,
      totalAnnualRevenue,
      outsideSpendPerFamily: outsideSpend,
      marketType: raw.marketType ?? "mid",
      priorities: prioritiesArr,
    },
    hero: {
      capturedPct,
      leakingDollars,
      leakingDollarsFormatted: fmt$(leakingDollars),
      walletPool,
      walletPoolFormatted: fmt$(walletPool),
      totalAnnualRevenueFormatted: fmt$(totalAnnualRevenue),
    },
    engines,
    // Legacy fields used by existing email templates / report page
    current: {
      total: totalAnnualRevenue,
      totalFormatted: fmt$(totalAnnualRevenue),
      duesRevenue: 0,
      duesRevenueFormatted: fmt$(0),
    },
    opportunities: engines
      .filter((e) => !e.locked && (e.gap ?? 0) > 0 && e.key !== "wallet")
      .map((e) => ({
        key: e.key,
        label: e.label,
        amount: e.gap || 0,
        amountFormatted: e.gapFormatted || fmt$(0),
        detail: e.insight || "",
      })),
    totals: {
      totalOpportunity,
      totalOpportunityFormatted: fmt$(totalOpportunity),
      projectedTotal: totalAnnualRevenue + totalOpportunity,
      projectedTotalFormatted: fmt$(totalAnnualRevenue + totalOpportunity),
      upliftPct: totalAnnualRevenue > 0 ? Math.round((totalOpportunity / totalAnnualRevenue) * 100) : 0,
      walletCapturedPct: capturedPct,
      leakingDollarsFormatted: fmt$(leakingDollars),
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
