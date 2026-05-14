import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Loader2, Play, Image as ImageIcon, X, Check } from "lucide-react";
import { uploadMediaFile, formatDuration, type MediaItem } from "@/lib/mediaUpload";
import { useMarketingLink } from "@/hooks/useMarketingLink";

type Mode = "image" | "video" | "any";

type Props = {
  orgId: string;
  mode?: Mode;
  value?: string | null; // selected url
  onChange?: (url: string | null, item: MediaItem | null) => void;
  label?: string;
  limit?: number; // how many to load
  compact?: boolean;
};

const accept = (mode: Mode) =>
  mode === "image" ? "image/*" : mode === "video" ? "video/*" : "image/*,video/*";

export default function MediaPicker({
  orgId,
  mode = "image",
  value,
  onChange,
  label,
  limit = 60,
  compact = false,
}: Props) {
  const ml = useMarketingLink();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let q = supabase
      .from("org_brand_assets")
      .select("*")
      .eq("org_id", orgId)
      .eq("archived", false)
      .order("uploaded_at", { ascending: false })
      .limit(limit);
    if (mode !== "any") q = q.eq("media_type", mode);
    const { data } = await q;
    setItems((data ?? []) as MediaItem[]);
    setLoading(false);
  }, [orgId, mode, limit]);

  useEffect(() => {
    load();
  }, [load]);

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
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const select = (item: MediaItem) => {
    if (!onChange) return;
    if (value === item.url) onChange(null, null);
    else onChange(item.url, item);
  };

  const cols = compact ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-3 sm:grid-cols-5 md:grid-cols-6";

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium">{label}</p>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        } p-3`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Upload className="h-3.5 w-3.5" />
            <span>Drag {mode === "any" ? "files" : `${mode}s`} here or</span>
          </div>
          <div className="flex items-center gap-2">
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
            <Link
              to={ml("/marketing/media")}
              className="text-xs text-primary hover:underline whitespace-nowrap"
            >
              Open library →
            </Link>
          </div>
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

        {uploading.length > 0 && (
          <div className="space-y-1 mb-2">
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
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No {mode === "any" ? "media" : `${mode}s`} yet. Drop files above or click Upload.
          </p>
        ) : (
          <div className={`grid ${cols} gap-2`}>
            {items.map((item) => {
              const selected = value === item.url;
              const isVideo = item.media_type === "video";
              const thumb = item.poster_url || item.thumbnail_url || item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item)}
                  className={`group relative aspect-square rounded overflow-hidden border-2 transition-all ${
                    selected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"
                  }`}
                  title={item.alt_text || item.caption || item.filename || ""}
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
                    <img src={item.url} alt={item.alt_text || ""} className="w-full h-full object-cover bg-muted" />
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
