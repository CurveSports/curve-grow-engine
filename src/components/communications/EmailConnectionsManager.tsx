import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, CheckCircle2, X, Loader2 } from "lucide-react";

type Connection = {
  id: string;
  provider: "gmail" | "outlook";
  email_address: string;
  display_name: string | null;
  status: string;
  connected_at: string;
  last_used_at: string | null;
};

export default function EmailConnectionsManager({ userId }: { userId: string }) {
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<"gmail" | "outlook" | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_email_connections")
      .select("id, provider, email_address, display_name, status, connected_at, last_used_at")
      .eq("user_id", userId)
      .order("connected_at", { ascending: false });
    if (error) toast.error(error.message);
    setConns((data ?? []) as Connection[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [userId]);

  // OAuth callback redirect handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("email_oauth");
    if (status === "success") {
      toast.success("Inbox connected");
      params.delete("email_oauth"); params.delete("provider");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
      load();
    } else if (status === "error") {
      const reason = params.get("reason") || "Unknown error";
      toast.error(`Connection failed: ${reason}`);
      params.delete("email_oauth"); params.delete("reason"); params.delete("provider");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  async function connect(provider: "gmail" | "outlook") {
    setConnecting(provider);
    try {
      const { data, error } = await supabase.functions.invoke("email-oauth-start", {
        body: { provider, redirectTo: window.location.href.split("?")[0] },
      });
      if (error) throw error;
      const url = (data as any)?.authUrl;
      if (!url) throw new Error("No auth URL returned");
      window.location.href = url;
    } catch (e: any) {
      setConnecting(null);
      toast.error(e?.message ?? "Could not start connection");
    }
  }

  async function disconnect(c: Connection) {
    if (!confirm(`Disconnect ${c.email_address}?`)) return;
    const { error } = await supabase.from("user_email_connections").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    setConns((p) => p.filter((x) => x.id !== c.id));
    toast.success("Inbox disconnected");
  }

  const hasGmail = conns.some((c) => c.provider === "gmail" && c.status === "active");
  const hasOutlook = conns.some((c) => c.provider === "outlook" && c.status === "active");

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4" /> Personal inbox
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect your Gmail or Outlook to send 1-on-1 messages (sponsor outreach, coach emails, board notes)
          directly from your inbox. Replies land in your inbox too. We never read or store your messages.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ProviderCard
          provider="gmail"
          label="Gmail"
          emoji="✉️"
          connected={hasGmail}
          loading={connecting === "gmail"}
          onConnect={() => connect("gmail")}
        />
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 flex items-center gap-3 opacity-70">
          <span className="text-2xl" aria-hidden>📧</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Outlook / Microsoft 365</div>
            <div className="text-xs text-muted-foreground">Coming soon</div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : conns.length === 0 ? (
        <p className="text-xs text-muted-foreground">No inbox connected yet.</p>
      ) : (
        <ul className="space-y-2 pt-2 border-t border-border">
          {conns.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-health shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {c.email_address}
                  <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">{c.provider}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Connected {new Date(c.connected_at).toLocaleDateString()}
                  {c.last_used_at ? ` · last used ${new Date(c.last_used_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <button
                onClick={() => disconnect(c)}
                className="text-muted-foreground hover:text-destructive"
                title="Disconnect"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ProviderCard({
  provider, label, emoji, connected, loading, onConnect,
}: {
  provider: string;
  label: string;
  emoji: string;
  connected: boolean;
  loading: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4 flex items-center gap-3">
      <span className="text-2xl" aria-hidden>{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">
          {connected ? "Connected" : "Not connected"}
        </div>
      </div>
      <Button size="sm" variant={connected ? "outline" : "default"} onClick={onConnect} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : connected ? "Add another" : "Connect"}
      </Button>
    </div>
  );
}
