import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import PipelineKanban from "@/components/sponsorship/PipelineKanban";
import PipelineList from "@/components/sponsorship/PipelineList";
import PipelineMetrics from "@/components/sponsorship/PipelineMetrics";
import AddLeadModal from "@/components/sponsorship/AddLeadModal";
import LeadDetailPanel from "@/components/sponsorship/LeadDetailPanel";
import { Plus, LayoutGrid, Rows3, BarChart3, Filter as FilterIcon, Globe, Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_LABELS, SOURCES, SOURCE_LABELS, type SponsorshipLead } from "@/lib/sponsorship";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/format";
import { Link } from "react-router-dom";

type View = "pipeline" | "list" | "metrics";
type Scope = "global" | "by_org";

export default function AdminPipeline() {
  const [view, setView] = useState<View>("pipeline");
  const [leads, setLeads] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [stageFilter, setStageFilter] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const [warmOnly, setWarmOnly] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: leadRows }, { data: orgRows }, { data: noteCounts }, { data: roleRows }, { data: profileRows }] = await Promise.all([
      supabase.from("sponsorship_leads").select("*").order("last_stage_change_at", { ascending: false }),
      supabase.from("organizations").select("id, name").order("name"),
      supabase.from("sponsorship_lead_notes").select("lead_id, is_client_visible"),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
      supabase.from("profiles").select("user_id, full_name, email"),
    ]);

    const orgList = (orgRows ?? []) as { id: string; name: string }[];
    const orgMap = new Map(orgList.map((o) => [o.id, o.name]));

    const adminIds = new Set((roleRows ?? []).map((r: any) => r.user_id));
    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.user_id, p.full_name || p.email || p.user_id.slice(0, 8)]));
    const adminList = Array.from(adminIds).map((id) => ({ id: id as string, name: profileMap.get(id as string) ?? (id as string).slice(0, 8) }));

    const noteAgg = new Map<string, { count: number; visible: boolean }>();
    for (const n of (noteCounts ?? []) as any[]) {
      const cur = noteAgg.get(n.lead_id) ?? { count: 0, visible: false };
      cur.count += 1;
      if (n.is_client_visible) cur.visible = true;
      noteAgg.set(n.lead_id, cur);
    }

    const enriched = ((leadRows ?? []) as SponsorshipLead[]).map((l) => ({
      ...l,
      org_name: orgMap.get(l.org_id) ?? null,
      assigned_name: l.assigned_to ? profileMap.get(l.assigned_to) ?? null : null,
      notes_count: noteAgg.get(l.id)?.count ?? 0,
      has_client_visible_notes: noteAgg.get(l.id)?.visible ?? false,
    }));

    setOrgs(orgList);
    setAdmins(adminList);
    setLeads(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (orgFilter && l.org_id !== orgFilter) return false;
      if (stageFilter.size > 0 && !stageFilter.has(l.stage)) return false;
      if (sourceFilter.size > 0 && !sourceFilter.has(l.source)) return false;
      if (warmOnly && !l.is_warm) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!l.business_name?.toLowerCase().includes(s) && !l.org_name?.toLowerCase().includes(s) && !l.contact_name?.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [leads, orgFilter, stageFilter, sourceFilter, warmOnly, search]);

  const toggleSet = (s: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(s);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  };

  return (
    <AppShell title="Sponsorship Pipeline">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="curve-eyebrow mb-2">CRM</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Sponsorship Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Managing sponsorship partnerships on behalf of Curve Sports Allegiance clients through the Diamond Sports Foundation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen((v) => !v)}>
            <FilterIcon className="h-4 w-4 mr-1.5" /> Filter
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="bg-health text-health-foreground hover:bg-health/90">
            <Plus className="h-4 w-4 mr-1.5" /> Add Lead
          </Button>
        </div>
      </div>

      <div className="inline-flex items-center bg-card border border-border rounded-lg p-1 mb-6">
        <ToggleBtn active={view === "pipeline"} onClick={() => setView("pipeline")} icon={<LayoutGrid className="h-4 w-4" />} label="Pipeline" />
        <ToggleBtn active={view === "list"} onClick={() => setView("list")} icon={<Rows3 className="h-4 w-4" />} label="List" />
        <ToggleBtn active={view === "metrics"} onClick={() => setView("metrics")} icon={<BarChart3 className="h-4 w-4" />} label="Metrics" />
      </div>

      {filtersOpen && (
        <div className="curve-card mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Search</Label>
              <Input placeholder="Business, org, contact…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1.5 h-9" />
            </div>
            <div>
              <Label className="text-xs">Organization</Label>
              <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All organizations</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Switch checked={warmOnly} onCheckedChange={setWarmOnly} />
              <Label className="text-sm">Warm leads only</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs mb-2 block">Stage</Label>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <button key={s} type="button" onClick={() => toggleSet(stageFilter, s, setStageFilter)} className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors", stageFilter.has(s) ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-foreground/30")}>
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs mb-2 block">Source</Label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <button key={s} type="button" onClick={() => toggleSet(sourceFilter, s, setSourceFilter)} className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors", sourceFilter.has(s) ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-foreground/30")}>
                  {SOURCE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading pipeline…</p>
      ) : (
        <>
          {view === "pipeline" && <PipelineKanban leads={filtered} onOpenLead={setOpenLeadId} onChanged={load} />}
          {view === "list" && <PipelineList leads={filtered} onOpenLead={setOpenLeadId} />}
          {view === "metrics" && <PipelineMetrics leads={leads} orgs={orgs} />}
        </>
      )}

      <AddLeadModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => { setAddOpen(false); load(); }}
      />
      <LeadDetailPanel
        leadId={openLeadId}
        onClose={() => setOpenLeadId(null)}
        onChanged={load}
      />
    </AppShell>
  );
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all", active ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
      {icon} {label}
    </button>
  );
}
