import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { REVENUE_ENGINES, type RevenueEngine } from "@/lib/revenueShare";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId: string;
  onSaved?: () => void;
};

export default function LogRevenueModal({ open, onOpenChange, orgId, onSaved }: Props) {
  const { user } = useAuth();
  const [engine, setEngine] = useState<RevenueEngine>("Pricing");
  const [amount, setAmount] = useState("");
  const [revenueDate, setRevenueDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [supportingNotes, setSupportingNotes] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setEngine("Pricing"); setAmount(""); setDescription("");
      setRevenueDate(new Date().toISOString().slice(0, 10));
      setPeriodStart(""); setPeriodEnd(""); setSupportingNotes(""); setVerified(false);
    }
  }, [open]);

  const amountNum = Number(amount.replace(/[^0-9.]/g, "")) || 0;
  const canSave = amountNum > 0 && description.trim().length > 0 && !busy;

  const save = async () => {
    if (!canSave || !user) return;
    setBusy(true);
    const { error } = await supabase.from("org_revenue_entries").insert({
      org_id: orgId,
      engine,
      amount: amountNum,
      description: description.trim(),
      revenue_date: revenueDate,
      entry_type: "manual",
      period_start: periodStart || null,
      period_end: periodEnd || null,
      supporting_notes: supportingNotes.trim() || null,
      is_verified: verified,
      verified_by: verified ? user.id : null,
      verified_at: verified ? new Date().toISOString() : null,
      logged_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Revenue entry saved", description: "Share calculation updated." });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Log New Revenue</DialogTitle>
          <DialogDescription>
            Record revenue generated above baseline through the Allegiance engagement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Engine</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REVENUE_ENGINES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEngine(e)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    engine === e
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-background border-border text-muted-foreground hover:bg-secondary",
                  )}
                >{e}</button>
              ))}
            </div>
            {engine === "Sponsorship" && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Sponsorship deals closing in the pipeline are auto-logged. Use this only for deals closed outside the pipeline.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount ($) *</Label>
              <Input type="number" inputMode="decimal" className="mt-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Revenue date *</Label>
              <Input type="date" className="mt-1.5" value={revenueDate} onChange={(e) => setRevenueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Description *</Label>
            <Textarea
              className="mt-1.5"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Spring 2026 pricing increase — HS dues raised from $2,800 to $3,200. 120 HS players × $400 = $48,000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Period start (optional)</Label>
              <Input type="date" className="mt-1.5" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Period end (optional)</Label>
              <Input type="date" className="mt-1.5" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Supporting notes (optional)</Label>
            <Textarea className="mt-1.5" rows={2} value={supportingNotes} onChange={(e) => setSupportingNotes(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Verified</p>
              <p className="text-[11px] text-muted-foreground">Toggle on once you've confirmed this revenue with the org.</p>
            </div>
            <Switch checked={verified} onCheckedChange={setVerified} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={!canSave} className="bg-health text-health-foreground hover:bg-health/90">
            {busy ? "Saving…" : "Save Revenue Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
