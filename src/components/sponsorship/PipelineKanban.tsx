import { useMemo, useState } from "react";
import { STAGES, STAGE_LABELS, STAGE_PILL, SOURCE_LABELS, type SponsorshipLead, daysBetween, staleClass } from "@/lib/sponsorship";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Flame, MessageSquare, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Enriched = SponsorshipLead & {
  org_name?: string | null;
  assigned_name?: string | null;
  notes_count?: number;
  has_client_visible_notes?: boolean;
};

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

  const grouped = useMemo(() => {
    const map: Record<string, Enriched[]> = {};
    STAGES.forEach((s) => (map[s] = []));
    for (const l of leads) (map[l.stage] ?? []).push(l);
    // warm-first within column, then most recent activity
    for (const s of STAGES) {
      map[s].sort((a, b) => {
        if (a.is_warm !== b.is_warm) return a.is_warm ? -1 : 1;
        return new Date(b.last_stage_change_at).getTime() - new Date(a.last_stage_change_at).getTime();
      });
    }
    return map;
  }, [leads]);

  const moveTo = async (leadId: string, to: string) => {
    if (!user) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === to) return;
    const wasNotClosed = lead.stage !== "closed_won";
    const { error } = await supabase.from("sponsorship_leads").update({ stage: to } as any).eq("id", leadId);
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

  return (
    <div className="overflow-x-auto -mx-4 md:-mx-8 px-4 md:px-8 pb-4">
      <div className="flex gap-3 min-w-max">
        {STAGES.map((stage) => {
          const list = grouped[stage] ?? [];
          const totalProposed = list.reduce((a, l) => a + (Number(l.proposed_value) || 0), 0);
          const isWonCol = stage === "closed_won";
          return (
            <div
              key={stage}
              className={cn(
                "w-[280px] flex-shrink-0 rounded-lg border bg-card transition-colors",
                overStage === stage ? "border-accent ring-2 ring-accent/30" : "border-border",
              )}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setOverStage(null);
                if (draggingId) { moveTo(draggingId, stage); setDraggingId(null); }
              }}
            >
              <div className="px-3 py-2.5 border-b border-border sticky top-0 bg-card rounded-t-lg">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", STAGE_PILL[stage])}>{STAGE_LABELS[stage]}</span>
                  <span className="text-xs text-muted-foreground font-semibold">{list.length}</span>
                </div>
                {totalProposed > 0 && <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(totalProposed)} proposed</p>}
              </div>

              <div className="p-2 space-y-2 min-h-[120px]">
                {list.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">Empty</p>
                )}
                {list.map((l) => {
                  const days = daysBetween(l.last_stage_change_at);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      draggable
                      onDragStart={() => setDraggingId(l.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => onOpenLead(l.id)}
                      className={cn(
                        "w-full text-left rounded-md border bg-background p-2.5 hover:border-foreground/30 transition-all",
                        l.is_warm && "border-l-4 border-l-warning",
                        isWonCol && "bg-health-soft border-health/30",
                        draggingId === l.id && "opacity-50",
                      )}
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
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
