import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, ArrowRight } from "lucide-react";

type Org = { id: string; name: string; logo_url: string | null };

export default function AdminBrowseOrgs() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("organizations")
      .select("id, name, logo_url")
      .order("name", { ascending: true })
      .then(({ data }) => setOrgs((data ?? []) as Org[]));
  }, []);

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title="Marketing — Browse Organizations">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Open marketing tools for an org</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pick an organization to act on their behalf — Brand Kit, Designs,
            Emails, Campaigns, Sequences, SMS, Social, Surveys & more.
          </p>
        </div>

        <Input
          placeholder="Search organizations..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />

        <div className="grid gap-3">
          {filtered.map((o) => (
            <Link
              key={o.id}
              to={`/admin/orgs/${o.id}/marketing`}
              className="group"
            >
              <Card className="transition hover:border-primary hover:shadow-md">
                <CardHeader className="flex-row items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {o.logo_url ? (
                      <img
                        src={o.logo_url}
                        alt=""
                        className="h-9 w-9 rounded object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <CardTitle className="text-base truncate">
                      {o.name}
                    </CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
                </CardHeader>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No organizations match.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
