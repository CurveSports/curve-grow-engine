import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus, Check, ChevronDown, ChevronRight, AlertCircle, Star, Calendar as CalIcon,
  Trash2, Filter, Sparkles, X,
} from "lucide-react";
import SeasonSetupModal from "./SeasonSetupModal";
import CustomItemModal from "./CustomItemModal";
import { timingDisplay } from "@/lib/calendarItems";
import { toast } from "@/hooks/use-toast";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

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
type StakeFilter = "all" | "parents" | "coaches" | "admin" | "players";
type Bucket = "overdue" | "this_week" | "next_week" | "later_month" | "later" | "tbd";

const STAKE_ICON: Record<string, string> = {
  parents: "👨‍👩‍👧",
  coaches: "🧢",
  admin: "📋",
  players: "🎽",
};

const BUCKET_META: Record<Bucket, { label: string; tone: string; expanded: boolean }> = {
  overdue: { label: "Overdue", tone: "warning", expanded: true },
  this_week: { label: "This week", tone: "accent", expanded: true },
  next_week: { label: "Next week", tone: "info", expanded: false },
  later_month: { label: "Later this month", tone: "muted", expanded: false },
  later: { label: "Later", tone: "muted", expanded: false },
  tbd: { label: "TBD — needs a date", tone: "warning", expanded: false },
};

