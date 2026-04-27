import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { buildInvoiceNumber, nextInvoiceSeq } from "@/lib/revenueShare";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId: string;
  orgName: string;
  onSaved?: () => void;
};

const monthAgo = () => {
  const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1);
  return d.toISOString().slice(0, 10);
};
const yesterday = () => {
  const d = new Date(); d.setDate(0); // last day of prev month
  return d.toISOString().slice(0, 10);
};
const plus30 = () => {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

export default function GenerateInvoiceModal({ open, onOpenChange, orgId, orgName, onSaved }: Props) {
  const { user } = useAuth();
  const [periodStart, setPeriodStart] = useState(monthAgo());
  const [periodEnd, setPeriodEnd] = useState(yesterday());
  const [dueDate, setDueDate] = useState(plus30());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [entries, setEntries] = useState<{ id: string; engine: string; amount: number; description: string; revenue_date: string }[]>([]);
  const [recoveryThreshold, setRecoveryThreshold] = useState(0);
  const [revenueAtPeriodStart, setRevenueAtPeriodStart] = useState(0);
  const [totalToDateAfter, setTotalToDateAfter] = useState(0);
  const [totalCurveShareToDate, setTotalCurveShareToDate] = useState(0);

  useEffect(() => {
    if (!open) return;
    setPeriodStart(monthAgo()); setPeriodEnd(yesterday()); setDueDate(plus30()); setNotes("");
  }, [open]);

  // Load period entries + summary
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [entriesRes, summaryRes, priorRes] = await Promise.all([
        supabase
          .from("org_revenue_entries")
          .select("id, engine, amount, description, revenue_date")
          .eq("org_id", orgId)
          .gte("revenue_date", periodStart)
          .lte("revenue_date", periodEnd)
          .order("revenue_date", { ascending: true }),
        supabase
          .from("org_revenue_share_summary")
          .select("recovery_threshold, total_new_revenue, curve_share_earned")
          .eq("org_id", orgId)
          .maybeSingle(),
        supabase
          .from("org_revenue_entries")
          .select("amount")
          .eq("org_id", orgId)
          .lt("revenue_date", periodStart),
      ]);
      setEntries((entriesRes.data ?? []) as any);
      setRecoveryThreshold(Number(summaryRes.data?.recovery_threshold ?? 0));
      setTotalToDateAfter(Number(summaryRes.data?.total_new_revenue ?? 0));
      setTotalCurveShareToDate(Number(summaryRes.data?.curve_share_earned ?? 0));
      setRevenueAtPeriodStart((priorRes.data ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0));
    })();
  }, [open, orgId, periodStart, periodEnd]);

  const calc = useMemo(() => {
    const newThisPeriod = entries.reduce((s, e) => s + Number(e.amount), 0);
    const recoveryPrior = Math.min(revenueAtPeriodStart, recoveryThreshold);
    const recoveryAfter = Math.min(revenueAtPeriodStart + newThisPeriod, recoveryThreshold);
    const aboveBefore = Math.max(0, revenueAtPeriodStart - recoveryThreshold);
    const aboveAfter = Math.max(0, revenueAtPeriodStart + newThisPeriod - recoveryThreshold);
    const aboveThisPeriod = Math.max(0, aboveAfter - aboveBefore);
    const curveShareThisPeriod = aboveThisPeriod * 0.25;
    return { newThisPeriod, recoveryPrior, recoveryAfter, aboveThisPeriod, curveShareThisPeriod };
  }, [entries, revenueAtPeriodStart, recoveryThreshold]);

  const canGenerate = !busy && entries.length > 0 && periodStart && periodEnd;

  const generate = async () => {
    if (!canGenerate || !user) return;
    setBusy(true);
    const seq = await nextInvoiceSeq(orgId);
    const invoiceNumber = buildInvoiceNumber(orgName, seq);
    const { error } = await supabase.from("org_revenue_share_invoices").insert({
      org_id: orgId,
      invoice_number: invoiceNumber,
      period_start: periodStart,
      period_end: periodEnd,
      new_revenue_this_period: calc.newThisPeriod,
      recovery_threshold: recoveryThreshold,
      revenue_toward_recovery_prior: calc.recoveryPrior,
      revenue_toward_recovery_after: calc.recoveryAfter,
      revenue_above_threshold_this_period: calc.aboveThisPeriod,
      curve_share_this_period: calc.curveShareThisPeriod,
      total_new_revenue_to_date: totalToDateAfter,
      total_curve_share_to_date: totalCurveShareToDate,
      due_date: dueDate || null,
      invoice_notes: notes.trim() || null,
      revenue_entry_ids: entries.map((e) => e.id),
      generated_by: user.id,
      status: "draft",
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not generate invoice", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invoice generated", description: invoiceNumber });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Revenue Share Invoice</DialogTitle>
          <DialogDescription>{orgName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Period start</Label>
              <Input type="date" className="mt-1.5" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Period end</Label>
              <Input type="date" className="mt-1.5" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Due date</Label>
              <Input type="date" className="mt-1.5" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="curve-eyebrow mb-2">Revenue in this period</p>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revenue entries in this date range.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {entries.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground truncate"><span className="font-medium text-foreground">{e.engine}</span> — {e.description}</span>
                    <span className="font-mono font-semibold">{formatCurrency(Number(e.amount))}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-border pt-1.5 mt-1.5 font-semibold">
                  <span>Total new revenue this period</span>
                  <span className="font-mono">{formatCurrency(calc.newThisPeriod)}</span>
                </li>
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-secondary/40 p-4 font-mono text-sm space-y-1">
            <Row label="New revenue this period" value={formatCurrency(calc.newThisPeriod)} />
            <Row label="Recovery toward threshold (prior)" value={formatCurrency(calc.recoveryPrior)} />
            <Row label="Recovery toward threshold (after)" value={formatCurrency(calc.recoveryAfter)} />
            <Row label="Recovery threshold" value={formatCurrency(recoveryThreshold)} />
            <div className="border-t border-border my-1" />
            <Row label="Revenue above threshold this period" value={formatCurrency(calc.aboveThisPeriod)} />
            <Row label="Curve share rate" value="× 25%" />
            <Row label="Curve share this period" value={formatCurrency(calc.curveShareThisPeriod)} bold />
          </div>

          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea className="mt-1.5" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={generate} disabled={!canGenerate} className="bg-health text-health-foreground hover:bg-health/90">
            {busy ? "Generating…" : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-base text-accent" : ""}`}>
      <span className="text-muted-foreground font-sans">{label}</span>
      <span>{value}</span>
    </div>
  );
}
