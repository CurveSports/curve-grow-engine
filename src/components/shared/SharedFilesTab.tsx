import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Upload, Download, Trash2, FileText, Search, CloudUpload,
  CheckCircle2, XCircle, X, Folder, FolderPlus, ChevronRight, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SharedFile = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  description: string | null;
  uploaded_by: string | null;
  folder_path: string;
  created_at: string;
};

type SharedFolder = {
  id: string;
  org_id: string;
  path: string;
  created_by: string | null;
};

type UploadItem = {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_EXTS = new Set([
  "pdf","doc","docx","xls","xlsx","csv","ppt","pptx","txt","rtf","md","pages","numbers","key",
  "png","jpg","jpeg","gif","webp","svg","heic","bmp","tiff",
  "psd","ai","sketch","fig","xd",
  "mp4","mov","webm","avi","mkv","mp3","wav","m4a","aac","ogg",
  "zip","rar","7z","tar","gz","json","xml","yaml","yml",
]);
const BLOCKED_EXTS = new Set([
  "exe","msi","bat","cmd","com","scr","ps1","sh","app","dmg","pkg","jar","vbs","js","mjs","html","htm",
]);

function extOf(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}
function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return `Too large — max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB`;
  const ext = extOf(file.name);
  if (!ext) return "Missing file extension";
  if (BLOCKED_EXTS.has(ext)) return `Blocked file type (.${ext})`;
  if (!ALLOWED_EXTS.has(ext)) return `Unsupported file type (.${ext})`;
  return null;
}
function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ── Path helpers ─────────────────────────────
// path = "" (root) or "a/b/c". No leading/trailing slash.
function normalizeSegment(s: string) {
  return s.trim().replace(/[\/\\]/g, "").replace(/[^a-zA-Z0-9 _.\-]/g, "").trim();
}
function joinPath(parent: string, name: string) {
  return parent ? `${parent}/${name}` : name;
}
function parentOf(p: string) {
  if (!p) return "";
  const i = p.lastIndexOf("/");
  return i === -1 ? "" : p.slice(0, i);
}
function isDirectChild(parent: string, candidate: string) {
  if (!candidate) return false;
  if (candidate === parent) return false;
  if (parent === "") return !candidate.includes("/");
  return candidate.startsWith(parent + "/") &&
    !candidate.slice(parent.length + 1).includes("/");
}
function basename(p: string) {
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

export default function SharedFilesTab({ orgId }: { orgId: string }) {
  const { profile, role } = useAuth();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [uploaderNames, setUploaderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [cwd, setCwd] = useState<string>(""); // current folder
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: fdata, error: fErr }, { data: foldata, error: dErr }] = await Promise.all([
      supabase.from("org_shared_files").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("org_shared_folders").select("*").eq("org_id", orgId),
    ]);
    if (fErr || dErr) {
      toast({ title: "Failed to load", description: (fErr ?? dErr)?.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (fdata ?? []) as SharedFile[];
    setFiles(rows);
    setFolders((foldata ?? []) as SharedFolder[]);

    const ids = Array.from(new Set(rows.map(r => r.uploaded_by).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email || "Unknown"; });
      setUploaderNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [orgId]);

  // ── Derived: subfolders & files at cwd ──────────────
  const allFolderPaths = useMemo(() => {
    const set = new Set<string>();
    // explicit folders
    folders.forEach(f => set.add(f.path));
    // derived from file paths (each ancestor)
    files.forEach(f => {
      if (!f.folder_path) return;
      const parts = f.folder_path.split("/");
      let acc = "";
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        set.add(acc);
      }
    });
    return set;
  }, [folders, files]);

  const subfolders = useMemo(() => {
    return Array.from(allFolderPaths)
      .filter(p => isDirectChild(cwd, p))
      .sort((a, b) => a.localeCompare(b));
  }, [allFolderPaths, cwd]);

  const filesHere = useMemo(() => {
    return files
      .filter(f => f.folder_path === cwd)
      .filter(f => !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.description ?? "").toLowerCase().includes(search.toLowerCase()));
  }, [files, cwd, search]);

  const breadcrumbs = useMemo(() => {
    if (!cwd) return [] as { label: string; path: string }[];
    const parts = cwd.split("/");
    return parts.map((p, i) => ({ label: p, path: parts.slice(0, i + 1).join("/") }));
  }, [cwd]);

  // ── Upload (signed PUT URL + XHR for progress) ──────
  const uploadOne = (file: File, item: UploadItem, targetFolder: string) =>
    new Promise<void>(async (resolve) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safeName}`;

      const { data: signed, error: signErr } = await supabase
        .storage.from("org-shared-files").createSignedUploadUrl(path);
      if (signErr || !signed) {
        setUploads(u => u.map(x => x.id === item.id ? { ...x, status: "error", error: signErr?.message ?? "Sign failed" } : x));
        return resolve();
      }
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed.signedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploads(u => u.map(x => x.id === item.id ? { ...x, progress: pct, status: "uploading" } : x));
        }
      };
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const { error: insErr } = await supabase.from("org_shared_files").insert({
            org_id: orgId,
            name: file.name,
            storage_path: path,
            mime_type: file.type || null,
            size_bytes: file.size,
            uploaded_by: profile?.user_id,
            folder_path: targetFolder,
          });
          if (insErr) setUploads(u => u.map(x => x.id === item.id ? { ...x, status: "error", error: insErr.message } : x));
          else setUploads(u => u.map(x => x.id === item.id ? { ...x, progress: 100, status: "done" } : x));
        } else {
          setUploads(u => u.map(x => x.id === item.id ? { ...x, status: "error", error: `HTTP ${xhr.status}` } : x));
        }
        resolve();
      };
      xhr.onerror = () => {
        setUploads(u => u.map(x => x.id === item.id ? { ...x, status: "error", error: "Network error" } : x));
        resolve();
      };
      xhr.send(file);
    });

  const startUploads = useCallback(async (incoming: File[]) => {
    const target = cwd;
    const valid: { file: File; item: UploadItem }[] = [];
    const newItems: UploadItem[] = [];
    for (const file of incoming) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
      const err = validateFile(file);
      const item: UploadItem = {
        id, name: file.name, size: file.size, progress: 0,
        status: err ? "error" : "pending", error: err ?? undefined,
      };
      newItems.push(item);
      if (!err) valid.push({ file, item });
    }
    setUploads(u => [...newItems, ...u]);
    if (newItems.some(i => i.status === "error")) {
      toast({
        title: "Some files were rejected",
        description: newItems.filter(i => i.status === "error").map(i => `${i.name}: ${i.error}`).join(" · "),
        variant: "destructive",
      });
    }
    for (const v of valid) await uploadOne(v.file, v.item, target);
    await load();
  }, [orgId, profile?.user_id, cwd]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    startUploads(Array.from(list));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    if (dropped.length) startUploads(dropped);
  };

  const dismissUpload = (id: string) => setUploads(u => u.filter(x => x.id !== id));
  const clearFinished = () => setUploads(u => u.filter(x => x.status !== "done"));

  const handleDownload = async (f: SharedFile) => {
    const { data, error } = await supabase.storage
      .from("org-shared-files").createSignedUrl(f.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", description: error?.message ?? "No URL", variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = f.name; a.target = "_blank";
    document.body.appendChild(a); a.click(); a.remove();
  };

  const handleDeleteFile = async (f: SharedFile) => {
    if (!confirm(`Delete "${f.name}"? This can't be undone.`)) return;
    const { error: sErr } = await supabase.storage.from("org-shared-files").remove([f.storage_path]);
    if (sErr) { toast({ title: "Storage delete failed", description: sErr.message, variant: "destructive" }); return; }
    const { error: dErr } = await supabase.from("org_shared_files").delete().eq("id", f.id);
    if (dErr) { toast({ title: "Delete failed", description: dErr.message, variant: "destructive" }); return; }
    toast({ title: "File deleted" });
    await load();
  };

  const handleNewFolder = async () => {
    const raw = prompt("Folder name");
    if (!raw) return;
    const name = normalizeSegment(raw);
    if (!name) { toast({ title: "Invalid name", variant: "destructive" }); return; }
    const newPath = joinPath(cwd, name);
    if (allFolderPaths.has(newPath)) { toast({ title: "Folder already exists" }); return; }
    const { error } = await supabase.from("org_shared_folders").insert({
      org_id: orgId, path: newPath, created_by: profile?.user_id,
    });
    if (error) { toast({ title: "Create failed", description: error.message, variant: "destructive" }); return; }
    await load();
  };

  const handleDeleteFolder = async (path: string) => {
    // Count contents (including nested)
    const filesInside = files.filter(f => f.folder_path === path || f.folder_path.startsWith(path + "/"));
    const foldersInside = Array.from(allFolderPaths).filter(p => p === path || p.startsWith(path + "/"));
    if (filesInside.length > 0) {
      toast({ title: "Folder not empty", description: `Contains ${filesInside.length} file(s). Delete those first.`, variant: "destructive" });
      return;
    }
    if (!confirm(`Delete folder "${basename(path)}"?`)) return;
    const { error } = await supabase.from("org_shared_folders").delete()
      .eq("org_id", orgId).in("path", foldersInside);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    await load();
  };

  const canDeleteFile = (f: SharedFile) => role === "admin" || f.uploaded_by === profile?.user_id;
  const canDeleteFolder = (path: string) => {
    if (role === "admin") return true;
    const f = folders.find(x => x.path === path);
    return f ? f.created_by === profile?.user_id : false;
  };

  const activeUploads = uploads.filter(u => u.status === "uploading" || u.status === "pending");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="curve-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Shared Files</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Files shared between Curve and your team. Both sides can upload and download.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewFolder}>
            <FolderPlus className="h-4 w-4 mr-2" /> New folder
          </Button>
        </div>

        {/* Breadcrumbs */}
        <div className="mt-4 flex items-center gap-1 text-sm flex-wrap">
          <button
            onClick={() => setCwd("")}
            className={cn("inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary",
              cwd === "" && "text-foreground font-semibold")}
          >
            <Home className="h-3.5 w-3.5" /> Home
          </button>
          {breadcrumbs.map((b, i) => (
            <div key={b.path} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                onClick={() => setCwd(b.path)}
                className={cn("px-2 py-1 rounded hover:bg-secondary",
                  i === breadcrumbs.length - 1 && "text-foreground font-semibold")}
              >
                {b.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed transition-colors p-6 text-center",
          dragOver ? "border-accent bg-accent-soft" : "border-border bg-card hover:border-accent/50 hover:bg-accent-soft/30"
        )}
      >
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
        <CloudUpload className={cn("h-8 w-8 mx-auto mb-2", dragOver ? "text-accent" : "text-muted-foreground")} />
        <p className="text-sm font-semibold">
          {dragOver ? "Drop to upload here" : `Drag & drop files into ${cwd ? `“${basename(cwd)}”` : "Home"}`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse · up to {Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB each
        </p>
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="curve-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {activeUploads.length > 0 ? `Uploading ${activeUploads.length}…` : "Uploads"}
            </h3>
            {uploads.some(u => u.status === "done") && (
              <Button size="sm" variant="ghost" onClick={clearFinished}>Clear finished</Button>
            )}
          </div>
          <div className="space-y-2.5">
            {uploads.map((u) => (
              <div key={u.id} className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  {u.status === "done" && <CheckCircle2 className="h-4 w-4 text-health shrink-0" />}
                  {u.status === "error" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  {(u.status === "uploading" || u.status === "pending") && <Upload className="h-4 w-4 text-accent shrink-0" />}
                  <span className="truncate flex-1">{u.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {u.status === "done" ? "Done" :
                     u.status === "error" ? (u.error ?? "Failed") :
                     u.status === "pending" ? "Queued" : `${u.progress}%`}
                  </span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => dismissUpload(u.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {u.status !== "error" && (
                  <Progress value={u.status === "done" ? 100 : u.progress}
                    className={cn("h-1.5", u.status === "done" && "[&>div]:bg-health")} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listing */}
      <div className="curve-card">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search files in this folder…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : subfolders.length === 0 && filesHere.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              This folder is empty. Drop files above or create a subfolder.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {subfolders.map((path) => (
              <div key={`f-${path}`} className="flex items-center justify-between gap-3 py-3">
                <button
                  onClick={() => setCwd(path)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left hover:text-accent transition-colors"
                >
                  <Folder className="h-5 w-5 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{basename(path)}</p>
                    <p className="text-xs text-muted-foreground">Folder</p>
                  </div>
                </button>
                {canDeleteFolder(path) && (
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteFolder(path)}
                    title="Delete folder" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {filesHere.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString()} · uploaded by {f.uploaded_by ? (uploaderNames[f.uploaded_by] ?? "—") : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(f)} title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDeleteFile(f) && (
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteFile(f)}
                      title="Delete" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
