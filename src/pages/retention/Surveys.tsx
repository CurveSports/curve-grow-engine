import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { SurveyTrendCharts } from "@/components/retention/SurveyTrendCharts";

export default function Surveys() {
  const navigate = useNavigate();
  const { orgId, isImpersonating } = useEffectiveOrg();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState("");

  const linkTo = (path: string) => (isImpersonating && orgId ? `/admin/orgs/${orgId}${path}` : path);

  const load = async () => {
    if (!orgId) return;
    const [{ data: s }, { data: ss }] = await Promise.all([
      (supabase as any).from("org_nps_surveys").select("*, org_seasons(name)").eq("org_id", orgId).order("created_at", { ascending: false }),
      (supabase as any).from("org_seasons").select("id,name,season_end_date").eq("org_id", orgId).order("season_end_date", { ascending: false }),
    ]);
    setSurveys(s || []);
    setSeasons(ss || []);
  };

  useEffect(() => { load(); }, [orgId]);

  const create = async () => {
    if (!name || !orgId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: latest } = await (supabase as any)
      .from("survey_master_questions")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const master_version = latest?.version ?? 1;
    const { data: settings } = await (supabase as any)
      .from("org_retention_settings")
      .select("default_collect_team,default_collect_age_group")
      .eq("org_id", orgId)
      .maybeSingle();
    const { data, error } = await (supabase as any).from("org_nps_surveys").insert({
      org_id: orgId, name, created_by: user!.id, status: "draft",
      season_id: seasonId || null,
      master_version,
      collect_team: settings?.default_collect_team ?? true,
      collect_age_group: settings?.default_collect_age_group ?? false,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Survey created");
    setOpen(false);
    setName("");
    setSeasonId("");
    navigate(linkTo(`/retention/surveys/${data.id}`));
  };

  const avgScore = surveys.length > 0
    ? surveys.filter((s) => s.nps_score != null).reduce((a, s) => a + Number(s.nps_score), 0) / Math.max(1, surveys.filter((s) => s.nps_score != null).length)
    : null;

  return (
    <AppShell title="Parent Surveys">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Parent Surveys</h1>
            <p className="text-muted-foreground mt-1">End-of-season feedback, benchmarked across every Curve org.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Survey</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a survey</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Survey name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="End of Spring 2026 Season" />
                </div>
                <div>
                  <Label>Season (optional)</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value)}
                  >
                    <option value="">— None —</option>
                    {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <Button onClick={create} className="w-full" disabled={!name}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {avgScore != null && (
          <Card>
            <CardHeader><CardTitle>Your rolling NPS (0–10 question)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold">{avgScore.toFixed(0)}</span>
                {avgScore >= 50 ? <TrendingUp className="h-6 w-6 text-green-500" /> : <TrendingDown className="h-6 w-6 text-amber-500" />}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                NPS = (% Promoters − % Detractors). Above 50 is excellent. Above 70 is world-class.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {surveys.length === 0 && <p className="text-muted-foreground p-4">No surveys yet — create your first one.</p>}
          {surveys.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(linkTo(`/retention/surveys/${s.id}`))}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {s.org_seasons?.name ? `${s.org_seasons.name} · ` : ""}
                    {s.sent_at ? format(new Date(s.sent_at), "MMM d, yyyy") : "Not sent"} · {s.response_count || 0} responses
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  {s.nps_score != null && <span className="text-2xl font-bold">{Number(s.nps_score).toFixed(0)}</span>}
                  <Badge variant={s.status === "sent" ? "default" : "secondary"}>{s.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
