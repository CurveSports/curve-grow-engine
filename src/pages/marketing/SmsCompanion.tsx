import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageSquare, Plus, Sparkles } from "lucide-react";

type SmsDraft = {
  id: string;
  body: string;
  status: "draft" | "approved" | "queued" | "sent" | "cancelled";
  estimated_recipients: number;
  created_at: string;
};

export default function SmsCompanion() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  const [items, setItems] = useState<SmsDraft[]>([]);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");

  const load = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("org_sms_drafts")
      .select("id,body,status,estimated_recipients,created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as SmsDraft[]);
  };
  useEffect(() => { load(); }, [orgId]);

  const generate = async () => {
    if (!emailSubject.trim()) { toast.error("Provide an email subject or topic to generate from"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-content", {
        body: {
          kind: "sms",
          prompt: `Write a single SMS (under 145 characters, no emoji unless brand-appropriate, friendly, with a clear action) for: ${emailSubject}. Include a placeholder {{shortlink}} where the link should go.`,
        },
      });
      if (error) throw error;
      const text = (data?.text ?? "").trim();
      setBody(text.slice(0, 320));
    } catch (e: any) {
      // Fallback: stub the text so the workflow still demos locally.
      setBody(`${emailSubject.slice(0, 80)} — details + signup: {{shortlink}}`.slice(0, 160));
      toast.message("Used local fallback (AI function unavailable)");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!orgId || !body.trim()) { toast.error("SMS body is required"); return; }
    setSaving(true);
    const { error } = await supabase.from("org_sms_drafts").insert({
      org_id: orgId,
      body: body.trim(),
      status: "draft",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("SMS draft saved");
    setOpen(false);
    setBody("");
    setEmailSubject("");
    load();
  };

  return (
    <AppShell title="SMS Companion">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">SMS Companions</h1>
          <p className="text-muted-foreground mt-1">Generate short SMS versions of your emails. Sending will be wired in Round 14.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New SMS draft</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No SMS drafts yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="capitalize">{s.status}</Badge>
                <span className="text-xs text-muted-foreground">{s.body.length} chars</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{s.body}</p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate SMS companion</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email subject or topic</Label>
              <Textarea rows={2} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Spring tryouts open — register by Friday" />
              <Button size="sm" variant="outline" className="mt-2" onClick={generate} disabled={generating}>
                <Sparkles className="h-4 w-4 mr-2" />{generating ? "Generating…" : "Generate with AI"}
              </Button>
            </div>
            <div>
              <Label>SMS body <span className="text-xs text-muted-foreground">({body.length}/160)</span></Label>
              <Textarea rows={4} maxLength={320} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tryouts Mon 6pm — register: {{shortlink}}" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>Save draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
