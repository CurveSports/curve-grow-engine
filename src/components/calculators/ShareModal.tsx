import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CALCULATOR_LABELS, type CalculatorType, keyOutputFor } from "@/lib/calculators";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  calculatorType: CalculatorType;
  outputValues: Record<string, unknown>;
}

export function ShareModal({ open, onOpenChange, orgId, calculatorType, outputValues }: ShareModalProps) {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const key = keyOutputFor(calculatorType, outputValues);

  const handleSend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("share-calculator-scenario", {
        body: {
          org_id: orgId,
          calculator_type: calculatorType,
          calculator_label: CALCULATOR_LABELS[calculatorType],
          key_output_label: key.label,
          key_output_value: key.value,
          output_values: outputValues,
          note: note.trim() || null,
        },
      });
      if (error) throw error;
      toast({ title: "Shared with your Curve team", description: "They've been notified by email." });
      setNote("");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Couldn't share scenario", description: err?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this scenario with your Curve team</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-accent-soft border border-accent/30 p-4">
            <p className="curve-eyebrow text-accent mb-1">{CALCULATOR_LABELS[calculatorType]}</p>
            <p className="text-sm text-muted-foreground">{key.label}</p>
            <p className="font-display text-2xl font-semibold text-foreground mt-1">{key.value}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Add a note for your Curve team (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 'Thinking about raising fees next season — wanted to see the math'"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {sending ? "Sending…" : "Send to Curve Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
