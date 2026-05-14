import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload, Search, Trash2, Image as ImageIcon, Video as VideoIcon, FileText, Film, Type,
  Sparkles, Plus, Folder, Hash, X, Loader2, Copy, Download, Star,
} from "lucide-react";
import { uploadMediaFile, formatBytes, formatDuration, type MediaItem } from "@/lib/mediaUpload";

type ItemType =
  | "photo" | "video" | "raw_clip" | "finished_design"
  | "graphic" | "document" | "caption_snippet" | "hashtag_set";

type Item = MediaItem & {
  asset_type: ItemType | string;
  ai_tags?: string[];
  body_text?: string | null;
  title?: string | null;
  used_count?: number;
  last_used_at?: string | null;
};

type Collection = {
  id: string; org_id: string; name: string; description: string | null;
  created_at: string;
};

const TYPE_META: Record<string, { label: string; icon: typeof ImageIcon; tint: string }> = {
  photo:           { label: "Photo",           icon: ImageIcon, tint: "bg-blue-500/10 text-blue-600" },
  video:           { label: "Video",           icon: VideoIcon, tint: "bg-purple-500/10 text-purple-600" },
  raw_clip:        { label: "Raw clip",        icon: Film,      tint: "bg-amber-500/10 text-amber-700" },
  finished_design: { label: "Finished design", icon: Sparkles,  tint: "bg-emerald-500/10 text-emerald-600" },
  graphic:         { label: "Graphic",         icon: ImageIcon, tint: "bg-pink-500/10 text-pink-600" },
  document:        { label: "Document",        icon: FileText,  tint: "bg-slate-500/10 text-slate-700" },
  caption_snippet: { label: "Caption",         icon: Type,      tint: "bg-indigo-500/10 text-indigo-600" },
  hashtag_set:     { label: "Hashtags",        icon: Hash,      tint: "bg-teal-500/10 text-teal-600" },
};

const FILTER_TYPES: { value: string; label: string }[] = [
  { value: "all",             label: "All" },
  { value: "photo",           label: "Photos" },
  { value: "video",           label: "Videos" },
  { value: "raw_clip",        label: "Raw clips" },
  { value: "finished_design", label: "Designs" },
  { value: "graphic",         label: "Graphics" },
  { value: "document",        label: "Documents" },
  { value: "caption_snippet", label: "Captions" },
  { value: "hashtag_set",     label: "Hashtags" },
];

