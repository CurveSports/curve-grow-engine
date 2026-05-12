import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, AlertTriangle, Activity } from "lucide-react";

export default function PortfolioAnalytics() {
  const [stats, setStats] = useState<any>({});
  const [orgSummaries, setOrgSummaries] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [orgsRes, sendsRes, smsRes, npsRes, summariesRes] = await Promise.all([
        (supabase as any).from("organizations").select("id", { count: "exact", head: true }),
        (supabase as any).from("org_email_sends").select("id, recipient_count, status", { count: "exact" }),
        (supabase as any).from("org_sms_sends").select("id, recipient_count", { count: "exact" }),
        (supabase as any).from("org_nps_responses").select("category"),
        (supabase as any).from("org_marketing_summary").select("*, organizations(name)").order("emails_sent_l30", { ascending: false, nullsFirst: false }).limit(10),
      ]);

      const npsResps = npsRes.data || [];
      const promoters = npsResps.filter((r: any) => r.category === "promoter").length;
      const detractors = npsResps.filter((r: any) => r.category === "detractor").length;
      const portfolioNps = npsResps.length > 0 ? ((promoters - detractors) / npsResps.length) * 100 : null;

      setStats({
        totalOrgs: orgsRes.count || 0,
        totalEmails: sendsRes.count || 0,
        totalSms: smsRes.count || 0,
        totalNpsResponses: npsResps.length,
        portfolioNps,
      });
      setOrgSummaries(summariesRes.data || []);
    })();
  }, []);

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Portfolio Marketing Analytics</h1>
          <p className="text-muted-foreground mt-1">Cross-portfolio command center</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalOrgs}</div>
            <div className="text-xs text-muted-foreground">Total orgs</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalEmails}</div>
            <div className="text-xs text-muted-foreground">Emails sent (all-time)</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalSms}</div>
            <div className="text-xs text-muted-foreground">SMS sent</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalNpsResponses}</div>
            <div className="text-xs text-muted-foreground">NPS responses</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.portfolioNps != null ? stats.portfolioNps.toFixed(0) : "—"}</div>
            <div className="text-xs text-muted-foreground">Portfolio NPS</div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="leaderboard">
          <TabsList>
            <TabsTrigger value="leaderboard"><TrendingUp className="h-4 w-4 mr-1" />Leaderboard</TabsTrigger>
            <TabsTrigger value="alerts"><AlertTriangle className="h-4 w-4 mr-1" />Alerts</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-1" />Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader><CardTitle>Most Active Orgs (by emails sent l30)</CardTitle></CardHeader>
              <CardContent>
                {orgSummaries.length === 0 ? (
                  <p className="text-muted-foreground">No org marketing summaries yet. Nightly aggregation job will populate these.</p>
                ) : (
                  <div className="space-y-2">
                    {orgSummaries.map((s) => (
                      <div key={s.org_id} className="flex justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{s.organizations?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.contacts_total} contacts · NPS {s.current_nps_score != null ? Number(s.current_nps_score).toFixed(0) : "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{s.emails_sent_l30 || 0}</div>
                          <div className="text-xs text-muted-foreground">emails l30</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader><CardTitle>Orgs needing attention</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Alerts will surface here as data accumulates: orgs with no activity in 14+ days, declining NPS, stuck approval queues.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader><CardTitle>Recent portfolio activity</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Real-time activity feed coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
