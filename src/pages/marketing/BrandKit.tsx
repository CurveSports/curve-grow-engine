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
import { Upload, Trash2, Image as ImageIcon, Save, Sparkles } from "lucide-react";
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
  const [hashtagInput, setHashtagInput] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  useGoogleFonts([kit.font_heading, kit.font_body, ...FONT_OPTIONS]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const [kitRes, assetsRes, orgRes] = await Promise.all([
        supabase.from("org_brand_kits").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("org_brand_assets").select("*").eq("org_id", orgId).eq("archived", false).order("uploaded_at", { ascending: false }),
        supabase.from("organizations").select("logo_url").eq("id", orgId).maybeSingle(),
      ]);
      const intakeLogo = (orgRes.data as any)?.logo_url ?? null;
      let loaded: BrandKit = (kitRes.data as BrandKit) ?? { org_id: orgId };
      // Backfill primary logo from intake upload so users don't re-upload
      if (!loaded.logo_primary_url && intakeLogo) {
        loaded = { ...loaded, logo_primary_url: intakeLogo };
        await supabase
          .from("org_brand_kits")
          .upsert({ org_id: orgId, logo_primary_url: intakeLogo }, { onConflict: "org_id" });
      }
      setKit(loaded);
      setAssets((assetsRes.data ?? []) as BrandAsset[]);
      setLoading(false);
      // Auto-pull colors from primary logo on first load if none are set yet
      const noColors = !loaded.color_primary && !loaded.color_secondary && !loaded.color_accent;
      if (loaded.logo_primary_url && noColors) {
        autofillColorsFromLogo(loaded.logo_primary_url);
      }
    })();
  }, [orgId]);

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
        {/* Logos */}
        <Card className="p-6 lg:col-span-3">
          <h2 className="font-display text-lg font-semibold mb-4">Logos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              ["logo_primary_url", "Primary logo", "Full-color, used most often"],
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
                  <button onClick={() => setKit((k) => ({ ...k, [key]: null }))} className="block mx-auto mt-1 text-xs text-muted-foreground hover:text-destructive">
                    Remove
                  </button>
                )}
              </div>
            ))}
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
              <Label>Brand voice notes</Label>
              <Textarea
                rows={5}
                value={kit.brand_voice_notes || ""}
                onChange={(e) => setKit((k) => ({ ...k, brand_voice_notes: e.target.value }))}
                placeholder="Energetic, family-focused, never corporate. Avoid jargon. Always celebrate the kids first…"
              />
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

        {/* Photo library */}
        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Photo library</h2>
              <p className="text-sm text-muted-foreground">Upload action shots, team photos and venue images for use in designs.</p>
            </div>
            <Button onClick={() => photoInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" /> Upload photos
            </Button>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotosUpload} />
          </div>
          {assets.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No photos yet — upload your best shots to use in designs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {assets.map((a) => (
                <div key={a.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={a.thumbnail_url || a.url} alt={a.alt_text || ""} className="w-full h-full object-cover" />
                  <button
                    onClick={() => archiveAsset(a.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
