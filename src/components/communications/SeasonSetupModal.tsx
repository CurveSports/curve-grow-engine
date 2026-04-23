import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { buildItemsForSeason, suggestSeasonName } from "@/lib/calendarItems";
import { toast } from "@/hooks/use-toast";

type Track = "youth" | "hs";

export type SeasonSetupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  userId: string;
  hasYouth: boolean;
  hasHs: boolean;
  defaultTrack?: Track;
  reEnrollmentDeadlineRequired?: boolean;
  onCreated?: (seasonId: string) => void;
};

export default function SeasonSetupModal({
  open, onOpenChange, orgId, userId, hasYouth, hasHs, defaultTrack, onCreated,
}: SeasonSetupModalProps) {
  const showTrackPicker = hasYouth && hasHs;
  const initialTrack: Track = defaultTrack ?? (hasYouth ? "youth" : "hs");

  const [track, setTrack] = useState<Track>(initialTrack);
  const [seasonName, setSeasonName] = useState(suggestSeasonName());
  const [hasTryouts, setHasTryouts] = useState<"yes" | "no" | "tbd">("yes");
  const [tryoutDate, setTryoutDate] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const [reDeadline, setReDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTrack(defaultTrack ?? (hasYouth ? "youth" : "hs"));
      setSeasonName(suggestSeasonName());
      setHasTryouts("yes");
      setTryoutDate("");
      setSeasonStart("");
      setSeasonEnd("");
      setReDeadline("");
      setErr(null);
    }
  }, [open, defaultTrack, hasYouth]);

  async function submit() {
    setErr(null);
    if (!seasonName.trim()) return setErr("Season name is required");
    if (!seasonStart) return setErr("Season start date is required");
    if (!seasonEnd) return setErr("Season end date is required");
    if (hasTryouts === "yes" && !tryoutDate) return setErr("Tryout date is required (or choose Not determined yet)");

    setSubmitting(true);
    try {
      const { data: season, error: seasonErr } = await supabase
        .from("org_communication_seasons")
        .insert({
          org_id: orgId,
          track,
          season_name: seasonName.trim(),
          has_tryouts: hasTryouts !== "no",
          tryout_date: hasTryouts === "yes" ? tryoutDate : null,
          tryout_date_tbd: hasTryouts === "tbd",
          season_start_date: seasonStart,
          season_end_date: seasonEnd,
          re_enrollment_deadline: reDeadline || null,
          created_by: userId,
        })
        .select()
        .single();
      if (seasonErr) throw seasonErr;

      // Generate calendar items
      const items = buildItemsForSeason({
        org_id: orgId,
        season_id: season.id,
        track,
        anchors: {
          tryout_date: hasTryouts === "yes" ? tryoutDate : null,
          season_start_date: seasonStart,
          season_end_date: seasonEnd,
          re_enrollment_deadline: reDeadline || null,
          has_tryouts: hasTryouts !== "no",
        },
        created_by: userId,
      });

      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from("org_calendar_items").insert(items);
        if (itemsErr) throw itemsErr;
      }

      toast({ title: "Season added", description: `${seasonName} calendar created — ${items.length} items added.` });
      onCreated?.(season.id);
      onOpenChange(false);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create season");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a season</DialogTitle>
          <DialogDescription>
            Set up the dates and we'll generate the calendar items automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {showTrackPicker && (
            <div>
              <Label className="text-xs font-semibold mb-2 block">Track</Label>
              <div className="flex gap-2">
                {(["youth", "hs"] as Track[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrack(t)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-semibold border transition-colors",
                      track === t
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-card border-border hover:border-accent/50",
                    )}
                  >
                    {t === "youth" ? "Youth" : "High School"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold mb-1 block">Season name</Label>
            <Input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="e.g. Fall 2025" />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-2 block">Do you hold tryouts for this season?</Label>
            <div className="flex gap-2">
              {([
                { v: "yes", l: "Yes" },
                { v: "no", l: "No" },
                { v: "tbd", l: "Not determined yet" },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setHasTryouts(opt.v)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                    hasTryouts === opt.v
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-card border-border hover:border-accent/50",
                  )}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            {hasTryouts === "tbd" && (
              <p className="text-[11px] text-muted-foreground mt-2">
                You can add the date later — tryout-related items will show as TBD.
              </p>
            )}
          </div>

          {hasTryouts === "yes" && (
            <div>
              <Label className="text-xs font-semibold mb-1 block">Tryout date</Label>
              <Input type="date" value={tryoutDate} onChange={(e) => setTryoutDate(e.target.value)} />
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold mb-1 block">Season start date</Label>
            <Input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">First practice or first tournament — whichever comes first.</p>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Season end date</Label>
            <Input type="date" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Re-enrollment deadline (optional)</Label>
            <Input type="date" value={reDeadline} onChange={(e) => setReDeadline(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">When families need to commit for the next season.</p>
          </div>

          {err && (
            <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-foreground">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building…</> : "Build My Calendar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
