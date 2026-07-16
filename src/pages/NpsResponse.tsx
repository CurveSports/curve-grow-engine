// End-of-season parent survey response page.
// Handles three routes:
//   /s/:slug             — public shareable link (anon RPC)
//   /nps/preview/:surveyId — authenticated/public preview by id (no submission)
//   /nps/:token          — legacy magic-link flow
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { categoryLabel, MasterQuestion, OrgQuestion, SurveyQuestionType } from "@/lib/surveys";

type AnyQ = (MasterQuestion & { _source: "master" }) | (OrgQuestion & { _source: "org"; category?: string });

type PublicSurvey = {
  id: string;
  name: string;
  question: string | null;
  master_version: number | null;
  collect_team: boolean | null;
  collect_age_group: boolean | null;
  is_open: boolean;
  public_slug: string;
  org_id: string;
  org_name: string | null;
  org_logo_url: string | null;
};

export default function NpsResponse() {
  const { token, surveyId, slug } = useParams();
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/nps/preview/");
  const isPublicSlug = location.pathname.startsWith("/s/");
  const isLegacyToken = !isPreview && !isPublicSlug;

  const [loading, setLoading] = useState(true);
  const [notAvailable, setNotAvailable] = useState<string | null>(null);
  const [survey, setSurvey] = useState<PublicSurvey | null>(null);
  const [master, setMaster] = useState<MasterQuestion[]>([]);
  const [orgQs, setOrgQs] = useState<OrgQuestion[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamNameOptions, setTeamNameOptions] = useState<string[]>([]);
  const [ageOptions, setAgeOptions] = useState<string[]>([]);
  const [contactId, setContactId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teamText, setTeamText] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let publicSurvey: PublicSurvey | null = null;

      if (isLegacyToken) {
        const { data: link } = await (supabase as any)
          .from("magic_links").select("*").eq("token", token).maybeSingle();
        if (!link) { setNotAvailable("This link is invalid or expired."); setLoading(false); return; }
        const sid = link.payload?.survey_id;
        setContactId(link.payload?.contact_id ?? link.contact_id ?? null);
        if (!sid) { setNotAvailable("This link is invalid."); setLoading(false); return; }
        const { data } = await (supabase as any).rpc("get_public_survey", { _slug: null, _preview_id: sid });
        publicSurvey = data as PublicSurvey | null;
      } else if (isPreview) {
        const { data } = await (supabase as any).rpc("get_public_survey", { _slug: null, _preview_id: surveyId });
        publicSurvey = data as PublicSurvey | null;
      } else {
        const { data } = await (supabase as any).rpc("get_public_survey", { _slug: slug, _preview_id: null });
        publicSurvey = data as PublicSurvey | null;
        if (!publicSurvey) {
          setNotAvailable("This survey isn't accepting responses right now.");
          setLoading(false);
          return;
        }
      }

      if (!publicSurvey) { setNotAvailable("Survey not found."); setLoading(false); return; }
      setSurvey(publicSurvey);

      const version = publicSurvey.master_version ?? 1;
      const [{ data: m }, { data: oq }, { data: tt }, { data: settings }] = await Promise.all([
        (supabase as any).from("survey_master_questions").select("*").eq("version", version).eq("is_active", true).order("sort_order"),
        (supabase as any).from("org_survey_questions").select("*").eq("survey_id", publicSurvey.id).order("sort_order"),
        (supabase as any).from("org_teams").select("id,name").eq("org_id", publicSurvey.org_id).order("name"),
        (supabase as any).from("org_retention_settings").select("team_name_options,age_group_options").eq("org_id", publicSurvey.org_id).maybeSingle(),
      ]);
      setMaster((m as MasterQuestion[]) || []);
      setOrgQs((oq as OrgQuestion[]) || []);
      setTeams((tt as any[]) || []);
      setTeamNameOptions((settings as any)?.team_name_options ?? []);
      setAgeOptions((settings as any)?.age_group_options ?? []);
      setLoading(false);
    })();
  }, [token, surveyId, slug, isPreview, isPublicSlug, isLegacyToken]);

  const submit = async () => {
    if (!survey) return;
    if (!name.trim()) return toast.error("Please enter your name");
    if (survey.collect_team !== false && !teamId && !teamText.trim()) return toast.error("Please pick or type your team");
    for (const q of master) if (q.is_required && !answers[`master:${q.id}`]) return toast.error(`Please answer: ${q.question_text}`);
    for (const q of orgQs) if (q.is_required && !answers[`org:${q.id}`]) return toast.error(`Please answer: ${q.question_text}`);

    setSubmitting(true);

    if (isPreview) {
      setSubmitting(false); setDone(true);
      return;
    }

    const answersArr = Object.entries(answers).map(([key, value]) => {
      const [source, question_id] = key.split(":");
      return { question_id, question_source: source, answer_value: value };
    });

    if (isPublicSlug) {
      const { error } = await (supabase as any).rpc("submit_public_survey_response", {
        _slug: survey.public_slug,
        _respondent_name: name.trim(),
        _team_id: teamId && /^[0-9a-f-]{36}$/i.test(teamId) ? teamId : null,
        _team_name_text: teamText.trim() || teams.find((t) => t.id === teamId)?.name || null,
        _age_group: ageGroup || null,
        _email: email.trim() || null,
        _answers: answersArr,
      });
      if (error) { setSubmitting(false); toast.error(error.message || "Could not save"); return; }
      setSubmitting(false); setDone(true);
      return;
    }

    // Legacy magic-link path — direct inserts (existing RLS grants covered this)
    const npsQ = master.find((q) => q.question_type === "rating_10");
    const npsAnswer = npsQ ? Number(answers[`master:${npsQ.id}`]) : NaN;
    const npsScore = Number.isFinite(npsAnswer) ? npsAnswer : null;

    const { data: resp, error: rErr } = await (supabase as any).from("org_nps_responses").insert({
      survey_id: survey.id,
      contact_id: contactId,
      respondent_name: name.trim(),
      team_id: teamId && /^[0-9a-f-]{36}$/i.test(teamId) ? teamId : null,
      team_name_text: teamText.trim() || teams.find((t) => t.id === teamId)?.name || null,
      age_group: ageGroup || null,
      score: npsScore,
      responded_via: "public_form",
    }).select().single();
    if (rErr || !resp) { setSubmitting(false); toast.error("Could not save"); return; }
    if (answersArr.length) {
      const rows = answersArr.map((a) => ({ ...a, response_id: resp.id }));
      const { error: aErr } = await (supabase as any).from("org_nps_answers").insert(rows);
      if (aErr) { setSubmitting(false); toast.error("Could not save answers"); return; }
    }
    setSubmitting(false);
    setDone(true);
  };

  const setA = (key: string, value: string) => setAnswers((prev) => ({ ...prev, [key]: value }));

  if (loading) return <div className="min-h-screen flex items-center justify-center p-6 text-muted-foreground">Loading…</div>;

  if (notAvailable) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 text-center space-y-3">
          <h2 className="text-xl font-bold">Survey unavailable</h2>
          <p className="text-muted-foreground">{notAvailable}</p>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-card rounded-2xl shadow-xl p-8 text-center space-y-3">
          <div className="text-5xl">🙏</div>
          <h2 className="text-2xl font-bold">Thank you!</h2>
          <p className="text-muted-foreground">Your feedback helps {survey.org_name} keep improving.</p>
        </div>
      </div>
    );
  }

  const allQuestions: AnyQ[] = [
    ...master.map((q) => ({ ...q, _source: "master" as const })),
    ...orgQs.map((q) => ({ ...q, _source: "org" as const })),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 py-6 px-4">
      <div className="max-w-xl mx-auto bg-card rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
        {isPreview && (
          <div className="px-3 py-2 rounded-md bg-amber-100 text-amber-900 text-xs font-medium text-center">
            Preview mode — responses are not recorded.
          </div>
        )}

        <div className="text-center space-y-2">
          {survey.org_logo_url && <img src={survey.org_logo_url} alt={survey.org_name || ""} className="h-14 mx-auto object-contain" />}
          <h1 className="text-2xl font-bold">{survey.org_name}</h1>
          <p className="text-sm text-muted-foreground">End-of-season parent survey · takes about 3 minutes</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Your name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <Label>Email (optional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          {survey.collect_team !== false && (
            <div>
              <Label>Team *</Label>
              {(teams.length > 0 || teamNameOptions.length > 0) ? (
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={teamId || (teamText ? `__custom:${teamText}` : "")} onChange={(e) => {
                  const v = e.target.value;
                  if (v.startsWith("__custom:")) { setTeamId(""); setTeamText(v.slice(9)); }
                  else if (v === "__other") { setTeamId("__other"); setTeamText(""); }
                  else { setTeamId(v); setTeamText(""); }
                }}>
                  <option value="">— Choose your team —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  {teamNameOptions.map((n) => <option key={`c:${n}`} value={`__custom:${n}`}>{n}</option>)}
                  <option value="__other">Other / not listed</option>
                </select>
              ) : null}
              {(teams.length === 0 && teamNameOptions.length === 0) || teamId === "__other" ? (
                <Input className="mt-2" placeholder="Team name" value={teamText} onChange={(e) => setTeamText(e.target.value)} />
              ) : null}
            </div>
          )}
          {survey.collect_age_group && (
            <div>
              <Label>Age group</Label>
              {ageOptions.length > 0 ? (
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                  <option value="">— Choose age group —</option>
                  {ageOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              ) : (
                <Input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} placeholder="e.g. 12U, 14U" />
              )}
            </div>
          )}
        </div>

        {allQuestions.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">This survey has no questions yet.</div>
        )}

        {allQuestions.map((q) => {
          const key = `${q._source}:${q.id}`;
          return (
            <div key={key} className="space-y-2 border-t pt-4">
              <div className="text-sm font-medium">
                {q.question_text}
                {q.is_required && <span className="text-destructive"> *</span>}
              </div>
              {q._source === "master" && "category" in q && (
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{categoryLabel((q as MasterQuestion).category)}</div>
              )}
              <QuestionInput type={q.question_type} value={answers[key] ?? ""} onChange={(v) => setA(key, v)} />
            </div>
          );
        })}

        <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit survey"}
        </Button>
      </div>
    </div>
  );
}

function QuestionInput({ type, value, onChange }: { type: SurveyQuestionType; value: string; onChange: (v: string) => void }) {
  if (type === "rating_5") {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(String(n))}
            className={`flex-1 aspect-square rounded-md font-bold text-lg transition-transform hover:scale-105 ${
              value === String(n) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}>{n}</button>
        ))}
      </div>
    );
  }
  if (type === "rating_10") {
    return (
      <>
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <button key={i} type="button" onClick={() => onChange(String(i))}
              className={`aspect-square rounded-md font-bold text-sm transition-transform hover:scale-110 ${
                value === String(i)
                  ? (i <= 6 ? "bg-red-500 text-white" : i <= 8 ? "bg-amber-500 text-white" : "bg-green-500 text-white")
                  : "bg-muted text-foreground"
              }`}>{i}</button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>Not at all likely</span><span>Extremely likely</span></div>
      </>
    );
  }
  if (type === "yes_no_maybe") {
    return (
      <div className="flex gap-2">
        {["Yes", "Maybe", "No"].map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${
              value === opt ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}>{opt}</button>
        ))}
      </div>
    );
  }
  return <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your answer…" />;
}
