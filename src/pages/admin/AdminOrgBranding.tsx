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
      supabase.from("org_branding").select("logo_url, primary_hsl, accent_hsl").eq("org_id", orgId).maybeSingle(),
    ]);
    setOrgName(org?.name ?? "");
    setLogoUrl(branding?.logo_url ?? null);
    setPrimaryHex(hslToHex(branding?.primary_hsl ?? DEFAULT_PRIMARY));
    setAccentHex(hslToHex(branding?.accent_hsl ?? DEFAULT_ACCENT));
    if (branding?.logo_url) runExtraction(branding.logo_url);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const runExtraction = async (url: string) => {
    setExtracting(true);
    try {
      const colors = await extractColors(url, 6);
      setPalette(colors);
    } catch (err) { console.warn(err); }
    finally { setExtracting(false); }
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${orgId}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("org-logos").upload(path, file, {
      cacheControl: "3600", upsert: true, contentType: file.type,
    });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("org_branding").upsert({
      org_id: orgId, logo_url: pub.publicUrl, updated_by: user.id,
    }, { onConflict: "org_id" });
    setUploading(false);
    if (dbErr) return toast.error(dbErr.message);
    setLogoUrl(pub.publicUrl);
    toast.success("Logo uploaded");
    runExtraction(pub.publicUrl);
    e.target.value = "";
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
            <p className="text-sm text-muted-foreground">PNG with transparent background. Max 2 MB.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-20 w-44 rounded-lg border border-border bg-nav flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-16 max-w-40 object-contain" />
              ) : (
                <div className="flex flex-col items-center text-nav-muted">
                  <ImageOff className="h-5 w-5" />
                  <span className="text-[10px] mt-1">No logo</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={onLogoFile} disabled={uploading} />
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium cursor-pointer hover:opacity-90">
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
                </span>
              </label>
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
