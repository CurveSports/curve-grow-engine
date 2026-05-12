import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FlaskConical, Plus, Trophy } from "lucide-react";

type AbTest = {
  id: string;
  variant_a_subject: string;
  variant_b_subject: string;
  status: "draft" | "running" | "complete" | "cancelled";
  split_pct: number;
  winner_variant: "a" | "b" | null;
  winner_metric: string;
  variant_a_sent: number;
  variant_a_opens: number;
  variant_b_sent: number;
  variant_b_opens: number;
  created_at: string;
};

export default function AbTests() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  const [items, setItems] = useState<AbTest[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ a: "", b: "", split: 50 });

  const load = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("org_email_ab_tests")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as AbTest[]);
  };
  useEffect(() => { load(); }, [orgId]);

  const create = async () => {
    if (!orgId || !form.a.trim() || !form.b.trim()) {
      toast.error("Both subject lines are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("org_email_ab_tests").insert({
      org_id: orgId,
      variant_a_subject: form.a,
      variant_b_subject: form.b,
      split_pct: form.split,
      status: "draft",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("A/B test draft created");
    setOpen(false);
    setForm({ a: "", b: "", split: 50 });
    load();
  };

  const rate = (opens: number, sent: number) => sent > 0 ? ((opens / sent) * 100).toFixed(1) + "%" : "—";

  return (
    <AppShell title="A/B Tests">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Subject A/B Tests</h1>
          <p className="text-muted-foreground mt-1">Test two subject lines on a slice of your audience, then send the winner to the rest.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New A/B Test</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No A/B tests yet. Create one to start optimizing your subject lines.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={t.status === "complete" ? "default" : "secondary"}>{t.status}</Badge>
                {t.winner_variant && (
                  <div className="flex items-center gap-1 text-sm text-primary font-medium">
                    <Trophy className="h-4 w-4" /> Winner: Variant {t.winner_variant.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg border ${t.winner_variant === "a" ? "border-primary bg-primary/5" : ""}`}>
                  <div className="text-xs text-muted-foreground mb-1">Variant A</div>
                  <div className="font-medium">{t.variant_a_subject}</div>
                  <div className="text-xs text-muted-foreground mt-2">Open rate: {rate(t.variant_a_opens, t.variant_a_sent)} ({t.variant_a_sent} sent)</div>
                </div>
                <div className={`p-3 rounded-lg border ${t.winner_variant === "b" ? "border-primary bg-primary/5" : ""}`}>
                  <div className="text-xs text-muted-foreground mb-1">Variant B</div>
                  <div className="font-medium">{t.variant_b_subject}</div>
                  <div className="text-xs text-muted-foreground mt-2">Open rate: {rate(t.variant_b_opens, t.variant_b_sent)} ({t.variant_b_sent} sent)</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-3">Split {t.split_pct}/{100 - t.split_pct} • Winner by {t.winner_metric.replace("_", " ")}</div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New A/B Test</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject A</Label>
              <Input value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} placeholder="Tryouts start Monday — register now" />
            </div>
            <div>
              <Label>Subject B</Label>
              <Input value={form.b} onChange={(e) => setForm({ ...form, b: e.target.value })} placeholder="Don't miss spring tryouts 🥎" />
            </div>
            <div>
              <Label>Test slice (% per variant)</Label>
              <Input type="number" min={10} max={50} value={form.split} onChange={(e) => setForm({ ...form, split: Math.max(10, Math.min(50, +e.target.value)) })} />
              <p className="text-xs text-muted-foreground mt-1">Each variant goes to {form.split}% of the audience; the winner goes to the remaining {100 - form.split * 2}%.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>Create draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
