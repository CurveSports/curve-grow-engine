import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Heart, AlertCircle, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { useMarketingLink } from "@/hooks/useMarketingLink";

export default function NpsSurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ml = useMarketingLink();
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [followupNotes, setFollowupNotes] = useState<Record<string, string>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const openEdit = () => {
    setEditForm({
      name: survey.name || "",
      question: survey.question || "",
      audience_segment_id: survey.audience_segment_id || "",
      followup_question_promoter: survey.followup_question_promoter || "",
      followup_question_passive: survey.followup_question_passive || "",
      followup_question_detractor: survey.followup_question_detractor || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const payload = { ...editForm };
    if (!payload.audience_segment_id) payload.audience_segment_id = null;
    const { error } = await (supabase as any).from("org_nps_surveys").update(payload).eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Survey updated");
    setEditOpen(false);
    load();
  };

  const load = async () => {
    if (!id) return;
    const { data: s } = await (supabase as any).from("org_nps_surveys").select("*").eq("id", id).single();
    const { data: r } = await (supabase as any).from("org_nps_responses").select("*").eq("survey_id", id).order("responded_at", { ascending: false });
    setSurvey(s);
    setResponses(r || []);
    if (s?.org_id) {
      const { data: segs } = await (supabase as any).from("org_contact_segments").select("id,name,contact_count").eq("org_id", s.org_id).order("name");
      setSegments(segs || []);
    }
  };

  useEffect(() => { load(); }, [id]);

  const sendSurvey = async () => {
    if (!survey?.audience_segment_id) {
      toast.error("Pick an audience first — open Edit and choose a segment.");
      return;
    }
    if (!confirm("Send this survey to everyone in the audience now?")) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("nps-send-survey", { body: { survey_id: id } });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Sent to ${data?.sent ?? 0} of ${data?.total ?? 0} recipients` + (data?.failed ? ` (${data.failed} failed)` : ""));
    load();
  };

  const sendTest = async () => {
    if (!testEmail) return toast.error("Enter your email");
    setSending(true);
    const { data, error } = await supabase.functions.invoke("nps-send-survey", { body: { survey_id: id, test_email: testEmail } });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(data?.sent ? "Test sent — check your inbox" : "Test failed");
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
        <Button variant="ghost" onClick={() => navigate(ml("/marketing/nps"))}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to surveys
        </Button>

        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{survey.name}</h1>
            <Badge className="mt-2">{survey.status}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open(`/nps/preview/${id}`, "_blank")}>
              <Eye className="h-4 w-4 mr-2" />Preview
            </Button>
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-2" />Edit
            </Button>
            {survey.status === "draft" && (
              <Button onClick={sendSurvey} disabled={sending}>{sending ? "Sending…" : "Send Survey"}</Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1">Recipients will see</div>
              <div className="font-medium">{survey.question}</div>
              <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
                <div><span className="text-green-600 font-medium">Promoter follow-up:</span> {survey.followup_question_promoter}</div>
                <div><span className="text-amber-600 font-medium">Passive follow-up:</span> {survey.followup_question_passive}</div>
                <div><span className="text-red-600 font-medium">Detractor follow-up:</span> {survey.followup_question_detractor}</div>
              </div>
            </div>
            <div className="border-t pt-3 grid md:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Audience</div>
                <div className="font-medium">
                  {segments.find(s => s.id === survey.audience_segment_id)?.name || (
                    <span className="text-destructive">No audience selected — click Edit to choose one.</span>
                  )}
                </div>
                {survey.audience_segment_id && (
                  <div className="text-xs text-muted-foreground">
                    ~{segments.find(s => s.id === survey.audience_segment_id)?.contact_count ?? 0} recipients
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Send a test to yourself</div>
                <div className="flex gap-2">
                  <Input placeholder="you@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                  <Button variant="outline" size="sm" onClick={sendTest} disabled={sending || !testEmail}>Test send</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
                <Label>Audience</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={editForm.audience_segment_id || ""}
                  onChange={(e) => setEditForm({ ...editForm, audience_segment_id: e.target.value })}
                >
                  <option value="">— Choose a segment —</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contact_count ?? 0})</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Manage segments under <strong>Contacts → Segments</strong>.</p>
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
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
