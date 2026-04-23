import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PipelineKanban from "@/components/sponsorship/PipelineKanban";
import AddLeadModal from "@/components/sponsorship/AddLeadModal";
import LeadDetailPanel from "@/components/sponsorship/LeadDetailPanel";
import { formatCurrency } from "@/lib/format";
import type { SponsorshipLead } from "@/lib/sponsorship";

export default function OrgSponsorshipTab({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: leadRows }, { data: sum }, { data: base }, { data: noteRows }, { data: profileRows }, { data: roleRows }] = await Promise.all([
      supabase.from("sponsorship_leads").select("*").eq("org_id", orgId).order("last_stage_change_at", { ascending: false }),
      supabase.from("org_sponsorship_summary").select("*").eq("org_id", orgId).maybeSingle(),
      supabase.from("org_engagement_baselines").select("baseline_revenue").eq("org_id", orgId).maybeSingle(),
      supabase.from("sponsorship_lead_notes").select("lead_id, is_client_visible").eq("org_id", orgId),
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
    ]);

    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.user_id, p.full_name || p.email || p.user_id.slice(0, 8)]));
    const noteAgg = new Map<string, { count: number; visible: boolean }>();
    for (const n of (noteRows ?? []) as any[]) {
      const cur = noteAgg.get(n.lead_id) ?? { count: 0, visible: false };
      cur.count += 1;
      if (n.is_client_visible) cur.visible = true;
      noteAgg.set(n.lead_id, cur);
    }

    const enriched = ((leadRows ?? []) as SponsorshipLead[]).map((l) => ({
      ...l,
      assigned_name: l.assigned_to ? profileMap.get(l.assigned_to) ?? null : null,
      notes_count: noteAgg.get(l.id)?.count ?? 0,
      has_client_visible_notes: noteAgg.get(l.id)?.visible ?? false,
    }));

    setLeads(enriched);
    setSummary(sum);
    setBaseline((base?.baseline_revenue as number) ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [orgId]);

  const totalLeads = summary?.total_leads ?? leads.length;
  const warmLeads = summary?.warm_leads ?? leads.filter((l) => l.is_warm).length;
  const closedWon = summary?.deals_closed_won ?? leads.filter((l) => l.stage === "closed_won").length;
  const totalClosedValue = Number(summary?.total_closed_value ?? leads.filter((l) => l.stage === "closed_won").reduce((a, l) => a + (Number(l.closed_value) || 0), 0));
  const curveShare = totalClosedValue * 0.25;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Sponsorship Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-1">Curve-managed deal flow for {orgName}.</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="bg-health text-health-foreground hover:bg-health/90">
          <Plus className="h-4 w-4 mr-1.5" /> Add Lead for This Org
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Leads" value={totalLeads} />
        <Stat label="Warm Leads" value={warmLeads} valueClass="text-warning" />
        <Stat label="Deals Closed" value={closedWon} valueClass="text-health" />
        <Stat label="Total Closed Value" value={formatCurrency(totalClosedValue)} valueClass="text-health" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <PipelineKanban leads={leads} showOrgName={false} onOpenLead={setOpenLeadId} onChanged={load} />
      )}

      <div className="curve-card">
        <p className="curve-eyebrow mb-3">Curve Revenue Share — Sponsorship</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Mini label="Baseline revenue" value={baseline !== null ? formatCurrency(baseline) : "Not set"} />
          <Mini label="Total sponsorship closed" value={formatCurrency(totalClosedValue)} />
          <Mini label="Curve share (25%)" value={formatCurrency(curveShare)} accent />
        </div>
        <p className="text-xs text-muted-foreground mt-4">Full revenue share tracking including all engines coming in Revenue Share module.</p>
      </div>

      <AddLeadModal open={addOpen} onOpenChange={setAddOpen} orgId={orgId} onCreated={() => { setAddOpen(false); load(); }} />
      <LeadDetailPanel leadId={openLeadId} orgName={orgName} onClose={() => setOpenLeadId(null)} onChanged={load} />
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: any; valueClass?: string }) {
  return (
    <div className="curve-card">
      <p className="curve-eyebrow mb-2">{label}</p>
      <p className={`font-display text-2xl font-semibold ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}
function Mini({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-semibold mt-1 text-lg ${accent ? "text-health" : ""}`}>{value}</p>
    </div>
  );
}
