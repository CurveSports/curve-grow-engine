import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Loader2, Wand2, Copy, Download, CheckCircle2, XCircle, Send, Mail, Trash2 } from "lucide-react";
import { useMarketingLink } from "@/hooks/useMarketingLink";
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

type Design = {
  id: string;
  org_id: string;
  name: string | null;
  design_type: string;
  status: string;
  generated_html: string | null;
  preview_url: string | null;
  export_urls: any;
  template_id: string | null;
  parent_design_id: string | null;
  created_at: string;
};

type Template = { id: string; name: string; dimensions: any };
type Refinement = { id: string; refinement_prompt: string; created_at: string };

export default function DesignEditor() {
  const { id } = useParams<{ id: string }>();
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const ml = useMarketingLink();
  const isAdmin = role === "admin";

  const [design, setDesign] = useState<Design | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [refinements, setRefinements] = useState<Refinement[]>([]);
  const [variations, setVariations] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);
  const [varying, setVarying] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: d } = await supabase.from("designs").select("*").eq("id", id).single();
    if (!d) { setLoading(false); return; }
    setDesign(d as Design);
    setName(d.name || "");
    const promises: any[] = [
      supabase.from("design_refinements").select("id,refinement_prompt,created_at").eq("design_id", id).order("created_at", { ascending: false }),
      supabase.from("designs").select("id,name,preview_url,status,design_type,created_at,template_id,parent_design_id,generated_html,org_id,export_urls").eq("parent_design_id", id),
    ];
    if (d.template_id) promises.push(supabase.from("design_templates").select("id,name,dimensions").eq("id", d.template_id).single());
    const [refRes, varRes, tplRes] = await Promise.all(promises);
    setRefinements((refRes.data ?? []) as Refinement[]);
    setVariations((varRes.data ?? []) as Design[]);
    if (tplRes?.data) setTemplate(tplRes.data as Template);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Realtime: live-update this design while AI is generating in the background
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`design-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "designs", filter: `id=eq.${id}` },
        (payload: any) => {
          setDesign((prev) => (prev ? { ...prev, ...(payload.new as any) } : (payload.new as any)));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleRetry = async () => {
    if (!design?.template_id || !id) return;
    setRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-design", {
        body: {
          template_id: design.template_id,
          org_id: design.org_id,
          prompt_input: (design as any).prompt_input || {},
          style_direction: (design as any).prompt_input?.style_direction || "bold_sport",
        },
      });
      if (error) throw error;
      toast.success("Retrying — opening the new generation.");
      if (data?.design_id) navigate(ml(`/marketing/designs/${data.design_id}`));
    } catch (e: any) {
      toast.error(e.message || "Retry failed");
    } finally {
      setRefining(false);
    }
  };

  const previewSrc = useMemo(() => {
    if (!design?.generated_html) return "";
    return `data:text/html;charset=utf-8,${encodeURIComponent(design.generated_html)}`;
  }, [design?.generated_html]);

  const handleRefine = async () => {
    if (!refinePrompt.trim() || !id) return;
    setRefining(true);
    try {
      const { error } = await supabase.functions.invoke("refine-design", {
        body: { design_id: id, refinement_prompt: refinePrompt.trim() },
      });
      if (error) throw error;
      toast.success("Refinement applied");
      setRefinePrompt("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Refinement failed");
    } finally {
      setRefining(false);
    }
  };

  const handleVariations = async () => {
    if (!id) return;
    setVarying(true);
    try {
      const { error } = await supabase.functions.invoke("generate-variations", {
        body: { design_id: id, count: 3 },
      });
      if (error) throw error;
      toast.success("Variations created");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setVarying(false);
    }
  };

  const handleExport = async (format: "png" | "jpg" | "pdf", scale = 1) => {
    if (!id) return;
    setExporting(`${format}_${scale}x`);
    try {
      const { data, error } = await supabase.functions.invoke("render-design", {
        body: { design_id: id, format, scale },
      });
      if (error) throw error;
      window.open(data.url, "_blank");
      load();
    } catch (e: any) {
      toast.error(e.message || "Export failed (renderer pending — Browserless token will enable PNG/PDF export)");
    } finally {
      setExporting(null);
    }
  };

  // (approval workflow removed — designs are usable as soon as they're generated)

  const saveName = async () => {
    if (!id) return;
    await supabase.from("designs").update({ name }).eq("id", id);
    toast.success("Name updated");
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const { error } = await supabase.from("designs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      setDeleting(false);
    } else {
      toast.success("Design deleted");
      navigate(ml("/marketing/designs"));
    }
  };

  if (loading) return <AppShell title="Design"><div className="p-8 text-muted-foreground">Loading…</div></AppShell>;
  if (!design) return <AppShell title="Design"><div className="p-8">Design not found.</div></AppShell>;

  const w = template?.dimensions?.width || 1080;
  const h = template?.dimensions?.height || 1080;

  return (
    <AppShell title="Design">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(ml("/marketing/designs"))}><ArrowLeft className="h-4 w-4 mr-1" />All designs</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} className="font-display text-lg font-semibold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 max-w-md" />
              <span className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded ${design.status === "ready" || design.status === "draft" ? "bg-green-100 text-green-800" : design.status === "failed" ? "bg-destructive/10 text-destructive" : design.status === "generating" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"}`}>{design.status === "draft" ? "ready" : design.status.replace("_", " ")}</span>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-center overflow-auto" style={{ minHeight: 400 }}>
              {design.status === "generating" ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div>
                    <p className="font-display font-semibold text-lg">Generating your design…</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      AI is composing layout, applying your brand kit, and writing the HTML. This usually takes 20–60 seconds. You can close this page — we'll save it when it's ready.
                    </p>
                  </div>
                </div>
              ) : design.status === "failed" ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-4">
                  <XCircle className="h-12 w-12 text-destructive" />
                  <div className="space-y-2">
                    <p className="font-display font-semibold text-lg">Generation failed</p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {(design as any).generation_error || "Something went wrong while generating this design."}
                    </p>
                    <Button onClick={handleRetry} disabled={refining} size="sm" className="mt-2">
                      {refining ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Retrying…</> : <><Sparkles className="h-4 w-4 mr-2" />Retry generation</>}
                    </Button>
                  </div>
                </div>
              ) : design.generated_html ? (
                <iframe
                  srcDoc={design.generated_html}
                  title="Design preview"
                  style={{ width: w, height: h, transform: `scale(${Math.min(1, 600 / w, 600 / h)})`, transformOrigin: "center", border: "1px solid hsl(var(--border))", background: "white" }}
                  sandbox="allow-same-origin"
                />
              ) : design.preview_url ? (
                <img
                  src={design.preview_url}
                  alt={design.name || "Design preview"}
                  style={{ width: w, height: h, transform: `scale(${Math.min(1, 600 / w, 600 / h)})`, transformOrigin: "center", border: "1px solid hsl(var(--border))", background: "white", objectFit: "cover" }}
                />
              ) : (
                <div className="flex items-center justify-center text-sm text-muted-foreground p-8">No preview available.</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">{w} × {h}px</p>
          </Card>

          {/* Variations */}
          {variations.length > 0 && (
            <Card className="p-4 mt-4">
              <h3 className="font-display font-semibold mb-3">Variations</h3>
              <div className="grid grid-cols-3 gap-3">
                {variations.map((v) => (
                  <Link key={v.id} to={ml(`/marketing/designs/${v.id}`)}>
                    <div className="aspect-square bg-muted rounded overflow-hidden hover:ring-2 hover:ring-primary transition-all">
                      {v.preview_url ? <img src={v.preview_url} alt={v.name || ""} className="w-full h-full object-cover" /> : (
                        <iframe srcDoc={v.generated_html || ""} className="w-full h-full pointer-events-none" sandbox="allow-same-origin" title={v.name || ""} />
                      )}
                    </div>
                    <p className="text-xs mt-1 truncate">{v.name}</p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Refine */}
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-2 flex items-center gap-2"><Wand2 className="h-4 w-4" />Refine with AI</h3>
            <Textarea
              rows={3}
              placeholder="e.g. Make the headline bigger and add more energy"
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
            />
            <Button onClick={handleRefine} disabled={refining || !refinePrompt.trim()} className="w-full mt-2">
              {refining ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Refining…</> : <><Sparkles className="h-4 w-4 mr-2" />Apply refinement</>}
            </Button>
            <Button variant="outline" onClick={handleVariations} disabled={varying} className="w-full mt-2">
              {varying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : <><Copy className="h-4 w-4 mr-2" />Generate 3 variations</>}
            </Button>
          </Card>

          {/* Use design */}
          {(design.status === "ready" || design.status === "draft") && (
            <Card className="p-4">
              <h3 className="font-display font-semibold mb-3">Use this design</h3>
              <Button onClick={() => navigate(ml(`/marketing/emails/new?design=${design.id}`))} className="w-full">
                <Mail className="h-4 w-4 mr-2" />Use in email
              </Button>
            </Card>
          )}

          {/* Export */}
          <Card className="p-4">
            <h3 className="font-display font-semibold mb-3">Export</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["png", "jpg", "pdf"] as const).flatMap((fmt) =>
                (fmt === "pdf" ? [1] : [1, 2]).map((scale) => (
                  <Button key={`${fmt}_${scale}`} variant="outline" size="sm" onClick={() => handleExport(fmt, scale)} disabled={exporting !== null}>
                    {exporting === `${fmt}_${scale}x` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                    {fmt.toUpperCase()}{scale > 1 ? ` ${scale}×` : ""}
                  </Button>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Renderer is currently a stub — exports return a placeholder until the Browserless token is configured.</p>
          </Card>

          {/* Refinement history */}
          {refinements.length > 0 && (
            <Card className="p-4">
              <h3 className="font-display font-semibold mb-2">Refinement history</h3>
              <ul className="space-y-2 text-xs">
                {refinements.map((r) => (
                  <li key={r.id} className="border-l-2 border-border pl-2">
                    <p>{r.refinement_prompt}</p>
                    <p className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Delete */}
          <Card className="p-4 border-destructive/20">
            <h3 className="font-display font-semibold mb-3 text-destructive">Danger zone</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />Delete design
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this design?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove “{design.name || "Untitled"}” and its refinement history. Variations will become standalone designs. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
