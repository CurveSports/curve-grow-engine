import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";

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
  opportunities: Array<{
    key: string;
    label: string;
    amount: number;
    amountFormatted: string;
    detail: string;
  }>;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Report unavailable</h1>
        <p className="text-slate-600 mb-6">{error ?? "We couldn't find that report."}</p>
        <Link to="/revenue-audit"><Button>Start a new audit</Button></Link>
      </div>
    );
  }

  const r = lead.report_payload;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">
            Curve<span className="text-emerald-600">Sports</span>
          </div>
          <a href="https://www.curvesports.com" className="text-sm text-slate-600 hover:text-emerald-600">curvesports.com</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium uppercase tracking-wide mb-4">
            Revenue Audit for {lead.org_name}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            You're sitting on{" "}
            <span className="text-emerald-600">{r.totals.totalOpportunityFormatted}</span>{" "}
            in untapped revenue.
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Based on what you shared, here's where the dollars are — and how to capture them.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Stat label="Current annual revenue" value={r.current.totalFormatted} />
          <Stat label="Projected with Curve" value={r.totals.projectedTotalFormatted} highlight />
          <Stat label="Total uplift" value={`+${r.totals.upliftPct}%`} />
        </div>

        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" /> Where the opportunity is
        </h2>

        <div className="space-y-3 mb-12">
          {r.opportunities.length === 0 ? (
            <p className="text-slate-600">Looks like you're already running a tight ship. Let's talk anyway — there's always a next level.</p>
          ) : (
            r.opportunities.map((o) => (
              <div key={o.key} className="border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-6 hover:border-emerald-200 transition-colors">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">{o.label}</div>
                    <div className="text-sm text-slate-600 mt-1">{o.detail}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-600 whitespace-nowrap">{o.amountFormatted}</div>
              </div>
            ))
          )}
        </div>

        <div className="bg-emerald-600 text-white rounded-2xl p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to capture this revenue?</h2>
          <p className="text-emerald-50 mb-6 max-w-xl mx-auto">
            A Curve Sports team member is reviewing your audit and will be in touch shortly. Want to skip the wait?
          </p>
          <a href="https://www.curvesports.com/contact" target="_blank" rel="noreferrer">
            <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50">
              Book a call <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>

        <p className="text-xs text-center text-slate-400 mt-8">
          Estimates based on the inputs you provided and Curve Sports industry benchmarks. Actual results vary.
        </p>
      </main>

      <footer className="border-t border-slate-100 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-sm text-slate-500 text-center">
          © {new Date().getFullYear()} Curve Sports
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-5 ${highlight ? "bg-emerald-600 text-white" : "bg-slate-50"}`}>
      <div className={`text-xs uppercase tracking-wide font-medium mb-2 ${highlight ? "text-emerald-100" : "text-slate-500"}`}>{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
