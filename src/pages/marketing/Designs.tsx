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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Sparkles, Loader2, Image as ImageIcon, Search, Trash2 } from "lucide-react";
import { useMarketingLink } from "@/hooks/useMarketingLink";
import SchoolPicker from "@/components/marketing/SchoolPicker";
import MediaPicker from "@/components/marketing/MediaPicker";

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
  generating: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  failed: "bg-destructive/10 text-destructive",
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-destructive/10 text-destructive",
};

export default function Designs() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const ml = useMarketingLink();
  const { orgId } = useEffectiveOrg();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [pickOpen, setPickOpen] = useState(false);
  const [picked, setPicked] = useState<Template | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [styleDirection, setStyleDirection] = useState<string>("bold_sport");
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Realtime: keep design rows in sync as generation completes / fails in the background
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`designs-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "designs", filter: `org_id=eq.${orgId}` },
        (payload: any) => {
          setDesigns((prev) => {
            if (payload.eventType === "DELETE") return prev.filter((d) => d.id !== payload.old.id);
            const row = payload.new as Design;
            const idx = prev.findIndex((d) => d.id === row.id);
            if (idx === -1) return [row, ...prev];
            const next = [...prev];
            next[idx] = { ...next[idx], ...row };
            return next;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

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
    for (const f of picked.input_fields ?? []) {
      if (f.required && !inputs[f.name]) {
        return toast.error(`${f.label} is required`);
      }
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-design", {
        body: { template_id: picked.id, org_id: orgId, prompt_input: inputs, style_direction: styleDirection },
      });
      if (error) throw error;
      toast.success("Generating in the background — we'll let you know when it's ready.");
      setPickOpen(false);
      setPicked(null);
      setInputs({});
      // Optimistically navigate to the new design's editor so the user sees progress
      if (data?.design_id) navigate(ml(`/marketing/designs/${data.design_id}`));
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (designId: string) => {
    setDeletingId(designId);
    const { error } = await supabase.from("designs").delete().eq("id", designId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Design deleted");
      setDesigns((prev) => prev.filter((d) => d.id !== designId));
    }
    setDeletingId(null);
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
            <Link key={d.id} to={ml(`/marketing/designs/${d.id}`)}>
              <Card className="overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
                  {d.status === "generating" ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs font-medium">Generating…</p>
                    </div>
                  ) : d.status === "failed" ? (
                    <div className="flex flex-col items-center gap-1 text-destructive px-2 text-center">
                      <ImageIcon className="h-8 w-8" />
                      <p className="text-xs font-medium">Generation failed</p>
                    </div>
                  ) : d.preview_url ? (
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
                    <MediaPicker
                      orgId={orgId!}
                      mode="image"
                      value={inputs[f.name] ?? ""}
                      onChange={(url) => setInputs((s) => ({ ...s, [f.name]: url ?? "" }))}
                      compact
                    />
                  ) : f.type === "school_picker" ? (
                    <SchoolPicker
                      value={inputs[f.name] ?? ""}
                      logoUrl={inputs[f.logo_field || "school_logo_url"] ?? ""}
                      onChange={(next) => setInputs((s) => ({
                        ...s,
                        [f.name]: next.name,
                        [f.logo_field || "school_logo_url"]: next.logo_url ?? "",
                      }))}
                    />
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

              {/* Image slots — always available, optional unless template requires */}
              <div className="pt-4 border-t space-y-3">
                <div>
                  <Label>Hero image</Label>
                  <p className="text-xs text-muted-foreground mb-2">The dominant photo. Upload new or pick from your library.</p>
                  <MediaPicker
                    orgId={orgId!}
                    mode="image"
                    value={inputs.hero_photo_url ?? ""}
                    onChange={(url) => setInputs((s) => ({ ...s, hero_photo_url: url ?? "" }))}
                    compact
                  />
                </div>
                <div>
                  <Label>Secondary image <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground mb-2">Used as a sidebar, sticker, or collage element.</p>
                  <MediaPicker
                    orgId={orgId!}
                    mode="image"
                    value={inputs.secondary_photo_url ?? ""}
                    onChange={(url) => setInputs((s) => ({ ...s, secondary_photo_url: url ?? "" }))}
                    compact
                  />
                </div>
                <div>
                  <Label>Sponsor / partner logo <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground mb-2">Adds a "presented by" lockup to the design.</p>
                  <MediaPicker
                    orgId={orgId!}
                    mode="image"
                    value={inputs.sponsor_logo_url ?? ""}
                    onChange={(url) => setInputs((s) => ({ ...s, sponsor_logo_url: url ?? "" }))}
                    compact
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="mb-2 block">Style direction</Label>
                <p className="text-xs text-muted-foreground mb-3">How should this look? Pick a visual treatment — your brand colors and fonts apply to all of them.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: "bold_sport", label: "Bold Sport", blurb: "Diagonal cuts, duotone, gameday energy" },
                    { key: "editorial", label: "Editorial", blurb: "Magazine layout, asymmetric, refined" },
                    { key: "minimal_modern", label: "Minimal Modern", blurb: "Restrained, whitespace, one hero" },
                    { key: "vintage_athletic", label: "Vintage Athletic", blurb: "Varsity, crest, heritage feel" },
                    { key: "high_energy", label: "High-Energy Neon", blurb: "Saturated, sticker chips, glitch text" },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setStyleDirection(s.key)}
                      className={`text-left p-3 rounded-lg border transition-all ${styleDirection === s.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
                    >
                      <p className="font-semibold text-sm">{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.blurb}</p>
                    </button>
                  ))}
                </div>
              </div>
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

