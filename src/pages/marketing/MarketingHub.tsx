import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Palette, Users, Mail, Sparkles, ArrowRight } from "lucide-react";

const TILES = [
  {
    to: "/marketing/designs",
    label: "Designs",
    desc: "Generate flyers, social posts and emails from your brand kit using AI.",
    icon: Sparkles,
  },
  {
    to: "/marketing/emails",
    label: "Email campaigns",
    desc: "Send approved designs to a segment and track opens, clicks, bounces.",
    icon: Mail,
  },
  {
    to: "/marketing/contacts",
    label: "Contacts & Segments",
    desc: "Upload your roster, organize families, build reusable audience segments.",
    icon: Users,
  },
  {
    to: "/marketing/brand-kit",
    label: "Brand Kit",
    desc: "Logos, colors, fonts and voice — the foundation every design pulls from.",
    icon: Palette,
  },
  {
    to: "/marketing/email-setup",
    label: "Email Setup",
    desc: "Verify your sending domain and set defaults for outgoing campaigns.",
    icon: Mail,
  },
];

export default function MarketingHub() {
  return (
    <AppShell title="Marketing">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Marketing</h1>
        <p className="text-muted-foreground mt-1">Set up the basics, then we'll create on-brand assets for every channel.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} to={t.to}>
              <Card className="p-6 h-full transition-all hover:shadow-md hover:-translate-y-0.5 group">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-lg font-semibold">{t.label}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
