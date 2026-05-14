import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { renderEmail } from "@/emails/render";

type Tpl = {
  id: string; name: string; category: string | null; description: string | null;
  rendering_engine: string; jsx_source: string | null; mjml_source: string | null;
  input_fields: any; preview_props: any; is_system: boolean; sort_order: number; active: boolean;
};

const empty = (): Partial<Tpl> => ({
  name: "", category: "announcement", description: "", rendering_engine: "mjml",
  mjml_source: "", input_fields: [], preview_props: {}, is_system: true, sort_order: 100, active: true,
});

export default function AdminEmailTemplates() {
  const [items, setItems] = useState<Tpl[]>([]);
  const [editing, setEditing] = useState<Partial<Tpl> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("email_templates").select("*").order("sort_order");
    setItems((data ?? []) as Tpl[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const [preview, setPreview] = useState<{ html: string; errors: any[] }>({ html: "", errors: [] });
  useEffect(() => {
    if (!editing) { setPreview({ html: "", errors: [] }); return; }
    let cancelled = false;
    renderEmail({
      mjmlSource: editing.mjml_source ?? "",
      props: (editing.preview_props as any) ?? {},
    }).then((r) => { if (!cancelled) setPreview(r); });
    return () => { cancelled = true; };
  }, [editing]);

  const save = async () => {
    if (!editing?.name) return toast.error("Name required");
    try {
      const payload: any = {
        name: editing.name, category: editing.category, description: editing.description,
        rendering_engine: editing.rendering_engine || "mjml",
        jsx_source: editing.jsx_source || null,
        mjml_source: editing.mjml_source || null,
        input_fields: editing.input_fields ?? [],
        preview_props: editing.preview_props ?? {},
        is_system: editing.is_system ?? true,
        sort_order: editing.sort_order ?? 100,
        active: editing.active ?? true,
      };
      if (editing.id) {
        const { error } = await supabase.from("email_templates").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      setEditing(null); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <AppShell title="Email templates">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Email templates</h1>
          <p className="text-muted-foreground mt-1">System library of branded MJML templates orgs use to compose campaigns.</p>
        </div>
        <Button onClick={() => setEditing(empty())}><Plus className="h-4 w-4 mr-2" />New template</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Category</th><th className="text-left p-3">Engine</th><th className="text-right p-3">Order</th><th className="text-left p-3">Active</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : items.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3 font-medium">{t.name}{t.is_system && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">system</span>}</td>
                <td className="p-3">{t.category}</td>
                <td className="p-3">{t.rendering_engine}</td>
                <td className="p-3 text-right">{t.sort_order}</td>
                <td className="p-3">{t.active ? "✓" : "—"}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(t)} className="p-1 hover:bg-muted rounded mr-1"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(t.id)} className="p-1 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} template</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Category</Label><Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
                  <div><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
                </div>
                <div><Label>Description</Label><Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div><Label>Rendering engine</Label>
                  <select value={editing.rendering_engine ?? "mjml"} onChange={(e) => setEditing({ ...editing, rendering_engine: e.target.value })}
                    className="w-full h-10 px-2 rounded-md border border-input bg-background text-sm">
                    <option value="mjml">MJML</option>
                    <option value="react_email">React Email (system component key in jsx_source)</option>
                  </select>
                </div>
                <div><Label>System component key (react_email)</Label>
                  <Input value={editing.jsx_source ?? ""} onChange={(e) => setEditing({ ...editing, jsx_source: e.target.value })} placeholder="TryoutAnnouncement" /></div>
                <div><Label>MJML source</Label>
                  <Textarea rows={14} className="font-mono text-xs" value={editing.mjml_source ?? ""} onChange={(e) => setEditing({ ...editing, mjml_source: e.target.value })} /></div>
                <div><Label>Input fields (JSON)</Label>
                  <Textarea rows={5} className="font-mono text-xs" value={JSON.stringify(editing.input_fields ?? [], null, 2)}
                    onChange={(e) => { try { setEditing({ ...editing, input_fields: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} /></div>
                <div><Label>Preview props (JSON)</Label>
                  <Textarea rows={5} className="font-mono text-xs" value={JSON.stringify(editing.preview_props ?? {}, null, 2)}
                    onChange={(e) => { try { setEditing({ ...editing, preview_props: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />Active</label>
              </div>
              <div className="border border-border rounded overflow-hidden bg-zinc-100">
                <div className="text-xs uppercase tracking-wider text-muted-foreground p-2 bg-muted/50">Live preview</div>
                <iframe srcDoc={preview.html} className="w-full" style={{ minHeight: 600, border: "none", background: "white" }} title="tpl-preview" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
