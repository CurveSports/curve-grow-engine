import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

type School = {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  state: string | null;
  level: string;
  logo_url: string | null;
  athletic_conference: string | null;
};

interface Props {
  /** Currently selected school name (we display this in the trigger) */
  value: string;
  /** Currently saved logo URL (so we can show preview when re-opening) */
  logoUrl?: string;
  /** Called when a school is picked. Provides name + logo URL together. */
  onChange: (next: { name: string; logo_url: string | null }) => void;
}

export default function SchoolPicker({ value, logoUrl, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const debRef = useRef<number | null>(null);

  // Search as you type (debounced)
  useEffect(() => {
    if (!open) return;
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(async () => {
      setLoading(true);
      const term = q.trim();
      let query = supabase
        .from("schools")
        .select("id,name,short_name,city,state,level,logo_url,athletic_conference")
        .eq("active", true)
        .order("verified", { ascending: false })
        .order("name")
        .limit(40);
      if (term) {
        // ilike across multiple columns
        query = query.or(
          `name.ilike.%${term}%,short_name.ilike.%${term}%,city.ilike.%${term}%,aliases.cs.{${term}}`
        );
      }
      const { data } = await query;
      setResults((data ?? []) as School[]);
      setLoading(false);
    }, 200);
    return () => { if (debRef.current) window.clearTimeout(debRef.current); };
  }, [q, open]);

  const pick = (s: School) => {
    onChange({ name: s.name, logo_url: s.logo_url });
    setOpen(false);
    setQ("");
  };

  const clear = () => onChange({ name: "", logo_url: null });

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 flex items-center gap-3 h-10 px-3 rounded-md border border-input bg-background text-sm hover:border-primary transition-colors text-left"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={value ? "" : "text-muted-foreground"}>
            {value || "Search for a school…"}
          </span>
        </button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Find a school</DialogTitle></DialogHeader>
          <Input
            autoFocus
            placeholder="Search by name, city, or nickname (e.g. Bama, UCLA)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="max-h-96 overflow-y-auto -mx-2">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No schools match.</div>
            ) : (
              <ul className="divide-y divide-border">
                {results.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-muted/40 rounded text-left"
                    >
                      <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt="" className="h-9 w-9 object-contain" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">no logo</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[s.city, s.state].filter(Boolean).join(", ")} · {s.level}
                          {s.athletic_conference && ` · ${s.athletic_conference}`}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter className="!justify-between">
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setSuggestOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Can't find it? Add a school
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuggestSchoolDialog
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        onCreated={(s) => pick(s)}
        initialName={q}
      />
    </>
  );
}

function SuggestSchoolDialog({
  open, onOpenChange, onCreated, initialName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (s: School) => void;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [level, setLevel] = useState("HS");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (open) setName(initialName); }, [open, initialName]);

  const uploadLogo = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `school-logos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: false, contentType: file.type });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    setUploading(false);
    toast.success("Logo uploaded");
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Name required");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("schools")
      .insert({
        name: name.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        level,
        logo_url: logoUrl.trim() || null,
        verified: false,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("School added — visible to everyone immediately");
    onChange_done(data);
    onOpenChange(false);
  };

  const onChange_done = (data: any) => onCreated(data as School);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a school</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lincoln High School" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="CA" />
            </div>
          </div>
          <div>
            <Label>Level</Label>
            <select value={level} onChange={(e) => setLevel(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              <option value="HS">High School</option>
              <option value="JUCO">JUCO</option>
              <option value="NAIA">NAIA</option>
              <option value="NCAA D3">NCAA D3</option>
              <option value="NCAA D2">NCAA D2</option>
              <option value="NCAA D1">NCAA D1</option>
              <option value="INTL">International</option>
            </select>
          </div>
          <div>
            <Label>Logo URL (optional)</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
            {logoUrl && (
              <img src={logoUrl} alt="" className="h-12 mt-2 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Add school"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
