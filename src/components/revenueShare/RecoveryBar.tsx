import { formatCurrency } from "@/lib/format";

type Props = {
  totalNewRevenue: number;
  threshold: number;
  curveShare: number;
  compact?: boolean;
};

/**
 * Two-segment progress bar:
 *   - green fill up to threshold (recovery)
 *   - gold fill beyond threshold scaled to a "share lane" (capped visually at +100%)
 */
export default function RecoveryBar({ totalNewRevenue, threshold, curveShare, compact }: Props) {
  const safeThresh = Math.max(threshold, 1);
  const recoverPct = Math.min(100, (Math.min(totalNewRevenue, safeThresh) / safeThresh) * 100);
  const above = Math.max(0, totalNewRevenue - threshold);
  // Show share lane scaled to threshold (so 100% = 1x above)
  const sharePct = threshold > 0 ? Math.min(100, (above / threshold) * 100) : 0;

  return (
    <div className={compact ? "" : "space-y-2"}>
      <div className="relative h-3 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-health transition-all"
          style={{ width: `${recoverPct / 2}%` }}
          aria-hidden
        />
        {sharePct > 0 && (
          <div
            className="absolute inset-y-0 bg-accent transition-all"
            style={{ left: "50%", width: `${sharePct / 2}%` }}
            aria-hidden
          />
        )}
        <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" aria-hidden />
      </div>
      {!compact && (
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>$0</span>
          <span className="font-semibold text-foreground">{formatCurrency(threshold)} threshold</span>
          <span>{formatCurrency(Math.max(threshold * 2, totalNewRevenue))}</span>
        </div>
      )}
      {!compact && (
        <p className="text-xs text-muted-foreground">
          New revenue <span className="font-semibold text-foreground">{formatCurrency(totalNewRevenue)}</span>
          {curveShare > 0 && (
            <> · Curve share <span className="font-semibold text-accent">{formatCurrency(curveShare)}</span></>
          )}
        </p>
      )}
    </div>
  );
}
