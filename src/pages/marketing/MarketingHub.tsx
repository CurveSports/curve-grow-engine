import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import {
import { useMarketingLink } from "@/hooks/useMarketingLink";
  Palette, Users, Mail, Sparkles, ArrowRight, Megaphone, CheckCircle2,
  Link2, FlaskConical, Clock, MessageSquare, Share2, Calendar, Heart,
} from "lucide-react";

type Tile = { to: string; label: string; desc: string; icon: typeof Mail };

const SECTIONS: { title: string; blurb: string; tiles: Tile[] }[] = [
  {
    title: "Create & send",
    blurb: "Build assets and ship them across every channel.",
    tiles: [
      { to: "/marketing/designs", label: "Designs", desc: "Generate flyers, social posts and emails from your brand kit using AI.", icon: Sparkles },
      { to: "/marketing/emails", label: "Email Campaigns", desc: "Send approved designs to a segment and track opens, clicks, bounces.", icon: Mail },
      { to: "/marketing/sms", label: "SMS", desc: "Send TCPA-compliant text campaigns. Dedicated number per club.", icon: MessageSquare },
      { to: "/marketing/social", label: "Social Accounts", desc: "Connect Instagram, Facebook, X, LinkedIn and more via Buffer.", icon: Share2 },
    ],
  },
  {
    title: "Orchestrate",
    blurb: "Coordinate multi-asset, multi-week campaigns end to end.",
    tiles: [
      { to: "/marketing/sequences", label: "Campaign Sequences", desc: "Pick a proven multi-week campaign, plug in your dates, watch it run.", icon: Calendar },
      { to: "/marketing/campaigns", label: "Campaigns", desc: "Coordinate flyers, emails and posts under one goal with a shared approval flow.", icon: Megaphone },
      { to: "/marketing/approvals", label: "Approvals", desc: "Final sign-off on assets that have cleared Curve review.", icon: CheckCircle2 },
    ],
  },
  {
    title: "Optimize",
    blurb: "Squeeze more performance out of every send.",
    tiles: [
      { to: "/marketing/ab-tests", label: "A/B Tests", desc: "Test two subject lines on a slice of your audience and auto-send the winner.", icon: FlaskConical },
      { to: "/marketing/send-times", label: "Send-time Optimization", desc: "Recommended windows based on when your audience actually opens.", icon: Clock },
      { to: "/marketing/shortlinks", label: "Shortlinks & QR", desc: "Branded trackable links with one-click QR codes for flyers and posts.", icon: Link2 },
    ],
  },
  {
    title: "Listen",
    blurb: "Measure satisfaction and act on signal.",
    tiles: [
      { to: "/marketing/nps", label: "NPS Surveys", desc: "Track parent satisfaction. Auto-flag detractors for personal followup.", icon: Heart },
    ],
  },
  {
    title: "Foundation",
    blurb: "Set up once — every asset and send pulls from here.",
    tiles: [
      { to: "/marketing/brand-kit", label: "Brand Kit", desc: "Logos, colors, fonts and voice — the foundation every design pulls from.", icon: Palette },
      { to: "/marketing/contacts", label: "Contacts & Segments", desc: "Upload your roster, organize families, build reusable audience segments.", icon: Users },
      { to: "/marketing/email-setup", label: "Email Setup", desc: "Verify your sending domain and set defaults for outgoing campaigns.", icon: Mail },
    ],
  },
];

export default function MarketingHub() {
  const ml = useMarketingLink();
  return (
    <AppShell title="Marketing">
      <div className="mb-10">
        <p className="curve-eyebrow mb-2">Marketing</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Everything to grow your club.</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Set up the foundation once, then create, orchestrate and optimize campaigns across email, SMS and social — all in one place.
        </p>
      </div>

      <div className="space-y-12">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="mb-4">
              <h2 className="font-display text-xl font-semibold tracking-tight">{section.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{section.blurb}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.tiles.map((t) => {
                const Icon = t.icon;
                return (
                  <Link key={t.label} to={t.to}>
                    <Card className="p-5 h-full transition-all hover:shadow-md hover:-translate-y-0.5 group">
                      <div className="flex items-start gap-4">
                        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-display text-base font-semibold">{t.label}</h3>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t.desc}</p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
