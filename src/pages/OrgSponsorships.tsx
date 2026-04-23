import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Diamond, Flame, ChevronDown, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { IN_PROGRESS_STAGES, isOrgSubmitted, type OrgLeadView } from "@/lib/orgSponsorship";
import { daysBetween } from "@/lib/sponsorship";
import LeadSubmissionModal from "@/components/sponsorship/LeadSubmissionModal";

export default function OrgSponsorships() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<OrgLeadView[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [orgCity, setOrgCity] = useState<string | null>(null);

  const load = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    const [{ data, error }, { data: org }] = await Promise.all([
      supabase.rpc("get_org_sponsorship_view", { p_org_id: profile.org_id }),
      supabase.from("organizations").select("city_state").eq("id", profile.org_id).maybeSingle(),
    ]);
    if (error) console.error(error);
    setLeads((data ?? []) as OrgLeadView[]);
    setOrgCity(org?.city_state ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.org_id]);

  const buckets = useMemo(() => {
    const inProgress = leads.filter(l => IN_PROGRESS_STAGES.includes(l.stage as any));
    const won = leads.filter(l => l.stage === "closed_won");
    const lost = leads.filter(l => l.stage === "closed_lost");
    return { inProgress, won, lost };
  }, [leads]);

  const stats = useMemo(() => {
    const submittedByOrg = leads.filter(l => isOrgSubmitted(l.source)).length;
    const submittedByDsf = leads.length - submittedByOrg;
    const stale = buckets.inProgress.some(l => daysBetween(l.last_stage_change_at) > 14);
    const totalClosed = buckets.won.reduce((a, l) => a + Number(l.closed_value || 0), 0);
    return {
      total: leads.length,
      submittedByOrg,
      submittedByDsf,
      active: buckets.inProgress.length,
      stale,
      closedCount: buckets.won.length,
      totalClosed,
      curveShare: totalClosed * 0.25,
    };
  }, [leads, buckets]);

  return (
    <AppShell title="Sponsorship Pipeline">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">Sponsorships</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Sponsorship Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Track the status of your sponsorship leads and partnerships.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-health text-health-foreground hover:bg-health/90">
          <Plus className="h-4 w-4 mr-1.5" /> Add Leads
        </Button>
      </div>

      {/* DSF banner */}
      <div className="mb-6 rounded-lg border-l-4 border-health bg-health-soft/40 p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-health/15 flex items-center justify-center flex-shrink-0">
          <Diamond className="h-4 w-4 text-health" />
        </div>
        <p className="text-sm leading-relaxed">
          Your Curve team is actively working your sponsorship leads through the <strong>Diamond Sports Foundation</strong> — a registered 501(c)3 nonprofit. Sponsorships secured through DSF are <strong>tax-deductible charitable contributions</strong> for your sponsors, making every partnership more valuable.
        </p>
      </div>

      {/* Stats */}
      {!loading && leads.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Leads" value={stats.total} subtitle={`${stats.submittedByOrg} submitted · ${stats.submittedByDsf} added by DSF`} />
          <StatCard label="Being Worked" value={stats.active} subtitle="across all stages" valueClass={stats.stale ? "text-warning" : ""} />
          <StatCard label="Deals Closed" value={stats.closedCount} valueClass="text-health" />
          <StatCard
            label="Sponsorship Revenue"
            value={formatCurrency(stats.totalClosed)}
            valueClass="text-health"
            subtitle={`Curve share: ${formatCurrency(stats.curveShare)} → DSF`}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : leads.length === 0 ? (
        <EmptyState onAdd={() => setAddOpen(true)} />
      ) : (
        <>
          {/* Pipeline 3-column / mobile accordion */}
          <div className="md:grid md:grid-cols-3 md:gap-4 space-y-3 md:space-y-0 mb-8">
            <PipelineColumn title="In Progress" count={buckets.inProgress.length} leads={buckets.inProgress} accent="default" />
            <PipelineColumn
              title="Closed"
              count={buckets.won.length}
              leads={buckets.won}
              accent="health"
              extraHeader={`· ${formatCurrency(buckets.won.reduce((a, l) => a + Number(l.closed_value || 0), 0))}`}
              wonLabel
            />
            <PipelineColumn title="Not Pursued" count={buckets.lost.length} leads={buckets.lost} accent="muted" />
          </div>

          {/* Closed deals section */}
          <div className="curve-card">
            <div className="mb-4">
              <p className="curve-eyebrow">Closed Partnerships</p>
              <h2 className="font-display text-lg font-semibold mt-1">Revenue secured through the Diamond Sports Foundation</h2>
            </div>
            {buckets.won.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No partnerships closed yet. Your Curve team is actively working your leads.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-semibold px-4 py-2">Business</th>
                      <th className="text-left font-semibold px-4 py-2">Tier</th>
                      <th className="text-right font-semibold px-4 py-2">Value</th>
                      <th className="text-left font-semibold px-4 py-2">Closed</th>
                      <th className="text-left font-semibold px-4 py-2 hidden sm:table-cell">DSF Rep</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.won.map((l) => (
                      <tr key={l.id} className="border-b border-border/60">
                        <td className="px-4 py-3 font-medium">{l.business_name}</td>
                        <td className="px-4 py-3">
                          {l.sponsorship_tier ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-accent border border-accent/30">
                              {l.sponsorship_tier}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-health tabular-nums">{formatCurrency(Number(l.closed_value || 0))}</td>
                        <td className="px-4 py-3 text-muted-foreground">{l.closed_at ? formatDate(l.closed_at) : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{l.assigned_rep_name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-display font-semibold">Total</td>
                      <td className="px-4 py-3 text-right font-display text-lg font-semibold text-health tabular-nums">
                        {formatCurrency(buckets.won.reduce((a, l) => a + Number(l.closed_value || 0), 0))}
                      </td>
                      <td colSpan={2} className="px-4 py-3 text-xs text-muted-foreground">across {buckets.won.length} partnership{buckets.won.length === 1 ? "" : "s"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {profile?.org_id && (
        <LeadSubmissionModal
          open={addOpen}
          onOpenChange={setAddOpen}
          orgId={profile.org_id}
          defaultCityState={orgCity}
          variant="org"
          onSubmitted={() => load()}
        />
      )}
    </AppShell>
  );
}

function StatCard({ label, value, subtitle, valueClass = "" }: { label: string; value: any; subtitle?: string; valueClass?: string }) {
  return (
    <div className="curve-card">
      <p className="curve-eyebrow mb-1.5">{label}</p>
      <p className={cn("font-display text-2xl font-semibold tabular-nums", valueClass)}>{value}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function PipelineColumn({
  title, count, leads, accent, extraHeader, wonLabel,
}: {
  title: string;
  count: number;
  leads: OrgLeadView[];
  accent: "default" | "health" | "muted";
  extraHeader?: string;
  wonLabel?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const headerClass = accent === "health" ? "text-health" : accent === "muted" ? "text-muted-foreground" : "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn("w-full flex items-center justify-between gap-2 px-4 py-3 bg-secondary/50 md:cursor-default", "md:pointer-events-none")}
      >
        <p className={cn("text-sm font-display font-semibold", headerClass)}>
          {title} · {count} {wonLabel ? `deal${count === 1 ? "" : "s"}` : `lead${count === 1 ? "" : "s"}`}{extraHeader && <span className="ml-1">{extraHeader}</span>}
        </p>
        <ChevronDown className={cn("h-4 w-4 md:hidden transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("p-3 space-y-2 md:block", open ? "block" : "hidden")}>
        {leads.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1 py-2">None</p>
        ) : (
          leads.map(l => <LeadCard key={l.id} lead={l} />)
        )}
      </div>
    </div>
  );
}

function LeadCard({ lead }: { lead: OrgLeadView }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const orgSubmitted = isOrgSubmitted(lead.source);
  const days = daysBetween(lead.last_stage_change_at);
  const notes = lead.client_notes ?? [];

  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm flex-1 min-w-0">{lead.business_name}</p>
        <span className={cn(
          "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold border whitespace-nowrap",
          orgSubmitted
            ? "bg-health-soft text-health border-health/30"
            : "bg-info-soft text-info border-info/30",
        )}>
          {orgSubmitted ? "Submitted by you" : "Added by DSF"}
        </span>
      </div>
      {lead.is_warm && (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold bg-warning-soft text-warning border border-warning/30">
          <Flame className="h-3 w-3" /> Warm
        </span>
      )}
      <div className="text-xs text-muted-foreground space-y-0.5">
        {lead.business_type && <p>{lead.business_type}</p>}
        {lead.city_state && <p>{lead.city_state}</p>}
      </div>
      {lead.sponsorship_tier && (
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-accent-soft text-accent border border-accent/30">
          {lead.sponsorship_tier}
        </span>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <p className="text-xs font-medium">
          {lead.stage === "closed_won" && lead.closed_value
            ? <span className="text-health">{formatCurrency(Number(lead.closed_value))} — Partnership secured</span>
            : lead.stage_simplified}
        </p>
        <p className="text-[10px] text-muted-foreground">{days}d</p>
      </div>
      {notes.length > 0 && (
        <button
          onClick={() => setNotesOpen(o => !o)}
          className="w-full flex items-center gap-1.5 text-[11px] font-medium text-accent hover:text-accent/80 pt-1"
        >
          <MessageSquare className="h-3 w-3" />
          {notes.length} update{notes.length === 1 ? "" : "s"} from your Curve team
          <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", notesOpen && "rotate-180")} />
        </button>
      )}
      {notesOpen && notes.length > 0 && (
        <div className="space-y-2 pt-1">
          {notes.map((n, i) => (
            <div key={i} className="rounded bg-secondary/40 p-2 text-xs">
              <p className="text-[10px] text-muted-foreground mb-0.5">
                {n.author_name ?? "Curve team"} · {formatDate(n.created_at)}
              </p>
              <p className="leading-relaxed">{n.note_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="curve-card text-center py-12">
      <div className="h-14 w-14 rounded-full bg-accent-soft text-accent mx-auto flex items-center justify-center mb-4">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="font-display text-xl font-semibold mb-2">Your sponsorship pipeline is empty</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        Submit local businesses for the DSF team to reach out to on your behalf. Every lead brings you closer to new revenue.
      </p>
      <Button onClick={onAdd} className="bg-health text-health-foreground hover:bg-health/90">
        <Plus className="h-4 w-4 mr-1.5" /> Add Your First Leads
      </Button>
    </div>
  );
}
