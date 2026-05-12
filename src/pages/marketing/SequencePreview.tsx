import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Image, MessageSquare } from "lucide-react";

const channelIcon = (t: string) => {
  if (t === "email") return <Mail className="h-4 w-4" />;
  if (t === "sms") return <MessageSquare className="h-4 w-4" />;
  return <Image className="h-4 w-4" />;
};

const channelColor = (t: string) => {
  if (t === "email") return "bg-blue-500";
  if (t === "sms") return "bg-green-500";
  return "bg-purple-500";
};

export default function SequencePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: t } = await supabase.from("campaign_sequence_templates").select("*").eq("id", id).single();
      const { data: a } = await supabase
        .from("campaign_sequence_assets")
        .select("*")
        .eq("sequence_template_id", id)
        .order("order_in_sequence");
      setTemplate(t);
      setAssets(a || []);
    })();
  }, [id]);

  if (!template) return <AppShell><div className="p-6">Loading...</div></AppShell>;

  const minDay = Math.min(...assets.map((a) => a.days_from_anchor || 0), 0);
  const maxDay = Math.max(...assets.map((a) => a.days_from_anchor || 0), 0);
  const range = maxDay - minDay || 1;

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/marketing/sequences")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to library
        </Button>

        <header className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold">{template.name}</h1>
            <p className="text-muted-foreground mt-1">{template.preview_summary}</p>
            <p className="text-sm mt-3"><strong>Best for:</strong> {template.best_for}</p>
          </div>
          <Button size="lg" onClick={() => navigate(`/marketing/sequences/${id}/launch`)}>
            Use This Sequence
          </Button>
        </header>

        <Card>
          <CardHeader><CardTitle>Timeline ({assets.length} assets over {template.duration_days} days)</CardTitle></CardHeader>
          <CardContent>
            <div className="relative h-24 bg-muted rounded-md overflow-hidden">
              <div className="absolute inset-y-0 left-1/2 w-px bg-border" style={{ left: `${((0 - minDay) / range) * 100}%` }}>
                <span className="absolute -top-5 -translate-x-1/2 text-xs text-muted-foreground">Day 0</span>
              </div>
              {assets.map((a, i) => {
                const pct = ((a.days_from_anchor - minDay) / range) * 100;
                return (
                  <div
                    key={a.id}
                    className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${channelColor(a.asset_type)} cursor-pointer hover:scale-150 transition-transform`}
                    style={{ left: `${pct}%` }}
                    title={`${a.asset_label} (Day ${a.days_from_anchor})`}
                  />
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Email</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /> Social</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> SMS</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">All assets</h2>
          {assets.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-md ${channelColor(a.asset_type)} text-white flex items-center justify-center`}>
                  {channelIcon(a.asset_type)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{a.asset_label}</div>
                  <div className="text-sm text-muted-foreground">
                    Day {a.days_from_anchor >= 0 ? "+" : ""}{a.days_from_anchor} · {a.channel}
                    {a.subject_template && ` · "${a.subject_template}"`}
                  </div>
                </div>
                {a.required ? <Badge>Required</Badge> : <Badge variant="outline">Optional</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
