import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { BUDGET_CATEGORIES, budgetCategoryMeta, formatCurrency } from "@/lib/dealRoom";
import { workstreamLabel, WORKSTREAMS } from "@/lib/acquisitions";
import BudgetItemModal from "./BudgetItemModal";
import { toast } from "sonner";

export default function BudgetPanel({ acquisition }: { acquisition: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [wsFilter, setWsFilter] = useState("all");
  const [paidFilter, setPaidFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("acquisition_budget_items").select("*").eq("acquisition_id", acquisition.id).order("date_incurred", { ascending: false });
    setItems(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, [acquisition.id]);

  const totals = items.reduce((acc, it) => {
    acc.budgeted += Number(it.budgeted_amount ?? 0);
    acc.actual += Number(it.actual_amount ?? 0);
    return acc;
  }, { budgeted: 0, actual: 0 });
  const remaining = totals.budgeted - totals.actual;
  const variance = totals.budgeted ? ((totals.actual - totals.budgeted) / totals.budgeted) * 100 : 0;

  const byWs: Record<string, { budgeted: number; actual: number }> = {};
  items.forEach((it) => {
    const w = it.workstream;
    if (!byWs[w]) byWs[w] = { budgeted: 0, actual: 0 };
    byWs[w].budgeted += Number(it.budgeted_amount ?? 0);
    byWs[w].actual += Number(it.actual_amount ?? 0);
  });

  const filtered = items.filter((it) => {
    if (wsFilter !== "all" && it.workstream !== wsFilter) return false;
    if (paidFilter === "paid" && !it.is_paid) return false;
    if (paidFilter === "unpaid" && it.is_paid) return false;
    return true;
  });

  const del = async (id: string) => {
    if (!confirm("Delete this budget item?")) return;
    await supabase.from("acquisition_budget_items").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Budget — {acquisition.club_name}</h2>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Add Budget Item</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Budgeted" value={formatCurrency(totals.budgeted)} />
        <Stat label="Total Spent" value={formatCurrency(totals.actual)} />
        <Stat label="Remaining" value={formatCurrency(remaining)} tone={remaining < 0 ? "danger" : "good"} />
        <Stat label="Variance" value={`${variance >= 0 ? "+" : ""}${variance.toFixed(1)}%`} tone={variance > 0 ? "danger" : "good"} />
      </div>

      {Object.keys(byWs).length > 0 && (
        <div className="curve-card">
          <h3 className="font-semibold text-sm mb-3">Budget by workstream</h3>
          <div className="space-y-2">
            {Object.entries(byWs).map(([ws, t]) => {
              const pct = t.budgeted ? (t.actual / t.budgeted) * 100 : 0;
              return (
                <div key={ws} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{workstreamLabel(ws)}</span>
                    <span className="text-muted-foreground">{formatCurrency(t.actual)} / {formatCurrency(t.budgeted)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${pct > 100 ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <select value={wsFilter} onChange={(e) => setWsFilter(e.target.value)} className="text-sm rounded-md border bg-background px-2 py-2">
          <option value="all">All workstreams</option>
          {WORKSTREAMS.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
        </select>
        <select value={paidFilter} onChange={(e) => setPaidFilter(e.target.value)} className="text-sm rounded-md border bg-background px-2 py-2">
          <option value="all">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="curve-card text-center py-10 text-sm text-muted-foreground">No budget items yet.</div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Workstream</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-left px-3 py-2">Vendor</th>
                <th className="text-right px-3 py-2">Budgeted</th>
                <th className="text-right px-3 py-2">Actual</th>
                <th className="text-center px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const cat = budgetCategoryMeta(it.category);
                return (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2 text-xs">{it.date_incurred ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{workstreamLabel(it.workstream)}</td>
                    <td className="px-3 py-2"><span className={`text-[10px] px-1.5 py-0.5 rounded ${cat.color}`}>{cat.label}</span></td>
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 text-xs">{it.vendor ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(it.budgeted_amount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(it.actual_amount)}</td>
                    <td className="px-3 py-2 text-center">{it.is_paid ? "✅" : "⬜"}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => { setEditing(it); setOpen(true); }} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => del(it.id)} className="p-1 hover:bg-muted rounded text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BudgetItemModal open={open} onOpenChange={setOpen} acquisitionId={acquisition.id} item={editing} onSaved={load} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "good" }) {
  return (
    <div className="curve-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 tabular-nums ${tone === "danger" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : ""}`}>{value}</p>
    </div>
  );
}
