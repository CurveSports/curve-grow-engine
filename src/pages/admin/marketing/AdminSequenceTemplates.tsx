import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";

type Tpl = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  duration_days: number | null;
  anchor_event: string | null;
  anchor_label: string | null;
  goal_metric: string | null;
  default_goal_target: number | null;
  tier: number | null;
  best_for: string | null;
  preview_summary: string | null;
  thumbnail_url: string | null;
  active: boolean;
  is_system: boolean;
  sort_order: number | null;
};

type Asset = {
  id?: string;
  sequence_template_id?: string;
  order_in_sequence: number | null;
  days_from_anchor: number | null;
  time_of_day: string | null;
  asset_type: string | null;
  channel: string | null;
  asset_label: string | null;
  subject_template: string | null;
  preview_text_template: string | null;
  copy_template: string | null;
  notes: string | null;
  required: boolean;
};

const emptyTpl = (): Partial<Tpl> => ({
  name: "", category: "general", description: "", duration_days: 14,
  anchor_event: "campaign_start", anchor_label: "Campaign start",
  goal_metric: "registrations", default_goal_target: 50, tier: 1,
  best_for: "", preview_summary: "", active: true, is_system: true, sort_order: 100,
});

const emptyAsset = (): Asset => ({
  order_in_sequence: 1, days_from_anchor: 0, time_of_day: "09:00",
  asset_type: "email", channel: "email", asset_label: "",
  subject_template: "", preview_text_template: "", copy_template: "",
  notes: "", required: true,
});

