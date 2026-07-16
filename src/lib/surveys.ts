// Shared types and helpers for the Retention parent-survey system.
export type SurveyQuestionType = "rating_5" | "rating_10" | "yes_no_maybe" | "open_text";

export type MasterQuestion = {
  id: string;
  version: number;
  question_text: string;
  question_type: SurveyQuestionType;
  category: string;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
};

export type OrgQuestion = {
  id: string;
  survey_id: string;
  org_id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  sort_order: number;
  is_required: boolean;
};

export type Answer = {
  question_id: string;
  question_source: "master" | "org";
  question_text: string;
  question_type: SurveyQuestionType;
  answer_value: string;
};

export const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  rating_5: "1–5 rating (stars)",
  rating_10: "0–10 scale (NPS)",
  yes_no_maybe: "Yes / No / Maybe",
  open_text: "Open text",
};

export const CATEGORY_LABELS: Record<string, string> = {
  overall: "Overall experience",
  coaching: "Coaching & development",
  communication: "Communication",
  value: "Value",
  fairness: "Fairness",
  events: "Events & tournaments",
  retention: "Retention",
  nps: "Recommendation (NPS)",
  qualitative: "Open feedback",
};

export function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

// NPS = %promoters (9-10) − %detractors (0-6)
export function calcNps(scores: number[]): number | null {
  if (!scores.length) return null;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

export function avgRating(values: number[]): number | null {
  if (!values.length) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

export function distributeChoices(values: string[]): Record<string, number> {
  return values.reduce((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Build CSV rows: [respondent metadata + one column per question] × responses
export function buildResponseCsv(
  masterQuestions: MasterQuestion[],
  orgQuestions: OrgQuestion[],
  responses: Array<{
    id: string;
    respondent_name: string | null;
    team_name_text: string | null;
    age_group: string | null;
    responded_at: string;
    answers: Answer[];
  }>,
): string {
  const cols = [
    "Submitted",
    "Name",
    "Team",
    "Age group",
    ...masterQuestions.map((q) => `[Core] ${q.question_text}`),
    ...orgQuestions.map((q) => `[Org] ${q.question_text}`),
  ];
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const rows = responses.map((r) => {
    const byKey = new Map(r.answers.map((a) => [`${a.question_source}:${a.question_id}`, a.answer_value]));
    const line = [
      new Date(r.responded_at).toISOString(),
      r.respondent_name ?? "",
      r.team_name_text ?? "",
      r.age_group ?? "",
      ...masterQuestions.map((q) => byKey.get(`master:${q.id}`) ?? ""),
      ...orgQuestions.map((q) => byKey.get(`org:${q.id}`) ?? ""),
    ];
    return line.map(esc).join(",");
  });
  return [cols.map(esc).join(","), ...rows].join("\n");
}
