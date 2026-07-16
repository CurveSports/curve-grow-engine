// Longitudinal trend charts across surveys.
// - NPS score per survey (line)
// - Response rate per survey (bar; needs recipient_count)
// - Per-question rating averages (multi-select line)
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { avgRating, calcNps, categoryLabel, MasterQuestion } from "@/lib/surveys";

type SurveyRow = {
  id: string;
  name: string | null;
  sent_at: string | null;
  created_at: string;
  season_id?: string | null;
  org_seasons?: { name?: string | null } | null;
  organizations?: { name?: string | null } | null;
  nps_score?: number | null;
  response_count?: number | null;
  recipient_count?: number | null;
};

type AnswerRow = {
  question_id: string;
  question_source: "master" | "org";
  answer_value: string;
  // Either shape works — we peek through the join.
  org_nps_responses?: { survey_id?: string; org_nps_surveys?: { org_id?: string } };
  response_id?: string;
  survey_id?: string;
};

type Props = {
  surveys: SurveyRow[];
  answers: AnswerRow[];
  master: MasterQuestion[];
  responsesBySurvey?: Record<string, number>; // optional override, else uses survey.response_count
  title?: string;
  emptyHint?: string;
  showOrgName?: boolean;
};

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#ec4899"];

export function SurveyTrendCharts({
  surveys, answers, master, responsesBySurvey, title, emptyHint, showOrgName,
}: Props) {
  // Sort by sent_at (fallback created_at) ascending — time-series
  const ordered = useMemo(() => {
    return [...surveys]
      .filter((s) => (s.response_count ?? 0) > 0 || s.sent_at)
      .sort((a, b) => {
        const at = new Date(a.sent_at ?? a.created_at).getTime();
        const bt = new Date(b.sent_at ?? b.created_at).getTime();
        return at - bt;
      });
  }, [surveys]);

  // Index answers by survey_id for per-survey aggregation
  const answersBySurvey = useMemo(() => {
    const out: Record<string, AnswerRow[]> = {};
    for (const a of answers) {
      const sid = a.survey_id ?? a.org_nps_responses?.survey_id;
      if (!sid) continue;
      (out[sid] ||= []).push(a);
    }
    return out;
  }, [answers]);

  const ratingMaster = useMemo(
    () => master.filter((q) => q.question_type === "rating_5" || q.question_type === "rating_10"),
    [master],
  );

  const [selectedQ, setSelectedQ] = useState<string[]>(() => ratingMaster.slice(0, 3).map((q) => q.id));

  // Build the trend-data array: one row per survey
  const data = useMemo(() => {
    return ordered.map((s) => {
      const label = s.org_seasons?.name || s.name || (s.sent_at ? new Date(s.sent_at).toLocaleDateString() : "Draft");
      const responseCount = responsesBySurvey?.[s.id] ?? s.response_count ?? 0;
      const recipients = s.recipient_count ?? 0;
      const responseRate = recipients > 0 ? Math.round((responseCount / recipients) * 100) : null;

      const row: Record<string, any> = {
        surveyId: s.id,
        label,
        subtitle: showOrgName ? s.organizations?.name : (s.name ?? ""),
        nps: s.nps_score != null ? Number(s.nps_score) : null,
        responseCount,
        responseRate,
      };

      const aList = answersBySurvey[s.id] || [];
      for (const q of ratingMaster) {
        const vals = aList
          .filter((a) => a.question_source === "master" && a.question_id === q.id)
          .map((a) => Number(a.answer_value))
          .filter((n) => !Number.isNaN(n));
        row[`q_${q.id}`] = q.question_type === "rating_10" ? calcNps(vals) : avgRating(vals);
        row[`qcount_${q.id}`] = vals.length;
      }
      return row;
    });
  }, [ordered, answersBySurvey, ratingMaster, responsesBySurvey, showOrgName]);

  if (ordered.length < 2) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title ?? "Trends across surveys"}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {emptyHint ?? "You need at least two sent surveys to see trends. Send another end-of-season survey to start comparing."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const toggleQ = (id: string) => {
    setSelectedQ((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">NPS score over time</CardTitle>
            <p className="text-xs text-muted-foreground">% Promoters − % Detractors, per survey.</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} domain={[-100, 100]} />
                <Tooltip content={<TrendTooltip suffix="" fmt={(v) => `${v}`} />} />
                <Line type="monotone" dataKey="nps" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Response volume & rate</CardTitle>
            <p className="text-xs text-muted-foreground">Bars = responses. Line = response rate % (when recipients tracked).</p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip content={<TrendTooltip suffix="" />} />
                <Bar yAxisId="left" dataKey="responseCount" fill={COLORS[0]} radius={[4, 4, 0, 0]} name="Responses" />
                <Line yAxisId="right" type="monotone" dataKey="responseRate" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 3 }} name="Response rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {ratingMaster.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rating averages by question</CardTitle>
            <p className="text-xs text-muted-foreground">
              Tap a question to add/remove it from the chart. 0–10 questions plot as NPS; 1–5 as average score.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {ratingMaster.map((q, i) => {
                const active = selectedQ.includes(q.id);
                return (
                  <button key={q.id} onClick={() => toggleQ(q.id)} type="button"
                    className={`text-xs px-2 py-1 rounded-full border transition ${
                      active ? "text-primary-foreground border-transparent" : "bg-muted text-foreground border-transparent hover:bg-muted/80"
                    }`}
                    style={active ? { backgroundColor: COLORS[i % COLORS.length] } : undefined}
                    title={q.question_text}>
                    <span className="mr-1 opacity-70">[{categoryLabel(q.category)}]</span>
                    {truncate(q.question_text, 40)}
                    <Badge variant="secondary" className="ml-1 text-[10px]">{q.question_type === "rating_10" ? "NPS" : "1–5"}</Badge>
                  </button>
                );
              })}
            </div>

            {selectedQ.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Pick a question above to plot its trend.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<TrendTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {selectedQ.map((qid) => {
                      const q = ratingMaster.find((x) => x.id === qid);
                      if (!q) return null;
                      const idx = ratingMaster.findIndex((x) => x.id === qid);
                      return (
                        <Line key={qid} type="monotone" dataKey={`q_${qid}`}
                          name={truncate(q.question_text, 34) + (q.question_type === "rating_10" ? " (NPS)" : " (avg)")}
                          stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function TrendTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover text-popover-foreground shadow-md p-2 text-xs space-y-0.5">
      <div className="font-medium">{label}</div>
      {payload[0]?.payload?.subtitle && payload[0].payload.subtitle !== label && (
        <div className="text-muted-foreground">{payload[0].payload.subtitle}</div>
      )}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}: <b>{p.value ?? "—"}{suffix ?? (p.dataKey === "responseRate" ? "%" : "")}</b></span>
        </div>
      ))}
    </div>
  );
}
