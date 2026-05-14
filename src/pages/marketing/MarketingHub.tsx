import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Palette, Users, Mail, Sparkles, ArrowRight, Megaphone, CheckCircle2,
  Link2, FlaskConical, Clock, MessageSquare, Share2, Calendar, Heart,
  AlertTriangle, ShieldCheck, Send, Zap, TrendingUp, Image as ImageIcon,
  CheckSquare, Workflow, Smile, BarChart2,
} from "lucide-react";
import { useMarketingLink } from "@/hooks/useMarketingLink";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";

type HubStats = {
  detractorsOpen: number;
  nextSendAt: string | null;
  nextSendSubject: string | null;
  emailDomainVerified: boolean;
  smsActive: boolean;
  socialConnected: boolean;
  last24Opens: number;
  last24Clicks: number;
  last24Sent: number;
  newContacts7d: number;
  upcomingEvent: { id: string; title: string; starts_at: string } | null;
};

const EMPTY_STATS: HubStats = {
  detractorsOpen: 0, nextSendAt: null, nextSendSubject: null,
  emailDomainVerified: false, smsActive: false, socialConnected: false,
  last24Opens: 0, last24Clicks: 0, last24Sent: 0, newContacts7d: 0, upcomingEvent: null,
};

function timeFromNow(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const hr = Math.round(abs / 3600000);
  if (hr < 1) return ms > 0 ? "in <1h" : "<1h ago";
  if (hr < 48) return ms > 0 ? `in ${hr}h` : `${hr}h ago`;
  const d = Math.round(hr / 24);
  return ms > 0 ? `in ${d}d` : `${d}d ago`;
}

