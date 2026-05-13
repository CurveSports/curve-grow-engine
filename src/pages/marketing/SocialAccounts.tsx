import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Instagram, Facebook, Linkedin, Youtube, Plus, Share2, Trash2 } from "lucide-react";

type SocialAccount = {
  id: string;
  provider: string;
  handle: string;
  display_name: string | null;
  status: "pending" | "connected" | "error" | "disconnected";
  buffer_profile_id: string | null;
  created_at: string;
};

const PROVIDERS = [
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "x", label: "X (Twitter)", icon: Share2 },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "tiktok", label: "TikTok", icon: Share2 },
  { value: "youtube", label: "YouTube", icon: Youtube },
];

export default function SocialAccounts() {
  const { profile } = useAuth();
  const { orgId } = useEffectiveOrg();
  const [items, setItems] = useState<SocialAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ provider: "instagram", handle: "", display_name: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("org_social_accounts")
      .select("id,provider,handle,display_name,status,buffer_profile_id,created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as SocialAccount[]);
  };
  useEffect(() => { load(); }, [orgId]);

  const create = async () => {
    if (!orgId || !form.handle.trim()) { toast.error("Handle is required"); return; }
    setSaving(true);
    // NOTE: real Buffer OAuth wiring lands when the user supplies BUFFER_ACCESS_TOKEN.
    // For now we record the account in 'pending' so the rest of the flow works.
    const { error } = await supabase.from("org_social_accounts").insert({
      org_id: orgId,
      provider: form.provider,
      handle: form.handle.trim().replace(/^@/, ""),
      display_name: form.display_name || null,
      status: "pending",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account added — Buffer connection pending");
    setOpen(false);
    setForm({ provider: "instagram", handle: "", display_name: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this account?")) return;
    const { error } = await supabase.from("org_social_accounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <AppShell title="Social Accounts">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Social Accounts</h1>
          <p className="text-muted-foreground mt-1">Connect the social profiles you want Curve to post to. Live posting via Buffer activates once an access token is configured.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add account</Button>
      </div>

      <Card className="p-4 mb-6 bg-muted/40 border-dashed">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Buffer integration</strong> is stubbed. Add accounts now to plan posts and visualize the calendar — actual posting will activate when a Buffer access token is provided.
        </p>
      </Card>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <Share2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No accounts connected yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((a) => {
            const meta = PROVIDERS.find((p) => p.value === a.provider);
            const Icon = meta?.icon ?? Share2;
            return (
              <Card key={a.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">@{a.handle}</div>
                    <div className="text-xs text-muted-foreground">{meta?.label ?? a.provider}{a.display_name ? ` · ${a.display_name}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === "connected" ? "default" : "secondary"} className="capitalize">{a.status}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add social account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Platform</Label>
              <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Handle</Label>
              <Input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@thunderbolts" />
            </div>
            <div>
              <Label>Display name (optional)</Label>
              <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Thunderbolts Baseball" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
