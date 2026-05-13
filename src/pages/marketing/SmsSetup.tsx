import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Shield, MessageSquare, AlertTriangle } from "lucide-react";

export default function SmsSetup() {
  const [smsNumber, setSmsNumber] = useState<any>(null);
  const [areaCode, setAreaCode] = useState("");
  const [tcpaChecked, setTcpaChecked] = useState(false);
  const [signature, setSignature] = useState("");
  const { orgId } = useEffectiveOrg();
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      if (!orgId) return;
      const { data } = await (supabase as any).from("org_sms_numbers").select("*").eq("org_id", orgId).maybeSingle();
      setSmsNumber(data);
    })();
  }, [orgId]);

  const requestProvision = async () => {
    if (!areaCode || areaCode.length !== 3) {
      toast.error("Please enter a valid 3-digit area code");
      return;
    }
    const { data, error } = await (supabase as any).from("org_sms_numbers").insert({
      org_id: orgId,
      area_code: areaCode,
      twilio_phone_number: null,
      active: false,
      tcpa_consent_attested: false,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setSmsNumber(data);
    toast.success("Provisioning request submitted. Curve admin will approve and assign a number.");
  };

  const submitTcpa = async () => {
    if (!tcpaChecked || !signature) { toast.error("Please complete all fields"); return; }
    const { error } = await (supabase as any).from("org_sms_numbers").update({
      tcpa_consent_attested: true,
      tcpa_consent_attested_by: userId,
      tcpa_consent_attested_at: new Date().toISOString(),
    }).eq("id", smsNumber.id);
    if (error) { toast.error(error.message); return; }
    toast.success("TCPA attestation recorded. You can now send SMS.");
    const { data } = await (supabase as any).from("org_sms_numbers").select("*").eq("id", smsNumber.id).single();
    setSmsNumber(data);
  };

  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold">SMS Setup</h1>
          <p className="text-muted-foreground mt-1">Get a dedicated text number for your club</p>
        </header>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" />Phone Number</CardTitle></CardHeader>
          <CardContent>
            {!smsNumber ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Faster than email. 98% read rate. Family-friendly comms.
                </p>
                <div className="flex gap-2 max-w-sm">
                  <Input placeholder="Area code (e.g. 407)" value={areaCode} onChange={(e) => setAreaCode(e.target.value)} maxLength={3} />
                  <Button onClick={requestProvision}>Request Number</Button>
                </div>
                <p className="text-xs text-muted-foreground">$1/month + $0.0075 per SMS. Requires Curve admin approval.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{smsNumber.twilio_phone_number || `Pending (area code ${smsNumber.area_code})`}</div>
                <div className="flex gap-2">
                  <Badge variant={smsNumber.active ? "default" : "secondary"}>
                    {smsNumber.active ? "Active" : "Awaiting provision"}
                  </Badge>
                  {smsNumber.tcpa_consent_attested && <Badge className="bg-green-600">TCPA Attested</Badge>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {smsNumber && !smsNumber.tcpa_consent_attested && (
          <Card className="border-amber-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />TCPA Compliance — Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-500/10 p-4 rounded-md text-sm space-y-2">
                <p className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Important: Text Message Compliance</p>
                <p>Under TCPA law, you can only send marketing texts to people who've explicitly opted in. We help you stay compliant in three ways:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>SMS opt-in is required on every contact import</li>
                  <li>"Reply STOP to unsubscribe" auto-appended to every message</li>
                  <li>Opt-outs handled automatically — once a contact replies STOP, we never text them again</li>
                </ul>
              </div>
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-start gap-2">
                  <Checkbox id="tcpa" checked={tcpaChecked} onCheckedChange={(v) => setTcpaChecked(!!v)} />
                  <label htmlFor="tcpa" className="text-sm">
                    I confirm that all contacts who will receive SMS from this number have given prior express written consent to receive automated marketing text messages from our organization.
                  </label>
                </div>
                <div>
                  <Label>Your full name (electronic signature)</Label>
                  <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Type your name" />
                </div>
                <Button onClick={submitTcpa} disabled={!tcpaChecked || !signature}>Submit Attestation</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {smsNumber?.tcpa_consent_attested && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Opt-In Tools</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Tell parents to text <strong>JOIN</strong> to {smsNumber.twilio_phone_number || "your number"} to subscribe.</p>
              <Button variant="outline" onClick={() => toast.info("Opt-in magic link generation coming next round")}>Generate Opt-In Link</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
