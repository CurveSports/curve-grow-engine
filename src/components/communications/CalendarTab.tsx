import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Check, ChevronDown, ChevronUp, AlertCircle, Star, Calendar as CalIcon, Trash2 } from "lucide-react";
import SeasonSetupModal from "./SeasonSetupModal";
import CustomItemModal from "./CustomItemModal";
import { timingDisplay } from "@/lib/calendarItems";
import { toast } from "@/hooks/use-toast";

type Season = {
  id: string;
  org_id: string;
  track: "youth" | "hs";
  season_name: string;
  has_tryouts: boolean;
  tryout_date: string | null;
  tryout_date_tbd: boolean;
  season_start_date: string;
  season_end_date: string;
  re_enrollment_deadline: string | null;
  status: "upcoming" | "active" | "completed";
};

type CalendarItem = {
  id: string;
  season_id: string;
  track: string | null;
  system_code: string | null;
  title: string;
  description: string | null;
  phase: "pre_season" | "in_season" | "post_season";
  timing_type: "relative" | "recurring" | "manual";
  timing_anchor: string | null;
  timing_offset_days: number | null;
  timing_direction: string | null;
  timing_note: string | null;
  recurrence_frequency: string | null;
  recurrence_day: string | null;
  recurrence_note: string | null;
  calculated_due_date: string | null;
  is_tbd: boolean;
  stakeholder: string;
  ai_communication_type: string | null;
  is_sent: boolean;
  sent_at: string | null;
  is_system_item: boolean;
  is_custom: boolean;
  is_non_negotiable: boolean;
};

type TrackFilter = "all" | "youth" | "hs";
type PhaseFilter = "all" | "pre_season" | "in_season" | "post_season";
type StakeFilter = "all" | "parents" | "coaches" | "admin" | "players";

const PHASE_LABELS = {
  pre_season: "PRE-SEASON",
  in_season: "IN-SEASON",
  post_season: "POST-SEASON",
} as const;
const PHASE_BAND_CLASS = {
  pre_season: "border-warning/40 bg-warning-soft/30",
  in_season: "border-health/40 bg-health-soft/30",
  post_season: "border-info/40 bg-info-soft/30",
} as const;
const PHASE_TEXT_CLASS = {
  pre_season: "text-warning",
  in_season: "text-health",
  post_season: "text-info",
} as const;

