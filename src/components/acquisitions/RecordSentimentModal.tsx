import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SENTIMENT_FACES, SENTIMENT_MILESTONES } from "@/lib/dealRoom";
import { toast } from "sonner";

export default function RecordSentimentModal({ open, onOpenChange, acquisitionId, onSaved }: any) {
  const [milestone, setMilestone] = useState("day_30");
  const [custom, setCustom] = useState("");
  const [score, setScore] = useState<number>(3);
  const [notes, setNotes] = useState("");

  useEffect(() => { if (open) { setMilestone("day_30"); setCustom(""); setScore(3); setNotes(""); } }, [open]);

  const submit = async () => {
    if (!notes) return toast.error("Notes required");
    if (milestone === "custom" && !custom) return toast.error("Custom milestone name required");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("acquisition_seller_sentiment").insert({
      acquisition_id: acquisitionId, milestone, custom_milestone_name: milestone === "custom" ? custom : null,
      sentiment_score: score, notes, recorded_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Recorded"); onOpenChange(false); onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Pulse Check</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {SENTIMENT_MILESTONES.map((m) => (
              <button key={m.key} onClick={() => setMilestone(m.key)} className={`text-xs px-3 py-1 rounded-full border ${milestone === m.key ? "bg-emerald-600 text-white border-emerald-600" : "bg-card hover:bg-muted"}`}>{m.label}</button>
            ))}
            <button onClick={() => setMilestone("custom")} className={`text-xs px-3 py-1 rounded-full border ${milestone === "custom" ? "bg-emerald-600 text-white border-emerald-600" : "bg-card hover:bg-muted"}`}>Custom</button>
          </div>
          {milestone === "custom" && <Input placeholder="e.g. Post-launch check-in" value={custom} onChange={(e) => setCustom(e.target.value)} />}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Sentiment</p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const f = SENTIMENT_FACES[n];
                return (
                  <button key={n} onClick={() => setScore(n)} className={`p-3 rounded-lg border-2 text-center ${score === n ? "border-emerald-500 bg-emerald-50" : "border-border hover:bg-muted"}`}>
                    <div className="text-2xl">{f.emoji}</div>
                    <p className="text-[10px] font-semibold mt-1">{n}</p>
                    <p className="text-[10px] text-muted-foreground">{f.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <Textarea placeholder="How is the seller feeling about the transition? Any specific concerns raised?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-emerald-600 hover:bg-emerald-700">Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
