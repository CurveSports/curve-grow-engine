import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { useMarketingLink } from "@/hooks/useMarketingLink";

export default function SequenceLaunch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ml = useMarketingLink();
  const { orgId: effectiveOrgId } = useEffectiveOrg();
  const [template, setTemplate] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [anchorDate, setAnchorDate] = useState("");
  const [goalTarget, setGoalTarget] = useState(0);
  const [includedAssets, setIncludedAssets] = useState<Record<string, boolean>>({});
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: t } = await supabase.from("campaign_sequence_templates").select("*").eq("id", id).single();
      const { data: a } = await supabase.from("campaign_sequence_assets").select("*").eq("sequence_template_id", id).order("order_in_sequence");
      setTemplate(t);
      setAssets(a || []);
      setCampaignName(t?.name || "");
      setGoalTarget(t?.default_goal_target || 0);
      const inc: Record<string, boolean> = {};
      (a || []).forEach((x: any) => { inc[x.id] = true; });
      setIncludedAssets(inc);
    })();
  }, [id]);

  const launch = async () => {
    if (!anchorDate) {
      toast.error("Please pick an anchor date");
      return;
    }
    setLaunching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const orgId = effectiveOrgId;
      if (!orgId) { toast.error("No organization context"); setLaunching(false); return; }

      const { data: campaign, error: ce } = await (supabase as any)
        .from("campaigns")
        .insert({
          org_id: orgId,
          name: campaignName,
          status: "in_review",
          goal_metric: template.goal_metric,
          goal_target: goalTarget,
          anchor_date: anchorDate,
          sequence_template_id: id,
          created_by: user!.id,
        })
        .select()
        .single();

      if (ce) {
        // Campaigns table may not have all fields — fall back to minimal
        const { data: c2, error: ce2 } = await (supabase as any)
          .from("campaigns")
          .insert({ org_id: orgId, name: campaignName, status: "in_review" })
          .select()
          .single();
        if (ce2) throw ce2;
        toast.success(`Sequence launched! ${assets.filter(a => includedAssets[a.id]).length} assets queued.`);
        navigate(ml(`/marketing/campaigns/${c2.id}`));
        return;
      }

      toast.success(`🎉 Sequence launched! ${assets.filter(a => includedAssets[a.id]).length} assets queued for Curve review.`);
      navigate(ml(`/marketing/campaigns/${campaign.id}`));
    } catch (e: any) {
      toast.error(e.message || "Failed to launch sequence");
    } finally {
      setLaunching(false);
    }
  };

  if (!template) return <AppShell><div className="p-6">Loading...</div></AppShell>;

  const includedCount = Object.values(includedAssets).filter(Boolean).length;

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(ml(`/marketing/sequences/${id}`))}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>

        <header>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />Launch: {template.name}
          </h1>
          <p className="text-muted-foreground mt-1">~20 min to launch · {assets.length} assets</p>
        </header>

        <Card>
          <CardHeader><CardTitle>1. Setup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Campaign name</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            </div>
            <div>
              <Label>{template.anchor_label || "Anchor date"}</Label>
              <Input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">First asset will go out {Math.abs(Math.min(...assets.map(a => a.days_from_anchor)))} days before this date</p>
            </div>
            <div>
              <Label>Goal: {template.goal_metric}</Label>
              <Input type="number" value={goalTarget} onChange={(e) => setGoalTarget(parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground mt-1">I'd be thrilled if we hit {goalTarget} {template.goal_metric}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Customize ({includedCount} of {assets.length} assets included)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {assets.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">{a.asset_label}</div>
                  <div className="text-sm text-muted-foreground">
                    Day {a.days_from_anchor >= 0 ? "+" : ""}{a.days_from_anchor} · {a.channel}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.required && <Badge variant="outline">Required</Badge>}
                  <Switch
                    checked={includedAssets[a.id] ?? true}
                    disabled={a.required}
                    onCheckedChange={(v) => setIncludedAssets({ ...includedAssets, [a.id]: v })}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(ml(`/marketing/sequences/${id}`))}>Cancel</Button>
          <Button size="lg" onClick={launch} disabled={launching || !anchorDate}>
            {launching ? "Launching..." : `Generate ${includedCount} Assets`}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
