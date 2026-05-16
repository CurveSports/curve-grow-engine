import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown, Upload, X } from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ---------- Types ----------
type FieldType =
  | "text" | "textarea" | "select" | "multi_select"
  | "date" | "number" | "url"
  | "photo_selector" | "video_selector" | "school_picker";

type InputField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select / multi_select
};

type Template = {
  id: string;
  name: string;
  category: string;
  design_type: string;
  dimensions: { width: number; height: number };
  base_prompt: string;
  mood: string | null;
  input_fields: InputField[];
  is_system: boolean;
  active: boolean;
  sort_order: number;
  thumbnail_url: string | null;
  generation_engine: string | null;
};

// ---------- Presets ----------
const FORMAT_PRESETS: { value: string; label: string; width: number; height: number }[] = [
  { value: "social_post_square",    label: "Square social post — 1080×1080",   width: 1080, height: 1080 },
  { value: "social_post_story",     label: "Story / Reel — 1080×1920",         width: 1080, height: 1920 },
  { value: "social_post_landscape", label: "Landscape social — 1200×630",      width: 1200, height: 630 },
  { value: "email_header",          label: "Email header — 1200×400",          width: 1200, height: 400 },
  { value: "flyer_letter",          label: "Flyer (letter) — 1275×1650",       width: 1275, height: 1650 },
  { value: "flyer_half",            label: "Flyer (half page) — 1275×825",     width: 1275, height: 825 },
  { value: "schedule_graphic",      label: "Schedule card — 1080×1350",        width: 1080, height: 1350 },
  { value: "banner",                label: "Web banner — 1500×500",            width: 1500, height: 500 },
  { value: "roster_card",           label: "Roster card — 1080×1350",          width: 1080, height: 1350 },
  { value: "sponsor_recognition",   label: "Sponsor recognition — 1080×1080",  width: 1080, height: 1080 },
];

const CATEGORY_PRESETS = [
  "general", "tryout", "commit", "event", "tournament", "sponsor",
  "recruitment", "announcement", "training", "off_season",
];

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  select: "Dropdown (single)",
  multi_select: "Multi-select",
  date: "Date",
  number: "Number",
  url: "URL / link",
  photo_selector: "Photo slot",
  video_selector: "Video slot",
  school_picker: "School picker",
};

const MOOD_CHIPS = [
  "high energy", "celebratory", "premium", "gritty", "playful",
  "calm / informational", "bold", "cinematic", "nostalgic",
];

