import { useEffect, useState } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NpsResponse() {
  const { token, surveyId: surveyIdParam } = useParams();
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/nps/preview/");
  const [params] = useSearchParams();
  const initialScore = params.get("score");
  const [score, setScore] = useState<number | null>(initialScore ? parseInt(initialScore) : null);
  const [step, setStep] = useState<"score" | "followup" | "done">(initialScore ? "followup" : "score");
  const [followup, setFollowup] = useState("");
  const [survey, setSurvey] = useState<any>(null);
  const [orgName, setOrgName] = useState("our club");
  const [responseId, setResponseId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let surveyId: string | undefined = surveyIdParam;
      let contactId: string | null = null;
      if (!isPreview) {
        const { data: link } = await (supabase as any).from("magic_links").select("*").eq("token", token).maybeSingle();
        if (!link) return;
        surveyId = link.payload?.survey_id;
        contactId = link.payload?.contact_id ?? link.contact_id ?? null;
        (window as any).__npsContactId = contactId;
      }
      if (!surveyId) return;
      const { data: s } = await (supabase as any).from("org_nps_surveys").select("*, organizations(name)").eq("id", surveyId).single();
      setSurvey(s);
      setOrgName(s?.organizations?.name || "our club");
    })();
  }, [token, surveyIdParam, isPreview]);

  const submitScore = async (s: number) => {
    setScore(s);
    if (!survey) { setStep("done"); return; }
    if (isPreview) { setStep("followup"); return; }
    const { data, error } = await (supabase as any).from("org_nps_responses").insert({
      survey_id: survey.id,
      score: s,
      responded_via: "email_link",
    }).select().single();
    if (error) { toast.error("Could not record response"); return; }
    setResponseId(data.id);
    setStep("followup");
  };

  const submitFollowup = async () => {
    if (!isPreview && responseId && followup) {
      await (supabase as any).from("org_nps_responses").update({ followup_response: followup }).eq("id", responseId);
    }
    setStep("done");
  };

  const promptText = (survey?.question || "How likely are you to recommend {org_name} to a friend or family member?")
    .replace("{org_name}", orgName);

  const followupQuestion = score == null ? "" :
    score >= 9 ? (survey?.followup_question_promoter || "What did we do well?") :
    score >= 7 ? (survey?.followup_question_passive || "What would make it a 10?") :
    (survey?.followup_question_detractor || "What can we do better?");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-card rounded-2xl shadow-xl p-8">
        {isPreview && (
          <div className="mb-4 px-3 py-2 rounded-md bg-amber-100 text-amber-900 text-xs font-medium text-center">
            Preview mode — responses are not recorded.
          </div>
        )}
        {step === "score" && (
          <>
            <h1 className="text-2xl font-bold mb-2">A quick favor</h1>
            <p className="text-muted-foreground mb-6">{promptText}</p>
            <div className="grid grid-cols-11 gap-1.5">
              {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  onClick={() => submitScore(n)}
                  className={`aspect-square rounded-md font-bold text-lg transition-transform hover:scale-110 ${
                    n <= 6 ? "bg-red-500 text-white" :
                    n <= 8 ? "bg-amber-500 text-white" :
                    "bg-green-500 text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Not at all likely</span>
              <span>Extremely likely</span>
            </div>
          </>
        )}

        {step === "followup" && (
          <>
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-3xl font-bold">{score}</div>
            </div>
            <h2 className="text-xl font-bold mb-2 text-center">{followupQuestion}</h2>
            <p className="text-sm text-muted-foreground mb-4 text-center">Optional — but it helps us a lot.</p>
            <Textarea rows={5} value={followup} onChange={(e) => setFollowup(e.target.value)} />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep("done")}>Skip</Button>
              <Button className="flex-1" onClick={submitFollowup}>Submit</Button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="text-center space-y-4">
            <div className="text-5xl">🙏</div>
            <h2 className="text-2xl font-bold">Thank you!</h2>
            {score != null && score >= 9 && (
              <p className="text-muted-foreground">Would you share us with a friend? Word of mouth is everything for clubs like ours.</p>
            )}
            {score != null && score <= 6 && (
              <p className="text-muted-foreground">We hear you. Someone from our team will reach out personally.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
