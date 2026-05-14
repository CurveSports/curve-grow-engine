import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Heart, FlaskConical, Clock, Link2, BarChart2, ArrowRight } from "lucide-react";
import { useMarketingLink } from "@/hooks/useMarketingLink";

const TILES = [
  { to: "/marketing/nps", label: "NPS Surveys", desc: "Track parent satisfaction. Auto-flag detractors.", icon: Heart },
  { to: "/marketing/ab-tests", label: "A/B Tests", desc: "Test subject lines, send the winner.", icon: FlaskConical },
  { to: "/marketing/send-times", label: "Send-time Optimization", desc: "When your audience actually opens.", icon: Clock },
  { to: "/marketing/shortlinks", label: "Shortlinks & QR", desc: "Branded trackable links and QR codes.", icon: Link2 },
];

export default function Insights() {
  const ml = useMarketingLink();
  return (
    <AppShell title="Insights">
      <div className="mb-8">
        <p className="curve-eyebrow mb-2">Insights</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Measure what's working.</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Satisfaction, experiments, timing and link performance — everything you need to make the next send better than the last.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.to} to={ml(t.to)}>
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
    </AppShell>
  );
}
