import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Upload, Loader2, Play, Search, Trash2, Copy, Download, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { uploadMediaFile, formatDuration, formatBytes, type MediaItem } from "@/lib/mediaUpload";

type Filter = "all" | "image" | "video";

export default function Media() {
  const { orgId } = useEffectiveOrg();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("org_brand_assets")
      .select("*")
      .eq("org_id", orgId)
      .eq("archived", false)
      .order("uploaded_at", { ascending: false });
    setItems((data ?? []) as MediaItem[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFiles = async (files: File[]) => {
    if (!files.length || !orgId) return;
    setUploading(true);
    const fresh: MediaItem[] = [];
    for (const f of files) {
      try {
        const item = await uploadMediaFile(f, orgId);
        if (item) fresh.push(item);
      } catch (e: any) {
        toast.error(`${f.name}: ${e.message || "upload failed"}`);
      }
    }
    if (fresh.length) {
      setItems((prev) => [...fresh, ...prev]);
      toast.success(`${fresh.length} file${fresh.length > 1 ? "s" : ""} uploaded`);
    }
    setUploading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const archive = async (item: MediaItem) => {
    if (!confirm(`Archive "${item.filename || "this item"}"? It won't be visible to designers anymore.`)) return;
    await supabase.from("org_brand_assets").update({ archived: true }).eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setSelected(null);
  };

  const saveMeta = async (item: MediaItem, patch: Partial<MediaItem>) => {
    const { error } = await supabase.from("org_brand_assets").update(patch).eq("id", item.id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    setSelected((s) => (s && s.id === item.id ? { ...s, ...patch } : s));
    toast.success("Saved");
  };

  const filtered = items.filter((i) => {
    if (filter !== "all" && i.media_type !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (i.filename || "").toLowerCase().includes(q) ||
      (i.caption || "").toLowerCase().includes(q) ||
      (i.alt_text || "").toLowerCase().includes(q) ||
      (i.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell title="Media Library">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground mt-1">
            Photos and videos for designs, email, and social. Upload once — reuse everywhere.
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      <Card className="p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, tag, or caption…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(["all", "image", "video"] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "image" ? <ImageIcon className="h-3.5 w-3.5 mr-1" /> : f === "video" ? <VideoIcon className="h-3.5 w-3.5 mr-1" /> : null}
              {f === "all" ? "All" : f === "image" ? "Images" : "Videos"}
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} item{filtered.length === 1 ? "" : "s"}</span>
      </Card>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-transparent"
        }`}
      >
        {loading ? (
          <Card className="p-12 text-center text-muted-foreground">Loading…</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-display font-semibold mb-1">No media yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Drop files here or click Upload. Images up to 12&nbsp;MB, videos up to 100&nbsp;MB.
            </p>
            <Button onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />Upload your first file
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((item) => {
              const isVideo = item.media_type === "video";
              const thumb = item.poster_url || item.thumbnail_url || item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="group text-left"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border relative">
                    {isVideo ? (
                      <>
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                          <Play className="h-8 w-8 text-white drop-shadow" fill="white" />
                        </div>
                        {item.duration_seconds && (
                          <span className="absolute bottom-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/70 text-white">
                            {formatDuration(item.duration_seconds)}
                          </span>
                        )}
                      </>
                    ) : (
                      <img src={item.url} alt={item.alt_text || ""} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <p className="text-xs mt-1 truncate" title={item.filename || ""}>{item.filename || "Untitled"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.width && item.height ? `${item.width}×${item.height}` : ""}
                    {item.file_size_bytes ? ` · ${formatBytes(item.file_size_bytes)}` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="truncate">{selected?.filename || "Media"}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg overflow-hidden bg-muted">
                {selected.media_type === "video" ? (
                  <video src={selected.url} controls className="w-full max-h-[400px]" poster={selected.poster_url || undefined} />
                ) : (
                  <img src={selected.url} alt={selected.alt_text || ""} className="w-full max-h-[400px] object-contain" />
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                {selected.width && <div>Dimensions: {selected.width} × {selected.height}px</div>}
                {selected.duration_seconds && <div>Duration: {formatDuration(selected.duration_seconds)}</div>}
                {selected.file_size_bytes && <div>Size: {formatBytes(selected.file_size_bytes)}</div>}
                {selected.mime_type && <div>Type: {selected.mime_type}</div>}
              </div>

              <div>
                <Label className="text-xs">Filename</Label>
                <Input
                  defaultValue={selected.filename || ""}
                  onBlur={(e) => e.target.value !== selected.filename && saveMeta(selected, { filename: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">Caption</Label>
                <Textarea
                  rows={2}
                  defaultValue={selected.caption || ""}
                  placeholder="What's in this shot? Used as context when AI generates designs."
                  onBlur={(e) => e.target.value !== (selected.caption || "") && saveMeta(selected, { caption: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">Alt text (accessibility)</Label>
                <Input
                  defaultValue={selected.alt_text || ""}
                  placeholder="Describe the image for screen readers."
                  onBlur={(e) => e.target.value !== (selected.alt_text || "") && saveMeta(selected, { alt_text: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input
                  defaultValue={(selected.tags || []).join(", ")}
                  placeholder="e.g. team-photo, action, summer-2026"
                  onBlur={(e) => {
                    const next = e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean);
                    saveMeta(selected, { tags: next });
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selected.url);
                    toast.success("URL copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />Copy URL
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-3.5 w-3.5 mr-1" />Download
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="text-destructive ml-auto" onClick={() => archive(selected)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Archive
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
