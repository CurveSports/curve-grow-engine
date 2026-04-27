import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Frequency = "monthly" | "quarterly" | "annual" | "custom";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId: string;
  orgName: string;
  onSaved?: () => void;
  allowSkip?: boolean;
};

export default function ContractSetupModal({ open, onOpenChange, orgId, orgName, onSaved, allowSkip = true }: Props) {
  const { user } = useAuth();
  const [contractValue, setContractValue] = useState("17500");
  const [signedDate, setSignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [installmentCount, setInstallmentCount] = useState("10");
  const [installmentAmount, setInstallmentAmount] = useState("1750");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [firstDue, setFirstDue] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Auto-calc installment amount from value/count
  useEffect(() => {
    const v = Number(contractValue) || 0;
    const c = Math.max(1, Number(installmentCount) || 1);
    setInstallmentAmount(String((v / c).toFixed(2)));
  }, [contractValue, installmentCount]);

  useEffect(() => {
    if (open) {
      setContractValue("17500"); setSignedDate(new Date().toISOString().slice(0, 10));
      setInstallmentCount("10"); setFrequency("monthly");
      setFirstDue(new Date().toISOString().slice(0, 10)); setNotes("");
    }
  }, [open]);

  const valueNum = Number(contractValue) || 0;
  const countNum = Math.max(1, Number(installmentCount) || 1);
  const amountNum = Number(installmentAmount) || 0;
  const canSave = valueNum > 0 && countNum > 0 && amountNum > 0 && !busy;

  const addPeriod = (d: Date, i: number) => {
    const nd = new Date(d);
    if (frequency === "monthly") nd.setMonth(nd.getMonth() + i);
    else if (frequency === "quarterly") nd.setMonth(nd.getMonth() + i * 3);
    else if (frequency === "annual") nd.setFullYear(nd.getFullYear() + i);
    return nd;
  };

  const save = async () => {
    if (!canSave || !user) return;
    setBusy(true);
    const { data: contract, error } = await supabase
      .from("org_engagement_contracts")
      .insert({
        org_id: orgId,
        contract_value: valueNum,
        contract_signed_date: signedDate || null,
        contract_notes: notes.trim() || null,
        installment_count: countNum,
        installment_amount: amountNum,
        installment_frequency: frequency,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !contract) {
      setBusy(false);
      toast({ title: "Could not save contract", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }

    // Generate installments (skip for "custom" — admin can add manually)
    if (frequency !== "custom" && firstDue) {
      const baseDue = new Date(firstDue);
      const rows = Array.from({ length: countNum }, (_, i) => ({
        contract_id: contract.id,
        org_id: orgId,
        installment_number: i + 1,
        amount: amountNum,
        due_date: addPeriod(baseDue, i).toISOString().slice(0, 10),
      }));
      await supabase.from("org_contract_installments").insert(rows);
    }

    setBusy(false);
    toast({ title: "Contract saved", description: `${formatCurrency(valueNum)} engagement contract recorded.` });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Set Up Engagement Contract</DialogTitle>
          <DialogDescription>
            Record the engagement contract details for {orgName} so revenue share recovery can be tracked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Contract value ($) *</Label>
              <Input type="number" className="mt-1.5" value={contractValue} onChange={(e) => setContractValue(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Signed date</Label>
              <Input type="date" className="mt-1.5" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Number of installments</Label>
              <Input type="number" min={1} className="mt-1.5" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Installment amount ($)</Label>
              <Input type="number" className="mt-1.5" value={installmentAmount} onChange={(e) => setInstallmentAmount(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Frequency</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(["monthly", "quarterly", "annual", "custom"] as Frequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border capitalize",
                    frequency === f ? "bg-accent text-accent-foreground border-accent" : "bg-background border-border text-muted-foreground hover:bg-secondary",
                  )}
                >{f}</button>
              ))}
            </div>
          </div>

          {frequency !== "custom" && (
            <div>
              <Label className="text-xs">First installment due date</Label>
              <Input type="date" className="mt-1.5" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {countNum} {frequency} payments of {formatCurrency(amountNum)} = {formatCurrency(amountNum * countNum)}
              </p>
            </div>
          )}

          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea className="mt-1.5" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {allowSkip && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Skip for now</Button>
          )}
          <Button onClick={save} disabled={!canSave} className="bg-health text-health-foreground hover:bg-health/90">
            {busy ? "Saving…" : "Save Contract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
