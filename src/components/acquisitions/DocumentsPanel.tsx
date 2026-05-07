import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Link2, Loader2, ExternalLink, Download, Replace, Eye, EyeOff, Archive, MoreHorizontal, Search } from "lucide-react";
import { DOC_WORKSTREAMS, DOC_TYPES, fileIconColor, formatBytes } from "@/lib/dealRoom";
import { workstreamLabel } from "@/lib/acquisitions";
import UploadDocumentModal from "./UploadDocumentModal";
import LinkDocumentModal from "./LinkDocumentModal";
import ReplaceDocumentModal from "./ReplaceDocumentModal";
import VersionHistoryModal from "./VersionHistoryModal";
import { toast } from "sonner";

export default function DocumentsPanel({ acquisition }: { acquisition: any }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">("active");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState<any | null>(null);
  const [versionsDoc, setVersionsDoc] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("acquisition_documents")
      .select("*").eq("acquisition_id", acquisition.id).eq("is_current_version", true)
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [acquisition.id]);

  const counts: Record<string, number> = { all: 0 };
  DOC_WORKSTREAMS.forEach((w) => (counts[w] = 0));
  docs.filter((d) => d.status === "active").forEach((d) => {
    counts.all++;
    if (d.workstream) counts[d.workstream] = (counts[d.workstream] ?? 0) + 1;
  });

  const filtered = docs.filter((d) => {
    if (d.status !== statusFilter) return false;
    if (folder !== "all" && d.workstream !== folder) return false;
    if (typeFilter !== "all" && d.document_type !== typeFilter) return false;
    if (search && !d.document_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openDoc = async (d: any) => {
    if (d.storage_type === "uploaded" && d.file_path) {
      const { data } = await supabase.storage.from("acquisition-documents").createSignedUrl(d.file_path, 600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } else if (d.external_url) {
      window.open(d.external_url, "_blank");
    }
  };

  const downloadDoc = async (d: any) => {
    if (d.storage_type !== "uploaded" || !d.file_path) return;
    const { data } = await supabase.storage.from("acquisition-documents").createSignedUrl(d.file_path, 600, { download: true });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const toggleSeller = async (d: any) => {
    await supabase.from("acquisition_documents").update({ is_seller_visible: !d.is_seller_visible }).eq("id", d.id);
    toast.success(d.is_seller_visible ? "Hidden from seller" : "Shared with seller");
    load();
  };

  const archive = async (d: any) => {
    await supabase.from("acquisition_documents").update({ status: d.status === "archived" ? "active" : "archived" }).eq("id", d.id);
    toast.success(d.status === "archived" ? "Restored" : "Archived");
    load();
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Sidebar folders */}
      <aside className="col-span-12 md:col-span-3 space-y-1">
        <FolderItem label="📁 All Documents" active={folder === "all"} count={counts.all} onClick={() => setFolder("all")} />
        {DOC_WORKSTREAMS.map((w) => (
          <FolderItem key={w} label={`📁 ${workstreamLabel(w)}`} active={folder === w} count={counts[w] ?? 0} onClick={() => setFolder(w)} />
        ))}
      </aside>

      {/* Main */}
      <div className="col-span-12 md:col-span-9 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Documents — {acquisition.club_name}</h2>
          <div className="flex gap-2">
            <Button onClick={() => setUploadOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Upload File</Button>
            <Button variant="outline" onClick={() => setLinkOpen(true)}><Link2 className="h-4 w-4 mr-1" /> Link Google Doc</Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…" className="w-full pl-8 pr-3 py-2 text-sm rounded-md border bg-background" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-sm rounded-md border bg-background px-2 py-2">
            <option value="all">All types</option>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="text-sm rounded-md border bg-background px-2 py-2">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="curve-card text-center py-12 text-sm text-muted-foreground">No documents yet.</div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Workstream</th>
                  <th className="text-left px-3 py-2">v</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const ic = fileIconColor(d.file_type ?? (d.storage_type === "google_drive" ? "google" : ""));
                  return (
                    <tr key={d.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {d.storage_type === "google_drive" ? <Link2 className="h-4 w-4 text-blue-500" /> :
                           d.storage_type === "external_link" ? <ExternalLink className="h-4 w-4 text-muted-foreground" /> :
                           <FileText className={`h-4 w-4 ${ic.color}`} />}
                          <button onClick={() => openDoc(d)} className="font-medium hover:underline text-left">{d.document_name}</button>
                          {d.is_seller_visible && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">seller</span>}
                          {d.file_size && <span className="text-[10px] text-muted-foreground">{formatBytes(d.file_size)}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs">{d.document_type ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{d.workstream ? workstreamLabel(d.workstream) : "—"}</td>
                      <td className="px-3 py-2 text-xs">v{d.version}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDoc(d)} title="Open" className="p-1 hover:bg-muted rounded"><ExternalLink className="h-3.5 w-3.5" /></button>
                          {d.storage_type === "uploaded" && <button onClick={() => downloadDoc(d)} title="Download" className="p-1 hover:bg-muted rounded"><Download className="h-3.5 w-3.5" /></button>}
                          {d.storage_type === "uploaded" && <button onClick={() => setReplaceDoc(d)} title="Replace" className="p-1 hover:bg-muted rounded"><Replace className="h-3.5 w-3.5" /></button>}
                          <button onClick={() => toggleSeller(d)} title="Seller visibility" className="p-1 hover:bg-muted rounded">
                            {d.is_seller_visible ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => setVersionsDoc(d)} title="Versions" className="p-1 hover:bg-muted rounded text-xs">v{d.version}</button>
                          <button onClick={() => archive(d)} title="Archive" className="p-1 hover:bg-muted rounded"><Archive className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UploadDocumentModal open={uploadOpen} onOpenChange={setUploadOpen} acquisitionId={acquisition.id} onUploaded={load} defaultWorkstream={folder !== "all" ? folder : undefined} />
      <LinkDocumentModal open={linkOpen} onOpenChange={setLinkOpen} acquisitionId={acquisition.id} onAdded={load} defaultWorkstream={folder !== "all" ? folder : undefined} />
      {replaceDoc && <ReplaceDocumentModal doc={replaceDoc} onClose={() => setReplaceDoc(null)} onReplaced={load} />}
      {versionsDoc && <VersionHistoryModal doc={versionsDoc} onClose={() => setVersionsDoc(null)} onChanged={load} />}
    </div>
  );
}

function FolderItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full text-left text-sm px-3 py-1.5 rounded-md flex items-center justify-between ${active ? "bg-emerald-50 text-emerald-800 font-semibold" : "hover:bg-muted"}`}>
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </button>
  );
}
