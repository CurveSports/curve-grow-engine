import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function NpsSurveys() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [orgId, setOrgId] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("org_id").eq("user_id", user!.id).single();
      if (!profile?.org_id) return;
      setOrgId(profile.org_id);
      const { data } = await (supabase as any).from("org_nps_surveys").select("*").order("created_at", { ascending: false });
      setSurveys(data || []);
    })();
  }, []);

  const create = async () => {
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any).from("org_nps_surveys").insert({
      org_id: orgId, name, created_by: user!.id, status: "draft",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Survey created");
    setOpen(false);
    navigate(`/marketing/nps/${data.id}`);
  };

  const avgScore = surveys.length > 0
    ? surveys.filter((s) => s.nps_score != null).reduce((a, s) => a + Number(s.nps_score), 0) / Math.max(1, surveys.filter((s) => s.nps_score != null).length)
    : null;

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">NPS Surveys</h1>
            <p className="text-muted-foreground mt-1">Track parent satisfaction over time</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Survey</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create NPS Survey</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Survey name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="End of Spring 2026 Season" />
                </div>
                <Button onClick={create} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {avgScore != null && (
          <Card>
            <CardHeader><CardTitle>Current NPS Score (rolling avg)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold">{avgScore.toFixed(0)}</span>
                {avgScore >= 50 ? <TrendingUp className="h-6 w-6 text-green-500" /> : <TrendingDown className="h-6 w-6 text-amber-500" />}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                NPS = (% Promoters - % Detractors). Above 50 is excellent. Above 70 is world-class.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {surveys.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/marketing/nps/${s.id}`)}>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-sm text-muted-foreground">
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
