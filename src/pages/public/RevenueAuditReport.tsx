import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowRight,
  TrendingUp,
  Mail,
  CalendarCheck,
  Share2,
  Wallet,
} from "lucide-react";
import curveLogo from "@/assets/curve-sports-logo.png.asset.json";

type Opportunity = {
  key: string;
  label: string;
  amount: number;
  amountFormatted: string;
  detail: string;
};

type ReportPayload = {
  inputs: {
    totalPlayers: number;
    avgFee: number;
    currentRetention: number;
  };
  current: {
    totalFormatted: string;
    duesRevenueFormatted: string;
  };
  opportunities: Opportunity[];
  totals: {
    totalOpportunity: number;
    totalOpportunityFormatted: string;
    projectedTotalFormatted: string;
    upliftPct: number;
  };
};

type LeadView = {
  org_name: string;
  contact_name: string;
  report_payload: ReportPayload;
  created_at: string;
};

export default function RevenueAuditReport() {
  const { token } = useParams<{ token: string }>();
  const [lead, setLead] = useState<LeadView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailing, setEmailing] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_public_audit_report", { _token: token });
      if (error) {
        setError("Could not load report.");
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        setError("Report not found.");
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        setLead(row as LeadView);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleEmailReport = async () => {
    if (!token) return;
    setEmailing(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-revenue-audit", {
        body: { action: "email_report", token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "On its way",
        description: `We just emailed your report${data?.email ? ` to ${data.email}` : ""}.`,
      });
    } catch (err: any) {
      toast({
        title: "Couldn't send",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setEmailing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#c5ff3d]" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Report unavailable</h1>
        <p className="text-white/60 mb-6">{error ?? "We couldn't find that report."}</p>
        <Link to="/revenue-audit">
          <Button className="bg-[#c5ff3d] text-black hover:bg-[#b8f229]">Start a new audit</Button>
        </Link>
      </div>
    );
  }

  const r = lead.report_payload;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const mailtoForward = `mailto:?subject=${encodeURIComponent(
    `Curve Sports Revenue Audit — ${lead.org_name}`,
  )}&body=${encodeURIComponent(
    `Our Curve Sports Revenue Audit identified ${r.totals.totalOpportunityFormatted} in untapped annual revenue.\n\nView the full report: ${shareUrl}`,
  )}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <header className="border-b border-white/5 sticky top-0 z-30 backdrop-blur bg-[#0a0a0a]/80">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/revenue-audit" className="flex items-center gap-3">
            <img src={curveLogo.url} alt="Curve Sports" className="h-8 w-auto" />
          </Link>
          <a
            href="https://www.curvesports.com"
            className="text-sm text-white/60 hover:text-white"
          >
            curvesports.com
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Hero */}
        <div className="relative">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-[#c5ff3d]/10 blur-[100px] pointer-events-none" />
          <div className="relative text-center mb-14">
            <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-[0.18em] text-white/70 mb-6">
              Revenue Audit · {lead.org_name}
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]"
              style={{ fontFamily: "'Archivo Black', sans-serif" }}
            >
              You're sitting on
              <br />
              <span className="text-[#c5ff3d]">{r.totals.totalOpportunityFormatted}</span>
              <br />
              <span className="text-white/70 text-2xl md:text-3xl font-normal" style={{ fontFamily: "Inter, sans-serif" }}>
                in untapped annual revenue.
              </span>
            </motion.h1>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid md:grid-cols-3 gap-4 mb-16">
          <Stat label="Current annual revenue" value={r.current.totalFormatted} />
          <Stat label="Projected with Curve" value={r.totals.projectedTotalFormatted} highlight />
          <Stat label="Total uplift" value={`+${r.totals.upliftPct}%`} />
        </div>

        {/* Share of wallet callout */}
        <div className="mb-16 rounded-2xl border border-white/10 bg-gradient-to-br from-[#c5ff3d]/8 to-transparent p-8 md:p-10">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl bg-[#c5ff3d]/10 border border-[#c5ff3d]/20 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-[#c5ff3d]" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#c5ff3d] mb-2">Share of Wallet</div>
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Your families already spend the money. We help you capture more of it.
              </h2>
              <p className="text-white/60 leading-relaxed">
                Every line below is dollars already flowing through youth sports for {lead.org_name} — to outside vendors, third-party trainers, distant tournaments, and tournament-trip hotels. Bringing even a slice in-house compounds into retention, brand strength, and a healthier organization.
              </p>
            </div>
          </div>
        </div>

        {/* Opportunities */}
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
          <TrendingUp className="w-6 h-6 text-[#c5ff3d]" /> Where the opportunity is
        </h2>

        <div className="space-y-3 mb-20">
          {r.opportunities.length === 0 ? (
            <p className="text-white/60">
              Looks like you're already running a tight ship. Let's talk anyway — there's always a next level.
            </p>
          ) : (
            r.opportunities.map((o, i) => (
              <motion.div
                key={o.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5 md:p-6 flex items-start justify-between gap-6 hover:border-[#c5ff3d]/40 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="text-xs font-mono text-[#c5ff3d] mt-1">0{i + 1}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-lg">{o.label}</div>
                    <div className="text-sm text-white/60 mt-1">{o.detail}</div>
                  </div>
                </div>
                <div className="font-display text-2xl md:text-3xl font-bold text-[#c5ff3d] whitespace-nowrap tabular-nums" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  {o.amountFormatted}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* ACT 4: Next steps */}
        <section className="border-t border-white/10 pt-16">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-[0.18em] text-[#c5ff3d] mb-3">Act 4 — Next Steps</div>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              You've seen the map.<br />
              <span className="text-white/60">Let's walk it together.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Primary: book a call */}
            <a
              href="https://www.curvesports.com/contact"
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-[#c5ff3d] bg-[#c5ff3d]/10 p-6 hover:bg-[#c5ff3d]/15 transition flex flex-col"
            >
              <div className="w-11 h-11 rounded-lg bg-[#c5ff3d]/20 border border-[#c5ff3d]/30 flex items-center justify-center mb-4">
                <CalendarCheck className="w-5 h-5 text-[#c5ff3d]" />
              </div>
              <div className="font-display text-lg font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Book a Growth Partner call
              </div>
              <p className="text-sm text-white/60 mb-6 flex-1">
                30 minutes with a Curve strategist to walk through your audit and the first engines we'd activate.
              </p>
              <span className="inline-flex items-center text-sm font-semibold text-[#c5ff3d]">
                Schedule <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition" />
              </span>
            </a>

            {/* Email me my report */}
            <button
              type="button"
              onClick={handleEmailReport}
              disabled={emailing}
              className="text-left group rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/30 hover:bg-white/[0.04] transition flex flex-col disabled:opacity-60"
            >
              <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                {emailing ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Mail className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="font-display text-lg font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Email me my report
              </div>
              <p className="text-sm text-white/60 mb-6 flex-1">
                Send a fresh copy of this report to the email on file so you can come back to it later.
              </p>
              <span className="inline-flex items-center text-sm font-semibold text-white">
                {emailing ? "Sending…" : "Send it"} <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition" />
              </span>
            </button>

            {/* Forward to board */}
            <a
              href={mailtoForward}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/30 hover:bg-white/[0.04] transition flex flex-col"
            >
              <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div className="font-display text-lg font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                Forward to your board
              </div>
              <p className="text-sm text-white/60 mb-6 flex-1">
                Open a pre-filled email with a link to this report so you can share it with your leadership team.
              </p>
              <span className="inline-flex items-center text-sm font-semibold text-white">
                Compose <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition" />
              </span>
            </a>
          </div>

          <p className="text-xs text-center text-white/30 mt-10 max-w-xl mx-auto">
            Estimates based on the inputs you provided and Curve Sports industry benchmarks. Actual results vary — your Growth Partner call will sharpen the math against your specific market.
          </p>
        </section>
      </main>

      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-white/40 text-center">
          © {new Date().getFullYear()} Curve Sports
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl p-6 border ${
        highlight
          ? "bg-[#c5ff3d] text-black border-[#c5ff3d]"
          : "bg-white/[0.02] border-white/10 text-white"
      }`}
    >
      <div
        className={`text-xs uppercase tracking-[0.18em] mb-3 ${
          highlight ? "text-black/60" : "text-white/50"
        }`}
      >
        {label}
      </div>
      <div className="font-display text-3xl md:text-4xl font-bold tabular-nums" style={{ fontFamily: "'Oswald', sans-serif" }}>
        {value}
      </div>
    </div>
  );
}