const newField = (): InputField => ({
  name: "", label: "", type: "text", required: false,
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const emptyTemplate = (): Partial<Template> => ({
  name: "",
  category: "general",
  design_type: "social_post_square",
  dimensions: { width: 1080, height: 1080 },
  base_prompt: "",
  mood: "",
  input_fields: [],
  active: true,
  sort_order: 0,
  thumbnail_url: null,
});

// ---------- Sortable row in the templates list ----------
function SortableTemplateRow({
  t, onEdit, onDelete,
}: { t: Template; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: t.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const format = FORMAT_PRESETS.find((f) => f.value === t.design_type);
  return (
    <tr ref={setNodeRef} style={style} className="border-t border-border hover:bg-muted/30">
      <td className="p-2 w-8 text-muted-foreground">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="p-3 w-16">
        {t.thumbnail_url
          ? <img src={t.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover border border-border" />
          : <div className="h-10 w-10 rounded bg-muted border border-border" />}
      </td>
      <td className="p-3 font-medium">
        {t.name}
        {t.is_system && (
          <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            System
          </span>
        )}
      </td>
      <td className="p-3 text-muted-foreground capitalize">{t.category}</td>
      <td className="p-3 text-muted-foreground">{format?.label ?? `${t.dimensions?.width}×${t.dimensions?.height}`}</td>
      <td className="p-3">
        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${
          t.generation_engine === "stability_sharp"
            ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          {t.generation_engine === "stability_sharp" ? "Slot-based" : "AI HTML"}
        </span>
      </td>
      <td className="p-3">
        <span className={`text-xs px-2 py-0.5 rounded ${
          t.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-muted"
        }`}>
          {t.active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="p-3 text-right whitespace-nowrap">
        <button onClick={onEdit} className="text-muted-foreground hover:text-foreground p-1">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1 ml-1">
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

// ---------- Field row in the editor ----------
function FieldRow({
  field, index, total, onChange, onRemove, onMove,
}: {
  field: InputField;
  index: number;
  total: number;
  onChange: (next: InputField) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const needsOptions = field.type === "select" || field.type === "multi_select";
  return (
    <Card className="p-3 bg-muted/30">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1 pt-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">What the user sees</Label>
            <Input
              placeholder="e.g. Event date"
              value={field.label}
              onChange={(e) => {
                const label = e.target.value;
                onChange({ ...field, label, name: field.name || slugify(label) });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Field type</Label>
            <Select value={field.type} onValueChange={(v) => onChange({ ...field, type: v as FieldType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Internal name (auto)</Label>
            <Input
              value={field.name}
              onChange={(e) => onChange({ ...field, name: slugify(e.target.value) })}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Placeholder / hint</Label>
            <Input
              value={field.placeholder ?? ""}
              onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
            />
          </div>
          {needsOptions && (
            <div className="col-span-2">
              <Label className="text-xs">Options (one per line)</Label>
              <Textarea
                rows={3}
                value={(field.options ?? []).join("\n")}
                onChange={(e) => onChange({
                  ...field,
                  options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                })}
              />
            </div>
          )}
          <div className="col-span-2 flex items-center gap-2">
            <Switch
              checked={!!field.required}
              onCheckedChange={(v) => onChange({ ...field, required: v })}
            />
            <span className="text-xs text-muted-foreground">Required</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive p-1"
          title="Remove field"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

// ---------- Main page ----------
export default function AdminDesignTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Template>>(emptyTemplate());
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("design_templates")
      .select("*").order("sort_order").order("name");
    setTemplates((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (t?: Template) => {
    setEditing(t ? { ...t, mood: t.mood ?? "", input_fields: t.input_fields ?? [] } : emptyTemplate());
    setOpen(true);
  };

  const onFormatChange = (value: string) => {
    const preset = FORMAT_PRESETS.find((p) => p.value === value);
    if (!preset) return;
    setEditing((s) => ({
      ...s,
      design_type: preset.value,
      dimensions: { width: preset.width, height: preset.height },
    }));
  };

  const updateField = (i: number, next: InputField) => {
    setEditing((s) => {
      const arr = [...(s.input_fields ?? [])];
      arr[i] = next;
      return { ...s, input_fields: arr };
    });
  };
  const removeField = (i: number) => {
    setEditing((s) => {
      const arr = [...(s.input_fields ?? [])];
      arr.splice(i, 1);
      return { ...s, input_fields: arr };
    });
  };
  const moveField = (i: number, dir: -1 | 1) => {
    setEditing((s) => {
      const arr = [...(s.input_fields ?? [])];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return s;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...s, input_fields: arr };
    });
  };
  const addField = () => {
    setEditing((s) => ({ ...s, input_fields: [...(s.input_fields ?? []), newField()] }));
  };

  const uploadThumb = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const id = editing.id ?? `new-${Date.now()}`;
      const path = `design-template-thumbnails/${id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, {
        upsert: true, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("brand-assets").getPublicUrl(path);
      setEditing((s) => ({ ...s, thumbnail_url: pub.publicUrl }));
      toast.success("Thumbnail uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Name is required");
    const fields = (editing.input_fields ?? []).map((f) => ({
      ...f,
      name: f.name?.trim() || slugify(f.label || ""),
    }));
    if (fields.some((f) => !f.name || !f.label)) return toast.error("Every field needs a label");
    const payload: any = {
      name: editing.name.trim(),
      category: editing.category,
      design_type: editing.design_type,
      dimensions: editing.dimensions,
      base_prompt: editing.base_prompt ?? "",
      mood: editing.mood || null,
      input_fields: fields,
      thumbnail_url: editing.thumbnail_url ?? null,
      active: editing.active ?? true,
      sort_order: editing.sort_order ?? 0,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("design_templates").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("design_templates")
        .insert({ ...payload, is_system: false, sort_order: templates.length }));
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

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = templates.findIndex((t) => t.id === active.id);
    const newIdx = templates.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(templates, oldIdx, newIdx);
    setTemplates(reordered);
    // Persist all sort_orders in bulk
    const updates = reordered.map((t, i) =>
      supabase.from("design_templates").update({ sort_order: i }).eq("id", t.id),
    );
    await Promise.all(updates);
  };

  const promptHint = useMemo(() => {
    const fields = (editing.input_fields ?? []).map((f) => f.name).filter(Boolean);
    if (!fields.length) return "";
    return `Tip: reference fields by {{name}} — available here: ${fields.map((n) => `{{${n}}}`).join(", ")}`;
  }, [editing.input_fields]);

  return (
    <AppShell title="Design templates">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Design templates</h1>
          <p className="text-muted-foreground mt-1">
            The catalog every org sees in their template picker. Drag to reorder.
          </p>
        </div>
        <Button onClick={() => openEdit()}><Plus className="h-4 w-4 mr-2" />New template</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th></th>
              <th className="text-left p-3">Preview</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Format</th>
              <th className="text-left p-3">Engine</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={templates.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : templates.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No templates.</td></tr>
                ) : (
                  templates.map((t) => (
                    <SortableTemplateRow
                      key={t.id}
                      t={t}
                      onEdit={() => openEdit(t)}
                      onDelete={() => remove(t.id)}
                    />
                  ))
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit template" : "New template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basics */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Basics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Template name</Label>
                  <Input
                    placeholder="e.g. Tryout Announcement"
                    value={editing.name ?? ""}
                    onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editing.category}
                    onValueChange={(v) => setEditing((s) => ({ ...s, category: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_PRESETS.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Format / size</Label>
                  <Select value={editing.design_type} onValueChange={onFormatChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORMAT_PRESETS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Thumbnail */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Thumbnail (shown in org picker)
              </h3>
              <div className="flex items-center gap-4">
                {editing.thumbnail_url ? (
                  <img
                    src={editing.thumbnail_url}
                    alt=""
                    className="h-24 w-24 rounded object-cover border border-border"
                  />
                ) : (
                  <div className="h-24 w-24 rounded bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                    <Button asChild variant="outline" size="sm" disabled={uploading}>
                      <span>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {uploading ? "Uploading…" : "Upload thumbnail"}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadThumb(e.target.files[0])}
                    />
                  </label>
                  {editing.thumbnail_url && (
                    <button
                      type="button"
                      onClick={() => setEditing((s) => ({ ...s, thumbnail_url: null }))}
                      className="text-xs text-muted-foreground hover:text-destructive text-left"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Prompt + mood */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                What does this template create?
              </h3>
              <div>
                <Label>Design intent (plain English, 1–3 sentences)</Label>
                <Textarea
                  rows={4}
                  placeholder="A bold tryout poster: 'TRYOUTS' as the dominant headline, date/time second-largest, age groups as a chip row, location below, CTA at the bottom."
                  value={editing.base_prompt ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s, base_prompt: e.target.value }))}
                />
                {promptHint && (
                  <p className="text-xs text-muted-foreground mt-1.5">{promptHint}</p>
                )}
              </div>
              <div>
                <Label>Visual mood</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {MOOD_CHIPS.map((m) => {
                    const selected = (editing.mood ?? "").split(",").map((s) => s.trim()).includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const set = new Set((editing.mood ?? "").split(",").map((s) => s.trim()).filter(Boolean));
                          if (set.has(m)) set.delete(m); else set.add(m);
                          setEditing((s) => ({ ...s, mood: Array.from(set).join(", ") }));
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:border-primary"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                <Input
                  className="mt-2"
                  placeholder="Or type custom mood notes…"
                  value={editing.mood ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s, mood: e.target.value }))}
                />
              </div>
            </section>

            {/* Fields */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  What should the org fill in?
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Add field
                </Button>
              </div>
              <div className="space-y-2">
                {(editing.input_fields ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No fields yet. Add the things the org needs to provide (event date, photo, headline…).
                  </p>
                )}
                {(editing.input_fields ?? []).map((f, i) => (
                  <FieldRow
                    key={i}
                    field={f}
                    index={i}
                    total={(editing.input_fields ?? []).length}
                    onChange={(next) => updateField(i, next)}
                    onRemove={() => removeField(i)}
                    onMove={(dir) => moveField(i, dir)}
                  />
                ))}
              </div>
            </section>

            {/* Status */}
            <section className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.active ?? true}
                  onCheckedChange={(v) => setEditing((s) => ({ ...s, active: v }))}
                />
                <span className="text-sm">
                  {editing.active ? "Active — visible to all orgs" : "Inactive — hidden from orgs"}
                </span>
              </div>
              {editing.id && (
                <span className="text-xs text-muted-foreground">
                  Engine:{" "}
                  <strong>
                    {editing.generation_engine === "stability_sharp" ? "Slot-based (Stability + composite)" : "AI HTML (Gemini)"}
                  </strong>
                </span>
              )}
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
