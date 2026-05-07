import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Bell, Upload } from "lucide-react";
import { toast } from "sonner";
import AddStaffModal from "./AddStaffModal";
import StaffDetailPanel from "./StaffDetailPanel";
import ImportStaffCsvModal from "./ImportStaffCsvModal";
import { REQUIREMENT_TYPES, statusIcon, statusPillClass, isOverdue, STATUS_LABEL } from "@/lib/compliance";

export default function CompliancePanel({ acquisition }: { acquisition: any }) {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [empFilter, setEmpFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: it }] = await Promise.all([
      supabase.from("acquisition_staff").select("*").eq("acquisition_id", acquisition.id).eq("is_active", true).order("last_name"),
      supabase.from("acquisition_compliance_items").select("*").eq("acquisition_id", acquisition.id),
    ]);
    setStaff(s ?? []); setItems(it ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [acquisition.id]);

  const itemsByStaff = useMemo(() => {
    const m = new Map<string, any[]>();
    items.forEach((i) => {
      if (!m.has(i.staff_id)) m.set(i.staff_id, []);
      m.get(i.staff_id)!.push(i);
    });
    return m;
  }, [items]);

  const filtered = staff.filter((p) => {
    if (statusFilter !== "all" && p.compliance_status !== statusFilter) return false;
    if (roleFilter !== "all" && p.role_type !== roleFilter) return false;
    if (empFilter !== "all" && p.employment_type !== empFilter) return false;
    if (search && !`${p.first_name} ${p.last_name} ${p.role}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totals = {
    total: staff.length,
    compliant: staff.filter((s) => s.compliance_status === "compliant").length,
    inProgress: staff.filter((s) => s.compliance_status === "in_progress").length,
    overdue: staff.filter((s) => s.compliance_status === "overdue").length,
  };
  const overallPct = staff.length ? Math.round(staff.reduce((sum, s) => sum + Number(s.compliance_pct), 0) / staff.length) : 0;

  const sendBulk = async () => {
    const eligible = staff.filter((s) => s.email && s.compliance_status !== "compliant");
    if (eligible.length === 0) return toast.error("No staff with email and incomplete items");
    if (!confirm(`Send reminders to ${eligible.length} staff with incomplete requirements?`)) return;
    const { data, error } = await supabase.functions.invoke("send-compliance-reminders", {
      body: { acquisition_id: acquisition.id, bulk: true },
    });
    if (error) return toast.error(error.message);
    toast.success(`Reminders sent to ${data?.sent ?? eligible.length} staff members`);
    await load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold">Staff Compliance — {acquisition.club_name}</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Staff" value={totals.total} />
        <Stat label="Fully Compliant" value={`${totals.compliant} / ${totals.total}`} tone="ok" />
        <Stat label="In Progress" value={totals.inProgress} tone="warn" />
        <Stat label="Overdue" value={totals.overdue} tone={totals.overdue > 0 ? "danger" : undefined} />
      </div>

      <div className="curve-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Overall Compliance</span>
          <span className="font-bold tabular-nums">{overallPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${overallPct >= 80 ? "bg-emerald-500" : overallPct >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button onClick={() => setAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1.5" /> Add Staff Member</Button>
        <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload className="h-4 w-4 mr-1.5" /> Import Staff CSV</Button>
        <Button variant="outline" onClick={sendBulk}><Bell className="h-4 w-4 mr-1.5" /> Send Bulk Reminder</Button>
      </div>

      <div className="curve-card">
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <Input placeholder="Search name or role…" className="w-56 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Filter label="Status" value={statusFilter} onChange={setStatusFilter} options={[["all","All"],["compliant","Compliant"],["in_progress","In progress"],["overdue","Overdue"],["not_started","Not started"]]} />
          <Filter label="Role" value={roleFilter} onChange={setRoleFilter} options={[["all","All"],["coach","Coach"],["staff","Staff"],["admin","Admin"],["director","Director"]]} />
          <Filter label="Employment" value={empFilter} onChange={setEmpFilter} options={[["all","All"],["employee","Employee"],["contractor","Contractor"],["volunteer","Volunteer"]]} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Team</th>
                {REQUIREMENT_TYPES.filter((r) => r.key !== "other").map((r) => (
                  <th key={r.key} className="py-2 px-2 text-center">{r.label}</th>
                ))}
                <th className="py-2 pr-3">Overall</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const myItems = itemsByStaff.get(p.id) ?? [];
                const rowBg = p.compliance_status === "compliant" ? "bg-emerald-50/50" :
                  p.compliance_status === "overdue" ? "bg-rose-50/50" :
                  p.compliance_status === "not_started" ? "bg-muted/20" : "";
                return (
                  <tr key={p.id} className={`border-b border-border/60 ${rowBg}`}>
                    <td className="py-2 pr-3 font-medium">
                      <button className="hover:underline text-left" onClick={() => setActiveStaffId(p.id)}>
                        {p.first_name} {p.last_name}
                      </button>
                    </td>
                    <td className="py-2 pr-3">{p.role}</td>
                    <td className="py-2 pr-3 capitalize text-xs text-muted-foreground">{p.role_type} · {p.employment_type}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{p.team_or_department ?? "—"}</td>
                    {REQUIREMENT_TYPES.filter((r) => r.key !== "other").map((r) => {
                      const it = myItems.find((i) => i.requirement_type === r.key);
                      if (!it) return <td key={r.key} className="py-2 px-2 text-center text-xs text-muted-foreground">N/A</td>;
                      return <td key={r.key} className="py-2 px-2 text-center text-base" title={STATUS_LABEL[it.status]}>{statusIcon(it.status, isOverdue(it))}</td>;
                    })}
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusPillClass(p.compliance_status)}`}>
                        {Number(p.compliance_pct).toFixed(0)}% {STATUS_LABEL[p.compliance_status]}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <button onClick={() => setActiveStaffId(p.id)} className="text-xs text-muted-foreground hover:text-foreground">View</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="py-10 text-center text-muted-foreground italic">No staff members. Click "Add Staff Member" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddStaffModal open={addOpen} onOpenChange={setAddOpen} acquisition={acquisition} onAdded={load} />
      <ImportStaffCsvModal open={csvOpen} onOpenChange={setCsvOpen} acquisition={acquisition} onImported={load} />
      {activeStaffId && <StaffDetailPanel staffId={activeStaffId} onClose={() => setActiveStaffId(null)} onChanged={load} />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "danger" | "warn" | "ok" }) {
  return (
    <div className="curve-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 tabular-nums ${
        tone === "danger" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : ""
      }`}>{value}</p>
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase font-semibold text-muted-foreground">{label}:</span>
      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
