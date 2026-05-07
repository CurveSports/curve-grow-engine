import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { COMM_TYPES, commMethodMeta } from "@/lib/dealRoom";
import LogCommunicationModal from "./LogCommunicationModal";
import { toast } from "sonner";

const COMM_LABELS: Record<string, string> = {
  seller: "Seller", staff: "Staff", sikich: "Sikich", legal: "Legal",
  vendor: "Vendor", internal: "Internal", other: "Other",
};

const COMM_COLORS: Record<string, string> = {
  seller: "bg-purple-100 text-purple-800",
  staff: "bg-blue-100 text-blue-800",
  sikich: "bg-teal-100 text-teal-800",
  legal: "bg-amber-100 text-amber-800",
  vendor: "bg-orange-100 text-orange-800",
  internal: "bg-slate-100 text-slate-800",
  other: "bg-gray-100 text-gray-800",
};

export default function CommunicationsPanel({ acquisition }: { acquisition: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [followUpsOnly, setFollowUpsOnly] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("acquisition_communications").select("*").eq("acquisition_id", acquisition.id).order("communication_date", { ascending: false });
    setItems(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, [acquisition.id]);

  const pending = items.filter((c) => c.follow_up_needed && !c.follow_up_completed).length;
  const today = new Date().toISOString().slice(0, 10);

  let filtered = items;
  if (filter !== "all") filtered = filtered.filter((c) => c.communication_type === filter);
  if (followUpsOnly) {
    filtered = filtered.filter((c) => c.follow_up_needed && !c.follow_up_completed)
      .sort((a, b) => (a.follow_up_date ?? "9999").localeCompare(b.follow_up_date ?? "9999"));
  }

  const completeFollowUp = async (c: any) => {
    await supabase.from("acquisition_communications").update({ follow_up_completed: true }).eq("id", c.id);
    toast.success("Follow-up complete"); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("acquisition_communications").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">Communications — {acquisition.club_name}</h2>
          {pending > 0 && (
            <button onClick={() => setFollowUpsOnly(!followUpsOnly)} className="text-xs mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
              {pending} pending follow-up{pending === 1 ? "" : "s"} {followUpsOnly && "· showing"}
            </button>
          )}
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Log Communication</Button>
      </div>

      <div className="flex flex-wrap gap-1">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>All</FilterPill>
        {COMM_TYPES.map((t) => <FilterPill key={t} active={filter === t} onClick={() => setFilter(t)}>{COMM_LABELS[t]}</FilterPill>)}
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="curve-card text-center py-10 text-sm text-muted-foreground">No communications yet.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const m = commMethodMeta(c.method);
            const overdue = c.follow_up_needed && !c.follow_up_completed && c.follow_up_date && c.follow_up_date < today;
            return (
              <div key={c.id} className="curve-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${COMM_COLORS[c.communication_type]}`}>{COMM_LABELS[c.communication_type]}</span>
                      <span className="text-xs">{m.icon} {m.label}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.communication_date).toLocaleString()}</span>
                    </div>
                    <p className="font-semibold text-sm">{c.subject}</p>
                    {c.summary && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{c.summary}</p>}
                    {(c.contact_name || c.contact_organization) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Contact: {[c.contact_name, c.contact_role && `(${c.contact_role})`, c.contact_organization && `at ${c.contact_organization}`].filter(Boolean).join(" ")}
                      </p>
                    )}
                    {c.follow_up_needed && (
                      <div className={`mt-2 p-2 rounded text-xs ${overdue ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}>
                        <div className="flex items-center justify-between">
                          <span>Follow-up by <strong>{c.follow_up_date}</strong>{overdue && " (overdue)"} — {c.follow_up_completed ? "✅ done" : "⬜ pending"}</span>
                          {!c.follow_up_completed && <Button size="sm" variant="ghost" onClick={() => completeFollowUp(c)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark done</Button>}
                        </div>
                        {c.follow_up_notes && <p className="mt-1">{c.follow_up_notes}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => { setEditing(c); setOpen(true); }} className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => del(c.id)} className="p-1 hover:bg-muted rounded text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LogCommunicationModal open={open} onOpenChange={setOpen} acquisitionId={acquisition.id} item={editing} onSaved={load} />
    </div>
  );
}

function FilterPill({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`text-xs px-3 py-1 rounded-full border ${active ? "bg-emerald-600 text-white border-emerald-600" : "bg-card hover:bg-muted"}`}>{children}</button>;
}
