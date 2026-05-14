import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Instagram, Facebook, Linkedin, Youtube, Share2, Trash2, ExternalLink, Plus } from "lucide-react";

type SocialAccount = {
  id: string;
  provider: string;
  handle: string;
  display_name: string | null;
  status: "pending" | "connected" | "error" | "disconnected";
  ayrshare_account_id: string | null;
  created_at: string;
};

type AyrshareProfile = {
  id: string;
  ayrshare_profile_key: string;
  display_title: string | null;
  is_mock: boolean;
  active: boolean;
};

const PROVIDER_META: Record<string, { label: string; icon: typeof Instagram }> = {
  instagram: { label: "Instagram", icon: Instagram },
  facebook: { label: "Facebook", icon: Facebook },
  x: { label: "X (Twitter)", icon: Share2 },
  twitter: { label: "X (Twitter)", icon: Share2 },
  tiktok: { label: "TikTok", icon: Share2 },
  linkedin: { label: "LinkedIn", icon: Linkedin },
  youtube: { label: "YouTube", icon: Youtube },
};

export default function SocialAccounts() {
  const { orgId } = useEffectiveOrg();
  const [items, setItems] = useState<SocialAccount[]>([]);
  const [profile, setProfile] = useState<AyrshareProfile | null>(null);
  const [connecting, setConnecting] = useState(false);

  const load = async () => {
    if (!orgId) return;
    const [{ data: accts }, { data: prof }] = await Promise.all([
      supabase
        .from("org_social_accounts")
        .select("id,provider,handle,display_name,status,ayrshare_account_id,created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("org_ayrshare_profiles")
        .select("id,ayrshare_profile_key,display_title,is_mock,active")
        .eq("org_id", orgId)
        .maybeSingle(),
    ]);
    setItems((accts ?? []) as SocialAccount[]);
    setProfile((prof ?? null) as AyrshareProfile | null);
  };

  useEffect(() => { load(); }, [orgId]);

  const startConnect = async () => {
    if (!orgId) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-social-account", {
        body: { org_id: orgId },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("No connection URL returned");
      window.open(url, "_blank", "noopener,noreferrer");
      // Poll for new accounts (Ayrshare webhook will populate)
      const start = Date.now();
      const poll = setInterval(async () => {
        await load();
        if (Date.now() - start > 120_000) clearInterval(poll);
      }, 5000);
      toast.success((data as { mock?: boolean }).mock
        ? "Test mode — opened mock connection page"
        : "Opened connection page in a new tab");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start connection");
    } finally {
      setConnecting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Disconnect this account?")) return;
    const { error } = await supabase.functions.invoke("disconnect-social-account", {
      body: { account_id: id },
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Account disconnected");
    load();
  };

  const connected = items.filter((a) => a.status === "connected" || a.status === "pending");

  return (
    <AppShell title="Social Accounts">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Social Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Connect your club's social accounts so we can publish your scheduled campaigns.
          </p>
        </div>
        <Button onClick={startConnect} disabled={connecting}>
          <Plus className="h-4 w-4 mr-2" />
          {connected.length === 0 ? "Connect Social Accounts" : "Connect another"}
        </Button>
      </div>

      {profile?.is_mock && (
        <Card className="p-4 mb-6 bg-muted/40 border-dashed">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Test mode</strong> — social posting is currently stubbed.
            Once credentials are configured, real posting activates automatically.
          </p>
        </Card>
      )}

      {connected.length === 0 ? (
        <Card className="p-12 text-center">
          <Share2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No accounts connected yet.</p>
          <Button onClick={startConnect} disabled={connecting}>Connect Social Accounts</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {connected.map((a) => {
              const meta = PROVIDER_META[a.provider] ?? { label: a.provider, icon: Share2 };
              const Icon = meta.icon;
              return (
                <Card key={a.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">@{a.handle}</div>
                      <div className="text-xs text-muted-foreground">
                        {meta.label}{a.display_name ? ` · ${a.display_name}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={a.status === "connected" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {profile?.is_mock ? "test mode" : a.status}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-6">
            <Button variant="outline" size="sm" onClick={startConnect} disabled={connecting}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage accounts
            </Button>
          </div>
        </>
      )}
    </AppShell>
  );
}
