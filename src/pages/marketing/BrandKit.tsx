import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Trash2, Image as ImageIcon, Save, Sparkles, Wand2, ImageOff, ChevronDown, ChevronUp } from "lucide-react";
import { extractColors } from "@/lib/colorExtract";

type BrandKit = {
  id?: string;
  org_id?: string;
  logo_primary_url?: string | null;
  logo_secondary_url?: string | null;
  logo_mark_url?: string | null;
  color_primary?: string | null;
  color_secondary?: string | null;
  color_accent?: string | null;
  color_dark?: string | null;
  color_light?: string | null;
  font_heading?: string | null;
  font_body?: string | null;
  brand_voice_notes?: string | null;
  tagline?: string | null;
  hashtags?: string[] | null;
};

type BrandAsset = {
  id: string;
  asset_type: string;
  url: string;
  thumbnail_url: string | null;
  filename: string | null;
  alt_text: string | null;
  tags: string[] | null;
};

const FONT_OPTIONS = ["Inter", "Poppins", "Montserrat", "Oswald", "Playfair Display", "Bebas Neue", "Roboto", "Work Sans", "Lora", "Anton"];

// Inject a Google Fonts <link> for any font referenced by the kit
function useGoogleFonts(fonts: (string | null | undefined)[]) {
  useEffect(() => {
    const unique = Array.from(new Set(fonts.filter(Boolean) as string[]));
    unique.forEach((f) => {
      const id = `gf-${f.replace(/\s+/g, "-")}`;
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@400;600;700&display=swap`;
      document.head.appendChild(link);
    });
  }, [fonts.join("|")]);
}

export default function BrandKit() {
  const { profile } = useAuth();
  const { orgId } = useEffectiveOrg();

  const [kit, setKit] = useState<BrandKit>({});
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [hashtagInput, setHashtagInput] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Smart logo pipeline state (mirrors org_branding)
  const [logoStatus, setLogoStatus] = useState<string | null>(null);
  const [logoQuality, setLogoQuality] = useState<string | null>(null);
  const [logoOriginalUrl, setLogoOriginalUrl] = useState<string | null>(null);
  const [logoDims, setLogoDims] = useState<{ w: number; h: number } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showOverrides, setShowOverrides] = useState(false);

  useGoogleFonts([kit.font_heading, kit.font_body, ...FONT_OPTIONS]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const [kitRes, assetsRes, orgRes, brandingRes] = await Promise.all([
        supabase.from("org_brand_kits").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("org_brand_assets").select("*").eq("org_id", orgId).eq("archived", false).order("uploaded_at", { ascending: false }),
        supabase.from("organizations").select("logo_url").eq("id", orgId).maybeSingle(),
        supabase.from("org_branding").select("logo_url, logo_original_url, logo_quality, logo_processing_status, logo_width, logo_height").eq("org_id", orgId).maybeSingle(),
      ]);
      const intakeLogo = (orgRes.data as any)?.logo_url ?? null;
      const brandingLogo = (brandingRes.data as any)?.logo_url ?? null;
      let loaded: BrandKit = (kitRes.data as BrandKit) ?? { org_id: orgId };
      // Prefer the enhanced branding logo, then intake fallback
      const bestLogo = brandingLogo || intakeLogo;
      if (!loaded.logo_primary_url && bestLogo) {
        loaded = { ...loaded, logo_primary_url: bestLogo };
        await supabase
          .from("org_brand_kits")
          .upsert({ org_id: orgId, logo_primary_url: bestLogo }, { onConflict: "org_id" });
      }
      setKit(loaded);
      setAssets((assetsRes.data ?? []) as BrandAsset[]);
      setLogoStatus((brandingRes.data as any)?.logo_processing_status ?? null);
      setLogoQuality((brandingRes.data as any)?.logo_quality ?? null);
      setLogoOriginalUrl((brandingRes.data as any)?.logo_original_url ?? null);
      const w = (brandingRes.data as any)?.logo_width;
      const h = (brandingRes.data as any)?.logo_height;
      setLogoDims(w && h ? { w, h } : null);
      setLoading(false);
      const noColors = !loaded.color_primary && !loaded.color_secondary && !loaded.color_accent;
      if (loaded.logo_primary_url && noColors) {
        autofillColorsFromLogo(loaded.logo_primary_url);
      }
    })();
  }, [orgId]);

  // Poll org_branding while logo is being enhanced
  useEffect(() => {
    if (logoStatus !== "pending" || !orgId) return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from("org_branding")
        .select("logo_url, logo_quality, logo_processing_status")
        .eq("org_id", orgId)
        .maybeSingle();
      const status = (data as any)?.logo_processing_status;
      if (status && status !== "pending") {
        const newUrl = (data as any)?.logo_url ?? null;
        setLogoStatus(status);
        setLogoQuality((data as any)?.logo_quality ?? null);
        if (newUrl) {
          setKit((k) => ({ ...k, logo_primary_url: newUrl }));
          await supabase.from("org_brand_kits").upsert(
            { org_id: orgId, logo_primary_url: newUrl },
            { onConflict: "org_id" }
          );
          autofillColorsFromLogo(newUrl);
        }
        if (status === "ready") toast.success("Logo enhanced");
        else if (status === "failed") toast.warning("Couldn't enhance logo — using original");
        clearInterval(t);
      }
    }, 2500);
    return () => clearInterval(t);
  }, [logoStatus, orgId]);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!orgId) return null;
    const ext = file.name.split(".").pop() || "png";
    const path = `${orgId}/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: false });
    if (error) {
      toast.error(error.message);
      return null;
    }
    const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  // Probe image dimensions client-side; SVG returns isVector
  const probeImage = (file: File): Promise<{ w: number; h: number; isVector: boolean }> =>
    new Promise((resolve) => {
      const isVector = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
      if (isVector) return resolve({ w: 0, h: 0, isVector: true });
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight, isVector: false }); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 0, h: 0, isVector: false }); };
      img.src = url;
    });

  // Smart single-upload pipeline → org-logos bucket + process-org-logo edge fn
  const onSmartLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    if (file.size > 5 * 1024 * 1024) { e.target.value = ""; return toast.error("Logo must be under 5 MB"); }

    setUploadingLogo(true);
    const { w, h, isVector } = await probeImage(file);
    const longEdge = Math.max(w, h);
    const fmt = isVector ? "svg" : (file.name.split(".").pop() || "png").toLowerCase();

    if (!isVector && longEdge > 0 && longEdge < 512) {
      setUploadingLogo(false); e.target.value = "";
      return toast.error(`Image is too small (${w}×${h}). Please upload at least 512px on the long edge.`);
    }
    if (!isVector && longEdge > 0 && longEdge < 1024) {
      toast.info(`Low-resolution source (${w}×${h}) — we'll auto-enhance it.`);
    }

    const path = `${orgId}/logo-original-${Date.now()}.${fmt}`;
    const { error: upErr } = await supabase.storage.from("org-logos").upload(path, file, {
      cacheControl: "3600", contentType: file.type,
    });
    if (upErr) { setUploadingLogo(false); e.target.value = ""; return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);

    const initialQuality = isVector ? "vector" : (longEdge >= 1500 ? "high" : longEdge >= 1024 ? "medium" : "low");
    const { error: dbErr } = await supabase.from("org_branding").upsert({
      org_id: orgId,
      logo_url: pub.publicUrl,
      logo_original_url: pub.publicUrl,
      logo_width: w || null,
      logo_height: h || null,
      logo_format: fmt,
      logo_processing_status: isVector ? "skipped" : "pending",
      logo_quality: initialQuality,
      updated_by: profile?.user_id ?? null,
    }, { onConflict: "org_id" });
    if (dbErr) { setUploadingLogo(false); e.target.value = ""; return toast.error(dbErr.message); }

    // Mirror immediately into the brand kit so other pages pick it up
    await supabase.from("org_brand_kits").upsert(
      { org_id: orgId, logo_primary_url: pub.publicUrl },
      { onConflict: "org_id" }
    );

    setKit((k) => ({ ...k, logo_primary_url: pub.publicUrl }));
    setLogoOriginalUrl(pub.publicUrl);
    setLogoDims(w && h ? { w, h } : null);
    setLogoStatus(isVector ? "skipped" : "pending");
    setLogoQuality(initialQuality);
    setUploadingLogo(false);
    e.target.value = "";

    if (isVector) {
      toast.success("Vector logo uploaded — no processing needed");
      autofillColorsFromLogo(pub.publicUrl);
      return;
    }

    toast.success("Uploaded — enhancing in the background…");
    supabase.functions.invoke("process-org-logo", {
      body: { org_id: orgId, original_url: pub.publicUrl, width: w, height: h, format: fmt, is_vector: false },
    }).catch((err) => console.warn("enhance trigger failed", err));
  };

  // Manual override uploads (reverse / mark) — keep simple direct upload
  const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: "logo_primary_url" | "logo_secondary_url" | "logo_mark_url") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Logo must be under 3 MB");
    const url = await uploadFile(file, "logos");
    if (url) {
      setKit((k) => ({ ...k, [key]: url }));
      if (key === "logo_primary_url") autofillColorsFromLogo(url);
    }
    e.target.value = "";
  };

  const autofillColorsFromLogo = async (logoUrl: string, force = false) => {
    try {
      const colors = await extractColors(logoUrl, 5);
      if (!colors.length) return;
      setKit((k) => {
        const next = { ...k };
        const slots: (keyof BrandKit)[] = ["color_primary", "color_secondary", "color_accent", "color_dark", "color_light"];
        let filled = 0;
        slots.forEach((slot, i) => {
          if ((force || !k[slot]) && colors[i]) {
            (next as any)[slot] = colors[i].hex;
            filled++;
          }
        });
        if (filled) toast.success(`Pulled ${filled} color${filled > 1 ? "s" : ""} from your logo`);
        return next;
      });
    } catch (err) {
      console.warn("color extraction failed", err);
    }
  };

  const onPhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !orgId) return;
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name} is over 8 MB`);
        continue;
      }
      const url = await uploadFile(file, "photos");
      if (!url) continue;
      const { data, error } = await supabase
        .from("org_brand_assets")
        .insert({ org_id: orgId, asset_type: "photo", url, filename: file.name })
        .select("*")
        .single();
      if (!error && data) setAssets((a) => [data as BrandAsset, ...a]);
    }
    e.target.value = "";
    toast.success("Photos uploaded");
  };

  const archiveAsset = async (id: string) => {
    await supabase.from("org_brand_assets").update({ archived: true }).eq("id", id);
    setAssets((a) => a.filter((x) => x.id !== id));
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (!tag) return;
    setKit((k) => ({ ...k, hashtags: Array.from(new Set([...(k.hashtags ?? []), tag])) }));
    setHashtagInput("");
  };

  const removeHashtag = (tag: string) => {
    setKit((k) => ({ ...k, hashtags: (k.hashtags ?? []).filter((t) => t !== tag) }));
  };

  const generateBrandVoice = async () => {
    if (!orgId) return;
    if (kit.brand_voice_notes && !confirm("Replace your current brand voice notes with an AI-generated draft?")) return;
    setGeneratingVoice(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-brand-voice", { body: { orgId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const voice = data?.voice?.trim();
      if (!voice) throw new Error("No voice returned");
      setKit((k) => ({ ...k, brand_voice_notes: voice }));
      toast.success(`Draft brand voice generated${data.usedWebsite ? " from your website" : ""}. Edit and Save when ready.`);
    } catch (e: any) {
      toast.error(e.message || "Could not generate brand voice");
    } finally {
      setGeneratingVoice(false);
    }
  };

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    const payload = { ...kit, org_id: orgId };
    delete (payload as any).id;
    const { error } = await supabase
      .from("org_brand_kits")
      .upsert(payload, { onConflict: "org_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Brand kit saved");
  };

  if (loading) return <AppShell title="Brand Kit"><div className="p-8 text-muted-foreground">Loading…</div></AppShell>;

  return (
    <AppShell title="Brand Kit">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Brand Kit</h1>
          <p className="text-muted-foreground mt-1">Everything we need to design on-brand assets for you.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logos — single smart upload */}
        <Card className="p-6 lg:col-span-3 space-y-5">
          <div>
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" /> Logo
            </h2>
            <p className="text-sm text-muted-foreground">
              Upload one logo — we'll auto-clean and enhance it. SVG is best (lossless). PNG/JPG must be at least 512px on the long edge; we'll upscale and remove backgrounds automatically. Max 5 MB.
            </p>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="h-24 w-52 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden relative">
              {kit.logo_primary_url ? (
                <img src={kit.logo_primary_url} alt="Logo" className="max-h-20 max-w-48 object-contain" />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageOff className="h-5 w-5" />
                  <span className="text-[10px] mt-1">No logo yet</span>
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
                <input
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={onSmartLogoUpload}
                  disabled={uploadingLogo || logoStatus === "pending"}
                />
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium cursor-pointer hover:opacity-90">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingLogo ? "Uploading…" : logoStatus === "pending" ? "Enhancing…" : kit.logo_primary_url ? "Replace logo" : "Upload logo"}
                </span>
              </label>
              {kit.logo_primary_url && (
                <div className="flex items-center gap-2 flex-wrap">
                  {logoQuality && (
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      logoQuality === "vector" || logoQuality === "high"
                        ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                        : logoQuality === "medium"
                        ? "border-amber-500/40 text-amber-700 bg-amber-500/10"
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
                  {logoStatus === "ready" && logoOriginalUrl && logoOriginalUrl !== kit.logo_primary_url && (
                    <a href={logoOriginalUrl} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground underline">
                      view original
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Optional manual overrides for reverse / mark variants */}
          <div>
            <button
              type="button"
              onClick={() => setShowOverrides((s) => !s)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              {showOverrides ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showOverrides ? "Hide" : "Add"} custom variants (reverse / mark)
            </button>
            {showOverrides && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {([
                  ["logo_secondary_url", "Reverse logo", "For dark backgrounds"],
                  ["logo_mark_url", "Logo mark", "Just the icon — for avatars, watermarks"],
                ] as const).map(([key, label, hint]) => (
                  <div key={key} className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <div className="aspect-video bg-muted rounded flex items-center justify-center mb-3 overflow-hidden">
                      {kit[key] ? (
                        <img src={kit[key]!} alt={label} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mb-3">{hint}</p>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-primary cursor-pointer hover:underline">
                      <Upload className="h-4 w-4" />
                      {kit[key] ? "Replace" : "Upload"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogoUpload(e, key)} />
                    </label>
                    {kit[key] && (
                      <button
                        onClick={() => setKit((k) => ({ ...k, [key]: null }))}
                        className="block mx-auto mt-1 text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Colors */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Colors</h2>
            {kit.logo_primary_url && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => autofillColorsFromLogo(kit.logo_primary_url!, true)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Re-pull from logo
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {([
              ["color_primary", "Primary"],
              ["color_secondary", "Secondary"],
              ["color_accent", "Accent"],
              ["color_dark", "Dark"],
              ["color_light", "Light"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={kit[key] || "#000000"}
                    onChange={(e) => setKit((k) => ({ ...k, [key]: e.target.value }))}
                    className="h-10 w-10 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={kit[key] || ""}
                    onChange={(e) => setKit((k) => ({ ...k, [key]: e.target.value }))}
                    placeholder="#000000"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fonts */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Typography</h2>
          <div className="space-y-4">
            <div>
              <Label>Heading font</Label>
              <select
                value={kit.font_heading || "Inter"}
                onChange={(e) => setKit((k) => ({ ...k, font_heading: e.target.value }))}
                className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <div
                className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-3 text-2xl leading-tight"
                style={{ fontFamily: `'${kit.font_heading || "Inter"}', sans-serif`, fontWeight: 700 }}
              >
                The quick brown fox
              </div>
            </div>
            <div>
              <Label>Body font</Label>
              <select
                value={kit.font_body || "Inter"}
                onChange={(e) => setKit((k) => ({ ...k, font_body: e.target.value }))}
                className="w-full mt-1 h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <div
                className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-3 text-sm leading-relaxed"
                style={{ fontFamily: `'${kit.font_body || "Inter"}', sans-serif` }}
              >
                Pack my box with five dozen liquor jugs — the quick brown fox jumps over the lazy dog.
              </div>
            </div>
          </div>
        </Card>

        {/* Voice & messaging */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-4">Voice & messaging</h2>
          <div className="space-y-3">
            <div>
              <Label>Tagline</Label>
              <Input
                value={kit.tagline || ""}
                onChange={(e) => setKit((k) => ({ ...k, tagline: e.target.value }))}
                placeholder="e.g. Where champions are made"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Brand voice notes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateBrandVoice}
                  disabled={generatingVoice}
                >
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  {generatingVoice ? "Generating…" : "Generate"}
                </Button>
              </div>
              <Textarea
                rows={10}
                value={kit.brand_voice_notes || ""}
                onChange={(e) => setKit((k) => ({ ...k, brand_voice_notes: e.target.value }))}
                placeholder="Energetic, family-focused, never corporate. Avoid jargon. Always celebrate the kids first…"
              />
              <p className="text-xs text-muted-foreground mt-1">
                We use your website, social handles, and intake answers to draft a starting point. Edit freely.
              </p>
            </div>
          </div>
        </Card>

        {/* Hashtags */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Hashtags</h2>
          <div className="flex gap-2">
            <Input
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
              placeholder="GoTeam"
            />
            <Button type="button" onClick={addHashtag} variant="outline">Add</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(kit.hashtags ?? []).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                #{tag}
                <button onClick={() => removeHashtag(tag)} className="text-muted-foreground hover:text-destructive">×</button>
              </span>
            ))}
            {!(kit.hashtags?.length ?? 0) && <p className="text-xs text-muted-foreground">No hashtags yet</p>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