export default function CalendarTab({
  orgId, userId, hasYouth, hasHs, onDraftItem,
}: {
  orgId: string;
  userId: string;
  hasYouth: boolean;
  hasHs: boolean;
  onDraftItem: (item: CalendarItem, season?: Season) => void;
}) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeasonId, setActiveSeasonId] = useState<string | "all">("all");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("all");
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [stakeFilter, setStakeFilter] = useState<StakeFilter>("all");
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: it }] = await Promise.all([
      supabase.from("org_communication_seasons").select("*").eq("org_id", orgId).order("season_start_date", { ascending: false }),
      supabase.from("org_calendar_items").select("*").eq("org_id", orgId).order("calculated_due_date", { ascending: true, nullsFirst: false }),
    ]);
    setSeasons((s ?? []) as Season[]);
    setItems((it ?? []) as CalendarItem[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [orgId]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (activeSeasonId !== "all" && i.season_id !== activeSeasonId) return false;
      if (trackFilter !== "all") {
        const season = seasons.find((s) => s.id === i.season_id);
        if (season && season.track !== trackFilter && i.track !== "both") return false;
      }
      if (phaseFilter !== "all" && i.phase !== phaseFilter) return false;
      if (stakeFilter !== "all" && i.stakeholder !== stakeFilter) return false;
      return true;
    });
  }, [items, seasons, activeSeasonId, trackFilter, phaseFilter, stakeFilter]);

  const phaseGroups = useMemo(() => {
    const groups: Record<"pre_season" | "in_season" | "post_season", CalendarItem[]> = {
      pre_season: [], in_season: [], post_season: [],
    };
    for (const i of filtered) groups[i.phase].push(i);
    // Sort within each: overdue → today → upcoming → TBD
    for (const k of Object.keys(groups) as Array<keyof typeof groups>) {
      groups[k].sort((a, b) => {
        if (a.is_tbd && !b.is_tbd) return 1;
        if (!a.is_tbd && b.is_tbd) return -1;
        const aOver = !a.is_sent && a.calculated_due_date && a.calculated_due_date < todayISO;
        const bOver = !b.is_sent && b.calculated_due_date && b.calculated_due_date < todayISO;
        if (aOver && !bOver) return -1;
        if (!aOver && bOver) return 1;
        return (a.calculated_due_date ?? "").localeCompare(b.calculated_due_date ?? "");
      });
    }
    return groups;
  }, [filtered, todayISO]);

  async function toggleSent(item: CalendarItem) {
    const next = !item.is_sent;
    const { error } = await supabase
      .from("org_calendar_items")
      .update({
        is_sent: next,
        sent_at: next ? new Date().toISOString() : null,
        sent_by: next ? userId : null,
      })
      .eq("id", item.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_sent: next, sent_at: next ? new Date().toISOString() : null } : p)));
  }

  async function deleteCustom(item: CalendarItem) {
    if (!item.is_custom) return;
    if (!confirm(`Delete "${item.title}"?`)) return;
    const { error } = await supabase.from("org_calendar_items").delete().eq("id", item.id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== item.id));
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground py-12 text-center">Loading calendar…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header / actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Communication Calendar</h2>
          <p className="text-sm text-muted-foreground mt-1">Your complete season communication schedule — personalized to your program.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setSeasonModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4 mr-1" /> Add Season
          </Button>
          <Button variant="outline" onClick={() => setCustomModalOpen(true)} disabled={seasons.length === 0}>
            <Plus className="h-4 w-4 mr-1" /> Add Custom Item
          </Button>
        </div>
      </div>

      {/* Season pills */}
      {seasons.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <SeasonPill active={activeSeasonId === "all"} onClick={() => setActiveSeasonId("all")} label="All seasons" />
          {seasons.map((s) => (
            <SeasonPill
              key={s.id}
              active={activeSeasonId === s.id}
              onClick={() => setActiveSeasonId(s.id)}
              label={`${s.season_name} (${s.track === "youth" ? "Y" : "HS"})`}
              status={s.status}
            />
          ))}
        </div>
      )}

      {/* Filter pills */}
      {hasYouth && hasHs && (
        <FilterRow label="Track" options={[
          { v: "all", l: "All" }, { v: "youth", l: "Youth" }, { v: "hs", l: "HS" },
        ]} value={trackFilter} onChange={(v) => setTrackFilter(v as TrackFilter)} />
      )}
      <div className="flex flex-wrap gap-3">
        <FilterRow label="Phase" options={[
          { v: "all", l: "All" }, { v: "pre_season", l: "Pre" }, { v: "in_season", l: "In" }, { v: "post_season", l: "Post" },
        ]} value={phaseFilter} onChange={(v) => setPhaseFilter(v as PhaseFilter)} compact />
        <FilterRow label="Stakeholder" options={[
          { v: "all", l: "All" }, { v: "parents", l: "Parents" }, { v: "coaches", l: "Coaches" }, { v: "admin", l: "Admin" },
        ]} value={stakeFilter} onChange={(v) => setStakeFilter(v as StakeFilter)} compact />
      </div>

      {seasons.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <CalIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No seasons set up yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Add your first season to generate the calendar.</p>
          <Button onClick={() => setSeasonModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4 mr-1" /> Add Season
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {(["pre_season", "in_season", "post_season"] as const).map((p) => {
            const list = phaseGroups[p];
            const sent = list.filter((i) => i.is_sent).length;
            const total = list.length;
            const pct = total === 0 ? 0 : Math.round((sent / total) * 100);
            return (
              <div key={p}>
                <div className={cn("rounded-t-lg border-l-4 border-y border-r px-4 py-3 flex items-center justify-between", PHASE_BAND_CLASS[p])}>
                  <h3 className={cn("font-display text-sm font-bold tracking-wider uppercase", PHASE_TEXT_CLASS[p])}>{PHASE_LABELS[p]}</h3>
                  {total > 0 && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{sent} / {total} sent</span>
                      <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                        <div className={cn("h-full transition-all", pct === 100 ? "bg-health" : "bg-accent")} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-b-lg border-l-4 border-x border-b border-border bg-background p-4">
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No items in this phase match your filters.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {list.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          season={seasons.find((s) => s.id === item.season_id)}
                          today={todayISO}
                          onToggleSent={() => toggleSent(item)}
                          onDraft={() => onDraftItem(item, seasons.find((s) => s.id === item.season_id))}
                          onDelete={() => deleteCustom(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SeasonSetupModal
        open={seasonModalOpen}
        onOpenChange={setSeasonModalOpen}
        orgId={orgId}
        userId={userId}
        hasYouth={hasYouth}
        hasHs={hasHs}
        onCreated={() => load()}
      />
      <CustomItemModal
        open={customModalOpen}
        onOpenChange={setCustomModalOpen}
        orgId={orgId}
        userId={userId}
        seasons={seasons}
        hasYouth={hasYouth}
        hasHs={hasHs}
        onCreated={() => load()}
      />
    </div>
  );
}

function SeasonPill({ active, onClick, label, status }: {
  active: boolean; onClick: () => void; label: string; status?: "upcoming" | "active" | "completed";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors flex items-center gap-1.5",
        active
          ? "bg-accent text-accent-foreground border-accent"
          : status === "completed"
            ? "bg-muted text-muted-foreground border-border line-through opacity-70"
            : status === "active"
              ? "bg-health-soft text-health border-health/30"
              : status === "upcoming"
                ? "bg-info-soft text-info border-info/30"
                : "bg-card border-border",
      )}
    >
      {status === "completed" && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

function FilterRow({ label, options, value, onChange, compact }: {
  label: string; options: { v: string; l: string }[]; value: string; onChange: (v: string) => void; compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {!compact && <span className="text-xs font-semibold text-muted-foreground">{label}:</span>}
      {compact && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>}
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
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

function ItemCard({ item, season, today, onToggleSent, onDraft, onDelete }: {
  item: CalendarItem;
  season?: Season;
  today: string;
  onToggleSent: () => void;
  onDraft: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isOverdue = !item.is_sent && item.calculated_due_date && item.calculated_due_date < today;
  const isToday = item.calculated_due_date === today;
  const trackBadgeClass =
    item.track === "youth" ? "bg-info-soft text-info border-info/30" :
    item.track === "hs" ? "bg-accent-soft text-accent border-accent/30" :
    "bg-secondary text-foreground border-border";
  const stakeIcon =
    item.stakeholder === "parents" ? "👨‍👩‍👧" :
    item.stakeholder === "coaches" ? "🧢" :
    item.stakeholder === "admin" ? "📋" : "🎽";

  return (
    <div className={cn(
      "rounded-lg border bg-card p-3 transition-all relative",
      isOverdue ? "border-l-4 border-l-warning border-y-border border-r-border" :
      item.is_sent ? "opacity-70" : "border-border",
    )}>
      {isOverdue && (
        <span className="absolute top-2 right-2 rounded-full bg-warning text-white px-2 py-0.5 text-[10px] font-bold">OVERDUE</span>
      )}

      {/* Top row: badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {item.system_code && (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">{item.system_code}</span>
        )}
        {item.track && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold border", trackBadgeClass)}>
            {item.track === "youth" ? "Youth" : item.track === "hs" ? "HS" : "Both"}
          </span>
        )}
        {item.is_non_negotiable && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-warning-soft text-warning border border-warning/30 inline-flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5" /> Required
          </span>
        )}
        {item.is_custom && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-secondary text-foreground border border-border">Custom</span>
        )}
      </div>

      {/* Title + stakeholder */}
      <div className="mb-2">
        <h4 className="font-semibold text-sm leading-snug">{item.title}</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
          {stakeIcon} {item.stakeholder}
        </p>
      </div>

      {/* Timing */}
      <p className="text-xs text-muted-foreground">{timingDisplay(item)}</p>
      {item.timing_note && (
        <p className="text-[11px] italic text-warning mt-1">{item.timing_note}</p>
      )}

      {/* Due date */}
      {item.is_tbd ? (
        <p className="text-xs text-warning mt-2 inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> TBD — anchor not set
        </p>
      ) : item.calculated_due_date ? (
        <p className={cn(
          "text-xs mt-2 font-medium",
          isOverdue ? "text-warning" : isToday ? "text-warning" : "text-health",
        )}>
          Due: {new Date(item.calculated_due_date + "T00:00:00").toLocaleDateString()}
          {isToday && <span className="ml-1 text-[10px] uppercase tracking-wider">today</span>}
        </p>
      ) : null}

      {/* Description (collapsed) */}
      {item.description && (
        <button
          onClick={() => setOpen(!open)}
          className="mt-2 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {open ? "Hide" : "Show"} description
        </button>
      )}
      {open && item.description && (
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
      )}

      {/* Action row */}
      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
        <button
          onClick={onToggleSent}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-semibold border transition-colors inline-flex items-center gap-1",
            item.is_sent
              ? "bg-health-soft text-health border-health/30"
              : "bg-card border-border hover:border-accent/50",
          )}
        >
          <Check className="h-3 w-3" />
          {item.is_sent ? `Sent ${item.sent_at ? new Date(item.sent_at).toLocaleDateString() : ""}` : "Mark as Sent"}
        </button>
        {item.ai_communication_type && (
          <button
            onClick={onDraft}
            className="rounded-md px-2.5 py-1 text-[11px] font-semibold border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Draft →
          </button>
        )}
        {item.is_custom && (
          <button
            onClick={onDelete}
            className="ml-auto text-muted-foreground hover:text-warning"
            aria-label="Delete custom item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
