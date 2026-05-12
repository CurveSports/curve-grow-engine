import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AdminSequenceTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("campaign_sequence_templates")
      .select("*")
      .order("sort_order");
    setTemplates(data || []);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("campaign_sequence_templates").update({ active }).eq("id", id);
    toast.success(active ? "Activated" : "Deactivated");
    load();
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Sequence Templates</h1>
          <p className="text-muted-foreground mt-1">Manage the campaign sequence library</p>
        </header>

        <div className="space-y-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <Badge variant="outline">Tier {t.tier}</Badge>
                    <Badge variant="secondary">{t.category}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{t.preview_summary}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t.duration_days}d · Goal: {t.goal_metric} · Default: {t.default_goal_target}
                  </div>
                </div>
                <Switch checked={t.active} onCheckedChange={(v) => toggleActive(t.id, v)} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
