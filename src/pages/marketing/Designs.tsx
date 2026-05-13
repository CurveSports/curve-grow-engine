import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Plus, Sparkles, Loader2, Image as ImageIcon, Search } from "lucide-react";

type Template = {
  id: string;
  name: string;
  category: string;
  design_type: string;
  dimensions: any;
  base_prompt: string;
  input_fields: any[];
};

type Design = {
  id: string;
  name: string | null;
  design_type: string;
  status: string;
  preview_url: string | null;
  created_at: string;
  template_id: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-destructive/10 text-destructive",
};

export default function Designs() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { orgId } = useEffectiveOrg();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [pickOpen, setPickOpen] = useState(false);
  const [picked, setPicked] = useState<Template | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const [dRes, tRes] = await Promise.all([
      supabase.from("designs").select("id,name,design_type,status,preview_url,created_at,template_id").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200),
      supabase.from("design_templates").select("*").eq("active", true).order("sort_order"),
    ]);
    setDesigns((dRes.data ?? []) as Design[]);
    setTemplates((tRes.data ?? []) as Template[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return designs.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (!q) return true;
      return (d.name || "").toLowerCase().includes(q);
    });
  }, [designs, search, statusFilter]);

  const startGenerate = async () => {
    if (!picked || !orgId) return;
    // validate required
    for (const f of picked.input_fields ?? []) {
      if (f.required && !inputs[f.name]) {
        return toast.error(`${f.label} is required`);
      }
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-design", {
        body: { template_id: picked.id, org_id: orgId, prompt_input: inputs },
      });
      if (error) throw error;
      toast.success("Design generated");
      setPickOpen(false);
      setPicked(null);
      setInputs({});
      navigate(`/marketing/designs/${data.design_id}`);
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const categories = useMemo(() => Array.from(new Set(templates.map((t) => t.category))), [templates]);

  return (
    <AppShell title="Designs">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Designs</h1>
          <p className="text-muted-foreground mt-1">AI-generated, on-brand assets for every campaign.</p>
        </div>
        <Button onClick={() => setPickOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New design
        </Button>
      </div>

      <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search designs…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-semibold mb-1">No designs yet</p>
          <p className="text-sm text-muted-foreground mb-4">Pick a template, fill in a few details, and we'll generate it for you.</p>
          <Button onClick={() => setPickOpen(true)}><Plus className="h-4 w-4 mr-2" />Create your first design</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((d) => (
            <Link key={d.id} to={`/marketing/designs/${d.id}`}>
              <Card className="overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                  {d.preview_url ? (
                    <img src={d.preview_url} alt={d.name || "Design"} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate flex-1">{d.name || "Untitled"}</p>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${STATUS_BADGE[d.status] ?? STATUS_BADGE.draft}`}>{d.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(d.created_at).toLocaleDateString()}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Template picker / generator */}
      <Dialog open={pickOpen} onOpenChange={(o) => { setPickOpen(o); if (!o) { setPicked(null); setInputs({}); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{picked ? `New: ${picked.name}` : "Pick a template"}</DialogTitle></DialogHeader>

          {!picked ? (
            <div className="space-y-6">
              {categories.map((cat) => (
                <div key={cat}>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">{cat}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {templates.filter((t) => t.category === cat).map((t) => (
                      <button key={t.id} onClick={() => setPicked(t)} className="text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/30 transition-colors">
                        <p className="font-display font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.dimensions?.width}×{t.dimensions?.height} · {t.design_type}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Fill in these details — AI will compose the design from your brand kit.</p>
              {(picked.input_fields ?? []).map((f: any) => (
                <div key={f.name}>
                  <Label>{f.label}{f.required && <span className="text-destructive ml-1">*</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea rows={3} placeholder={f.placeholder} value={inputs[f.name] ?? ""} onChange={(e) => setInputs((s) => ({ ...s, [f.name]: e.target.value }))} />
                  ) : f.type === "photo_selector" ? (
                    <PhotoSelector orgId={orgId!} value={inputs[f.name] ?? ""} onChange={(v) => setInputs((s) => ({ ...s, [f.name]: v }))} />
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"}
                      placeholder={f.placeholder}
                      value={inputs[f.name] ?? ""}
                      onChange={(e) => setInputs((s) => ({ ...s, [f.name]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            {picked && <Button variant="ghost" onClick={() => { setPicked(null); setInputs({}); }}>← Back to templates</Button>}
            <Button variant="outline" onClick={() => setPickOpen(false)}>Cancel</Button>
            {picked && (
              <Button onClick={startGenerate} disabled={generating}>
                {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function PhotoSelector({ orgId, value, onChange }: { orgId: string; value: string; onChange: (v: string) => void }) {
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  useEffect(() => {
    supabase.from("org_brand_assets").select("id,url").eq("org_id", orgId).eq("archived", false).eq("asset_type", "photo").order("uploaded_at", { ascending: false }).limit(40).then(({ data }) => {
      setPhotos((data ?? []) as any);
    });
  }, [orgId]);
  if (!photos.length) return <p className="text-xs text-muted-foreground mt-1">No photos in your library yet — add them under Brand Kit.</p>;
  return (
    <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 mt-1">
      {photos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.url)}
          className={`aspect-square rounded overflow-hidden border-2 transition-all ${value === p.url ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"}`}
        >
          <img src={p.url} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}
