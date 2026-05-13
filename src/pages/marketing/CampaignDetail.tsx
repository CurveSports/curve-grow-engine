import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Image as ImageIcon, Mail, Trash2, Send, Save } from "lucide-react";

type Campaign = any;
type AssetRow = {
  id: string;
  asset_type: string;
  design_id: string | null;
  email_send_id: string | null;
  label: string | null;
  sort_order: number;
  design?: { id: string; name: string | null; preview_url: string | null; status: string } | null;
  email?: { id: string; subject: string | null; status: string } | null;
};

const STATUSES = ["planning", "in_review", "approved", "live", "completed", "archived"];

export default function CampaignDetail() {
  const { id } = useParams();
  const { profile, user, role } = useAuth();
  const navigate = useNavigate();
  const { orgId } = useEffectiveOrg();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<"design" | "email">("design");
  const [available, setAvailable] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: c } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
    setCampaign(c);
    const { data: a } = await supabase
      .from("campaign_assets")
      .select("id,asset_type,design_id,email_send_id,label,sort_order")
      .eq("campaign_id", id)
      .order("sort_order");
    const rows = (a ?? []) as AssetRow[];
    // hydrate
    const designIds = rows.filter((r) => r.design_id).map((r) => r.design_id!) as string[];
    const emailIds = rows.filter((r) => r.email_send_id).map((r) => r.email_send_id!) as string[];
    const [{ data: ds }, { data: es }] = await Promise.all([
      designIds.length
        ? supabase.from("designs").select("id,name,preview_url,status").in("id", designIds)
        : Promise.resolve({ data: [] }),
      emailIds.length
        ? supabase.from("org_email_sends").select("id,subject,status").in("id", emailIds)
        : Promise.resolve({ data: [] }),
    ]);
    const dMap = new Map((ds ?? []).map((d: any) => [d.id, d]));
    const eMap = new Map((es ?? []).map((e: any) => [e.id, e]));
    setAssets(rows.map((r) => ({ ...r, design: r.design_id ? dMap.get(r.design_id) ?? null : null, email: r.email_send_id ? eMap.get(r.email_send_id) ?? null : null })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const save = async () => {
    if (!campaign) return;
    setSaving(true);
    const { error } = await supabase
      .from("campaigns")
      .update({
        name: campaign.name,
        description: campaign.description,
        goal: campaign.goal,
        status: campaign.status,
        start_date: campaign.start_date || null,
        end_date: campaign.end_date || null,
      })
      .eq("id", campaign.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const openPicker = async (type: "design" | "email") => {
    if (!orgId) return;
    setPickerType(type);
    setPickerOpen(true);
    if (type === "design") {
      const { data } = await supabase.from("designs").select("id,name,preview_url,status").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50);
      setAvailable(data ?? []);
    } else {
      const { data } = await supabase.from("org_email_sends").select("id,subject,status").eq("org_id", orgId).order("created_at", { ascending: false }).limit(50);
      setAvailable(data ?? []);
    }
  };

  const addAsset = async (item: any) => {
    if (!campaign) return;
    const sort = assets.length;
    const insert: any = {
      campaign_id: campaign.id,
      asset_type: pickerType,
      label: pickerType === "design" ? item.name : item.subject,
      sort_order: sort,
    };
    if (pickerType === "design") insert.design_id = item.id;
    else insert.email_send_id = item.id;
    const { error } = await supabase.from("campaign_assets").insert(insert);
    if (error) return toast.error(error.message);
    setPickerOpen(false);
    load();
  };

  const removeAsset = async (assetId: string) => {
    const { error } = await supabase.from("campaign_assets").delete().eq("id", assetId);
    if (error) return toast.error(error.message);
    load();
  };

  const submitForApproval = async () => {
    if (!campaign || !user) return;
    if (!assets.length) return toast.error("Add at least one asset before submitting");
    // Create approval queue entries for any non-approved designs/emails
    const queueRows = assets
      .filter((a) => (a.design && a.design.status !== "approved") || (a.email && a.email.status === "draft"))
      .map((a) => ({
        org_id: campaign.org_id,
        campaign_id: campaign.id,
        subject_type: a.asset_type,
        design_id: a.design_id,
        email_send_id: a.email_send_id,
        current_stage: "curve_review",
        status: "pending",
        submitted_by: user.id,
        priority: "normal",
      }));
    if (queueRows.length) {
      const { error } = await supabase.from("approval_queue").insert(queueRows);
      if (error) return toast.error(error.message);
    }
    await supabase.from("campaigns").update({ status: "in_review" }).eq("id", campaign.id);
    toast.success("Submitted for Curve review");
    load();
  };

  if (loading) return <AppShell><Card className="p-8 text-center text-muted-foreground">Loading…</Card></AppShell>;
  if (!campaign) return <AppShell><Card className="p-8 text-center">Campaign not found.</Card></AppShell>;

  return (
    <AppShell title={campaign.name}>
      <div className="mb-6">
        <Link to="/marketing/campaigns" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold mb-4">Campaign details</h2>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={campaign.name} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })} />
              </div>
              <div>
                <Label>Goal</Label>
                <Input value={campaign.goal ?? ""} onChange={(e) => setCampaign({ ...campaign, goal: e.target.value })} placeholder="Fill 4 tryout slots, 60 RSVPs" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={campaign.description ?? ""} onChange={(e) => setCampaign({ ...campaign, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input type="date" value={campaign.start_date ?? ""} onChange={(e) => setCampaign({ ...campaign, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End</Label>
                  <Input type="date" value={campaign.end_date ?? ""} onChange={(e) => setCampaign({ ...campaign, end_date: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <select value={campaign.status} onChange={(e) => setCampaign({ ...campaign, status: e.target.value })} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save"}</Button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Assets ({assets.length})</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openPicker("design")}><Plus className="h-4 w-4 mr-1" />Design</Button>
                <Button size="sm" variant="outline" onClick={() => openPicker("email")}><Plus className="h-4 w-4 mr-1" />Email</Button>
              </div>
            </div>
            {assets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No assets yet. Add a design or email to get started.</p>
            ) : (
              <div className="space-y-2">
                {assets.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-md border border-border">
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {a.design?.preview_url ? (
                        <img src={a.design.preview_url} alt="" className="w-full h-full object-cover" />
                      ) : a.asset_type === "email" ? (
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.label || (a.design?.name ?? a.email?.subject ?? "Untitled")}</p>
                      <p className="text-xs text-muted-foreground capitalize">{a.asset_type} · {a.design?.status ?? a.email?.status ?? "—"}</p>
                    </div>
                    {a.design_id && (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/marketing/designs/${a.design_id}`)}>Open</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeAsset(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold mb-3">Approval workflow</h2>
            <p className="text-sm text-muted-foreground mb-4">
              When you submit, every draft asset enters the Curve review queue. After Curve approves, it returns to your team for final sign-off.
            </p>
            <Button className="w-full" onClick={submitForApproval} disabled={campaign.status === "in_review"}>
              <Send className="h-4 w-4 mr-2" />
              {campaign.status === "in_review" ? "In review" : "Submit for Curve review"}
            </Button>
            <Link to="/marketing/approvals" className="block text-center text-sm text-primary hover:underline mt-3">
              View approval queue →
            </Link>
          </Card>

          {role === "admin" && (
            <Card className="p-5 bg-amber-50 dark:bg-amber-900/10 border-amber-200">
              <p className="text-xs uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300 mb-2">Curve admin</p>
              <Link to="/admin/marketing/approvals" className="text-sm text-primary hover:underline">Open Curve approval queue →</Link>
            </Card>
          )}
        </div>
      </div>

      {/* Asset picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add {pickerType === "design" ? "design" : "email"}</DialogTitle></DialogHeader>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nothing yet. Create one first under {pickerType === "design" ? "Designs" : "Emails"}.</p>
          ) : (
            <div className="grid gap-2">
              {available.map((item) => (
                <button key={item.id} onClick={() => addAsset(item)} className="text-left p-3 rounded-md border border-border hover:border-primary hover:bg-muted/30 transition-colors flex items-center gap-3">
                  {pickerType === "design" ? (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {item.preview_url ? <img src={item.preview_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  ) : (
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name || item.subject || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setPickerOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
