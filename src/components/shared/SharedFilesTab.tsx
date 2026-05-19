import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, FileText, Loader2, Search } from "lucide-react";

type SharedFile = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
};

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function SharedFilesTab({ orgId }: { orgId: string }) {
  const { profile, role } = useAuth();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploaderNames, setUploaderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("org_shared_files")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load files", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as SharedFile[];
    setFiles(rows);
    const ids = Array.from(new Set(rows.map(r => r.uploaded_by).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name, email").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email || "Unknown"; });
      setUploaderNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [orgId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${orgId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("org-shared-files")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("org_shared_files").insert({
          org_id: orgId,
          name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: profile?.user_id,
        });
        if (insErr) throw insErr;
      }
      toast({ title: "Upload complete", description: `${fileList.length} file(s) uploaded.` });
      await load();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (f: SharedFile) => {
    const { data, error } = await supabase.storage
      .from("org-shared-files")
      .createSignedUrl(f.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", description: error?.message ?? "No URL", variant: "destructive" });
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = f.name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDelete = async (f: SharedFile) => {
    if (!confirm(`Delete "${f.name}"? This can't be undone.`)) return;
    const { error: sErr } = await supabase.storage.from("org-shared-files").remove([f.storage_path]);
    if (sErr) { toast({ title: "Storage delete failed", description: sErr.message, variant: "destructive" }); return; }
    const { error: dErr } = await supabase.from("org_shared_files").delete().eq("id", f.id);
    if (dErr) { toast({ title: "Delete failed", description: dErr.message, variant: "destructive" }); return; }
    toast({ title: "File deleted" });
    await load();
  };

  const canDelete = (f: SharedFile) =>
    role === "admin" || f.uploaded_by === profile?.user_id;

  const filtered = files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="curve-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Shared Files</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Files shared between Curve and your team. Both sides can upload and download.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Uploading…" : "Upload files"}
            </Button>
          </div>
        </div>
      </div>

      <div className="curve-card">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {files.length === 0 ? "No files yet. Upload the first one." : "No files match your search."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((f) => (
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
                  {canDelete(f) && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(f)} title="Delete" className="text-destructive hover:text-destructive">
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
