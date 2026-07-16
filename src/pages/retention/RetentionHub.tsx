import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smile, Gift, ArrowRight, Settings as SettingsIcon } from "lucide-react";

export default function RetentionHub() {
  return (
    <AppShell title="Retention & Referral Incentives">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Retention & Referral Incentives</h1>
          <p className="text-muted-foreground mt-1">
            Keep the families you have and turn happy parents into your best recruiters.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/retention/surveys" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Smile className="h-5 w-5" />
                  </div>
                  <Badge>Live</Badge>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Parent Surveys</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    End-of-season surveys with a shared core question set (so you can benchmark against
                    every other Curve org) plus your own custom questions.
                  </p>
                </div>
                <div className="flex items-center text-sm text-primary font-medium">
                  Open surveys <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="h-full opacity-70">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Gift className="h-5 w-5 text-muted-foreground" />
                </div>
                <Badge variant="secondary">Coming soon</Badge>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Referral Incentives</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Give parents a shareable referral link, track sign-ups, and reward families for bringing
                  new players in. Landing in the next release.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Link to="/retention/settings" className="group block">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Survey settings</h3>
                <p className="text-sm text-muted-foreground">Manage team name and age group options shown on your public parent survey.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}
