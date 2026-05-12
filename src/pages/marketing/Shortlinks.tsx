import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link2, Plus, Copy, ExternalLink, BarChart3, QrCode } from "lucide-react";
import { createShortlink, publicShortlinkUrl } from "@/lib/shortlinks";
import QrCodeBlock from "@/components/marketing/QrCodeBlock";

type Shortlink = {
  id: string;
  slug: string;
  target_url: string;
  label: string | null;
  click_count: number;
  brand_color: string | null;
  active: boolean;
  created_at: string;
};

export default function Shortlinks() {
  const { profile, user } = useAuth();
  const orgId = profile?.org_id;

  const [items, setItems] = useState<Shortlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ target_url: "", label: "", custom_slug: "", brand_color: "#0F172A" });
  const [saving, setSaving] = useState(false);
  const [qrFor, setQrFor] = useState<Shortlink | null>(null);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("org_shortlinks")
      .select("id,slug,target_url,label,click_count,brand_color,active,created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data ?? []) as Shortlink[]);
    setLoading(false);
  };

  // Real-time click count
  useEffect(() => {
    if (!orgId) return;
    load();
    const channel = supabase
      .channel("shortlinks-" + orgId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "org_shortlinks", filter: `org_id=eq.${orgId}` }, (payload) => {
        setItems((prev) => prev.map((it) => (it.id === (payload.new as any).id ? { ...it, ...(payload.new as any) } : it)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [orgId]);

  const create = async () => {
    if (!orgId || !user) return;
    if (!form.target_url.trim()) return toast.error("Destination URL is required");
    try { new URL(form.target_url); } catch { return toast.error("Enter a valid URL (include https://)"); }
    setSaving(true);
    try {
      await createShortlink({
        org_id: orgId,
        target_url: form.target_url.trim(),
        label: form.label.trim() || undefined,
        slug: form.custom_slug.trim() || undefined,
        brand_color: form.brand_color || null,
        created_by: user.id,
      });
      toast.success("Shortlink created");
      setOpen(false);
      setForm({ target_url: "", label: "", custom_slug: "", brand_color: "#0F172A" });
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const copy = (slug: string) => {
    const url = publicShortlinkUrl(slug);
    navigator.clipboard.writeText(url);
    toast.success("Copied " + url);
  };

  const toggle = async (link: Shortlink) => {
    await supabase.from("org_shortlinks").update({ active: !link.active }).eq("id", link.id);
    load();
  };

  return (
    <AppShell title="Shortlinks">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Shortlinks</h1>
          <p className="text-muted-foreground mt-1">Branded, trackable links and QR codes for every campaign.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New shortlink</Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-semibold mb-1">No shortlinks yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create one for each registration page, RSVP form, or fundraiser.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Create your first shortlink</Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((s) => {
            const url = publicShortlinkUrl(s.slug);
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-display font-semibold truncate">{s.label || s.slug}</p>
                      {!s.active && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Disabled</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-mono">{url}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">→ {s.target_url}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold tabular-nums">{s.click_count}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">clicks</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copy(s.slug)} title="Copy link"><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setQrFor(s)} title="QR code"><QrCode className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" asChild title="Open"><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(s)}>{s.active ? "Disable" : "Enable"}</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New shortlink</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Destination URL *</Label>
              <Input placeholder="https://yourorg.com/tryouts" value={form.target_url} onChange={(e) => setForm((s) => ({ ...s, target_url: e.target.value }))} />
            </div>
            <div>
              <Label>Label</Label>
              <Input placeholder="Spring tryouts registration" value={form.label} onChange={(e) => setForm((s) => ({ ...s, label: e.target.value }))} />
            </div>
            <div>
              <Label>Custom slug (optional)</Label>
              <Input placeholder="tryouts2026" value={form.custom_slug} onChange={(e) => setForm((s) => ({ ...s, custom_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} />
              <p className="text-xs text-muted-foreground mt-1">Leave blank for an auto-generated 7-char code.</p>
            </div>
            <div>
              <Label>QR brand color</Label>
              <input type="color" value={form.brand_color} onChange={(e) => setForm((s) => ({ ...s, brand_color: e.target.value }))} className="h-10 w-20 rounded border border-input cursor-pointer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>{saving ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      <Dialog open={!!qrFor} onOpenChange={(o) => { if (!o) setQrFor(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{qrFor?.label || qrFor?.slug}</DialogTitle></DialogHeader>
          {qrFor && (
            <div className="flex flex-col items-center gap-4 py-4">
              <QrCodeBlock
                value={publicShortlinkUrl(qrFor.slug)}
                color={qrFor.brand_color || "#0F172A"}
                size={280}
                filename={`qr-${qrFor.slug}.png`}
                caption={publicShortlinkUrl(qrFor.slug)}
              />
              <p className="text-xs text-muted-foreground text-center max-w-xs">High error-correction (H) — safe to overlay a small logo, print on flyers, or scan from a screen.</p>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setQrFor(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
