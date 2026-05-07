import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { SENTIMENT_FACES, SENTIMENT_MILESTONES } from "@/lib/dealRoom";
import RecordSentimentModal from "./RecordSentimentModal";

export default function SentimentPanel({ acquisition }: { acquisition: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("acquisition_seller_sentiment").select("*").eq("acquisition_id", acquisition.id).order("recorded_at", { ascending: true });
    setItems(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, [acquisition.id]);

  const latestByMilestone: Record<string, any> = {};
  items.forEach((s) => { latestByMilestone[s.milestone === "custom" ? `c_${s.id}` : s.milestone] = s; });
  const sortedAll = [...items].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  const latest = sortedAll[0];
  const showAlert = latest && latest.sentiment_score <= 2;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">Seller Sentiment — {acquisition.club_name}</h2>
          {acquisition.seller_primary_name && <p className="text-sm text-muted-foreground">Seller: {acquisition.seller_primary_name}</p>}
        </div>
        <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Record Pulse Check</Button>
      </div>

      {showAlert && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <p>Seller sentiment is low — last check scored <strong>{latest.sentiment_score}/5</strong> on {new Date(latest.recorded_at).toLocaleDateString()}. Consider scheduling a direct conversation to address concerns.</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : (
        <>
          <div className="curve-card">
            <h3 className="font-semibold text-sm mb-4">Timeline</h3>
            <div className="grid grid-cols-4 gap-2">
              {SENTIMENT_MILESTONES.map((m) => {
                const s = latestByMilestone[m.key];
                const face = s ? SENTIMENT_FACES[s.sentiment_score] : null;
                return (
                  <div key={m.key} className="flex flex-col items-center text-center">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl border-2 ${s ? "border-emerald-500 bg-emerald-50" : "border-muted bg-muted/30"}`}>
                      {face?.emoji ?? "○"}
                    </div>
                    <p className="text-xs font-semibold mt-2">{m.label}</p>
                    {s ? <p className={`text-xs ${face?.color}`}>{s.sentiment_score}/5 · {face?.label}</p> : <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm">All pulse checks</h3>
            {sortedAll.length === 0 && <p className="text-sm text-muted-foreground italic">No pulse checks recorded.</p>}
            {sortedAll.map((s) => {
              const face = SENTIMENT_FACES[s.sentiment_score];
              return (
                <div key={s.id} className="curve-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{s.milestone === "custom" ? s.custom_milestone_name : SENTIMENT_MILESTONES.find((m) => m.key === s.milestone)?.label}</p>
                      <p className={`text-sm ${face.color}`}>{face.emoji} {s.sentiment_score}/5 — {face.label}</p>
                      {s.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{s.notes}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(s.recorded_at).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <RecordSentimentModal open={open} onOpenChange={setOpen} acquisitionId={acquisition.id} onSaved={load} />
    </div>
  );
}
