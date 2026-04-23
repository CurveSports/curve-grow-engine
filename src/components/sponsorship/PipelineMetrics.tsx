import { useMemo } from "react";
import { STAGES, STAGE_LABELS, type SponsorshipLead, SOURCE_LABELS, type Source } from "@/lib/sponsorship";
import { formatCurrency } from "@/lib/format";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Enriched = SponsorshipLead & {
  org_name?: string | null;
  assigned_name?: string | null;
};

export default function PipelineMetrics({
  leads, orgs,
}: {
  leads: Enriched[];
  orgs: { id: string; name: string }[];
}) {
  const stats = useMemo(() => {
    const active = leads.filter((l) => l.is_active);
    const totalProposed = active.reduce((a, l) => a + (Number(l.proposed_value) || 0), 0);
    const closedWon = leads.filter((l) => l.stage === "closed_won");
    const totalClosed = closedWon.reduce((a, l) => a + (Number(l.closed_value) || 0), 0);
    const stageCounts: Record<string, number> = {};
    STAGES.forEach((s) => (stageCounts[s] = leads.filter((l) => l.stage === s).length));
    return {
      activeCount: active.length,
      totalProposed,
      totalClosed,
      curveShare: totalClosed * 0.25,
      stageCounts,
    };
  }, [leads]);

  const reps = useMemo(() => {
    const m = new Map<string, { name: string; total: number; closed: number; value: number }>();
    leads.forEach((l) => {
      if (!l.assigned_to) return;
      const cur = m.get(l.assigned_to) ?? { name: l.assigned_name ?? l.assigned_to.slice(0, 8), total: 0, closed: 0, value: 0 };
      cur.total += 1;
      if (l.stage === "closed_won") {
        cur.closed += 1;
        cur.value += Number(l.closed_value) || 0;
      }
      m.set(l.assigned_to, cur);
    });
    return Array.from(m.entries()).map(([id, v]) => ({ id, ...v }));
  }, [leads]);

  const orgRows = useMemo(() => {
    return orgs.map((o) => {
      const list = leads.filter((l) => l.org_id === o.id);
      const closed = list.filter((l) => l.stage === "closed_won");
      const closedValue = closed.reduce((a, l) => a + (Number(l.closed_value) || 0), 0);
      return {
        id: o.id,
        name: o.name,
        leads: list.length,
        warm: list.filter((l) => l.is_warm).length,
        contacted: list.filter((l) => l.stage !== "new_lead").length,
        closed: closed.length,
        closedValue,
        share: closedValue * 0.25,
        lastActivity: list.reduce((max: string | null, l) => {
          const t = l.last_stage_change_at;
          return !max || t > max ? t : max;
        }, null),
      };
    }).filter((r) => r.leads > 0).sort((a, b) => b.closedValue - a.closedValue);
  }, [orgs, leads]);

  const sourceRows = useMemo(() => {
    const m = new Map<Source, { count: number; closed: number; value: number }>();
    leads.forEach((l) => {
      const cur = m.get(l.source) ?? { count: 0, closed: 0, value: 0 };
      cur.count += 1;
      if (l.stage === "closed_won") {
        cur.closed += 1;
        cur.value += Number(l.closed_value) || 0;
      }
      m.set(l.source, cur);
    });
    return Array.from(m.entries()).map(([s, v]) => ({
      source: s,
      count: v.count,
      closed: v.closed,
      closeRate: v.count > 0 ? Math.round((v.closed / v.count) * 100) : 0,
      avgDeal: v.closed > 0 ? v.value / v.closed : 0,
    }));
  }, [leads]);

  return (
    <div className="space-y-8">
      {/* Row 1 — Portfolio summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active Leads" value={stats.activeCount} />
        <Stat label="Pipeline Value" value={formatCurrency(stats.totalProposed)} />
        <Stat label="Total Closed Value" value={formatCurrency(stats.totalClosed)} valueClass="text-health" />
        <Stat label="Curve Share Earned" value={formatCurrency(stats.curveShare)} valueClass="text-health" />
      </div>

      {/* Row 2 — Funnel */}
      <section>
        <p className="curve-eyebrow mb-3">Pipeline funnel</p>
        <div className="curve-card p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {STAGES.map((s, i) => {
              const cur = stats.stageCounts[s] ?? 0;
              const prev = i === 0 ? cur : stats.stageCounts[STAGES[i - 1]] ?? 0;
              const rate = i === 0 || prev === 0 ? null : Math.round((cur / prev) * 100);
              return (
                <div key={s} className="rounded-md border border-border p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{STAGE_LABELS[s]}</p>
                  <p className="font-display text-2xl font-semibold mt-1">{cur}</p>
                  {rate !== null && <p className="text-[10px] text-muted-foreground mt-1">{rate}% from prior</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Row 3 — Per rep */}
      <section>
        <p className="curve-eyebrow mb-3">Rep performance</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reps.length === 0 && <p className="text-sm text-muted-foreground">No assigned reps yet.</p>}
          {reps.map((r) => (
            <div key={r.id} className="curve-card">
              <p className="font-semibold mb-2">{r.name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Mini label="Assigned" value={r.total} />
                <Mini label="Closed" value={r.closed} />
                <Mini label="Close rate" value={r.total > 0 ? `${Math.round((r.closed / r.total) * 100)}%` : "—"} />
                <Mini label="Closed value" value={formatCurrency(r.value)} />
                <Mini label="Curve share" value={formatCurrency(r.value * 0.25)} accent />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Row 4 — Per org */}
      <section>
        <p className="curve-eyebrow mb-3">Per-organization breakdown</p>
        <div className="curve-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Org</th>
                <th className="px-4 py-3 font-medium text-right">Leads</th>
                <th className="px-4 py-3 font-medium text-right">Warm</th>
                <th className="px-4 py-3 font-medium text-right">Contacted</th>
                <th className="px-4 py-3 font-medium text-right">Closed</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium text-right">Curve Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgRows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <Link to={`/admin/org/${r.id}?tab=sponsorship`} className="font-medium hover:underline">{r.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-right">{r.leads}</td>
                  <td className="px-4 py-3 text-right text-warning">{r.warm}</td>
                  <td className="px-4 py-3 text-right">{r.contacted}</td>
                  <td className="px-4 py-3 text-right text-health">{r.closed}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(r.closedValue)}</td>
                  <td className="px-4 py-3 text-right text-health font-semibold">{formatCurrency(r.share)}</td>
                </tr>
              ))}
              {orgRows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No orgs with leads yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Row 5 — Source performance */}
      <section>
        <p className="curve-eyebrow mb-3">Source performance</p>
        <div className="curve-card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium text-right">Leads</th>
                <th className="px-4 py-3 font-medium text-right">Closed</th>
                <th className="px-4 py-3 font-medium text-right">Close Rate</th>
                <th className="px-4 py-3 font-medium text-right">Avg Deal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sourceRows.map((r) => (
                <tr key={r.source}>
                  <td className="px-4 py-3">{SOURCE_LABELS[r.source]}</td>
                  <td className="px-4 py-3 text-right">{r.count}</td>
                  <td className="px-4 py-3 text-right">{r.closed}</td>
                  <td className="px-4 py-3 text-right">{r.closeRate}%</td>
                  <td className="px-4 py-3 text-right">{r.avgDeal > 0 ? formatCurrency(r.avgDeal) : "—"}</td>
                </tr>
              ))}
              {sourceRows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">—</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: any; valueClass?: string }) {
  return (
    <div className="curve-card">
      <p className="curve-eyebrow mb-2">{label}</p>
      <p className={cn("font-display text-2xl font-semibold tracking-tight", valueClass)}>{value}</p>
    </div>
  );
}
function Mini({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("font-semibold mt-0.5", accent && "text-health")}>{value}</p>
    </div>
  );
}
