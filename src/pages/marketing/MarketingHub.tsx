import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Palette, Users, Mail, Sparkles, ArrowRight } from "lucide-react";

const TILES = [
  {
    to: "/marketing/brand-kit",
    label: "Brand Kit",
    desc: "Logos, colors, fonts and voice — the foundation every design pulls from.",
    icon: Palette,
  },
  {
    to: "/marketing/contacts",
    label: "Contacts & Segments",
    desc: "Upload your roster, organize families, build reusable audience segments.",
    icon: Users,
  },
  {
    to: "/marketing/email-setup",
    label: "Email Setup",
    desc: "Verify your sending domain and set defaults for outgoing campaigns.",
    icon: Mail,
  },
  {
    to: "#",
    label: "Designs (coming)",
    desc: "Generate flyers, social posts and emails from your brand kit using AI.",
    icon: Sparkles,
    soon: true,
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
          const inner = (
            <Card className="p-6 h-full transition-all hover:shadow-md hover:-translate-y-0.5 group">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{t.label}</h2>
                    {t.soon && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Soon</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                </div>
                {!t.soon && <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
            </Card>
          );
          return t.soon ? <div key={t.label} className="opacity-60 cursor-not-allowed">{inner}</div> : <Link key={t.label} to={t.to}>{inner}</Link>;
        })}
      </div>
    </AppShell>
  );
}
