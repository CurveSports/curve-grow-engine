import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { AlertTriangle, Pencil } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId: string;
  orgName: string;
  // Called after baseline is set and the activate function should run.
  // The hook performs the actual function.invoke and returns success state.
  onConfirm: (baselineRevenue: number, adjustmentReason: string | null) => Promise<void>;
};

export default function BaselineModal({ open, onOpenChange, orgId, orgName, onConfirm }: Props) {
  const [calc, setCalc] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [baseline, setBaseline] = useState<string>("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setEditing(false);
    setReason("");
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("derived_metrics")
        .select("calculated_total_revenue")
        .eq("org_id", orgId)
        .maybeSingle();
      const v = (data?.calculated_total_revenue ?? 0) as number;
      setCalc(v);
      setBaseline(String(Math.round(v)));
      setLoading(false);
    })();
  }, [open, orgId]);

  const numericBaseline = Number(baseline.replace(/[^0-9.]/g, "")) || 0;
  const wasAdjusted = calc !== null && Math.abs(numericBaseline - calc) > 0.5;
  const canSubmit = numericBaseline > 0 && (!wasAdjusted || reason.trim().length > 0) && !busy;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onConfirm(numericBaseline, wasAdjusted ? reason.trim() : null);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Revenue Baseline for {orgName}</DialogTitle>
          <DialogDescription>
            This locks in the organization's current revenue as the baseline for tracking new revenue
            generated through the Allegiance engagement. Curve's 25% revenue share applies to all revenue
            above this baseline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-lg border border-border bg-secondary/40 p-5">
            <p className="curve-eyebrow mb-2">Calculated Revenue</p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !editing ? (
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-3xl font-semibold">{formatCurrency(calc ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Calculated from intake data</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Adjusted baseline ($)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="mt-1.5 h-11 text-lg font-semibold"
                    value={baseline}
                    onChange={(e) => setBaseline(e.target.value)}
                  />
                </div>
                {wasAdjusted && (
                  <div className="rounded-md bg-warning-soft border border-warning/30 p-3 text-xs text-warning">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p>You are manually adjusting the baseline. Add a note explaining the adjustment.</p>
                    </div>
                  </div>
                )}
                {wasAdjusted && (
                  <div>
                    <Label className="text-xs">Adjustment reason (required)</Label>
                    <Textarea
                      className="mt-1.5"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Intake numbers excluded sponsorship revenue captured separately."
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-4 text-sm">
            <p className="font-semibold mb-1">What this means</p>
            <p className="text-muted-foreground">
              Revenue above <span className="font-semibold text-foreground">{formatCurrency(numericBaseline)}</span> is
              considered new revenue. Curve's share = 25% of all new revenue across all engines.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="bg-health text-health-foreground hover:bg-health/90"
          >
            {busy ? "Activating…" : "Set Baseline & Activate Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
