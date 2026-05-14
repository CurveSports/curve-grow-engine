import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2, Play, X, Check, Search, Sparkles } from "lucide-react";
import { uploadMediaFile, formatDuration, type MediaItem } from "@/lib/mediaUpload";
import { useMarketingLink } from "@/hooks/useMarketingLink";

type Mode = "image" | "video" | "any";

type LogoVariant = { label: string; url: string };

type Props = {
  orgId: string;
  mode?: Mode;
  value?: string | null; // selected url
  onChange?: (url: string | null, item: MediaItem | null) => void;
  label?: string;
  limit?: number;
  compact?: boolean;
  /** Brand-kit logo quick-pick chips shown above the grid (e.g. for sponsor/logo slots) */
  logoVariants?: LogoVariant[];
};

const accept = (mode: Mode) =>
  mode === "image" ? "image/*" : mode === "video" ? "video/*" : "image/*,video/*";

type Collection = { id: string; name: string };

export default function MediaPicker({
  orgId,
  mode = "image",
  value,
  onChange,
  label,
  limit = 120,
  compact = false,
  logoVariants,
}: Props) {
  const ml = useMarketingLink();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionAssetIds, setCollectionAssetIds] = useState<string[] | null>(null); // null = no collection filter
  const [collectionId, setCollectionId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let q = supabase
      .from("org_brand_assets")
      .select("*")
      .eq("org_id", orgId)
      .eq("archived", false)
      .order("used_count", { ascending: false })
      .order("uploaded_at", { ascending: false })
      .limit(limit);
    if (mode !== "any") q = q.eq("media_type", mode);
    const { data } = await q;
    setItems((data ?? []) as MediaItem[]);
    setLoading(false);
  }, [orgId, mode, limit]);

  const loadCollections = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("org_content_collections")
      .select("id, name")
      .eq("org_id", orgId)
      .order("name");
    setCollections((data ?? []) as Collection[]);
  }, [orgId]);

  useEffect(() => {
    load();
    loadCollections();
  }, [load, loadCollections]);

  useEffect(() => {
    (async () => {
      if (collectionId === "all") {
        setCollectionAssetIds(null);
        return;
      }
      const { data } = await supabase
        .from("org_content_collection_items")
        .select("asset_id")
        .eq("collection_id", collectionId);
      setCollectionAssetIds((data ?? []).map((r: any) => r.asset_id));
    })();
  }, [collectionId]);

  const handleFiles = async (files: File[]) => {
    if (!files.length || !orgId) return;
    const filtered = files.filter((f) => {
      if (mode === "image" && !f.type.startsWith("image/")) return false;
      if (mode === "video" && !f.type.startsWith("video/")) return false;
      return true;
    });
    if (!filtered.length) return toast.error(`Only ${mode === "any" ? "image or video" : mode} files allowed`);

    setUploading(filtered.map((f) => ({ name: f.name, progress: 0 })));
    const newItems: MediaItem[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const f = filtered[i];
      try {
        const item = await uploadMediaFile(f, orgId);
        if (item) newItems.push(item);
        setUploading((u) => u.map((x, idx) => (idx === i ? { ...x, progress: 100 } : x)));
      } catch (e: any) {
        toast.error(`${f.name}: ${e.message || "upload failed"}`);
      }
    }
    setItems((prev) => [...newItems, ...prev]);
    setUploading([]);
    if (newItems.length === 1 && onChange) {
      onChange(newItems[0].url, newItems[0]);
    }
    if (newItems.length) toast.success(`${newItems.length} file${newItems.length > 1 ? "s" : ""} uploaded`);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const select = (url: string | null, item: MediaItem | null) => {
    if (!onChange) return;
    if (value === url) onChange(null, null);
    else onChange(url, item);
  };

  // Top tags across the loaded library
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const tags = [...(it.ai_tags ?? []), ...(it.tags ?? [])];
      for (const t of tags) {
        const k = t.trim().toLowerCase();
        if (!k) continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (collectionAssetIds && !collectionAssetIds.includes(it.id)) return false;
      if (activeTag) {
        const tags = [...(it.ai_tags ?? []), ...(it.tags ?? [])].map((t) => t.toLowerCase());
        if (!tags.includes(activeTag)) return false;
      }
      if (!q) return true;
      const hay = [
        it.title, it.filename, it.caption, it.alt_text, it.body_text,
        ...(it.ai_tags ?? []), ...(it.tags ?? []),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, activeTag, collectionAssetIds]);

  const selectedItem = useMemo(
    () => items.find((it) => it.url === value) ?? null,
    [items, value]
  );

  const cols = compact ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-3 sm:grid-cols-5 md:grid-cols-6";

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium">{label}</p>}

      {/* Selected preview */}
      {value && (
        <div className="flex items-start gap-3 p-2 rounded-lg border bg-muted/20">
          <div className="h-20 w-20 rounded overflow-hidden bg-muted flex-shrink-0">
            {selectedItem?.media_type === "video" ? (
              <div className="relative h-full w-full">
                <img src={selectedItem.poster_url || selectedItem.thumbnail_url || value} alt="" className="h-full w-full object-cover" />
                <Play className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" fill="white" />
              </div>
            ) : (
              <img src={value} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-medium truncate">
              {selectedItem?.title || selectedItem?.filename || "Selected media"}
            </p>
            {selectedItem?.caption && <p className="text-muted-foreground line-clamp-2 mt-0.5">{selectedItem.caption}</p>}
            {!!(selectedItem?.ai_tags?.length) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedItem.ai_tags.slice(0, 4).map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{t}</span>
                ))}
              </div>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => select(null, null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Brand-kit logo quick chips */}
      {logoVariants && logoVariants.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Brand kit logos
          </p>
          <div className="flex flex-wrap gap-2">
            {logoVariants.map((lv) => {
              const sel = value === lv.url;
              return (
                <button
                  key={lv.url}
                  type="button"
                  onClick={() => select(sel ? null : lv.url, null)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs transition-colors ${
                    sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <img src={lv.url} alt="" className="h-6 w-6 object-contain bg-white rounded" />
                  <span>{lv.label}</span>
                  {sel && <Check className="h-3 w-3 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        } p-3 space-y-2`}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, caption, tags…"
              className="h-8 pl-7 text-xs"
            />
          </div>
          {collections.length > 0 && (
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={!!uploading.length}
          >
            {uploading.length ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            Upload
          </Button>
          <Link to={ml("/marketing/media")} className="text-xs text-primary hover:underline whitespace-nowrap">
            Library →
          </Link>
          <input
            ref={inputRef}
            type="file"
            accept={accept(mode)}
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>

        {/* Tag chips */}
        {topTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeTag && (
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center gap-1"
              >
                {activeTag} <X className="h-2.5 w-2.5" />
              </button>
            )}
            {topTags.filter((t) => t !== activeTag).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTag(t)}
                className="px-2 py-0.5 rounded-full bg-muted hover:bg-muted/70 text-[10px] capitalize"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {uploading.length > 0 && (
          <div className="space-y-1">
            {uploading.map((u, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="truncate flex-1">{u.name}</span>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {items.length === 0
              ? `No ${mode === "any" ? "media" : `${mode}s`} yet. Drop files above or click Upload.`
              : "No matches. Clear search or tag filter."}
          </p>
        ) : (
          <div className={`grid ${cols} gap-2`}>
            {filtered.map((item) => {
              const selected = value === item.url;
              const isVideo = item.media_type === "video";
              const thumb = item.poster_url || item.thumbnail_url || item.url || "";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item.url, item)}
                  className={`group relative aspect-square rounded overflow-hidden border-2 transition-all ${
                    selected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"
                  }`}
                  title={item.title || item.alt_text || item.caption || item.filename || ""}
                >
                  {isVideo ? (
                    <>
                      <img src={thumb} alt="" className="w-full h-full object-cover bg-muted" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-6 w-6 text-white drop-shadow" fill="white" />
                      </div>
                      {item.duration_seconds && (
                        <span className="absolute bottom-1 right-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/70 text-white">
                          {formatDuration(item.duration_seconds)}
                        </span>
                      )}
                    </>
                  ) : (
                    <img src={item.url ?? ""} alt={item.alt_text || ""} className="w-full h-full object-cover bg-muted" />
                  )}
                  {selected && (
                    <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
