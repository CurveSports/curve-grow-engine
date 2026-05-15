import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, ImageOff, Palette, RotateCcw, ArrowLeft, Sparkles } from "lucide-react";
import { extractColors, suggestPrimaryAccent, ExtractedColor } from "@/lib/colorExtract";
import { LogoEnhancingOverlay } from "@/components/branding/LogoEnhancingOverlay";

const DEFAULT_PRIMARY = "222 47% 11%";
const DEFAULT_ACCENT = "142 71% 45%";

function hexToHsl(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
function hslToHex(hsl: string | null): string {
  if (!hsl) return "#000000";
  const m = hsl.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/);
  if (!m) return "#000000";
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) r = g = b = l;
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function AdminOrgBranding() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [logoQuality, setLogoQuality] = useState<string | null>(null);
  const [logoStatus, setLogoStatus] = useState<string | null>(null);
  const [logoDims, setLogoDims] = useState<{ w: number; h: number } | null>(null);
  const [primaryHex, setPrimaryHex] = useState(hslToHex(DEFAULT_PRIMARY));
  const [accentHex, setAccentHex] = useState(hslToHex(DEFAULT_ACCENT));
  const [palette, setPalette] = useState<ExtractedColor[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!orgId) return;
    const [{ data: org }, { data: branding }] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      supabase.from("org_branding").select("logo_url, logo_original_url, logo_quality, logo_processing_status, logo_width, logo_height, primary_hsl, accent_hsl").eq("org_id", orgId).maybeSingle(),
    ]);
    setOrgName(org?.name ?? "");
    setLogoUrl(branding?.logo_url ?? null);
    setOriginalUrl((branding as any)?.logo_original_url ?? null);
    setLogoQuality((branding as any)?.logo_quality ?? null);
    setLogoStatus((branding as any)?.logo_processing_status ?? null);
    const w = (branding as any)?.logo_width;
    const h = (branding as any)?.logo_height;
    setLogoDims(w && h ? { w, h } : null);
    setPrimaryHex(hslToHex(branding?.primary_hsl ?? DEFAULT_PRIMARY));
    setAccentHex(hslToHex(branding?.accent_hsl ?? DEFAULT_ACCENT));
    if (branding?.logo_url) runExtraction(branding.logo_url);
  };

  // Poll while processing
  useEffect(() => {
    if (logoStatus !== "pending" || !orgId) return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("org_branding")
        .select("logo_url, logo_quality, logo_processing_status, logo_processing_error")
        .eq("org_id", orgId)
        .maybeSingle();
      const status = (data as any)?.logo_processing_status;
      if (status && status !== "pending") {
        setLogoUrl(data?.logo_url ?? null);
        setLogoQuality((data as any)?.logo_quality ?? null);
        setLogoStatus(status);
        if (status === "ready") toast.success("Logo enhanced");
        else if (status === "failed") toast.warning("Couldn't enhance logo — using original");
        if (data?.logo_url) runExtraction(data.logo_url);
        clearInterval(t);
      }
    }, 2500);
    return () => clearInterval(t);
  }, [logoStatus, orgId]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const runExtraction = async (url: string) => {
    setExtracting(true);
    try {
      const colors = await extractColors(url, 6);
      setPalette(colors);
    } catch (err) { console.warn(err); }
    finally { setExtracting(false); }
  };

  const probeImage = (file: File): Promise<{ w: number; h: number; isVector: boolean }> =>
    new Promise((resolve) => {
      const isVector = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
      if (isVector) return resolve({ w: 0, h: 0, isVector: true });
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ w: img.naturalWidth, h: img.naturalHeight, isVector: false });
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 0, h: 0, isVector: false }); };
      img.src = url;
    });

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId || !user) return;
    if (file.size > 5 * 1024 * 1024) { e.target.value = ""; return toast.error("Logo must be under 5 MB"); }

    setUploading(true);
    const { w, h, isVector } = await probeImage(file);
    const longEdge = Math.max(w, h);
    const fmt = isVector ? "svg" : (file.name.split(".").pop() || "png").toLowerCase();

    if (!isVector && longEdge > 0 && longEdge < 512) {
      setUploading(false);
      e.target.value = "";
      return toast.error(`Image is too small (${w}×${h}). Please upload at least 512px on the long edge.`);
    }
    if (!isVector && longEdge > 0 && longEdge < 1024) {
      toast.info(`Low-resolution source (${w}×${h}) — we'll auto-enhance it.`);
    }

    const path = `${orgId}/logo-original-${Date.now()}.${fmt}`;
    const { error: upErr } = await supabase.storage.from("org-logos").upload(path, file, {
      cacheControl: "3600", contentType: file.type,
    });
    if (upErr) { setUploading(false); e.target.value = ""; return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);

    // Initial upsert: show the original immediately
    const { error: dbErr } = await supabase.from("org_branding").upsert({
      org_id: orgId,
      logo_url: pub.publicUrl,
      logo_original_url: pub.publicUrl,
      logo_width: w || null,
      logo_height: h || null,
      logo_format: fmt,
      logo_processing_status: isVector ? "skipped" : "pending",
      logo_quality: isVector ? "vector" : (longEdge >= 1500 ? "high" : longEdge >= 1024 ? "medium" : "low"),
      updated_by: user.id,
    }, { onConflict: "org_id" });
    if (dbErr) { setUploading(false); e.target.value = ""; return toast.error(dbErr.message); }

    setLogoUrl(pub.publicUrl);
    setOriginalUrl(pub.publicUrl);
    setLogoDims(w && h ? { w, h } : null);
    setLogoStatus(isVector ? "skipped" : "pending");
    setLogoQuality(isVector ? "vector" : (longEdge >= 1500 ? "high" : longEdge >= 1024 ? "medium" : "low"));
    setUploading(false);
    e.target.value = "";

    if (isVector) {
      toast.success("Vector logo uploaded — no processing needed");
      runExtraction(pub.publicUrl);
      return;
    }

    toast.success("Uploaded — enhancing in the background…");
    // Fire-and-forget enhancement
    supabase.functions.invoke("process-org-logo", {
      body: { org_id: orgId, original_url: pub.publicUrl, width: w, height: h, format: fmt, is_vector: false },
    }).catch((err) => console.warn("enhance trigger failed", err));
  };

  const removeLogo = async () => {
    if (!orgId || !user) return;
    const { error } = await supabase.from("org_branding").update({ logo_url: null, updated_by: user.id }).eq("org_id", orgId);
    if (error) return toast.error(error.message);
    setLogoUrl(null);
    setPalette([]);
    toast.success("Logo removed");
  };

  const save = async () => {
    if (!orgId || !user) return;
    setSaving(true);
    const { error } = await supabase.from("org_branding").upsert({
      org_id: orgId,
      primary_hsl: hexToHsl(primaryHex),
      accent_hsl: hexToHsl(accentHex),
      updated_by: user.id,
    }, { onConflict: "org_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Branding saved");
  };

  const reset = () => {
    setPrimaryHex(hslToHex(DEFAULT_PRIMARY));
    setAccentHex(hslToHex(DEFAULT_ACCENT));
  };

  const applySuggested = () => {
    const { primary, accent } = suggestPrimaryAccent(palette);
    if (primary) setPrimaryHex(primary.hex);
    if (accent) setAccentHex(accent.hex);
  };

  return (
    <AppShell title="Org Branding">
      <div className="max-w-4xl">
        <Link to="/admin/users" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to users
        </Link>
        <p className="curve-eyebrow mb-2">Customization · {orgName}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-1">Branding for {orgName}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Configure logo and colors on behalf of this organization. The org primary will see these immediately.
        </p>

        <Card className="p-6 space-y-5 mb-6">
          <div>
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" /> Logo
            </h2>
            <p className="text-sm text-muted-foreground">Upload one logo — we'll auto-clean and enhance it. SVG is best (lossless). PNG/JPG must be at least 512×512; we'll upscale and remove the background automatically. Max 5 MB.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-20 w-44 rounded-lg border border-border bg-nav flex items-center justify-center overflow-hidden relative">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-16 max-w-40 object-contain" />
              ) : (
                <div className="flex flex-col items-center text-nav-muted">
                  <ImageOff className="h-5 w-5" />
                  <span className="text-[10px] mt-1">No logo</span>
                </div>
              )}
              {logoStatus === "pending" && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex">
                <input type="file" accept="image/*,.svg" className="hidden" onChange={onLogoFile} disabled={uploading || logoStatus === "pending"} />
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium cursor-pointer hover:opacity-90">
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : logoStatus === "pending" ? "Enhancing…" : logoUrl ? "Replace logo" : "Upload logo"}
                </span>
              </label>
              {logoUrl && (
                <div className="flex items-center gap-2 flex-wrap">
                  {logoQuality && (
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      logoQuality === "vector" ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                      : logoQuality === "high" ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                      : logoQuality === "medium" ? "border-amber-500/40 text-amber-700 bg-amber-500/10"
                      : "border-orange-500/40 text-orange-700 bg-orange-500/10"
                    }`}>
                      {logoQuality === "vector" ? "Vector ✓"
                        : logoQuality === "high" ? "High res"
                        : logoQuality === "medium" ? "Medium res"
                        : "Low res — enhanced"}
                    </span>
                  )}
                  {logoDims && logoDims.w > 0 && (
                    <span className="text-[10px] text-muted-foreground">{logoDims.w}×{logoDims.h}</span>
                  )}
                  {logoStatus === "ready" && originalUrl && originalUrl !== logoUrl && (
                    <a href={originalUrl} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground underline">view original</a>
                  )}
                </div>
              )}
              {logoUrl && <Button variant="ghost" size="sm" onClick={removeLogo}>Remove logo</Button>}
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4" /> Color scheme
            </h2>
          </div>

          {extracting && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Analyzing logo…
            </div>
          )}

          {palette.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">From the logo</p>
                <Button variant="ghost" size="sm" onClick={applySuggested}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Auto-apply suggested
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {palette.map((c) => (
                  <div key={c.hex} className="flex flex-col items-center gap-1.5">
                    <div
                      className="h-10 w-10 rounded-md border-2 border-border"
                      style={{ background: c.hex }}
                    />
                    <div className="flex gap-1">
                      <button onClick={() => setPrimaryHex(c.hex)} className="text-[10px] text-muted-foreground hover:text-foreground" type="button">Primary</button>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <button onClick={() => setAccentHex(c.hex)} className="text-[10px] text-muted-foreground hover:text-foreground" type="button">Accent</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <ColorField label="Primary" hex={primaryHex} onChange={setPrimaryHex} />
            <ColorField label="Accent" hex={accentHex} onChange={setAccentHex} />
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Live preview</div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-9 px-4 inline-flex items-center rounded-md text-sm font-medium text-white" style={{ background: accentHex }}>Primary action</div>
              <div className="h-9 px-4 inline-flex items-center rounded-md text-sm font-medium text-white" style={{ background: primaryHex }}>Ink button</div>
              <a className="text-sm font-medium underline" style={{ color: accentHex }} href="#">A linked element</a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save branding"}</Button>
            <Button variant="ghost" onClick={reset}><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ColorField({ label, hex, onChange }: { label: string; hex: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 rounded-md border border-border cursor-pointer" />
        <Input value={hex} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" maxLength={7} />
      </div>
    </div>
  );
}