// ─── Date helpers ──────────────────────────────────────────────────────
function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // make Monday start
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function parseISODate(s: string) { return new Date(s + "T00:00:00"); }
function dayLabel(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function shortDate(s: string) {
  const d = parseISODate(s);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function classifyBucket(item: CalendarItem, today: Date, weekStart: Date): Bucket {
  if (item.is_tbd || !item.calculated_due_date) return "tbd";
  const due = parseISODate(item.calculated_due_date);
  const todayISO = ymd(today);
  if (!item.is_sent && item.calculated_due_date < todayISO) return "overdue";
  const weekEnd = addDays(weekStart, 6);
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekEnd = addDays(weekStart, 13);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  if (due >= weekStart && due <= weekEnd) return "this_week";
  if (due >= nextWeekStart && due <= nextWeekEnd) return "next_week";
  if (due > nextWeekEnd && due <= monthEnd) return "later_month";
  return "later";
}

// ─── Component ─────────────────────────────────────────────────────────
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
  const [stakeFilter, setStakeFilter] = useState<StakeFilter>("all");
  const [showSent, setShowSent] = useState(false);
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState<Record<Bucket, boolean>>(() =>
    Object.fromEntries(Object.entries(BUCKET_META).map(([k, v]) => [k, v.expanded])) as Record<Bucket, boolean>,
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayISO = useMemo(() => ymd(today), [today]);
  const weekStart = useMemo(() => startOfWeek(today), [today]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

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

  // Filter set
  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (activeSeasonId !== "all" && i.season_id !== activeSeasonId) return false;
      if (trackFilter !== "all") {
        const season = seasons.find((s) => s.id === i.season_id);
        if (season && season.track !== trackFilter && i.track !== "both") return false;
      }
      if (stakeFilter !== "all" && i.stakeholder !== stakeFilter) return false;
      if (!showSent && i.is_sent) return false;
      return true;
    });
  }, [items, seasons, activeSeasonId, trackFilter, stakeFilter, showSent]);

  // Bucket map
  const buckets = useMemo(() => {
    const out: Record<Bucket, CalendarItem[]> = {
      overdue: [], this_week: [], next_week: [], later_month: [], later: [], tbd: [],
    };
    for (const i of filtered) out[classifyBucket(i, today, weekStart)].push(i);
    // sort within bucket
    const sorter = (a: CalendarItem, b: CalendarItem) => {
      if (a.is_tbd && !b.is_tbd) return 1;
      if (!a.is_tbd && b.is_tbd) return -1;
      return (a.calculated_due_date ?? "").localeCompare(b.calculated_due_date ?? "");
    };
    for (const k of Object.keys(out) as Bucket[]) out[k].sort(sorter);
    return out;
  }, [filtered, today, weekStart]);

  // This-week stats (always against full unfiltered items for accuracy of headline)
  const weekStats = useMemo(() => {
    const inWeek = items.filter((i) => {
      if (i.is_tbd || !i.calculated_due_date) return false;
      const d = parseISODate(i.calculated_due_date);
      return d >= weekStart && d <= weekEnd;
    });
    const sent = inWeek.filter((i) => i.is_sent).length;
    const overdue = items.filter((i) => !i.is_sent && i.calculated_due_date && i.calculated_due_date < todayISO && !i.is_tbd).length;
    const nextDue = items.find((i) => !i.is_sent && !i.is_tbd && i.calculated_due_date && i.calculated_due_date >= todayISO);
    return { totalThisWeek: inWeek.length, sentThisWeek: sent, overdue, nextDue };
  }, [items, weekStart, weekEnd, todayISO]);

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

  function toggleBucket(b: Bucket) {
    setExpandedBuckets((prev) => ({ ...prev, [b]: !prev[b] }));
  }
  function toggleItem(id: string) {
    setExpandedItems((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground py-12 text-center">Loading calendar…</div>;
  }

  const filtersActive = trackFilter !== "all" || stakeFilter !== "all" || showSent;
  const hasAnyItems = items.length > 0;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Communication Calendar</h2>
          <p className="text-sm text-muted-foreground mt-1">Your weekly send checklist — keep every stakeholder communicated to on time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setSeasonModalOpen(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Season
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCustomModalOpen(true)} disabled={seasons.length === 0}>
            <Plus className="h-4 w-4 mr-1" /> Custom Item
          </Button>
        </div>
      </div>

      {/* ── This Week stat strip ── */}
      {hasAnyItems && (
        <div className="rounded-lg border border-border bg-gradient-to-br from-card to-secondary/40 px-4 py-3.5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tabular-nums">{weekStats.sentThisWeek}<span className="text-muted-foreground text-base font-medium">/{weekStats.totalThisWeek}</span></span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">sent this week</span>
          </div>
          {weekStats.totalThisWeek > 0 && (
            <div className="flex-1 min-w-[120px] max-w-[260px] h-2 bg-border rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all", weekStats.sentThisWeek === weekStats.totalThisWeek ? "bg-health" : "bg-accent")}
                style={{ width: `${weekStats.totalThisWeek === 0 ? 0 : Math.round((weekStats.sentThisWeek / weekStats.totalThisWeek) * 100)}%` }}
              />
            </div>
          )}
          {weekStats.overdue > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft text-warning px-2.5 py-1 text-xs font-semibold border border-warning/30">
              <AlertCircle className="h-3 w-3" /> {weekStats.overdue} overdue
            </div>
          )}
          {weekStats.nextDue?.calculated_due_date && (
            <div className="text-xs text-muted-foreground">
              Next due <span className="font-semibold text-foreground">{shortDate(weekStats.nextDue.calculated_due_date)}</span> · {weekStats.nextDue.title}
            </div>
          )}
        </div>
      )}

      {/* ── Season pills + filter ── */}
      {seasons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto flex-1 min-w-0 pb-1">
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

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8", filtersActive && "border-accent text-accent")}>
                <Filter className="h-3.5 w-3.5 mr-1.5" /> Filter
                {filtersActive && <span className="ml-1.5 rounded-full bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 font-bold">on</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3 p-4">
              {hasYouth && hasHs && (
                <FilterGroup label="Track" options={[
                  { v: "all", l: "All" }, { v: "youth", l: "Youth" }, { v: "hs", l: "HS" },
                ]} value={trackFilter} onChange={(v) => setTrackFilter(v as TrackFilter)} />
              )}
              <FilterGroup label="Stakeholder" options={[
                { v: "all", l: "All" }, { v: "parents", l: "Parents" }, { v: "coaches", l: "Coaches" },
                { v: "admin", l: "Admin" }, { v: "players", l: "Players" },
              ]} value={stakeFilter} onChange={(v) => setStakeFilter(v as StakeFilter)} />
              <label className="flex items-center justify-between text-sm pt-2 border-t border-border cursor-pointer">
                <span>Show sent items</span>
                <input type="checkbox" checked={showSent} onChange={(e) => setShowSent(e.target.checked)} className="h-4 w-4 accent-accent" />
              </label>
              {filtersActive && (
                <button
                  onClick={() => { setTrackFilter("all"); setStakeFilter("all"); setShowSent(false); }}
                  className="text-xs text-accent hover:underline inline-flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear filters
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* ── Empty state ── */}
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
        <div className="space-y-3">
          {(["overdue", "this_week", "next_week", "later_month", "later", "tbd"] as Bucket[]).map((b) => {
            const list = buckets[b];
            if (list.length === 0) return null;
            const meta = BUCKET_META[b];
            const expanded = expandedBuckets[b];
            return (
              <BucketSection
                key={b}
                bucket={b}
                meta={meta}
                count={list.length}
                expanded={expanded}
                onToggle={() => toggleBucket(b)}
                weekStart={b === "this_week" ? weekStart : undefined}
              >
                {b === "this_week" ? (
                  <ThisWeekDays
                    items={list}
                    weekStart={weekStart}
                    todayISO={todayISO}
                    seasons={seasons}
                    expandedItems={expandedItems}
                    onToggleItem={toggleItem}
                    onToggleSent={toggleSent}
                    onDraft={(it) => onDraftItem(it, seasons.find((s) => s.id === it.season_id))}
                    onDelete={deleteCustom}
                  />
                ) : (
                  <ItemList
                    items={list}
                    todayISO={todayISO}
                    seasons={seasons}
                    expandedItems={expandedItems}
                    onToggleItem={toggleItem}
                    onToggleSent={toggleSent}
                    onDraft={(it) => onDraftItem(it, seasons.find((s) => s.id === it.season_id))}
                    onDelete={deleteCustom}
                  />
                )}
              </BucketSection>
            );
          })}

          {/* Nothing in any bucket */}
          {Object.values(buckets).every((l) => l.length === 0) && (
            <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
              <Check className="h-8 w-8 text-health mx-auto mb-2" />
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="text-xs text-muted-foreground mt-1">
                {showSent ? "No items match your filters." : "No outstanding items. Toggle 'Show sent' to see your history."}
              </p>
            </div>
          )}
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

// ─── Bucket section ───────────────────────────────────────────────────
function BucketSection({
  bucket, meta, count, expanded, onToggle, weekStart, children,
}: {
  bucket: Bucket;
  meta: { label: string; tone: string };
  count: number;
  expanded: boolean;
  onToggle: () => void;
  weekStart?: Date;
  children: React.ReactNode;
}) {
  const headerToneClass =
    meta.tone === "warning" ? "text-warning" :
    meta.tone === "accent" ? "text-accent" :
    meta.tone === "info" ? "text-info" : "text-foreground";
  const dotToneClass =
    meta.tone === "warning" ? "bg-warning" :
    meta.tone === "accent" ? "bg-accent" :
    meta.tone === "info" ? "bg-info" : "bg-muted-foreground";

  const dateRange = bucket === "this_week" && weekStart
    ? `${shortDate(ymd(weekStart))} – ${shortDate(ymd(addDays(weekStart, 6)))}`
    : null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn("h-2 w-2 rounded-full flex-shrink-0", dotToneClass)} />
          <span className={cn("font-display font-bold text-sm uppercase tracking-wider", headerToneClass)}>{meta.label}</span>
          {dateRange && <span className="text-xs text-muted-foreground font-medium">· {dateRange}</span>}
          <span className="rounded-full bg-secondary text-foreground text-[11px] font-semibold px-2 py-0.5">{count}</span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

// ─── Plain item list (used for all buckets except this_week) ──────────
function ItemList({
  items, todayISO, seasons, expandedItems, onToggleItem, onToggleSent, onDraft, onDelete,
}: {
  items: CalendarItem[];
  todayISO: string;
  seasons: Season[];
  expandedItems: Set<string>;
  onToggleItem: (id: string) => void;
  onToggleSent: (it: CalendarItem) => void;
  onDraft: (it: CalendarItem) => void;
  onDelete: (it: CalendarItem) => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map((it) => (
        <ItemRow
          key={it.id}
          item={it}
          todayISO={todayISO}
          season={seasons.find((s) => s.id === it.season_id)}
          expanded={expandedItems.has(it.id)}
          onToggleExpand={() => onToggleItem(it.id)}
          onToggleSent={() => onToggleSent(it)}
          onDraft={() => onDraft(it)}
          onDelete={() => onDelete(it)}
        />
      ))}
    </ul>
  );
}

// ─── This Week — grouped by day ───────────────────────────────────────
function ThisWeekDays({
  items, weekStart, todayISO, seasons, expandedItems, onToggleItem, onToggleSent, onDraft, onDelete,
}: {
  items: CalendarItem[];
  weekStart: Date;
  todayISO: string;
  seasons: Season[];
  expandedItems: Set<string>;
  onToggleItem: (id: string) => void;
  onToggleSent: (it: CalendarItem) => void;
  onDraft: (it: CalendarItem) => void;
  onDelete: (it: CalendarItem) => void;
}) {
  const days: { date: Date; iso: string; items: CalendarItem[] }[] = [];
  for (let n = 0; n < 7; n++) {
    const d = addDays(weekStart, n);
    const iso = ymd(d);
    days.push({ date: d, iso, items: items.filter((i) => i.calculated_due_date === iso) });
  }

  return (
    <div className="divide-y divide-border">
      {days.map((day) => {
        const isToday = day.iso === todayISO;
        return (
          <div key={day.iso}>
            <div className={cn(
              "px-4 py-2 flex items-center justify-between text-xs",
              isToday ? "bg-accent-soft/40" : "bg-secondary/30",
            )}>
              <span className={cn(
                "font-semibold uppercase tracking-wider",
                isToday ? "text-accent" : "text-muted-foreground",
              )}>
                {dayLabel(day.date)} {isToday && <span className="ml-1 rounded-full bg-accent text-accent-foreground px-1.5 py-0.5 text-[9px] normal-case tracking-normal">Today</span>}
              </span>
              {day.items.length > 0 && (
                <span className="text-muted-foreground tabular-nums">{day.items.length} item{day.items.length === 1 ? "" : "s"}</span>
              )}
            </div>
            {day.items.length === 0 ? (
              <p className="px-4 py-2.5 text-xs text-muted-foreground italic">— nothing scheduled —</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {day.items.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    todayISO={todayISO}
                    season={seasons.find((s) => s.id === it.season_id)}
                    expanded={expandedItems.has(it.id)}
                    onToggleExpand={() => onToggleItem(it.id)}
                    onToggleSent={() => onToggleSent(it)}
                    onDraft={() => onDraft(it)}
                    onDelete={() => onDelete(it)}
                    hideDate
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Single item row ──────────────────────────────────────────────────
function ItemRow({
  item, todayISO, season, expanded, onToggleExpand, onToggleSent, onDraft, onDelete, hideDate,
}: {
  item: CalendarItem;
  todayISO: string;
  season?: Season;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleSent: () => void;
  onDraft: () => void;
  onDelete: () => void;
  hideDate?: boolean;
}) {
  const isOverdue = !item.is_sent && item.calculated_due_date && item.calculated_due_date < todayISO && !item.is_tbd;
  const stakeIcon = STAKE_ICON[item.stakeholder] ?? "•";

  return (
    <li className={cn(
      "group relative",
      item.is_sent && "bg-secondary/20",
    )}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Sent toggle */}
        <button
          onClick={onToggleSent}
          aria-label={item.is_sent ? "Mark as not sent" : "Mark as sent"}
          className={cn(
            "flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
            item.is_sent
              ? "bg-health border-health text-white"
              : "border-muted-foreground/40 hover:border-accent hover:bg-accent-soft",
          )}
        >
          {item.is_sent && <Check className="h-3 w-3" strokeWidth={3} />}
        </button>

        {/* Body — click to expand */}
        <button onClick={onToggleExpand} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              "font-medium text-sm truncate",
              item.is_sent && "line-through text-muted-foreground",
            )}>
              {item.title}
            </span>
            {item.is_non_negotiable && (
              <Star className="h-3 w-3 text-warning flex-shrink-0" fill="currentColor" />
            )}
            {item.is_custom && (
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary px-1 py-0.5 rounded flex-shrink-0">Custom</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            <span>{stakeIcon} {item.stakeholder}</span>
            {item.track && (
              <>
                <span>·</span>
                <span className="uppercase">{item.track === "youth" ? "Youth" : item.track === "hs" ? "HS" : "Both"}</span>
              </>
            )}
            {!hideDate && item.calculated_due_date && !item.is_tbd && (
              <>
                <span>·</span>
                <span className={cn(isOverdue && "text-warning font-semibold")}>
                  {isOverdue ? "Was due " : "Due "}{shortDate(item.calculated_due_date)}
                </span>
              </>
            )}
            {item.is_tbd && (
              <>
                <span>·</span>
                <span className="text-warning inline-flex items-center gap-0.5"><AlertCircle className="h-2.5 w-2.5" />TBD</span>
              </>
            )}
            {item.is_sent && item.sent_at && (
              <>
                <span>·</span>
                <span className="text-health">Sent {new Date(item.sent_at).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.ai_communication_type && !item.is_sent && (
            <button
              onClick={onDraft}
              className="rounded-md px-2 py-1 text-[11px] font-semibold border border-accent/40 text-accent hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" /> Draft
            </button>
          )}
          <button
            onClick={onToggleExpand}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-3 pl-12 space-y-2 text-xs border-t border-border/60 pt-2 bg-secondary/20">
          {item.description && (
            <p className="text-muted-foreground leading-relaxed">{item.description}</p>
          )}
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Timing:</span> {timingDisplay(item)}
          </p>
          {item.timing_note && (
            <p className="italic text-warning">{item.timing_note}</p>
          )}
          {season && (
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">Season:</span> {season.season_name} ({season.track === "youth" ? "Youth" : "HS"})
            </p>
          )}
          {item.system_code && (
            <p className="text-[10px] text-muted-foreground font-mono">{item.system_code}</p>
          )}
          {item.is_custom && (
            <button
              onClick={onDelete}
              className="text-warning hover:underline inline-flex items-center gap-1 text-xs"
            >
              <Trash2 className="h-3 w-3" /> Delete custom item
            </button>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Small components ─────────────────────────────────────────────────
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

function FilterGroup({ label, options, value, onChange }: {
  label: string; options: { v: string; l: string }[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1">
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