export default function ContentLibrary() {
  const { orgId } = useEffectiveOrg();
  const [items, setItems] = useState<Item[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [collectionMembership, setCollectionMembership] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: assets }, { data: cols }, { data: links }] = await Promise.all([
      supabase.from("org_brand_assets").select("*").eq("org_id", orgId).eq("archived", false)
        .order("uploaded_at", { ascending: false }),
      supabase.from("org_content_collections").select("*").eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      supabase.from("org_content_collection_items").select("collection_id, asset_id"),
    ]);
    setItems((assets ?? []) as Item[]);
    setCollections((cols ?? []) as Collection[]);
    const map = new Map<string, Set<string>>();
    for (const l of links ?? []) {
      if (!map.has(l.collection_id)) map.set(l.collection_id, new Set());
      map.get(l.collection_id)!.add(l.asset_id);
    }
    setCollectionMembership(map);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // Upload
  const handleFiles = async (files: File[]) => {
    if (!files.length || !orgId) return;
    setUploading(true);
    const fresh: Item[] = [];
    for (const f of files) {
      try {
        const uploaded = await uploadMediaFile(f, orgId);
        if (!uploaded) continue;
        // Auto-classify asset_type by mime
        let asset_type: ItemType = "photo";
        if (f.type.startsWith("video/")) asset_type = "video";
        else if (f.type === "application/pdf") asset_type = "document";
        else if (f.type === "image/png") asset_type = "graphic";
        if (asset_type !== uploaded.asset_type) {
          await supabase.from("org_brand_assets").update({ asset_type }).eq("id", uploaded.id);
          (uploaded as Item).asset_type = asset_type;
        }
        fresh.push(uploaded as Item);
        // Fire-and-forget AI tagging for images
        if ((uploaded as Item).media_type === "image") {
          supabase.functions.invoke("ai-tag-media", { body: { asset_id: uploaded.id } })
            .then(({ data }) => {
              if (data && (data as any).ai_tags) {
                setItems((prev) => prev.map((i) =>
                  i.id === uploaded.id ? { ...i, ai_tags: (data as any).ai_tags, alt_text: (data as any).alt_text ?? i.alt_text, title: (data as any).title ?? i.title } : i,
                ));
              }
            })
            .catch(() => { /* silent */ });
        }
      } catch (e: any) {
        toast.error(`${f.name}: ${e.message || "upload failed"}`);
      }
    }
    if (fresh.length) {
      setItems((prev) => [...fresh, ...prev]);
      toast.success(`${fresh.length} item${fresh.length > 1 ? "s" : ""} added — AI tagging in background`);
    }
    setUploading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  // Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (filterType !== "all" && it.asset_type !== filterType) return false;
      if (activeCollection) {
        const set = collectionMembership.get(activeCollection);
        if (!set || !set.has(it.id)) return false;
      }
      if (!q) return true;
      const hay = [
        it.title, it.filename, it.caption, it.alt_text, it.body_text,
        ...(it.tags ?? []), ...(it.ai_tags ?? []),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, filterType, activeCollection, collectionMembership, search]);

  const archive = async (item: Item) => {
    if (!confirm(`Remove "${item.title || item.filename || "this item"}" from the library?`)) return;
    await supabase.from("org_brand_assets").update({ archived: true }).eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setSelected(null);
  };

  const saveMeta = async (item: Item, patch: Partial<Item>) => {
    const { error } = await supabase.from("org_brand_assets").update(patch).eq("id", item.id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    if (selected?.id === item.id) setSelected({ ...selected, ...patch });
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const it of items) c[it.asset_type] = (c[it.asset_type] ?? 0) + 1;
    return c;
  }, [items]);

  const activeCollectionName = collections.find((c) => c.id === activeCollection)?.name;

  return (
    <AppShell title="Content Library">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Content Library</h1>
          <p className="text-muted-foreground mt-1">
            Every photo, video, design, caption and asset your org uses across channels — searchable, tagged, ready to drop into any campaign.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSnippetOpen(true)}>
            <Type className="h-4 w-4 mr-2" /> New caption
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Upload className="h-4 w-4 mr-2" />}
            Upload
          </Button>
          <input
            ref={inputRef} type="file" multiple
            accept="image/*,video/*,application/pdf"
            className="hidden"
            onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar — collections */}
        <aside className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collections</h3>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCollectionOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <button
            onClick={() => setActiveCollection(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
              activeCollection === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <Folder className="h-4 w-4" /> All items
            <span className="ml-auto text-xs">{items.length}</span>
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCollection(c.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                activeCollection === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <Folder className="h-4 w-4" />
              <span className="truncate">{c.name}</span>
              <span className="ml-auto text-xs">{collectionMembership.get(c.id)?.size ?? 0}</span>
            </button>
          ))}
          {collections.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-2">
              Create a collection to group items (e.g. "2026 tryouts", "Coach headshots").
            </p>
          )}
        </aside>

        {/* Main */}
        <div>
          {/* Search + type chips */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, caption, tags, AI labels…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {FILTER_TYPES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterType === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {f.label} <span className="ml-1 opacity-60">{counts[f.value] ?? 0}</span>
              </button>
            ))}
          </div>

          {activeCollectionName && (
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              Filtering by collection: <strong className="text-foreground">{activeCollectionName}</strong>
              <button onClick={() => setActiveCollection(null)} className="ml-1 hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Drop zone / grid */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative rounded-lg ${dragOver ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
          >
            {loading ? (
              <Card className="p-12 text-center text-muted-foreground">Loading…</Card>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-3">
                  {items.length === 0
                    ? "Nothing here yet. Drag files in or click Upload."
                    : "No items match this filter."}
                </p>
                {items.length === 0 && (
                  <Button onClick={() => inputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" /> Upload your first asset
                  </Button>
                )}
              </Card>
            ) : (
              <div
                className="gap-3"
                style={{
                  columnCount: 4, columnGap: "0.75rem",
                }}
              >
                {filtered.map((it) => (
                  <ItemCard key={it.id} item={it} onClick={() => setSelected(it)} />
                ))}
              </div>
            )}

            {dragOver && (
              <div className="absolute inset-0 rounded-lg bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none">
                <p className="font-medium text-primary">Drop to upload</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <DetailPanel
              item={selected}
              collections={collections}
              membership={collectionMembership}
              onSave={(patch) => saveMeta(selected, patch)}
              onDelete={() => archive(selected)}
              onToggleCollection={async (collectionId, member) => {
                if (member) {
                  await supabase.from("org_content_collection_items")
                    .delete().eq("collection_id", collectionId).eq("asset_id", selected.id);
                } else {
                  await supabase.from("org_content_collection_items")
                    .insert({ collection_id: collectionId, asset_id: selected.id });
                }
                load();
              }}
              onRetag={async () => {
                toast.message("Re-running AI tags…");
                const { data, error } = await supabase.functions.invoke("ai-tag-media", { body: { asset_id: selected.id } });
                if (error) return toast.error(error.message);
                toast.success("Tags refreshed");
                if (data) saveMeta(selected, data as Partial<Item>);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* New caption snippet */}
      <SnippetDialog
        open={snippetOpen} onOpenChange={setSnippetOpen}
        onCreate={async (kind, payload) => {
          if (!orgId) return;
          const { data, error } = await supabase.from("org_brand_assets").insert({
            org_id: orgId,
            asset_type: kind,
            media_type: "text",
            url: null,
            title: payload.title,
            body_text: payload.body,
            tags: payload.tags,
          }).select().single();
          if (error) { toast.error(error.message); return; }
          setItems((prev) => [data as Item, ...prev]);
          toast.success(`${TYPE_META[kind].label} saved`);
        }}
      />

      {/* New collection */}
      <CollectionDialog
        open={collectionOpen} onOpenChange={setCollectionOpen}
        onCreate={async (name, description) => {
          if (!orgId) return;
          const { data, error } = await supabase.from("org_content_collections")
            .insert({ org_id: orgId, name, description })
            .select().single();
          if (error) { toast.error(error.message); return; }
          setCollections((prev) => [data as Collection, ...prev]);
          toast.success("Collection created");
        }}
      />
    </AppShell>
  );
}

/* ---------------------------- Item Card ---------------------------- */

function ItemCard({ item, onClick }: { item: Item; onClick: () => void }) {
  const meta = TYPE_META[item.asset_type] ?? TYPE_META.photo;
  const Icon = meta.icon;
  const isText = item.media_type === "text";
  const isVideo = item.media_type === "video";

  return (
    <button
      onClick={onClick}
      className="group break-inside-avoid w-full mb-3 rounded-lg overflow-hidden bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all text-left block"
    >
      {isText ? (
        <div className="p-4 bg-gradient-to-br from-muted/40 to-muted/10 min-h-[140px] flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{meta.label}</span>
          </div>
          {item.title && <p className="font-medium text-sm mb-1">{item.title}</p>}
          <p className="text-xs text-muted-foreground line-clamp-5 whitespace-pre-wrap">{item.body_text}</p>
        </div>
      ) : (
        <div className="relative bg-muted">
          {isVideo ? (
            <>
              {item.poster_url || item.thumbnail_url ? (
                <img src={item.poster_url ?? item.thumbnail_url ?? ""} alt={item.alt_text ?? ""} className="w-full block" loading="lazy" />
              ) : (
                <div className="aspect-video flex items-center justify-center"><VideoIcon className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-background/80 flex items-center justify-center backdrop-blur">
                  <VideoIcon className="h-4 w-4" />
                </div>
              </div>
              {item.duration_seconds != null && (
                <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
                  {formatDuration(item.duration_seconds)}
                </span>
              )}
            </>
          ) : (
            <img src={item.thumbnail_url ?? item.url ?? ""} alt={item.alt_text ?? ""} className="w-full block" loading="lazy" />
          )}
          <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.tint}`}>
            {meta.label}
          </span>
        </div>
      )}
      {(item.title || item.ai_tags?.length) && (
        <div className="p-2.5">
          {item.title && !isText && <p className="text-xs font-medium truncate">{item.title}</p>}
          {item.ai_tags?.length ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.ai_tags.slice(0, 3).map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </button>
  );
}

/* ---------------------------- Detail Panel ---------------------------- */

function DetailPanel({
  item, collections, membership, onSave, onDelete, onToggleCollection, onRetag,
}: {
  item: Item;
  collections: Collection[];
  membership: Map<string, Set<string>>;
  onSave: (patch: Partial<Item>) => void;
  onDelete: () => void;
  onToggleCollection: (collectionId: string, currentlyMember: boolean) => Promise<void>;
  onRetag: () => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    title: item.title ?? "",
    caption: item.caption ?? "",
    alt_text: item.alt_text ?? "",
    body_text: item.body_text ?? "",
    tags: (item.tags ?? []).join(", "),
  });
  const meta = TYPE_META[item.asset_type] ?? TYPE_META.photo;
  const isText = item.media_type === "text";

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-2xl flex items-center gap-2">
          {item.title || item.filename || meta.label}
        </SheetTitle>
        <Badge variant="outline" className={`mt-1 self-start ${meta.tint}`}>{meta.label}</Badge>
      </SheetHeader>

      <div className="mt-4 space-y-4">
        {!isText && item.url && (
          <div className="rounded-lg overflow-hidden bg-muted">
            {item.media_type === "video" ? (
              <video src={item.url} poster={item.poster_url ?? undefined} controls className="w-full" />
            ) : (
              <img src={item.url} alt={item.alt_text ?? ""} className="w-full" />
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          {isText ? (
            <div>
              <Label>Body</Label>
              <Textarea rows={6} value={draft.body_text} onChange={(e) => setDraft({ ...draft, body_text: e.target.value })} />
            </div>
          ) : (
            <>
              <div>
                <Label>Caption</Label>
                <Textarea rows={2} value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
              </div>
              <div>
                <Label>Alt text (accessibility)</Label>
                <Input value={draft.alt_text} onChange={(e) => setDraft({ ...draft, alt_text: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
          </div>
          <Button
            size="sm"
            onClick={() => onSave({
              title: draft.title || null,
              caption: draft.caption || null,
              alt_text: draft.alt_text || null,
              body_text: draft.body_text || null,
              tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
            })}
          >
            Save
          </Button>
        </div>

        {item.ai_tags?.length ? (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">AI tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {item.ai_tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        {!isText && (
          <Button size="sm" variant="outline" onClick={onRetag}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Re-run AI tagging
          </Button>
        )}

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Collections</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {collections.length === 0 && <p className="text-xs text-muted-foreground">No collections yet.</p>}
            {collections.map((c) => {
              const member = membership.get(c.id)?.has(item.id) ?? false;
              return (
                <button
                  key={c.id}
                  onClick={() => onToggleCollection(c.id, member)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    member ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {member ? "✓ " : "+ "}{c.name}
                </button>
              );
            })}
          </div>
        </div>

        {!isText && (
          <div className="text-xs text-muted-foreground space-y-0.5 pt-2 border-t">
            {item.filename && <p>{item.filename}</p>}
            {item.width && item.height && <p>{item.width} × {item.height}</p>}
            {item.file_size_bytes && <p>{formatBytes(item.file_size_bytes)}</p>}
            <p>Uploaded {new Date(item.uploaded_at).toLocaleDateString()}</p>
            {(item.used_count ?? 0) > 0 && <p>Used {item.used_count} time{item.used_count === 1 ? "" : "s"}</p>}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          {item.body_text && (
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(item.body_text!); toast.success("Copied"); }}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy text
            </Button>
          )}
          {item.url && (
            <Button size="sm" variant="outline" asChild>
              <a href={item.url} target="_blank" rel="noreferrer" download>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download
              </a>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
          </Button>
        </div>
      </div>
    </>
  );
}

/* ---------------------------- Snippet Dialog ---------------------------- */

function SnippetDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onCreate: (kind: "caption_snippet" | "hashtag_set", payload: { title: string; body: string; tags: string[] }) => void;
}) {
  const [kind, setKind] = useState<"caption_snippet" | "hashtag_set">("caption_snippet");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  const submit = () => {
    if (!body.trim()) { toast.error("Add some content"); return; }
    onCreate(kind, {
      title: title || (kind === "hashtag_set" ? "Hashtag set" : "Caption snippet"),
      body: body.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    onOpenChange(false);
    setTitle(""); setBody(""); setTags("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New text item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["caption_snippet", "hashtag_set"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  kind === k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                }`}
              >
                {TYPE_META[k].label}
              </button>
            ))}
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "hashtag_set" ? "Game day hashtags" : "Recruiting CTA"} />
          </div>
          <div>
            <Label>{kind === "hashtag_set" ? "Hashtags" : "Body"}</Label>
            <Textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={kind === "hashtag_set"
                ? "#thunderbolts #travelball #playerpipeline"
                : "Tryouts open. DM us to lock your spot — limited roster slots remain."}
            />
          </div>
          <div>
            <Label>Tags</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="recruiting, gameday" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- Collection Dialog ---------------------------- */

function CollectionDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New collection</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2026 tryouts" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (!name.trim()) return; onCreate(name.trim(), description.trim()); onOpenChange(false); setName(""); setDescription(""); }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
