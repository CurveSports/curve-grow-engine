import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMarketingLink } from "@/hooks/useMarketingLink";
import {
  Mail,
  MessageSquare,
  Image as ImageIcon,
  Workflow,
  Share2,
  Smile,
  Sparkles,
  ArrowRight,
} from "lucide-react";

type Channel = {
  key: string;
  label: string;
  blurb: string;
  icon: any;
  to: string;
  accent: string;
};

export default function Create() {
  const navigate = useNavigate();
  const ml = useMarketingLink();

  const channels: Channel[] = [
    {
      key: "design",
      label: "Design / Flyer",
      blurb: "AI-generated graphics on-brand. Print, social, or in-app.",
      icon: ImageIcon,
      to: "/marketing/designs/new",
      accent: "from-violet-500/15 to-fuchsia-500/5",
    },
    {
      key: "email",
      label: "Email blast",
      blurb: "Compose, preview dark mode, A/B subject lines.",
      icon: Mail,
      to: "/marketing/emails/new",
      accent: "from-sky-500/15 to-blue-500/5",
    },
    {
      key: "sms",
      label: "SMS / Text",
      blurb: "Short, opt-in only. Best for game-day reminders.",
      icon: MessageSquare,
      to: "/marketing/sms/new",
      accent: "from-emerald-500/15 to-teal-500/5",
    },
    {
      key: "social",
      label: "Social post",
      blurb: "Schedule via your connected Instagram / FB / X.",
      icon: Share2,
      to: "/marketing/social",
      accent: "from-pink-500/15 to-rose-500/5",
    },
    {
      key: "sequence",
      label: "Sequence (multi-step)",
      blurb: "Pick a proven playbook. Anchor it to a date and go.",
      icon: Workflow,
      to: "/marketing/sequences",
      accent: "from-amber-500/15 to-orange-500/5",
    },
    {
      key: "nps",
      label: "NPS survey",
      blurb: "Measure how families really feel.",
      icon: Smile,
      to: "/marketing/nps",
      accent: "from-indigo-500/15 to-purple-500/5",
    },
  ];

  return (
    <AppShell title="Create">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">
              New asset
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            What do you want to send?
          </h1>
          <p className="text-muted-foreground mt-2">
            Pick a channel — your brand kit auto-applies.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((c) => (
            <button
              key={c.key}
              onClick={() => navigate(ml(c.to))}
              className="text-left group"
            >
              <Card
                className={`relative overflow-hidden p-6 h-full bg-gradient-to-br ${c.accent} border-border/60 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
              >
                <c.icon className="h-8 w-8 mb-4 text-foreground/80" />
                <p className="font-display font-bold text-lg">{c.label}</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {c.blurb}
                </p>
                <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Start <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Card>
            </button>
          ))}
        </div>

        <Card className="mt-8 p-6 bg-muted/30">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold">Not sure where to start?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse the sequence library — proven multi-step playbooks (Game
                Day, Tryout Reminder, Sponsor Recap) you can launch in 30
                seconds.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => navigate(ml("/marketing/sequences"))}
              >
                Browse sequences
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
