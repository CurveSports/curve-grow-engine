import { STAGE_LABELS, STAGE_PILL, SOURCE_LABELS, type SponsorshipLead, daysBetween, staleClass } from "@/lib/sponsorship";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

type Enriched = SponsorshipLead & {
  org_name?: string | null;
  assigned_name?: string | null;
};

export default function PipelineList({
  leads, showOrg = true, onOpenLead,
}: {
  leads: Enriched[];
  showOrg?: boolean;
  onOpenLead: (id: string) => void;
}) {
  return (
    <div className="curve-card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Business</th>
              {showOrg && <th className="px-4 py-3 font-medium">Org</th>}
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Warm</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium text-right">Proposed</th>
              <th className="px-4 py-3 font-medium">Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((l) => {
              const days = daysBetween(l.last_stage_change_at);
              return (
                <tr
                  key={l.id}
                  onClick={() => onOpenLead(l.id)}
                  className="hover:bg-secondary/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {l.is_warm && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                      {l.business_name}
                    </div>
                  </td>
                  {showOrg && <td className="px-4 py-3 text-muted-foreground">{l.org_name ?? "—"}</td>}
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {SOURCE_LABELS[l.source]}{l.source === "other" && l.source_other ? `: ${l.source_other}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {l.is_warm ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-warning-soft text-warning border border-warning/30">
                        <Flame className="h-2.5 w-2.5" /> Warm
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", STAGE_PILL[l.stage])}>
                      {STAGE_LABELS[l.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{l.sponsorship_tier ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.assigned_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {l.proposed_value ? formatCurrency(Number(l.proposed_value)) : <span className="text-muted-foreground font-normal">—</span>}
                  </td>
                  <td className={cn("px-4 py-3 text-xs", staleClass(days))}>{days}d</td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr><td colSpan={showOrg ? 9 : 8} className="px-4 py-12 text-center text-sm text-muted-foreground">No leads match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
