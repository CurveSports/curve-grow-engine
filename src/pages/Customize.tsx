import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Sparkles, Palette, ImageOff, ArrowRight } from "lucide-react";
import { extractColors, suggestPrimaryAccent, ExtractedColor } from "@/lib/colorExtract";

const DEFAULT_PRIMARY_HEX = "#0F172A";
const DEFAULT_ACCENT_HEX = "#22C55E";

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

export default function Customize() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { mark } = useOnboarding();
  const { logoUrl, refresh: refreshBranding } = useBranding();

  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [palette, setPalette] = useState<ExtractedColor[]>([]);
  const [primaryHex, setPrimaryHex] = useState(DEFAULT_PRIMARY_HEX);
  const [accentHex, setAccentHex] = useState(DEFAULT_ACCENT_HEX);
  const [saving, setSaving] = useState(false);

  // If a logo is already set, run extraction once on mount
  useEffect(() => {
    if (logoUrl && palette.length === 0) runExtraction(logoUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoUrl]);

  const runExtraction = async (url: string) => {
    setExtracting(true);
    try {
      const colors = await extractColors(url, 6);
      setPalette(colors);
      const { primary, accent } = suggestPrimaryAccent(colors);
      if (primary) setPrimaryHex(primary.hex);
      if (accent) setAccentHex(accent.hex);
    } catch (err) {
      console.warn("color extraction failed", err);
    } finally {
      setExtracting(false);
    }
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.org_id || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${profile.org_id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("org-logos").upload(path, file, {
      cacheControl: "3600", upsert: true, contentType: file.type,
    });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("org_branding").upsert({
      org_id: profile.org_id,
      logo_url: pub.publicUrl,
      updated_by: user.id,
    }, { onConflict: "org_id" });
    setUploading(false);
    if (dbErr) return toast.error(dbErr.message);
    refreshBranding();
    e.target.value = "";
    runExtraction(pub.publicUrl);
  };

  const saveAndContinue = async () => {
    if (!profile?.org_id || !user) return;
    setSaving(true);
    const primary_hsl = hexToHsl(primaryHex);
    const accent_hsl = hexToHsl(accentHex);
    const { error } = await supabase.from("org_branding").upsert({
      org_id: profile.org_id,
      primary_hsl,
      accent_hsl,
      updated_by: user.id,
    }, { onConflict: "org_id" });
    if (error) { setSaving(false); return toast.error(error.message); }
    await mark("branding_completed_at");
    refreshBranding();
    navigate("/intake", { replace: true });
  };

  const skip = async () => {
    await mark("branding_completed_at");
    navigate("/intake", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="curve-container py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-display font-bold text-sm">C</span>
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Curve OS</span>
        </div>
        <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">
          Skip for now
        </button>
      </header>

      <main className="flex-1 px-6 pb-12">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <p className="curve-eyebrow mb-3">Personalize your workspace</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight mb-3">
            Make Curve OS feel like home.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-10">
            Upload your logo and we'll suggest a color scheme to match. You can change this any time from Settings.
          </p>

          {/* Logo upload */}
          <Card className="p-6 space-y-5 mb-6">
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload your logo
              </h2>
              <p className="text-sm text-muted-foreground">
                PNG, JPG, WEBP, or SVG. Transparent PNG or SVG looks best. Max 2 MB.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-24 w-52 rounded-lg border border-border bg-nav flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="max-h-20 max-w-48 object-contain" />
                ) : (
                  <div className="flex flex-col items-center text-nav-muted">
                    <ImageOff className="h-5 w-5" />
                    <span className="text-[10px] mt-1">No logo yet</span>
                  </div>
                )}
              </div>
              <label className="inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={onLogoFile} disabled={uploading} />
                <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-foreground text-background text-sm font-medium cursor-pointer hover:opacity-90">
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Choose file"}
                </span>
              </label>
            </div>
          </Card>

          {/* Color suggestions */}
          <Card className="p-6 space-y-5 mb-6">
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4" /> Color scheme
              </h2>
              <p className="text-sm text-muted-foreground">
                {palette.length > 0
                  ? "Suggested from your logo. Click a swatch to set primary, shift-click for accent — or fine-tune below."
                  : "Upload a logo to get auto-suggested colors, or pick your own."}
              </p>
            </div>

            {extracting && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Analyzing your logo…
              </div>
            )}

            {palette.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">From your logo</p>
                <div className="flex flex-wrap gap-2">
                  {palette.map((c) => (
                    <div key={c.hex} className="flex flex-col items-center gap-1.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPrimaryHex(c.hex)}
                          className="h-10 w-10 rounded-md border-2 border-border hover:border-foreground transition-colors"
                          style={{ background: c.hex }}
                          title={`Use ${c.hex} as primary`}
                          type="button"
                        />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPrimaryHex(c.hex)}
                          className="text-[10px] text-muted-foreground hover:text-foreground"
                          type="button"
                        >Primary</button>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <button
                          onClick={() => setAccentHex(c.hex)}
                          className="text-[10px] text-muted-foreground hover:text-foreground"
                          type="button"
                        >Accent</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2 pt-2">
              <ColorField label="Primary (ink)" hex={primaryHex} onChange={setPrimaryHex} />
              <ColorField label="Accent (highlight)" hex={accentHex} onChange={setAccentHex} />
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Live preview</div>
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className="h-9 px-4 inline-flex items-center rounded-md text-sm font-medium text-white"
                  style={{ background: accentHex }}
                >
                  Primary action
                </div>
                <div
                  className="h-9 px-4 inline-flex items-center rounded-md text-sm font-medium text-white"
                  style={{ background: primaryHex }}
                >
                  Ink button
                </div>
                <a className="text-sm font-medium underline" style={{ color: accentHex }} href="#">A linked element</a>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3 justify-between">
            <Button variant="ghost" onClick={skip}>Skip for now</Button>
            <Button onClick={saveAndContinue} disabled={saving} className="h-12 px-6 text-base">
              {saving ? "Saving…" : <>Save and continue <ArrowRight className="h-4 w-4 ml-1.5" /></>}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ColorField({ label, hex, onChange }: { label: string; hex: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded-md border border-border cursor-pointer"
        />
        <Input
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}
