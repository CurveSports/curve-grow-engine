import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TaskTemplate, ENGINES, TASK_TYPES } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("task_templates").select("*").order("engine").order("title");
    setTemplates((data as TaskTemplate[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("task_templates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Template deleted"); load(); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{templates.length} templates · system templates are read-only</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create template</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>New task template</DialogTitle></DialogHeader>
            <TemplateForm onSaved={() => { setOpen(false); load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="curve-card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Engine</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium text-right">Days</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-secondary/40">
                  <td className="px-5 py-3">{t.title}</td>
                  <td className="px-5 py-3 text-xs">{t.engine}</td>
                  <td className="px-5 py-3 text-xs">{t.task_type}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{t.suggested_days_to_complete}</td>
                  <td className="px-5 py-3 text-xs">
                    {t.is_system_template ? <span className="px-2 py-0.5 rounded-full bg-secondary border border-border">System</span> : <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/30">Custom</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!t.is_system_template && <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TemplateForm({ onSaved }: { onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [engine, setEngine] = useState<string>("Pricing");
  const [taskType, setTaskType] = useState<string>("Strategy");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim() || !description.trim()) { toast.error("Title and description required"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("task_templates").insert({
      title: title.trim(), description: description.trim(),
      engine: engine as any, task_type: taskType as any,
      suggested_days_to_complete: days, is_system_template: false, created_by: user?.id,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Template created"); onSaved(); }
  };

  return (
    <div className="grid gap-3">
      <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <Textarea placeholder="Description" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <Select value={engine} onValueChange={setEngine}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ENGINES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
        <Select value={taskType} onValueChange={setTaskType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input type="number" value={days} onChange={e => setDays(Number(e.target.value))} placeholder="Days" />
      </div>
      <Button onClick={save} disabled={busy}>Save template</Button>
    </div>
  );
}
