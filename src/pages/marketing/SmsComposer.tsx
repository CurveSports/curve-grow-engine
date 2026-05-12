import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SmsComposer() {
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState("");
  const [smsNumber, setSmsNumber] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [segmentId, setSegmentId] = useState("");
  const [body, setBody] = useState("");
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("org_id").eq("user_id", user!.id).single();
      if (!profile?.org_id) return;
      setOrgId(profile.org_id);

      const { data: sn } = await (supabase as any).from("org_sms_numbers").select("*").eq("org_id", profile.org_id).maybeSingle();
      setSmsNumber(sn);

      const { data: segs } = await supabase.from("org_contact_segments").select("*").eq("org_id", profile.org_id);
      setSegments(segs || []);

      const { count } = await (supabase as any)
        .from("org_contacts")
        .select("*", { count: "exact", head: true })
        .eq("org_id", profile.org_id)
        .eq("sms_opt_in", true)
        .eq("unsubscribed", false);
      setRecipientCount(count || 0);
    })();
  }, []);

  const fullBody = body + (body && !body.includes("STOP") ? "\nReply STOP to unsubscribe" : "");
  const segments_count = Math.max(1, Math.ceil(fullBody.length / 160));
  const cost = (recipientCount * segments_count * 0.75).toFixed(2);

  const send = async () => {
    if (!smsNumber?.tcpa_consent_attested) {
      toast.error("Complete TCPA attestation before sending SMS");
      return;
    }
    const { data, error } = await (supabase as any).from("org_sms_sends").insert({
      org_id: orgId,
      from_number_id: smsNumber.id,
      segment_id: segmentId || null,
      message_body: body,
      recipient_count: recipientCount,
      status: "scheduled",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success(`SMS queued to ${recipientCount} recipients (Twilio not wired — stub)`);
    navigate("/marketing/sms");
  };

  if (!smsNumber) {
    return (
      <AppShell>
        <div className="p-6 max-w-2xl mx-auto">
          <Card>
            <CardHeader><CardTitle>SMS not configured</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4">You need to provision an SMS number first.</p>
              <Button onClick={() => navigate("/marketing/sms-setup")}>Go to SMS Setup</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Compose SMS</h1>

          <div>
            <Label>Audience</Label>
            <Select value={segmentId} onValueChange={setSegmentId}>
              <SelectTrigger><SelectValue placeholder="All SMS subscribers" /></SelectTrigger>
              <SelectContent>
                {segments.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{recipientCount} contacts opted into SMS</p>
          </div>

          <div>
            <Label>Message body</Label>
            <Textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tryouts Saturday — see you at the field!"
            />
            <div className="flex justify-between text-xs mt-1">
              <span className={body.length > 160 ? "text-amber-500" : "text-muted-foreground"}>
                {body.length}/160 chars · {segments_count} segment{segments_count > 1 ? "s" : ""}
              </span>
              <span className="text-muted-foreground">Est. cost: ${cost}</span>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-md text-xs">
            <strong>Auto-appended:</strong> "Reply STOP to unsubscribe" (TCPA required)
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/marketing/sms")}>Cancel</Button>
            <Button onClick={send} disabled={!body}>Send Now</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-6 rounded-3xl">
              <div className="text-center text-xs text-muted-foreground mb-3">{smsNumber.twilio_phone_number || smsNumber.display_name || "Your number"}</div>
              <div className="bg-white dark:bg-slate-700 rounded-2xl p-4 shadow-sm whitespace-pre-wrap text-sm">
                {fullBody || "Your message will appear here..."}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
