import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useMarketingLink } from "@/hooks/useMarketingLink";

export default function SmsSends() {
  const navigate = useNavigate();
  const ml = useMarketingLink();
  const [sends, setSends] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("org_sms_sends")
        .select("*")
        .order("created_at", { ascending: false });
      setSends(data || []);
    })();
  }, []);

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">SMS</h1>
            <p className="text-muted-foreground mt-1">All SMS sends and inbound replies</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(ml("/marketing/sms-setup"))}>Setup</Button>
            <Button onClick={() => navigate(ml("/marketing/sms/new"))}><Plus className="h-4 w-4 mr-2" />New SMS</Button>
          </div>
        </div>

        {sends.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No SMS sends yet</p>
              <Button className="mt-4" onClick={() => navigate(ml("/marketing/sms/new"))}>Send your first SMS</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sends.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium line-clamp-1">{s.message_body}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(s.created_at), "MMM d, yyyy h:mm a")} · {s.recipient_count || 0} recipients
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant={s.status === "sent" ? "default" : "secondary"}>{s.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {s.delivered_count || 0} delivered · {s.failed_count || 0} failed
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
