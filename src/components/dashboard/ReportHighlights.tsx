import { Link } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { formatCurrency } from "@/lib/format";

interface ReportHighlightsProps {
  totalRevenue: number;
  revenuePerPlayer: number;
  revenueGap: number;
  /** Optional benchmark for context. */
  revenueBenchmark?: number;
}

/**
 * Three quick highlights from the Revenue Leak Report, dropping the user into
 * the full report. Encouraging, not alarming, copy.
 */
export function ReportHighlights({
  totalRevenue,
  revenuePerPlayer,
  revenueGap,
  revenueBenchmark,
}: ReportHighlightsProps) {
  return (
    <div className="curve-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <p className="curve-eyebrow">From your report</p>
        </div>
        <Link to="/report" className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1">
          Full report <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Highlight
          label="Total revenue"
          value={<CountUp to={totalRevenue} format={(n) => formatCurrency(n)} duration={800} />}
          sub={revenueBenchmark ? `Benchmark ${formatCurrency(revenueBenchmark)}` : "Annual"}
        />
        <Highlight
          label="Per player"
          value={<CountUp to={revenuePerPlayer} format={(n) => formatCurrency(n)} duration={800} />}
          sub="What each athlete generates"
        />
        <Highlight
          label="Revenue gap"
          value={<CountUp to={Math.abs(revenueGap)} format={(n) => formatCurrency(n)} duration={800} />}
          sub={revenueGap > 0 ? "Below your benchmark" : "At or above benchmark"}
          accent={revenueGap > 0}
        />
      </div>
    </div>
  );
}

function Highlight({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`font-display text-2xl font-bold tabular-nums mt-1 ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>
    </div>
  );
}
