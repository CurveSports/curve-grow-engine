import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles } from "lucide-react";
import { ensureSendTimeSeed, formatSlot, type SendTimeRec } from "@/lib/sendTime";

export default function SendTimes() {
  const { profile } = useAuth();
  const { orgId } = useEffectiveOrg();
  const [items, setItems] = useState<SendTimeRec[]>([]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      await ensureSendTimeSeed(orgId);
      const { data } = await supabase
        .from("org_send_time_recommendations")
        .select("*")
        .eq("org_id", orgId)
        .order("open_rate", { ascending: false });
      setItems((data ?? []) as SendTimeRec[]);
    })();
  }, [orgId]);

  const recommended = items.filter((i) => i.is_recommended);
  const others = items.filter((i) => !i.is_recommended);

  return (
    <AppShell title="Send-time Optimization">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Best send times</h1>
        <p className="text-muted-foreground mt-1">Recommended windows are based on your audience's open and click history. Defaults shown until enough data accumulates.</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Recommended</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommended.map((s) => (
            <Card key={s.id} className="p-5 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <div className="font-display text-lg font-semibold">{formatSlot(s.day_of_week, s.hour_of_day)}</div>
              </div>
              <div className="text-sm text-muted-foreground">Open rate: <span className="font-medium text-foreground">{s.open_rate.toFixed(1)}%</span></div>
              <div className="text-sm text-muted-foreground">Click rate: <span className="font-medium text-foreground">{s.click_rate.toFixed(1)}%</span></div>
              <Badge variant="outline" className="mt-3 capitalize">{s.confidence} confidence</Badge>
            </Card>
          ))}
        </div>
      </div>

      {others.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold mb-3">Other tested windows</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {others.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="font-medium">{formatSlot(s.day_of_week, s.hour_of_day)}</div>
                <div className="text-xs text-muted-foreground mt-1">Open: {s.open_rate.toFixed(1)}% • Click: {s.click_rate.toFixed(1)}%</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
