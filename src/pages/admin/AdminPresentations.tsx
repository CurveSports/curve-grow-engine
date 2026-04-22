import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

export default function AdminPresentations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name", { ascending: true });
      setOrgs((data ?? []) as any);
    })();
  }, []);

  return (
    <AppShell title="Presentations">
      <div className="curve-card max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h1 className="font-display text-2xl font-semibold">Presentations</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Select an organization to view its Internal Brief and Client Presentation.
        </p>
        <Select onValueChange={(orgId) => navigate(`/admin/org/${orgId}?tab=presentations`)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an organization…" />
          </SelectTrigger>
          <SelectContent>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </AppShell>
  );
}
