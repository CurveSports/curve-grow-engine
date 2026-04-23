import { useEffect, useMemo, useRef, useState } from "react";
import { STAGES, STAGE_LABELS, STAGE_PILL, SOURCE_LABELS, type SponsorshipLead, daysBetween, staleClass } from "@/lib/sponsorship";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Flame, MessageSquare, Eye, MoreVertical, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Enriched = SponsorshipLead & {
  org_name?: string | null;
  assigned_name?: string | null;
  notes_count?: number;
  has_client_visible_notes?: boolean;
};

const COLLAPSED_KEY = "pipeline_kanban_collapsed_v1";

export default function PipelineKanban({
  leads,
  showOrgName = true,
  onOpenLead,
  onChanged,
}: {
  leads: Enriched[];
  showOrgName?: boolean;
  onOpenLead: (id: string) => void;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRaf = useRef<number | null>(null);

  // Collapsed columns persistence
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(COLLAPSED_KEY) : null;
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const toggleCollapsed = (s: string) => {
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (next.has(s)) next.delete(s); else next.add(s);
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  const grouped = useMemo(() => {
    const map: Record<string, Enriched[]> = {};
    STAGES.forEach((s) => (map[s] = []));
    for (const l of leads) (map[l.stage] ?? []).push(l);
    for (const s of STAGES) {
      map[s].sort((a, b) => {
        if (a.is_warm !== b.is_warm) return a.is_warm ? -1 : 1;
        return new Date(b.last_stage_change_at).getTime() - new Date(a.last_stage_change_at).getTime();
      });
    }
    return map;
  }, [leads]);

  // Closed-won prompt state
  const [wonPrompt, setWonPrompt] = useState<{ leadId: string; businessName: string; defaultValue: number | null } | null>(null);
  const [wonAmount, setWonAmount] = useState<string>("");
  const [savingWon, setSavingWon] = useState(false);

  const performMove = async (leadId: string, to: string, closedValue?: number | null) => {
    if (!user) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === to) return;
    const wasNotClosed = lead.stage !== "closed_won";
    const updates: Record<string, any> = { stage: to };
    if (to === "closed_won" && closedValue != null) updates.closed_value = closedValue;
    const { error } = await supabase.from("sponsorship_leads").update(updates as any).eq("id", leadId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("sponsorship_lead_stage_history").insert({
      lead_id: leadId, org_id: lead.org_id,
      from_stage: lead.stage, to_stage: to, changed_by: user.id,
    });
    if (to === "closed_won" && wasNotClosed) {
      const { fireConfetti } = await import("@/lib/sponsorship");
      fireConfetti();
      supabase.functions.invoke("sponsorship-deal-closed", { body: { lead_id: leadId } }).catch(() => {});
    }
    toast.success(`Moved to ${STAGE_LABELS[to as keyof typeof STAGE_LABELS]}`);
    onChanged?.();
  };

  const moveTo = async (leadId: string, to: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === to) return;
    if (to === "closed_won" && lead.stage !== "closed_won") {
      const def = lead.closed_value ?? lead.proposed_value ?? null;
      setWonAmount(def != null ? String(def) : "");
      setWonPrompt({ leadId, businessName: lead.business_name, defaultValue: def });
      return;
    }
    await performMove(leadId, to);
  };

  const confirmWon = async () => {
    if (!wonPrompt) return;
    const parsed = wonAmount.trim() === "" ? null : Number(wonAmount);
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    setSavingWon(true);
    await performMove(wonPrompt.leadId, "closed_won", parsed);
    setSavingWon(false);
    setWonPrompt(null);
    setWonAmount("");
  };


  // Auto-scroll the kanban container while dragging near edges
  const handleContainerDragOver = (e: React.DragEvent) => {
    if (!draggingId) return;
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX;
    const edge = 80; // px from edge to trigger scroll
    let dx = 0;
    if (x < rect.left + edge) {
      dx = -Math.max(6, (rect.left + edge - x) / 4);
    } else if (x > rect.right - edge) {
      dx = Math.max(6, (x - (rect.right - edge)) / 4);
    }
    if (dx !== 0) {
      if (autoScrollRaf.current == null) {
        const step = () => {
          el.scrollLeft += dx;
          autoScrollRaf.current = requestAnimationFrame(step);
        };
        autoScrollRaf.current = requestAnimationFrame(step);
      }
    } else if (autoScrollRaf.current != null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  };

  const stopAutoScroll = () => {
    if (autoScrollRaf.current != null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  };

  useEffect(() => () => stopAutoScroll(), []);

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto -mx-4 md:-mx-8 px-4 md:px-8 pb-4"
      onDragOver={handleContainerDragOver}
      onDragEnd={stopAutoScroll}
      onDrop={stopAutoScroll}
    >
      <div className="flex gap-2 min-w-max">
        {STAGES.map((stage) => {
          const list = grouped[stage] ?? [];
          const totalProposed = list.reduce((a, l) => a + (Number(l.proposed_value) || 0), 0);
          const isWonCol = stage === "closed_won";
          const isCollapsed = collapsed.has(stage);
          return (
            <div
              key={stage}
              className={cn(
                "flex-shrink-0 rounded-lg border bg-card transition-all",
                isCollapsed ? "w-[52px]" : "w-[220px]",
                overStage === stage ? "border-accent ring-2 ring-accent/30" : "border-border",
              )}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setOverStage(null);
                stopAutoScroll();
                if (draggingId) { moveTo(draggingId, stage); setDraggingId(null); }
              }}
            >
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleCollapsed(stage)}
                  className="w-full h-full min-h-[120px] flex flex-col items-center gap-2 py-3 text-muted-foreground hover:text-foreground transition-colors"
                  title={`Expand ${STAGE_LABELS[stage]}`}
                >
                  <span className="text-xs font-semibold">{list.length}</span>
                  <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold tracking-wide">
                    {STAGE_LABELS[stage]}
                  </span>
                </button>
              ) : (
                <>
                  <div className="px-2.5 py-2 border-b border-border sticky top-0 bg-card rounded-t-lg">
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(stage)}
                        className="min-w-0 flex-1 text-left"
                        title="Collapse column"
                      >
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border max-w-full truncate", STAGE_PILL[stage])}>
                          {STAGE_LABELS[stage]}
                        </span>
                      </button>
                      <span className="text-xs text-muted-foreground font-semibold shrink-0">{list.length}</span>
                    </div>
                    {totalProposed > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(totalProposed)} proposed</p>
                    )}
                  </div>

                  <div className="p-1.5 space-y-1.5 min-h-[120px]">
                    {list.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic text-center py-4">Empty</p>
                    )}
                    {list.map((l) => {
                      const days = daysBetween(l.last_stage_change_at);
                      return (
                        <div
                          key={l.id}
                          draggable
                          onDragStart={() => setDraggingId(l.id)}
                          onDragEnd={() => { setDraggingId(null); stopAutoScroll(); }}
                          className={cn(
                            "group relative rounded-md border bg-background hover:border-foreground/30 transition-all",
                            l.is_warm && "border-l-4 border-l-warning",
                            isWonCol && "bg-health-soft border-health/30",
                            draggingId === l.id && "opacity-50",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onOpenLead(l.id)}
                            className="w-full text-left p-2 pr-7"
                          >
                            <div className="flex items-start justify-between gap-1.5 mb-1">
                              <p className="text-sm font-semibold truncate">{l.business_name}</p>
                              {l.is_warm && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-warning-soft text-warning border border-warning/30 flex-shrink-0">
                                  <Flame className="h-2.5 w-2.5" /> Warm
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {SOURCE_LABELS[l.source]}{l.source === "other" && l.source_other ? `: ${l.source_other}` : ""}
                            </p>
                            {showOrgName && l.org_name && <p className="text-[11px] mt-1 truncate">{l.org_name}</p>}
                            <div className="flex items-center justify-between flex-wrap gap-1 mt-2 text-[10px]">
                              {l.assigned_name && <span className="text-muted-foreground truncate">{l.assigned_name}</span>}
                              {l.sponsorship_tier && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-info-soft text-info border border-info/30 font-semibold">{l.sponsorship_tier}</span>
                              )}
                            </div>
                            {(isWonCol ? l.closed_value : l.proposed_value) ? (
                              <p className={cn("text-sm font-semibold mt-1", isWonCol && "text-health")}>
                                {formatCurrency(Number(isWonCol ? l.closed_value : l.proposed_value))}
                              </p>
                            ) : null}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-[10px]">
                              <span className={staleClass(days)}>{days}d in stage</span>
                              <span className="flex items-center gap-2 text-muted-foreground">
                                {(l.notes_count ?? 0) > 0 && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{l.notes_count}</span>}
                                {l.has_client_visible_notes && <Eye className="h-2.5 w-2.5 text-health" />}
                              </span>
                            </div>
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                              title="Move to…"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Move to stage
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {STAGES.map((s) => {
                                const isCurrent = s === l.stage;
                                return (
                                  <DropdownMenuItem
                                    key={s}
                                    disabled={isCurrent}
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      if (!isCurrent) moveTo(l.id, s);
                                    }}
                                    className="text-xs flex items-center justify-between gap-2"
                                  >
                                    <span className="flex items-center gap-2">
                                      {isCurrent ? <Check className="h-3 w-3" /> : <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                                      {STAGE_LABELS[s]}
                                    </span>
                                    {isCurrent && <span className="text-[10px] text-muted-foreground">current</span>}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!wonPrompt} onOpenChange={(o) => { if (!o && !savingWon) { setWonPrompt(null); setWonAmount(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-health" /> Deal closed!
            </DialogTitle>
            <DialogDescription>
              Enter the final closed amount for <span className="font-semibold text-foreground">{wonPrompt?.businessName}</span>. This is what gets reported as won revenue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="closed-amount" className="text-xs">Closed amount ($)</Label>
            <Input
              id="closed-amount"
              type="number"
              min="0"
              step="100"
              autoFocus
              value={wonAmount}
              onChange={(e) => setWonAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmWon(); }}
              placeholder="0"
            />
            {wonPrompt?.defaultValue != null && (
              <p className="text-[11px] text-muted-foreground">Pre-filled from proposed value. Adjust if the final amount differs.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setWonPrompt(null); setWonAmount(""); }} disabled={savingWon}>
              Cancel
            </Button>
            <Button onClick={confirmWon} disabled={savingWon} className="bg-health text-health-foreground hover:bg-health/90">
              {savingWon ? "Saving…" : "Mark as Won"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