export default function AdminSequenceTemplates() {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [editing, setEditing] = useState<Partial<Tpl> | null>(null);
  const [assetsFor, setAssetsFor] = useState<Tpl | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("campaign_sequence_templates")
      .select("*")
      .order("sort_order", { nullsFirst: false });
    setTemplates((data || []) as Tpl[]);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("campaign_sequence_templates").update({ active }).eq("id", id);
    toast.success(active ? "Activated" : "Deactivated");
    load();
  };

  const saveTpl = async () => {
    if (!editing?.name) return toast.error("Name required");
    const payload: any = {
      name: editing.name, category: editing.category, description: editing.description,
      duration_days: editing.duration_days, anchor_event: editing.anchor_event,
      anchor_label: editing.anchor_label, goal_metric: editing.goal_metric,
      default_goal_target: editing.default_goal_target, tier: editing.tier,
      best_for: editing.best_for, preview_summary: editing.preview_summary,
      thumbnail_url: editing.thumbnail_url, active: editing.active ?? true,
      is_system: editing.is_system ?? true, sort_order: editing.sort_order ?? 100,
    };
    const { error } = editing.id
      ? await supabase.from("campaign_sequence_templates").update(payload).eq("id", editing.id)
      : await supabase.from("campaign_sequence_templates").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const removeTpl = async (id: string) => {
    if (!confirm("Delete sequence template? This also removes its steps.")) return;
    const { error } = await supabase.from("campaign_sequence_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const openAssets = async (t: Tpl) => {
    setAssetsFor(t);
    const { data } = await supabase
      .from("campaign_sequence_assets")
      .select("*")
      .eq("sequence_template_id", t.id)
      .order("order_in_sequence", { nullsFirst: false });
    setAssets((data || []) as Asset[]);
  };

  const reloadAssets = async () => {
    if (!assetsFor) return;
    const { data } = await supabase
      .from("campaign_sequence_assets")
      .select("*")
      .eq("sequence_template_id", assetsFor.id)
      .order("order_in_sequence", { nullsFirst: false });
    setAssets((data || []) as Asset[]);
  };

  const saveAsset = async () => {
    if (!assetsFor || !editingAsset) return;
    const payload: any = { ...editingAsset, sequence_template_id: assetsFor.id };
    delete payload.id;
    const { error } = editingAsset.id
      ? await supabase.from("campaign_sequence_assets").update(payload).eq("id", editingAsset.id)
      : await supabase.from("campaign_sequence_assets").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditingAsset(null);
    reloadAssets();
  };

  const removeAsset = async (id: string) => {
    if (!confirm("Delete step?")) return;
    const { error } = await supabase.from("campaign_sequence_assets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reloadAssets();
  };

  return (
    <AppShell title="Sequence templates">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Sequence templates</h1>
          <p className="text-muted-foreground mt-1">The campaign sequence library every org can launch from.</p>
        </div>
        <Button onClick={() => setEditing(emptyTpl())}>
          <Plus className="h-4 w-4 mr-2" />New template
        </Button>
      </div>

      <div className="space-y-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4 flex justify-between items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{t.name}</span>
                  {t.tier != null && <Badge variant="outline">Tier {t.tier}</Badge>}
                  {t.category && <Badge variant="secondary">{t.category}</Badge>}
                  {!t.is_system && <Badge>Custom</Badge>}
                </div>
                <div className="text-sm text-muted-foreground mt-1 truncate">{t.preview_summary}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t.duration_days ?? 0}d · Goal: {t.goal_metric ?? "—"} · Default: {t.default_goal_target ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={t.active} onCheckedChange={(v) => toggleActive(t.id, v)} />
                <Button variant="ghost" size="sm" onClick={() => openAssets(t)} title="Steps">
                  <Layers className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(t)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeTpl(t.id)} title="Delete">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="text-center text-muted-foreground py-12">No sequence templates yet.</div>
        )}
      </div>

      {/* Edit / new template dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} sequence template</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name</Label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              </div>
              <div>
                <Label>Tier</Label>
                <Input type="number" value={editing.tier ?? 1} onChange={(e) => setEditing({ ...editing, tier: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input type="number" value={editing.duration_days ?? 0} onChange={(e) => setEditing({ ...editing, duration_days: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Anchor event</Label>
                <Input value={editing.anchor_event ?? ""} onChange={(e) => setEditing({ ...editing, anchor_event: e.target.value })} placeholder="campaign_start, tryout_date…" />
              </div>
              <div>
                <Label>Anchor label</Label>
                <Input value={editing.anchor_label ?? ""} onChange={(e) => setEditing({ ...editing, anchor_label: e.target.value })} />
              </div>
              <div>
                <Label>Goal metric</Label>
                <Input value={editing.goal_metric ?? ""} onChange={(e) => setEditing({ ...editing, goal_metric: e.target.value })} placeholder="registrations, opens…" />
              </div>
              <div>
                <Label>Default goal target</Label>
                <Input type="number" value={editing.default_goal_target ?? 0} onChange={(e) => setEditing({ ...editing, default_goal_target: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <Label>Best for</Label>
                <Input value={editing.best_for ?? ""} onChange={(e) => setEditing({ ...editing, best_for: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Preview summary</Label>
                <Textarea rows={2} value={editing.preview_summary ?? ""} onChange={(e) => setEditing({ ...editing, preview_summary: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm col-span-2">
                <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active (visible to orgs)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveTpl}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Steps / assets manager */}
      <Dialog open={!!assetsFor} onOpenChange={(o) => { if (!o) { setAssetsFor(null); setAssets([]); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Steps — {assetsFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setEditingAsset(emptyAsset())}>
              <Plus className="h-4 w-4 mr-1" />Add step
            </Button>
          </div>
          <div className="space-y-2">
            {assets.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">#{a.order_in_sequence}</Badge>
                      <Badge variant="secondary">{a.channel || a.asset_type}</Badge>
                      <span className="text-muted-foreground">Day {a.days_from_anchor} · {a.time_of_day}</span>
                    </div>
                    <div className="font-medium mt-1 truncate">{a.asset_label || a.subject_template}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingAsset(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => a.id && removeAsset(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {assets.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">No steps yet.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit / new asset dialog */}
      <Dialog open={!!editingAsset} onOpenChange={(o) => !o && setEditingAsset(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAsset?.id ? "Edit" : "New"} step</DialogTitle></DialogHeader>
          {editingAsset && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Order</Label>
                <Input type="number" value={editingAsset.order_in_sequence ?? 1}
                  onChange={(e) => setEditingAsset({ ...editingAsset, order_in_sequence: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Days from anchor</Label>
                <Input type="number" value={editingAsset.days_from_anchor ?? 0}
                  onChange={(e) => setEditingAsset({ ...editingAsset, days_from_anchor: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Time of day</Label>
                <Input type="time" value={editingAsset.time_of_day ?? "09:00"}
                  onChange={(e) => setEditingAsset({ ...editingAsset, time_of_day: e.target.value })} />
              </div>
              <div>
                <Label>Channel</Label>
                <select value={editingAsset.channel ?? "email"}
                  onChange={(e) => setEditingAsset({ ...editingAsset, channel: e.target.value, asset_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="social">Social post</option>
                  <option value="design">Design asset</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label>Label</Label>
                <Input value={editingAsset.asset_label ?? ""}
                  onChange={(e) => setEditingAsset({ ...editingAsset, asset_label: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Subject (email)</Label>
                <Input value={editingAsset.subject_template ?? ""}
                  onChange={(e) => setEditingAsset({ ...editingAsset, subject_template: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Preview text</Label>
                <Input value={editingAsset.preview_text_template ?? ""}
                  onChange={(e) => setEditingAsset({ ...editingAsset, preview_text_template: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Copy / body</Label>
                <Textarea rows={6} value={editingAsset.copy_template ?? ""}
                  onChange={(e) => setEditingAsset({ ...editingAsset, copy_template: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Internal notes</Label>
                <Textarea rows={2} value={editingAsset.notes ?? ""}
                  onChange={(e) => setEditingAsset({ ...editingAsset, notes: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm col-span-2">
                <input type="checkbox" checked={editingAsset.required}
                  onChange={(e) => setEditingAsset({ ...editingAsset, required: e.target.checked })} />
                Required step
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAsset(null)}>Cancel</Button>
            <Button onClick={saveAsset}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
