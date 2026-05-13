import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Mail, Image, MessageSquare, Sparkles } from "lucide-react";
import { useMarketingLink } from "@/hooks/useMarketingLink";

type Template = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number | null;
  anchor_label: string | null;
  goal_metric: string | null;
  default_goal_target: number | null;
  tier: number | null;
  best_for: string | null;
  preview_summary: string | null;
  sort_order: number | null;
};

const TIER_LABEL: Record<number, string> = { 1: "Most Popular", 2: "Recommended", 3: "Specialty" };

export default function SequenceLibrary() {
  const navigate = useNavigate();
  const ml = useMarketingLink();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assetCounts, setAssetCounts] = useState<Record<string, { total: number; email: number; social: number; sms: number }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from("campaign_sequence_templates")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      setTemplates((t as Template[]) || []);

      const { data: a } = await supabase
        .from("campaign_sequence_assets")
        .select("sequence_template_id, asset_type");
      const counts: Record<string, { total: number; email: number; social: number; sms: number }> = {};
      (a || []).forEach((row: any) => {
        const id = row.sequence_template_id;
        if (!counts[id]) counts[id] = { total: 0, email: 0, social: 0, sms: 0 };
        counts[id].total++;
        if (row.asset_type === "email") counts[id].email++;
        else if (row.asset_type === "sms") counts[id].sms++;
        else counts[id].social++;
      });
      setAssetCounts(counts);
      setLoading(false);
    })();
  }, []);

  const filtered = templates.filter((t) => {
    if (filter === "all") return true;
    if (filter === "tier1") return t.tier === 1;
    return t.category === filter;
  });

  const tiers = [1, 2, 3];

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold">Campaign Sequences</h1>
          <p className="text-muted-foreground mt-1">
            Proven multi-week campaigns. Pick one, plug in your dates, watch it run.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {[
            { v: "all", label: "All" },
            { v: "tier1", label: "Recommended" },
            { v: "tryout", label: "Tryouts" },
            { v: "reenrollment", label: "Re-Enrollment" },
            { v: "showcase", label: "Events" },
            { v: "new_season", label: "Seasonal" },
            { v: "sponsor_recognition", label: "Sponsors" },
          ].map((f) => (
            <Button
              key={f.v}
              variant={filter === f.v ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.v)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (
          tiers.map((tier) => {
            const items = filtered.filter((t) => t.tier === tier);
            if (items.length === 0) return null;
            return (
              <section key={tier}>
                <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  {tier === 1 && <Sparkles className="h-5 w-5 text-primary" />}
                  {TIER_LABEL[tier]}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((tpl) => {
                    const c = assetCounts[tpl.id] || { total: 0, email: 0, social: 0, sms: 0 };
                    return (
                      <Card key={tpl.id} className="hover:shadow-lg transition-shadow flex flex-col">
                        <CardHeader>
                          <CardTitle className="text-lg">{tpl.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{tpl.preview_summary}</p>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              {tpl.duration_days}d
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                              <Mail className="h-3 w-3" />{c.email}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                              <Image className="h-3 w-3" />{c.social}
                            </Badge>
                            {c.sms > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <MessageSquare className="h-3 w-3" />{c.sms}
                              </Badge>
                            )}
                          </div>
                          {tpl.best_for && (
                            <p className="text-xs text-muted-foreground italic">{tpl.best_for}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              className="flex-1"
                              onClick={() => navigate(ml(`/marketing/sequences/${tpl.id}/launch`))}
                            >
                              Launch
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => navigate(ml(`/marketing/sequences/${tpl.id}`))}
                            >
                              Preview
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
