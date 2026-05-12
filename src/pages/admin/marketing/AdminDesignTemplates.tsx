import { useEffect, useState } from "react";
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

type Template = {
  id: string;
  name: string;
  category: string;
  design_type: string;
  dimensions: any;
  base_prompt: string;
  input_fields: any[];
  is_system: boolean;
  active: boolean;
  sort_order: number;
};

const empty: Partial<Template> = {
  name: "", category: "general", design_type: "social_post_square",
  dimensions: { width: 1080, height: 1080 }, base_prompt: "", input_fields: [], active: true, sort_order: 0,
};

export default function AdminDesignTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Template>>(empty);
  const [fieldsJson, setFieldsJson] = useState("[]");
  const [dimsJson, setDimsJson] = useState("{}");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("design_templates").select("*").order("sort_order").order("name");
    setTemplates((data ?? []) as Template[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (t?: Template) => {
    const v = t ?? empty;
    setEditing(v);
    setFieldsJson(JSON.stringify(v.input_fields ?? [], null, 2));
    setDimsJson(JSON.stringify(v.dimensions ?? {}, null, 2));
    setOpen(true);
  };

  const save = async () => {
    let input_fields: any, dimensions: any;
    try { input_fields = JSON.parse(fieldsJson); } catch { return toast.error("Invalid input_fields JSON"); }
    try { dimensions = JSON.parse(dimsJson); } catch { return toast.error("Invalid dimensions JSON"); }
    const payload: any = {
      name: editing.name, category: editing.category, design_type: editing.design_type,
      base_prompt: editing.base_prompt, dimensions, input_fields,
      active: editing.active ?? true, sort_order: editing.sort_order ?? 0,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("design_templates").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("design_templates").insert({ ...payload, is_system: false }));
    }
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete template?")) return;
    const { error } = await supabase.from("design_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <AppShell title="Design templates">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Design templates</h1>
          <p className="text-muted-foreground mt-1">The catalog every org sees in their template picker.</p>
        </div>
        <Button onClick={() => openEdit()}><Plus className="h-4 w-4 mr-2" />New template</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Dimensions</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            : templates.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No templates.</td></tr>
            : templates.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{t.name}{t.is_system && <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">System</span>}</td>
                <td className="p-3 text-muted-foreground">{t.category}</td>
                <td className="p-3 text-muted-foreground">{t.design_type}</td>
                <td className="p-3 text-muted-foreground">{t.dimensions?.width}×{t.dimensions?.height}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${t.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-muted"}`}>{t.active ? "Active" : "Inactive"}</span></td>
                <td className="p-3 text-right">
                  <button onClick={() => openEdit(t)} className="text-muted-foreground hover:text-foreground p-1"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive p-1 ml-1"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} template</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} /></div>
            <div><Label>Category</Label><Input value={editing.category ?? ""} onChange={(e) => setEditing((s) => ({ ...s, category: e.target.value }))} /></div>
            <div>
              <Label>Design type</Label>
              <select value={editing.design_type} onChange={(e) => setEditing((s) => ({ ...s, design_type: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="social_post_square">social_post_square</option>
                <option value="social_post_story">social_post_story</option>
                <option value="email_header">email_header</option>
                <option value="flyer">flyer</option>
                <option value="banner">banner</option>
                <option value="infographic">infographic</option>
              </select>
            </div>
            <div className="col-span-2"><Label>Base prompt (sent to AI)</Label><Textarea rows={3} value={editing.base_prompt ?? ""} onChange={(e) => setEditing((s) => ({ ...s, base_prompt: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Dimensions (JSON)</Label><Textarea rows={3} className="font-mono text-xs" value={dimsJson} onChange={(e) => setDimsJson(e.target.value)} /></div>
            <div className="col-span-2"><Label>Input fields (JSON array)</Label><Textarea rows={6} className="font-mono text-xs" value={fieldsJson} onChange={(e) => setFieldsJson(e.target.value)} /></div>
            <div><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing((s) => ({ ...s, sort_order: Number(e.target.value) }))} /></div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing((s) => ({ ...s, active: e.target.checked }))} /> Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
