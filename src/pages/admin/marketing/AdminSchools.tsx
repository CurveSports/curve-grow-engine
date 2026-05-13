import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BadgeCheck, AlertCircle } from "lucide-react";

type School = {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  state: string | null;
  level: string;
  athletic_conference: string | null;
  mascot: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  website: string | null;
  aliases: string[] | null;
  verified: boolean;
  active: boolean;
};

const empty = (): Partial<School> => ({
  name: "", level: "NCAA D1", verified: true, active: true, aliases: [],
});

export default function AdminSchools() {
  const [items, setItems] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unverified">("all");
  const [editing, setEditing] = useState<Partial<School> | null>(null);
  const [aliasText, setAliasText] = useState("");
  const [uploading, setUploading] = useState(false);

  const uploadLogo = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `school-logos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
    setEditing((prev) => prev ? { ...prev, logo_url: data.publicUrl } : prev);
    setUploading(false);
    toast.success("Logo uploaded");
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("schools").select("*").order("verified", { ascending: false }).order("name");
    setItems((data ?? []) as School[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((s) => {
      if (filter === "unverified" && s.verified) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.short_name ?? "").toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q) ||
        (s.state ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, filter]);

  const openEdit = (s?: School) => {
    const v = s ?? empty();
    setEditing(v);
    setAliasText((v.aliases ?? []).join(", "));
  };

  const save = async () => {
    if (!editing?.name) return toast.error("Name required");
    const aliases = aliasText.split(",").map((a) => a.trim()).filter(Boolean);
    const payload: any = {
      name: editing.name, short_name: editing.short_name || null,
      city: editing.city || null, state: editing.state || null,
      level: editing.level || "NCAA D1",
      athletic_conference: editing.athletic_conference || null,
      mascot: editing.mascot || null,
      logo_url: editing.logo_url || null,
      primary_color: editing.primary_color || null,
      secondary_color: editing.secondary_color || null,
      website: editing.website || null,
      aliases,
      verified: editing.verified ?? true,
      active: editing.active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("schools").update(payload).eq("id", editing.id)
      : await supabase.from("schools").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete school?")) return;
    const { error } = await supabase.from("schools").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const verify = async (id: string) => {
    await supabase.from("schools").update({ verified: true }).eq("id", id);
    load();
  };

  const unverifiedCount = items.filter((s) => !s.verified).length;

  return (
    <AppShell title="Schools library">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Schools library</h1>
          <p className="text-muted-foreground mt-1">Searchable catalog used by commit announcements and any other template that needs a school logo.</p>
        </div>
        <Button onClick={() => openEdit()}><Plus className="h-4 w-4 mr-2" />Add school</Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All ({items.length})</Button>
        <Button variant={filter === "unverified" ? "default" : "outline"} size="sm" onClick={() => setFilter("unverified")}>
          Needs review ({unverifiedCount})
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3">Logo</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Location</th>
              <th className="text-left p-3">Level</th>
              <th className="text-left p-3">Conference</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No schools.</td></tr>
            : filtered.map((s) => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3">
                  {s.logo_url ? <img src={s.logo_url} alt="" className="h-8 w-8 object-contain" /> : <div className="h-8 w-8 bg-muted rounded" />}
                </td>
                <td className="p-3 font-medium">
                  {s.name}
                  {s.short_name && <span className="ml-2 text-xs text-muted-foreground">({s.short_name})</span>}
                </td>
                <td className="p-3 text-muted-foreground">{[s.city, s.state].filter(Boolean).join(", ")}</td>
                <td className="p-3 text-muted-foreground">{s.level}</td>
                <td className="p-3 text-muted-foreground">{s.athletic_conference}</td>
                <td className="p-3">
                  {s.verified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300"><BadgeCheck className="h-3.5 w-3.5" />Verified</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><AlertCircle className="h-3.5 w-3.5" />User-added</span>
                  )}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {!s.verified && <button onClick={() => verify(s.id)} className="text-xs text-primary hover:underline mr-2">Verify</button>}
                  <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground p-1"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive p-1 ml-1"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} school</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Full name</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Short name</Label><Input value={editing.short_name ?? ""} onChange={(e) => setEditing({ ...editing, short_name: e.target.value })} /></div>
              <div><Label>Mascot</Label><Input value={editing.mascot ?? ""} onChange={(e) => setEditing({ ...editing, mascot: e.target.value })} /></div>
              <div><Label>City</Label><Input value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={editing.state ?? ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })} /></div>
              <div>
                <Label>Level</Label>
                <select value={editing.level ?? "NCAA D1"} onChange={(e) => setEditing({ ...editing, level: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option>NCAA D1</option><option>NCAA D2</option><option>NCAA D3</option>
                  <option>NAIA</option><option>JUCO</option><option>HS</option><option>INTL</option>
                </select>
              </div>
              <div><Label>Conference</Label><Input value={editing.athletic_conference ?? ""} onChange={(e) => setEditing({ ...editing, athletic_conference: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
                    className="flex-1"
                  />
                  {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
                </div>
                <Input className="mt-2" value={editing.logo_url ?? ""} onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })} placeholder="…or paste image URL" />
                {editing.logo_url && <img src={editing.logo_url} alt="" className="h-12 mt-2 object-contain" />}
              </div>
              <div><Label>Primary color</Label><Input value={editing.primary_color ?? ""} onChange={(e) => setEditing({ ...editing, primary_color: e.target.value })} placeholder="#9E1B32" /></div>
              <div><Label>Secondary color</Label><Input value={editing.secondary_color ?? ""} onChange={(e) => setEditing({ ...editing, secondary_color: e.target.value })} placeholder="#FFFFFF" /></div>
              <div className="col-span-2"><Label>Website</Label><Input value={editing.website ?? ""} onChange={(e) => setEditing({ ...editing, website: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Aliases (comma-separated)</Label>
                <Input value={aliasText} onChange={(e) => setAliasText(e.target.value)} placeholder="Bama, Roll Tide" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.verified ?? true} onChange={(e) => setEditing({ ...editing, verified: e.target.checked })} />
                Verified
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active
              </label>
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
