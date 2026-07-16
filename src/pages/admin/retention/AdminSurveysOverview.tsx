import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, ExternalLink, Search } from "lucide-react";
import { format } from "date-fns";
import { avgRating, calcNps, categoryLabel } from "@/lib/surveys";
import { SurveyTrendCharts } from "@/components/retention/SurveyTrendCharts";

export default function AdminSurveysOverview() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [master, setMaster] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: surveys }, { data: ans }, { data: m }] = await Promise.all([
        (supabase as any).from("org_nps_surveys").select("*, organizations(id, name)").order("created_at", { ascending: false }),
        (supabase as any).from("org_nps_answers").select("id, answer_value, question_id, question_source, org_nps_responses!inner(survey_id, org_nps_surveys!inner(org_id))"),
        (supabase as any).from("survey_master_questions").select("*").eq("is_active", true).order("sort_order"),
      ]);
      setRows(surveys || []);
      setAnswers(ans || []);
      setMaster(m || []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.name || "").toLowerCase().includes(q) || (r.organizations?.name || "").toLowerCase().includes(q));
  }, [rows, search]);

  // Network benchmarks
  const benchmarks = useMemo(() => {
    return master
      .filter((q) => q.question_type === "rating_5" || q.question_type === "rating_10")
      .map((q) => {
        const vals = answers
          .filter((a) => a.question_source === "master" && a.question_id === q.id)
          .map((a) => Number(a.answer_value))
          .filter((n) => !Number.isNaN(n));
        return {
          ...q,
          network_avg: avgRating(vals),
          nps: q.question_type === "rating_10" ? calcNps(vals) : null,
          count: vals.length,
        };
      });
  }, [master, answers]);

  return (
    <AppShell title="Parent Surveys — All Orgs">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Parent Surveys (All Orgs)</h1>
          <p className="text-muted-foreground mt-1">Cross-org overview and benchmarks across every Curve organization.</p>
        </div>

        <Tabs defaultValue="benchmarks">
          <TabsList>
            <TabsTrigger value="benchmarks">Network Benchmarks</TabsTrigger>
            <TabsTrigger value="surveys">All Surveys</TabsTrigger>
          </TabsList>

          <TabsContent value="benchmarks" className="space-y-3">
            <p className="text-sm text-muted-foreground">Averages across every response to core Curve questions — the number you sell against.</p>
            {benchmarks.length === 0 && <p className="text-muted-foreground p-4">No responses on scale questions yet.</p>}
            {benchmarks.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{b.question_text}</div>
                    <div className="text-xs text-muted-foreground">{categoryLabel(b.category)} · {b.count} responses network-wide</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{b.network_avg ?? "—"}</div>
                    {b.nps != null && <div className="text-xs">NPS <b>{b.nps}</b></div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="surveys" className="space-y-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by survey or org…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {filtered.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name || "Untitled survey"}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {s.organizations?.name || "—"} · {s.sent_at ? format(new Date(s.sent_at), "MMM d, yyyy") : "Not sent"} · {s.response_count || 0} responses
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.nps_score != null && <span className="text-2xl font-bold">{Number(s.nps_score).toFixed(0)}</span>}
                    <Badge variant={s.status === "sent" ? "default" : "secondary"}>{s.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => window.open(`/nps/preview/${s.id}`, "_blank")}><Eye className="h-4 w-4 mr-1" />Preview</Button>
                    {s.organizations?.id && (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/orgs/${s.organizations.id}/retention/surveys/${s.id}`)}>
                        <ExternalLink className="h-4 w-4 mr-1" />Open
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
