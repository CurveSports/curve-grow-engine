import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { calcDueDate } from "@/lib/calendarItems";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Phase = "pre_season" | "in_season" | "post_season";
type TimingType = "relative" | "recurring" | "manual";
type Anchor = "tryout_date" | "season_start" | "season_end" | "re_enrollment_deadline";
type Track = "youth" | "hs" | "both";

type Season = {
  id: string;
  season_name: string;
  track: "youth" | "hs";
  tryout_date: string | null;
  season_start_date: string;
  season_end_date: string;
  re_enrollment_deadline: string | null;
  has_tryouts: boolean;
};

export default function CustomItemModal({
  open, onOpenChange, orgId, userId, seasons, hasYouth, hasHs, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  userId: string;
  seasons: Season[];
  hasYouth: boolean;
  hasHs: boolean;
  onCreated?: () => void;
}) {
  const showTrackPicker = hasYouth && hasHs;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [track, setTrack] = useState<Track>(showTrackPicker ? "both" : (hasYouth ? "youth" : "hs"));
  const [phase, setPhase] = useState<Phase>("in_season");
  const [seasonId, setSeasonId] = useState<string>("");
  const [timingType, setTimingType] = useState<TimingType>("manual");
  const [anchor, setAnchor] = useState<Anchor>("season_start");
  const [offset, setOffset] = useState("7");
  const [direction, setDirection] = useState<"before" | "after">("before");
  const [recurrenceDay, setRecurrenceDay] = useState("thursday");
  const [stakeholder, setStakeholder] = useState<"parents" | "coaches" | "admin" | "players">("parents");
  const [aiType, setAiType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(""); setDescription("");
      setTrack(showTrackPicker ? "both" : (hasYouth ? "youth" : "hs"));
      setPhase("in_season");
      setSeasonId(seasons[0]?.id ?? "");
      setTimingType("manual");
      setAnchor("season_start"); setOffset("7"); setDirection("before");
      setRecurrenceDay("thursday");
      setStakeholder("parents");
      setAiType("");
      setErr(null);
    }
  }, [open, seasons, showTrackPicker, hasYouth]);

  async function submit() {
    setErr(null);
    if (!title.trim()) return setErr("Title is required");
    if (!seasonId) return setErr("Please select a season");

    const season = seasons.find((s) => s.id === seasonId);
    if (!season) return setErr("Invalid season");

    setSubmitting(true);
    try {
      let calculated_due_date: string | null = null;
      let is_tbd = false;
      const offsetNum = parseInt(offset, 10) || 0;
      if (timingType === "relative") {
        calculated_due_date = calcDueDate(
          { system_code: "", title, description: "", phase, timing_type: "relative",
            timing_anchor: anchor, timing_offset_days: offsetNum, timing_direction: direction,
            stakeholder } as any,
          {
            tryout_date: season.tryout_date,
            season_start_date: season.season_start_date,
            season_end_date: season.season_end_date,
            re_enrollment_deadline: season.re_enrollment_deadline,
            has_tryouts: season.has_tryouts,
          },
        );
        is_tbd = !calculated_due_date;
      }

      const { error: insertErr } = await supabase.from("org_calendar_items").insert({
        org_id: orgId,
        season_id: seasonId,
        track,
        title: title.trim(),
        description: description.trim() || null,
        phase,
        timing_type: timingType,
        timing_anchor: timingType === "relative" ? anchor : null,
        timing_offset_days: timingType === "relative" ? offsetNum : null,
        timing_direction: timingType === "relative" ? direction : null,
        recurrence_frequency: timingType === "recurring" ? "weekly" : null,
        recurrence_day: timingType === "recurring" ? recurrenceDay : null,
        recurrence_note: timingType === "recurring" ? `Every ${recurrenceDay} during season` : null,
        calculated_due_date,
        is_tbd,
        stakeholder,
        ai_communication_type: aiType.trim() || null,
        is_system_item: false,
        is_custom: true,
        created_by: userId,
      });
      if (insertErr) throw insertErr;

      toast({ title: "Custom item added", description: `${title} added to calendar.` });
      onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create item");
    } finally {
      setSubmitting(false);
    }
  }

  const PHASE_LABELS: Record<Phase, string> = {
    pre_season: "Pre-Season", in_season: "In-Season", post_season: "Post-Season",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add custom calendar item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Communication name *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px]" />
          </div>

          {showTrackPicker && (
            <PillRow
              label="Track"
              options={[{ v: "youth", l: "Youth" }, { v: "hs", l: "HS" }, { v: "both", l: "Both" }]}
              value={track}
              onChange={(v) => setTrack(v as Track)}
            />
          )}

          <PillRow
            label="Phase *"
            options={[
              { v: "pre_season", l: "Pre-Season" },
              { v: "in_season", l: "In-Season" },
              { v: "post_season", l: "Post-Season" },
            ]}
            value={phase}
            onChange={(v) => setPhase(v as Phase)}
          />

          <div>
            <Label className="text-xs font-semibold mb-1 block">Season *</Label>
            <Select value={seasonId} onValueChange={setSeasonId}>
              <SelectTrigger><SelectValue placeholder="Select a season" /></SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.season_name} ({s.track === "youth" ? "Youth" : "HS"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PillRow
            label="Timing"
            options={[
              { v: "relative", l: "Relative to a date" },
              { v: "recurring", l: "Recurring during season" },
              { v: "manual", l: "Send when needed" },
            ]}
            value={timingType}
            onChange={(v) => setTimingType(v as TimingType)}
          />

          {timingType === "relative" && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">Anchor</Label>
                <Select value={anchor} onValueChange={(v) => setAnchor(v as Anchor)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tryout_date">Tryout date</SelectItem>
                    <SelectItem value="season_start">Season start</SelectItem>
                    <SelectItem value="season_end">Season end</SelectItem>
                    <SelectItem value="re_enrollment_deadline">Re-enrollment deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1 block">Days</Label>
                  <Input type="number" value={offset} onChange={(e) => setOffset(e.target.value)} />
                </div>
                <PillRow
                  label="Direction"
                  options={[{ v: "before", l: "Before" }, { v: "after", l: "After" }]}
                  value={direction}
                  onChange={(v) => setDirection(v as "before" | "after")}
                />
              </div>
            </div>
          )}

          {timingType === "recurring" && (
            <div>
              <Label className="text-xs font-semibold mb-1 block">Day of week</Label>
              <Select value={recurrenceDay} onValueChange={setRecurrenceDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map((d) => (
                    <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <PillRow
            label="Stakeholder"
            options={[
              { v: "parents", l: "Parents" },
              { v: "coaches", l: "Coaches" },
              { v: "admin", l: "Admin" },
              { v: "players", l: "Players" },
            ]}
            value={stakeholder}
            onChange={(v) => setStakeholder(v as any)}
          />

          <div>
            <Label className="text-xs font-semibold mb-1 block">Link to AI template (optional)</Label>
            <Input value={aiType} onChange={(e) => setAiType(e.target.value)} placeholder="e.g. Weekly team update" />
            <p className="text-[11px] text-muted-foreground mt-1">Match an existing communication type to enable the Draft button.</p>
          </div>

          {err && (
            <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-foreground">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button onClick={submit} disabled={submitting} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding…</> : "Add to Calendar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PillRow({ label, options, value, onChange }: {
  label: string;
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold mb-2 block">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.v}
            type="button"
            onClick={() => onChange(opt.v)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
              value === opt.v
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card border-border hover:border-accent/50",
            )}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
}
