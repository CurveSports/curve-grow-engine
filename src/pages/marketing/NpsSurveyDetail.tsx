import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Heart, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function NpsSurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [followupNotes, setFollowupNotes] = useState<Record<string, string>>({});

  const load = async () => {
    if (!id) return;
    const { data: s } = await (supabase as any).from("org_nps_surveys").select("*").eq("id", id).single();
    const { data: r } = await (supabase as any).from("org_nps_responses").select("*").eq("survey_id", id).order("responded_at", { ascending: false });
    setSurvey(s);
    setResponses(r || []);
  };

  useEffect(() => { load(); }, [id]);

  const sendSurvey = async () => {
    await (supabase as any).from("org_nps_surveys").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
    toast.success("Survey marked as sent (email/SMS delivery wires when integrations are ready)");
    load();
  };

  const resolveFollowup = async (responseId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from("org_nps_responses").update({
      followup_completed_at: new Date().toISOString(),
      followup_completed_by: user!.id,
      followup_notes: followupNotes[responseId] || "",
      flagged_for_followup: false,
    }).eq("id", responseId);
    toast.success("Marked as resolved");
    load();
  };

  if (!survey) return <AppShell><div className="p-6">Loading...</div></AppShell>;

  const promoters = responses.filter(r => r.category === "promoter");
  const passives = responses.filter(r => r.category === "passive");
  const detractors = responses.filter(r => r.category === "detractor");
  const detractorsToFollow = detractors.filter(r => r.flagged_for_followup);

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/marketing/nps")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to surveys
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{survey.name}</h1>
            <Badge className="mt-2">{survey.status}</Badge>
          </div>
          {survey.status === "draft" && <Button onClick={sendSurvey}>Send Survey</Button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-3xl font-bold">{survey.nps_score != null ? Number(survey.nps_score).toFixed(0) : "—"}</div>
            <div className="text-xs text-muted-foreground">NPS Score</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-3xl font-bold text-green-600">{survey.promoter_count || 0}</div>
            <div className="text-xs text-muted-foreground">Promoters (9-10)</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-3xl font-bold text-amber-500">{survey.passive_count || 0}</div>
            <div className="text-xs text-muted-foreground">Passives (7-8)</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-3xl font-bold text-red-500">{survey.detractor_count || 0}</div>
            <div className="text-xs text-muted-foreground">Detractors (0-6)</div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({responses.length})</TabsTrigger>
            <TabsTrigger value="promoters"><Heart className="h-4 w-4 mr-1" />Promoters ({promoters.length})</TabsTrigger>
            <TabsTrigger value="detractors"><AlertCircle className="h-4 w-4 mr-1" />Detractor Followup ({detractorsToFollow.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-2">
            {responses.length === 0 ? (
              <p className="text-muted-foreground p-6">No responses yet</p>
            ) : responses.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="font-bold text-2xl">{r.score}</div>
                    {r.followup_response && <p className="text-sm mt-1">"{r.followup_response}"</p>}
                  </div>
                  <Badge variant={r.category === "promoter" ? "default" : r.category === "detractor" ? "destructive" : "secondary"}>
                    {r.category}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="promoters" className="space-y-2">
            <p className="text-sm text-muted-foreground p-2">Use these as testimonials in your marketing.</p>
            {promoters.filter(p => p.followup_response).map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <p className="italic">"{r.followup_response}"</p>
                  <div className="text-xs text-muted-foreground mt-2">Score: {r.score}</div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="detractors" className="space-y-3">
            <p className="text-sm text-muted-foreground p-2">
              Detractors are gold. Reach out personally — most can be turned around with a 5-minute call.
            </p>
            {detractorsToFollow.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="font-bold text-2xl text-red-500">{r.score}</div>
                  </div>
                  {r.followup_response && <p className="text-sm">"{r.followup_response}"</p>}
                  <Textarea
                    placeholder="What did you do to follow up?"
                    value={followupNotes[r.id] || ""}
                    onChange={(e) => setFollowupNotes({ ...followupNotes, [r.id]: e.target.value })}
                  />
                  <Button size="sm" onClick={() => resolveFollowup(r.id)}>Mark Resolved</Button>
                </CardContent>
              </Card>
            ))}
            {detractorsToFollow.length === 0 && <p className="text-muted-foreground p-2">No detractors needing followup. Nice.</p>}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
