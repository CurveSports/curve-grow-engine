import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Eye, Plus, Trash2, Copy, Download, ExternalLink, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import {
  avgRating, buildResponseCsv, calcNps, categoryLabel, distributeChoices,
  MasterQuestion, OrgQuestion, orderMasterQuestions, QUESTION_TYPE_LABELS, SurveyQuestionType,
} from "@/lib/surveys";
import { SortableQuestionList } from "@/components/retention/SortableQuestionList";
import { Checkbox } from "@/components/ui/checkbox";

type Response = {
  id: string;
  respondent_name: string | null;
  team_id: string | null;
  team_name_text: string | null;
  age_group: string | null;
  responded_at: string;
};

export default function SurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orgId, isImpersonating } = useEffectiveOrg();
  const linkTo = (path: string) => (isImpersonating && orgId ? `/admin/orgs/${orgId}${path}` : path);

  const [survey, setSurvey] = useState<any>(null);
  const [master, setMaster] = useState<MasterQuestion[]>([]);
  const [orgQs, setOrgQs] = useState<OrgQuestion[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newQ, setNewQ] = useState<{ text: string; type: SurveyQuestionType; required: boolean }>({ text: "", type: "rating_5", required: false });
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [toggling, setToggling] = useState(false);

  const locked = survey?.status === "sent" && (survey?.response_count ?? 0) > 0;

  const load = async () => {
    if (!id) return;
    const { data: s } = await (supabase as any)
      .from("org_nps_surveys")
      .select("*, organizations(name), org_seasons(name)")
      .eq("id", id)
      .single();
    setSurvey(s);
    if (!s) return;
    const version = s.master_version ?? 1;
    const [
      { data: m }, { data: oq }, { data: r }, { data: a },
      { data: ss }, { data: tt },
    ] = await Promise.all([
      (supabase as any).from("survey_master_questions").select("*").eq("version", version).eq("is_active", true).order("sort_order"),
      (supabase as any).from("org_survey_questions").select("*").eq("survey_id", id).order("sort_order"),
      (supabase as any).from("org_nps_responses").select("*").eq("survey_id", id).order("responded_at", { ascending: false }),
      (supabase as any).from("org_nps_answers").select("*, org_nps_responses!inner(survey_id)").eq("org_nps_responses.survey_id", id),
      (supabase as any).from("org_seasons").select("id,name").eq("org_id", s.org_id).order("season_end_date", { ascending: false }),
      (supabase as any).from("org_teams").select("id,name").eq("org_id", s.org_id).order("name"),
    ]);
    setMaster((m as MasterQuestion[]) || []);
    setOrgQs((oq as OrgQuestion[]) || []);
    setResponses((r as Response[]) || []);
    setAnswers(a || []);
    setSeasons(ss || []);
    setTeams(tt || []);
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    setEditForm({
      name: survey.name || "",
      question: survey.question || "",
      season_id: survey.season_id || "",
      collect_team: survey.collect_team ?? true,
      collect_age_group: survey.collect_age_group ?? false,
      followup_question_promoter: survey.followup_question_promoter || "",
      followup_question_passive: survey.followup_question_passive || "",
      followup_question_detractor: survey.followup_question_detractor || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const payload = { ...editForm };
    if (!payload.season_id) payload.season_id = null;
    const { error } = await (supabase as any).from("org_nps_surveys").update(payload).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditOpen(false);
    load();
  };

  const addQuestion = async () => {
    if (!newQ.text.trim() || !survey) return;
    const nextOrder = (orgQs.at(-1)?.sort_order ?? 0) + 10;
    const { error } = await (supabase as any).from("org_survey_questions").insert({
      org_id: survey.org_id, survey_id: id,
      question_text: newQ.text.trim(),
      question_type: newQ.type,
      sort_order: nextOrder,
      is_required: newQ.required,
    });
    if (error) { toast.error(error.message); return; }
    setNewQ({ text: "", type: "rating_5", required: false });
    setAddOpen(false);
    load();
  };

  const removeQ = async (qid: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await (supabase as any).from("org_survey_questions").delete().eq("id", qid);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const reorderQs = async (orderedIds: string[]) => {
    // Optimistic UI: renumber locally (10, 20, 30…), persist in a batch, verify by reloading.
    const prevOrgQs = orgQs;
    const byId = new Map(orgQs.map((q) => [q.id, q]));
    const next = orderedIds.map((qid, i) => ({ ...(byId.get(qid) as OrgQuestion), sort_order: (i + 1) * 10 }));
    setOrgQs(next);
    const results = await Promise.all(next.map((q) =>
      (supabase as any).from("org_survey_questions").update({ sort_order: q.sort_order }).eq("id", q.id)
    ));
    const firstErr = results.find((r: any) => r?.error);
    if (firstErr) {
      setOrgQs(prevOrgQs);
      toast.error(`Could not save order: ${firstErr.error.message}`);
      return;
    }
    toast.success("Question order saved");
    // Reload from the database so the report and preview reflect the persisted order.
    load();
  };

  const orderedMaster = orderMasterQuestions(master, survey?.master_question_order ?? null);
  const includedIds: string[] | null = survey?.included_master_question_ids ?? null;
  const isMasterIncluded = (qid: string) => includedIds === null || includedIds.includes(qid);
  const selectedMaster = orderedMaster.filter((q) => isMasterIncluded(q.id));

  const reorderMaster = async (orderedIds: string[]) => {
    if (locked) return;
    const prev = survey;
    setSurvey({ ...survey, master_question_order: orderedIds });
    const { error } = await (supabase as any)
      .from("org_nps_surveys")
      .update({ master_question_order: orderedIds })
      .eq("id", id);
    if (error) {
      setSurvey(prev);
      toast.error(`Could not save order: ${error.message}`);
      return;
    }
    toast.success("Question order saved");
    load();
  };

  const toggleMasterIncluded = async (qid: string, checked: boolean) => {
    if (locked) return;
    const currentIds = includedIds ?? master.map((q) => q.id);
    const nextIds = checked
      ? Array.from(new Set([...currentIds, qid]))
      : currentIds.filter((x) => x !== qid);
    const allIncluded = master.length > 0 && master.every((q) => nextIds.includes(q.id));
    const payload = { included_master_question_ids: allIncluded ? null : nextIds };
    const prev = survey;
    setSurvey({ ...survey, ...payload });
    const { error } = await (supabase as any).from("org_nps_surveys").update(payload).eq("id", id);
    if (error) {
      setSurvey(prev);
      toast.error(`Could not save: ${error.message}`);
      return;
    }
    toast.success(checked ? "Question included" : "Question removed");
  };



  const toggleOpen = async () => {
    const nextOpen = !survey.is_open;
    if (nextOpen && !confirm("Open this survey? The public link will start accepting responses.")) return;
    if (!nextOpen && !confirm("Close this survey? The public link will stop accepting responses.")) return;
    setToggling(true);
    const payload: any = { is_open: nextOpen };
    if (nextOpen && !survey.sent_at) payload.sent_at = new Date().toISOString();
    if (nextOpen) payload.status = "sent"; // keep legacy status for existing analytics
    const { error } = await (supabase as any).from("org_nps_surveys").update(payload).eq("id", id);
    setToggling(false);
    if (error) { toast.error(error.message); return; }
    toast.success(nextOpen ? "Survey opened" : "Survey closed");
    load();
  };

  const publicUrl = survey?.public_slug ? `${window.location.origin}/s/${survey.public_slug}` : "";

  const copyPublicLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Public link copied — paste it into your email or text");
  };

  const copyPreviewLink = async () => {
    const url = `${window.location.origin}/nps/preview/${id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Preview link copied");
  };


  const answersByResponse = new Map<string, any[]>();
  for (const a of answers) {
    const arr = answersByResponse.get(a.response_id) ?? [];
    arr.push(a);
    answersByResponse.set(a.response_id, arr);
  }

  const filteredResponses = teamFilter
    ? responses.filter((r) => r.team_id === teamFilter || r.team_name_text === teamFilter)
    : responses;

  const exportCsv = () => {
    const rich = filteredResponses.map((r) => ({
      id: r.id,
      respondent_name: r.respondent_name,
      team_name_text: r.team_name_text ?? teams.find((t) => t.id === r.team_id)?.name ?? null,
      age_group: r.age_group,
      responded_at: r.responded_at,
      answers: (answersByResponse.get(r.id) ?? []).map((a) => ({
        question_id: a.question_id,
        question_source: a.question_source,
        question_text: "",
        question_type: "open_text" as SurveyQuestionType,
        answer_value: a.answer_value ?? "",
      })),
    }));
    const csv = buildResponseCsv(selectedMaster, orgQs, rich);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${survey.name || "survey"}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!survey) return <AppShell><div className="p-6">Loading…</div></AppShell>;

  // Per-question aggregates
  const aggFor = (q: { id: string }, src: "master" | "org", type: SurveyQuestionType) => {
    const vals = answers.filter((a) => a.question_id === q.id && a.question_source === src).map((a) => a.answer_value);
    if (type === "rating_5" || type === "rating_10") {
      const nums = vals.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
      if (type === "rating_10") return { avg: avgRating(nums), nps: calcNps(nums), count: nums.length };
      return { avg: avgRating(nums), nps: null as number | null, count: nums.length };
    }
    if (type === "yes_no_maybe") return { dist: distributeChoices(vals), count: vals.length };
    return { texts: vals.filter(Boolean), count: vals.filter(Boolean).length };
  };

  return (
    <AppShell title={survey.name}>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(linkTo("/retention/surveys"))}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to surveys
        </Button>

        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{survey.name}</h1>
            <div className="flex gap-2 mt-2 items-center flex-wrap">
              <Badge variant={survey.is_open ? "default" : "secondary"}>{survey.is_open ? "Open — accepting responses" : "Closed"}</Badge>
              {survey.org_seasons?.name && <Badge variant="outline">{survey.org_seasons.name}</Badge>}
              {locked && <Badge variant="secondary">Locked — has responses</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(`/nps/preview/${id}`, "_blank")}><Eye className="h-4 w-4 mr-1" />Preview</Button>
            <Button variant="outline" size="sm" onClick={openEdit}>Edit</Button>
            <Button size="sm" variant={survey.is_open ? "outline" : "default"} onClick={toggleOpen} disabled={toggling}>
              {survey.is_open ? <><Lock className="h-4 w-4 mr-1" />Close survey</> : <><Unlock className="h-4 w-4 mr-1" />Open survey</>}
            </Button>
          </div>
        </div>

        {/* SHARE LINK */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Share this survey</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy the public link below and send it out from your own email tool, text blast, or team app.
              {!survey.is_open && <span className="block mt-1 text-amber-700">The survey is currently <b>closed</b> — open it above before sharing.</span>}
            </p>
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button variant="outline" onClick={copyPublicLink}><Copy className="h-4 w-4 mr-1" />Copy</Button>
              <Button variant="outline" onClick={() => window.open(publicUrl, "_blank")} disabled={!publicUrl}><ExternalLink className="h-4 w-4 mr-1" />Open</Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Preview (won't record answers): <button className="underline" onClick={copyPreviewLink}>copy preview link</button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="NPS Score" value={survey.nps_score != null ? Number(survey.nps_score).toFixed(0) : "—"} />
          <StatCard label="Promoters (9–10)" value={survey.promoter_count ?? 0} tone="green" />
          <StatCard label="Passives (7–8)" value={survey.passive_count ?? 0} tone="amber" />
          <StatCard label="Detractors (0–6)" value={survey.detractor_count ?? 0} tone="red" />
        </div>

        <Tabs defaultValue="questions">
          <TabsList>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="responses">Responses ({responses.length})</TabsTrigger>
            <TabsTrigger value="results">Per-question results</TabsTrigger>
          </TabsList>

          {/* QUESTIONS */}
          <TabsContent value="questions" className="space-y-4">

            <Card>
              <CardHeader><CardTitle className="text-base">Core questions (Curve — cross-org benchmark)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">Check the template questions you want to include on this survey. Unchecked questions won't appear in the public link or the report.</p>
                {master.map((q) => {
                  const included = isMasterIncluded(q.id);
                  const isNps = q.question_type === "rating_10";
                  return (
                    <div key={q.id} className="flex items-start gap-3 border-b last:border-b-0 py-2">
                      <Checkbox
                        checked={included}
                        onCheckedChange={(v) => toggleMasterIncluded(q.id, !!v)}
                        disabled={locked}
                        className="mt-1"
                      />
                      <Badge variant="outline" className="mt-0.5 shrink-0">{categoryLabel(q.category)}</Badge>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{q.question_text}</div>
                        <div className="text-xs text-muted-foreground">{QUESTION_TYPE_LABELS[q.question_type]}</div>
                        {isNps && !included && (
                          <div className="text-xs text-amber-700 mt-1">Excluding this removes the NPS score from this survey.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {master.length === 0 && <p className="text-sm text-muted-foreground">No core questions in this version.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle className="text-base">Your custom questions</CardTitle>
                <Button size="sm" onClick={() => setAddOpen(true)} disabled={locked}>
                  <Plus className="h-4 w-4 mr-1" />Add question
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {locked && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">This survey has responses — questions are locked. Create a new survey for the next season to change them.</p>}
                {!locked && orgQs.length > 0 && <p className="text-xs text-muted-foreground">Drag <span className="inline-block align-middle">⋮⋮</span> to reorder.</p>}
                <SortableQuestionList
                  items={orgQs}
                  disabled={locked}
                  onReorder={reorderQs}
                  renderItem={(q, handle) => (
                    <div className="flex items-start gap-2 border rounded p-2 bg-card">
                      <div className="pt-1">{handle}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{q.question_text}</div>
                        <div className="text-xs text-muted-foreground">{QUESTION_TYPE_LABELS[q.question_type]}{q.is_required ? " · required" : ""}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeQ(q.id)} disabled={locked}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                />
                {orgQs.length === 0 && <p className="text-sm text-muted-foreground">No custom questions yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>


          {/* RESPONSES */}
          <TabsContent value="responses" className="space-y-3">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="flex gap-2 items-center">
                <Label className="text-sm">Team:</Label>
                <select className="h-9 px-3 rounded-md border border-input bg-background text-sm" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
                  <option value="">All teams</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
            </div>
            {filteredResponses.length === 0 && <p className="text-muted-foreground p-4">No responses yet.</p>}
            {filteredResponses.map((r) => {
              const rAnswers = answersByResponse.get(r.id) ?? [];
              const teamName = r.team_name_text ?? teams.find((t) => t.id === r.team_id)?.name;
              return (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{r.respondent_name || "Anonymous"}</span>
                        {teamName && <span className="text-muted-foreground"> · {teamName}</span>}
                        {r.age_group && <span className="text-muted-foreground"> · {r.age_group}</span>}
                      </div>
                      <span className="text-muted-foreground text-xs">{new Date(r.responded_at).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{rAnswers.length} answers</div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* PER-QUESTION RESULTS */}
          <TabsContent value="results" className="space-y-3">
            {[...selectedMaster.map((q) => ({ q, src: "master" as const })), ...orgQs.map((q) => ({ q, src: "org" as const }))].map(({ q, src }) => {
              const agg: any = aggFor(q, src, q.question_type);
              return (
                <Card key={`${src}:${q.id}`}>
                  <CardContent className="p-4 space-y-1">
                    <div className="text-sm font-medium">{q.question_text}</div>
                    <div className="text-xs text-muted-foreground">{QUESTION_TYPE_LABELS[q.question_type]} · {agg.count} responses</div>
                    {(q.question_type === "rating_5" || q.question_type === "rating_10") && (
                      <div className="mt-1 text-sm">
                        Avg: <span className="font-bold">{agg.avg ?? "—"}</span>
                        {q.question_type === "rating_10" && <> · NPS: <span className="font-bold">{agg.nps ?? "—"}</span></>}
                      </div>
                    )}
                    {q.question_type === "yes_no_maybe" && (
                      <div className="mt-1 text-sm flex gap-3">
                        {Object.entries(agg.dist as Record<string, number>).map(([k, v]) => <span key={k}>{k}: <b>{v}</b></span>)}
                      </div>
                    )}
                    {q.question_type === "open_text" && (
                      <ul className="mt-1 list-disc pl-5 text-sm space-y-1">
                        {(agg.texts as string[]).slice(0, 10).map((t, i) => <li key={i} className="text-muted-foreground">"{t}"</li>)}
                        {(agg.texts as string[]).length > 10 && <li className="text-xs text-muted-foreground">…and {(agg.texts as string[]).length - 10} more</li>}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

        </Tabs>

        {/* Edit dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit survey</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div>
                <Label>Season</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={editForm.season_id || ""} onChange={(e) => setEditForm({ ...editForm, season_id: e.target.value })}>
                  <option value="">— None —</option>
                  {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editForm.collect_team} onChange={(e) => setEditForm({ ...editForm, collect_team: e.target.checked })} />Ask for team</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editForm.collect_age_group} onChange={(e) => setEditForm({ ...editForm, collect_age_group: e.target.checked })} />Ask for age group</label>
              </div>
              <div><Label>Legacy 0–10 main question (optional)</Label><Textarea rows={2} value={editForm.question || ""} onChange={(e) => setEditForm({ ...editForm, question: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add question dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add custom question</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Question</Label><Textarea rows={2} value={newQ.text} onChange={(e) => setNewQ({ ...newQ, text: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={newQ.type} onChange={(e) => setNewQ({ ...newQ, type: e.target.value as SurveyQuestionType })}>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newQ.required} onChange={(e) => setNewQ({ ...newQ, required: e.target.checked })} />Required</label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={addQuestion} disabled={!newQ.text.trim()}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "green" | "amber" | "red" }) {
  const cls = tone === "green" ? "text-green-600" : tone === "amber" ? "text-amber-500" : tone === "red" ? "text-red-500" : "";
  return (
    <Card><CardContent className="p-4">
      <div className={`text-3xl font-bold ${cls}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </CardContent></Card>
  );
}