export default function MarketingHub() {
  const ml = useMarketingLink();
  const { orgId } = useEffectiveOrg();
  const [stats, setStats] = useState<HubStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const surveyIds = (await supabase.from("org_nps_surveys").select("id").eq("org_id", orgId)).data?.map((s: any) => s.id) ?? [];
      const sendIds = (await supabase.from("org_email_sends").select("id").eq("org_id", orgId)).data?.map((s: any) => s.id) ?? [];

      const today = new Date(); today.setHours(0,0,0,0);
      const in48 = new Date(Date.now() + 48 * 3600 * 1000);

      const [
        detractors, nextSend, domains, smsNum, socials,
        events24, contacts7d, sentSends, gameDay,
      ] = await Promise.all([
        surveyIds.length
          ? supabase.from("org_nps_responses").select("id", { count: "exact", head: true })
              .eq("category", "detractor").eq("flagged_for_followup", true).is("followup_completed_at", null)
              .in("survey_id", surveyIds)
          : Promise.resolve({ count: 0 } as any),
        supabase.from("org_email_sends").select("id, subject, scheduled_for")
          .eq("org_id", orgId).eq("status", "scheduled")
          .order("scheduled_for", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("org_email_domains").select("id, status").eq("org_id", orgId),
        supabase.from("org_sms_numbers").select("id, active").eq("org_id", orgId).eq("active", true).limit(1),
        supabase.from("org_social_accounts").select("id").eq("org_id", orgId).limit(1),
        sendIds.length
          ? supabase.from("org_email_events").select("event_type").gte("created_at", since24).in("send_id", sendIds)
          : Promise.resolve({ data: [] } as any),
        supabase.from("org_contacts").select("id", { count: "exact", head: true })
          .eq("org_id", orgId).gte("created_at", since7d),
        supabase.from("org_email_sends").select("id, recipient_count").eq("org_id", orgId)
          .eq("status", "sent").gte("sent_at", since24),
        supabase.from("org_calendar_items").select("id, title, calculated_due_date")
          .eq("org_id", orgId).eq("is_non_negotiable", true)
          .gte("calculated_due_date", today.toISOString().slice(0, 10))
          .lte("calculated_due_date", in48.toISOString().slice(0, 10))
          .order("calculated_due_date", { ascending: true }).limit(1),
      ]);

      if (cancelled) return;

      const opens = (events24.data ?? []).filter((e: any) => e.event_type === "opened").length;
      const clicks = (events24.data ?? []).filter((e: any) => e.event_type === "clicked").length;
      const sent = (sentSends.data ?? []).reduce((acc: number, s: any) => acc + (s.recipient_count ?? 0), 0);
      const domainOk = (domains.data ?? []).some((d: any) => d.status === "verified" || d.status === "active");

      const gameDayItem = (gameDay.data ?? [])[0] as any;

      setStats({
        detractorsOpen: detractors.count ?? 0,
        nextSendAt: (nextSend.data as any)?.scheduled_for ?? null,
        nextSendSubject: (nextSend.data as any)?.subject ?? null,
        emailDomainVerified: domainOk,
        smsActive: (smsNum.data?.length ?? 0) > 0,
        socialConnected: (socials.data?.length ?? 0) > 0,
        last24Opens: opens, last24Clicks: clicks, last24Sent: sent,
        newContacts7d: contacts7d.count ?? 0,
        upcomingEvent: gameDayItem
          ? { id: gameDayItem.id, title: gameDayItem.title, starts_at: gameDayItem.calculated_due_date }
          : null,
      });
      setLoading(false);
    })().catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [orgId]);

  const whatsNext: { icon: typeof Mail; label: string; sub: string; to: string; tone: "default" | "warn" | "ok" }[] = [];
  if (stats.upcomingEvent) {
    whatsNext.push({
      icon: Zap,
      label: `Game day: ${stats.upcomingEvent.title}`,
      sub: `Starts ${timeFromNow(stats.upcomingEvent.starts_at)} — launch a 48h push`,
      to: "/marketing/sequences",
      tone: "warn",
    });
  }
  if (stats.detractorsOpen > 0) {
    whatsNext.push({
      icon: AlertTriangle,
      label: `${stats.detractorsOpen} detractor${stats.detractorsOpen === 1 ? "" : "s"} need follow-up`,
      sub: "Personal outreach within 48h saves the relationship",
      to: "/marketing/nps",
      tone: "warn",
    });
  }
  if (stats.nextSendAt) {
    whatsNext.push({
      icon: Send,
      label: stats.nextSendSubject || "Email scheduled",
      sub: `Sending ${timeFromNow(stats.nextSendAt)}`,
      to: "/marketing/emails",
      tone: "ok",
    });
  }
  if (whatsNext.length === 0 && !loading) {
    whatsNext.push({
      icon: Sparkles,
      label: "All clear — pick your next play",
      sub: "Nothing pending. Try a sequence or send a one-off.",
      to: "/marketing/sequences",
      tone: "default",
    });
  }

  const trustBadges = [
    { ok: stats.emailDomainVerified, label: "Email", to: "/marketing/email-setup" },
    { ok: stats.smsActive, label: "SMS", to: "/marketing/sms-setup" },
    { ok: stats.socialConnected, label: "Social", to: "/marketing/social" },
  ];

  return (
    <AppShell title="Marketing">
      <div className="mb-8">
        <p className="curve-eyebrow mb-2">Marketing</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">What's next for your club.</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Everything that needs you, plus one-tap shortcuts to ship today's wins.
        </p>
      </div>

      {/* Game Day banner */}
      {stats.upcomingEvent && (
        <Link to={ml("/marketing/sequences")} className="block mb-6">
          <Card className="p-4 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-background hover:border-amber-500/60 transition-all group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-700 dark:text-amber-400">Game Day Mode</span>
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">
                    {timeFromNow(stats.upcomingEvent.starts_at)}
                  </Badge>
                </div>
                <div className="font-display text-lg font-semibold truncate">{stats.upcomingEvent.title}</div>
                <div className="text-xs text-muted-foreground">Launch a 48-hour push — hype reel, reminders, and post-game recap, ready in one tap.</div>
              </div>
              <ArrowRight className="h-5 w-5 text-amber-700 dark:text-amber-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
          </Card>
        </Link>
      )}

      {/* Trust strip */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mr-1">Channels</span>
        {trustBadges.map((b) => (
          <Link key={b.label} to={ml(b.to)} className="group">
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all
              ${b.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${b.ok ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              {b.label}
              <span className="opacity-70">{b.ok ? "ready" : "needs setup"}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Command center grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12">
        {/* What's next */}
        <Card className="p-5 lg:col-span-2 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="curve-eyebrow">What's next</p>
              <h2 className="font-display text-xl font-semibold mt-0.5">Today's queue</h2>
            </div>
          </div>
          <div className="space-y-2">
            {whatsNext.slice(0, 4).map((w, i) => {
              const Icon = w.icon;
              const toneCls =
                w.tone === "warn" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                w.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                "bg-primary/10 text-primary";
              return (
                <Link key={i} to={ml(w.to)} className="block">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-all group">
                    <div className={`h-10 w-10 rounded-lg ${toneCls} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{w.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{w.sub}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Today's wins */}
        <Card className="p-5">
          <div className="mb-4">
            <p className="curve-eyebrow">Today's wins</p>
            <h2 className="font-display text-xl font-semibold mt-0.5">Last 24h</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Sent" value={stats.last24Sent} icon={Send} />
            <Stat label="Opens" value={stats.last24Opens} icon={Mail} />
            <Stat label="Clicks" value={stats.last24Clicks} icon={TrendingUp} />
            <Stat label="New contacts" value={stats.newContacts7d} icon={Users} sub="7d" />
          </div>
        </Card>
      </div>

      {/* Quick create */}
      <div className="mb-12">
        <p className="curve-eyebrow mb-3">Quick create</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickTile to={ml("/marketing/sequences")} icon={Workflow} label="Launch sequence" sub="Pick a play, plug in dates" />
          <QuickTile to={ml("/marketing/designs")} icon={Sparkles} label="Generate design" sub="AI from your brand kit" />
          <QuickTile to={ml("/marketing/emails/new")} icon={Mail} label="Send email" sub="One-off blast" />
          <QuickTile to={ml("/marketing/sms/new")} icon={MessageSquare} label="Send SMS" sub="TCPA compliant" />
        </div>
      </div>

      {/* Full directory (collapsed sections) */}
      <div className="space-y-10">
        <Section title="Foundation" blurb="Set once — every send pulls from here." tiles={[
          { to: "/marketing/brand-kit", label: "Brand Kit", desc: "Logos, colors, fonts and voice.", icon: Palette },
          { to: "/marketing/contacts", label: "Contacts & Segments", desc: "Roster, families, segments.", icon: Users },
          { to: "/marketing/email-setup", label: "Email Setup", desc: "Verify your sending domain.", icon: Mail },
          { to: "/marketing/sms-setup", label: "SMS Setup", desc: "Dedicated number per club.", icon: MessageSquare },
          { to: "/marketing/social", label: "Social Accounts", desc: "Connect Instagram, FB, X via Buffer.", icon: Share2 },
        ]} />
        <Section title="Orchestrate" blurb="Coordinate multi-asset campaigns end to end." tiles={[
          { to: "/marketing/sequences", label: "Sequence Library", desc: "Proven multi-week plays.", icon: Calendar },
          { to: "/marketing/campaigns", label: "Campaigns", desc: "One goal, many assets.", icon: Megaphone },
        ]} />
        <Section title="Measure" blurb="Squeeze more out of every send." tiles={[
          { to: "/marketing/nps", label: "NPS Surveys", desc: "Track satisfaction; flag detractors.", icon: Heart },
          { to: "/marketing/ab-tests", label: "A/B Tests", desc: "Auto-send the winner.", icon: FlaskConical },
          { to: "/marketing/send-times", label: "Send-time Optimization", desc: "When your audience opens.", icon: Clock },
          { to: "/marketing/shortlinks", label: "Shortlinks & QR", desc: "Branded trackable links.", icon: Link2 },
        ]} />
      </div>
    </AppShell>
  );
}

function Stat({ label, value, icon: Icon, sub }: { label: string; value: number; icon: typeof Mail; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}{sub && <span className="opacity-60">·{sub}</span>}
      </div>
      <div className="font-display text-2xl font-bold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function QuickTile({ to, icon: Icon, label, sub }: { to: string; icon: typeof Mail; label: string; sub: string }) {
  return (
    <Link to={to}>
      <Card className="p-4 h-full transition-all hover:shadow-md hover:-translate-y-0.5 group bg-gradient-to-br from-background to-muted/20">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-display text-sm font-semibold leading-tight">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </Card>
    </Link>
  );
}

type Tile = { to: string; label: string; desc: string; icon: typeof Mail };
function Section({ title, blurb, tiles }: { title: string; blurb: string; tiles: Tile[] }) {
  const ml = useMarketingLink();
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{blurb}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} to={ml(t.to)}>
              <Card className="p-4 h-full transition-all hover:shadow-sm hover:border-primary/40 group">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted text-foreground/70 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{t.label}</div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
