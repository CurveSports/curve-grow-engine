import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ArrowUp, ArrowDown, Trash2, ExternalLink, Link2 } from "lucide-react";
import {
  PLATFORM_TYPES, platformMeta, type SendPlatform, type PlatformType,
} from "@/lib/sendPlatforms";

export default function SendPlatformsManager({
  orgId, userId, canEdit,
}: {
  orgId: string;
  userId: string;
  canEdit: boolean;
}) {
  const [items, setItems] = useState<SendPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<PlatformType>("sportsengine");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("org_send_platforms")
      .select("*")
      .eq("org_id", orgId)
      .order("display_order", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data ?? []) as SendPlatform[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [orgId]);

  async function add() {
    if (!label.trim() || !url.trim()) {
      toast.error("Label and URL are required");
      return;
    }
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
    setSaving(true);
    const nextOrder = items.length;
    const { error } = await supabase.from("org_send_platforms").insert({
      org_id: orgId,
      label: label.trim(),
      url: normalized,
      platform_type: type,
      display_order: nextOrder,
      created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Platform added");
    setLabel(""); setUrl(""); setType("sportsengine"); setShowForm(false);
    load();
  }

  async function move(item: SendPlatform, direction: -1 | 1) {
    const idx = items.findIndex((i) => i.id === item.id);
    const swap = items[idx + direction];
    if (!swap) return;
    const updates = await Promise.all([
      supabase.from("org_send_platforms").update({ display_order: swap.display_order }).eq("id", item.id),
      supabase.from("org_send_platforms").update({ display_order: item.display_order }).eq("id", swap.id),
    ]);
    if (updates.some((r) => r.error)) {
      toast.error("Failed to reorder");
      return;
    }
    load();
  }

  async function remove(item: SendPlatform) {
    if (!confirm(`Delete "${item.label}"?`)) return;
    const { error } = await supabase.from("org_send_platforms").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    setItems((p) => p.filter((i) => i.id !== item.id));
  }

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Sending platforms
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add quick-launch links to the platforms you actually send messages from
            (SportsEngine, LeagueApps, TeamSnap, Mailchimp, etc.).
            They'll appear as one-click buttons on every AI draft so you can paste &amp; send fast.
          </p>
        </div>
        {canEdit && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add link
          </Button>
        )}
      </div>

      {!canEdit && items.length === 0 && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Only your organization's primary user can add or edit sending platforms.
        </div>
      )}

      {showForm && canEdit && (
        <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-label">Label</Label>
              <Input
                id="sp-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="SportsEngine — News Post"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={type} onValueChange={(v) => setType(v as PlatformType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="mr-2">{p.emoji}</span>{p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-url">Direct URL to send from</Label>
            <Input
              id="sp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-team.sportsngin.com/news/new"
            />
            <p className="text-xs text-muted-foreground">
              The exact URL you'd open to start a new message in that platform.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setLabel(""); setUrl(""); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={add} disabled={saving}>
              {saving ? "Saving…" : "Add link"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Link2 className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No sending platforms yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add the URLs you use to send messages — paste-and-send becomes one click.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const meta = platformMeta(it.platform_type);
            return (
              <li key={it.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
                <span className="text-xl shrink-0" aria-hidden>{meta.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{it.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{it.url}</div>
                </div>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="Open"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                {canEdit && (
                  <>
                    <button
                      onClick={() => move(it, -1)}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => move(it, 1)}
                      disabled={idx === items.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(it)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
