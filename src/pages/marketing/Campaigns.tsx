import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Megaphone, Calendar, ArrowRight } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  campaign_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  planning: "bg-muted text-muted-foreground",
  live: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

const TYPES = [
  { value: "tryout", label: "Tryout / Recruiting" },
  { value: "registration", label: "Registration / Re-enrollment" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "event", label: "Event Promotion" },
  { value: "newsletter", label: "Newsletter" },
  { value: "general", label: "General" },
];

export default function Campaigns() {
  const { profile, user } = useAuth();
  const { orgId } = useEffectiveOrg();

  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    goal: "",
    campaign_type: "general",
    start_date: "",
    end_date: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("campaigns")
      .select("id,name,description,goal,campaign_type,status,start_date,end_date,created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data ?? []) as Campaign[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const create = async () => {
    if (!orgId || !user) return;
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const { error } = await supabase.from("campaigns").insert({
      org_id: orgId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      goal: form.goal.trim() || null,
      campaign_type: form.campaign_type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: user.id,
      created_by_role: "org",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Campaign created");
    setOpen(false);
    setForm({ name: "", description: "", goal: "", campaign_type: "general", start_date: "", end_date: "" });
    load();
  };

  return (
    <AppShell title="Campaigns">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Coordinate flyers, emails and social posts behind one goal.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New campaign
        </Button>
      </div>

      <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" placeholder="Search campaigns…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
          <option value="all">All statuses</option>
          <option value="planning">Planning</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
        </select>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-semibold mb-1">No campaigns yet</p>
          <p className="text-sm text-muted-foreground mb-4">Group designs, emails and posts under one campaign goal.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Create your first campaign</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/marketing/campaigns/${c.id}`}>
              <Card className="p-5 transition-all hover:shadow-md hover:-translate-y-0.5 group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="font-display font-semibold text-lg truncate">{c.name}</h2>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${STATUS_BADGE[c.status] ?? STATUS_BADGE.planning}`}>{c.status.replace("_", " ")}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">{c.campaign_type}</span>
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                    {(c.start_date || c.end_date) && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"} → {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Spring 2026 Tryouts" />
            </div>
            <div>
              <Label>Type</Label>
              <select value={form.campaign_type} onChange={(e) => setForm((s) => ({ ...s, campaign_type: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Goal</Label>
              <Input value={form.goal} onChange={(e) => setForm((s) => ({ ...s, goal: e.target.value }))} placeholder="Fill 4 tryout slots, 60 RSVPs" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Quick overview of what this push is about." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
