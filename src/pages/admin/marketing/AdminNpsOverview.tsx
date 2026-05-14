import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Pencil, ExternalLink, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminNpsOverview() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("org_nps_surveys")
      .select("*, organizations(id, name)")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.name || "").toLowerCase().includes(q) ||
      (r.organizations?.name || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const openEdit = (s: any) => {
    setEditing(s);
    setEditForm({
      name: s.name || "",
      question: s.question || "",
      followup_question_promoter: s.followup_question_promoter || "",
      followup_question_passive: s.followup_question_passive || "",
      followup_question_detractor: s.followup_question_detractor || "",
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from("org_nps_surveys").update(editForm).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Survey updated");
    setEditing(null);
    load();
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">NPS Surveys (All Orgs)</h1>
          <p className="text-muted-foreground mt-1">Edit, preview, and review every NPS survey across the portfolio.</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by survey or org name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No surveys found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name || "Untitled survey"}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {s.organizations?.name || "—"} · {s.sent_at ? format(new Date(s.sent_at), "MMM d, yyyy") : "Not sent"} · {s.response_count || 0} responses
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.nps_score != null && <span className="text-2xl font-bold">{Number(s.nps_score).toFixed(0)}</span>}
                    <Badge variant={s.status === "sent" ? "default" : "secondary"}>{s.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => window.open(`/nps/preview/${s.id}`, "_blank")}>
                      <Eye className="h-4 w-4 mr-1" />Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4 mr-1" />Edit
                    </Button>
                    {s.organizations?.id && (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/orgs/${s.organizations.id}/marketing/nps/${s.id}`)}>
                        <ExternalLink className="h-4 w-4 mr-1" />Open
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Survey</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Survey name</Label>
                <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Main question</Label>
                <Textarea rows={2} value={editForm.question || ""} onChange={(e) => setEditForm({ ...editForm, question: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Use <code>{"{org_name}"}</code> to insert the org name.</p>
              </div>
              <div>
                <Label>Follow-up for Promoters (9–10)</Label>
                <Textarea rows={2} value={editForm.followup_question_promoter || ""} onChange={(e) => setEditForm({ ...editForm, followup_question_promoter: e.target.value })} />
              </div>
              <div>
                <Label>Follow-up for Passives (7–8)</Label>
                <Textarea rows={2} value={editForm.followup_question_passive || ""} onChange={(e) => setEditForm({ ...editForm, followup_question_passive: e.target.value })} />
              </div>
              <div>
                <Label>Follow-up for Detractors (0–6)</Label>
                <Textarea rows={2} value={editForm.followup_question_detractor || ""} onChange={(e) => setEditForm({ ...editForm, followup_question_detractor: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
