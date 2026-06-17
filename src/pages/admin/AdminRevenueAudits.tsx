import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";

type LeadRow = {
  id: string;
  org_name: string;
  contact_name: string;
  email: string;
  city_state: string | null;
  status: string;
  created_at: string;
  report_token: string;
  report_payload: any;
};

export default function AdminRevenueAudits() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("public_audit_leads")
        .select("id, org_name, contact_name, email, city_state, status, created_at, report_token, report_payload")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data as LeadRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Revenue Audit Leads</h1>
            <p className="text-sm text-muted-foreground">Submissions from the public /revenue-audit form.</p>
          </div>
          <a href="/revenue-audit" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              View public form <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </a>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="border rounded-lg p-12 text-center text-muted-foreground">No submissions yet.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Organization</th>
                  <th className="px-4 py-2.5 font-medium">Contact</th>
                  <th className="px-4 py-2.5 font-medium">Opportunity</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Submitted</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">
                      {r.org_name}
                      {r.city_state && <div className="text-xs text-muted-foreground">{r.city_state}</div>}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.contact_name}
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-600">
                      {r.report_payload?.totals?.totalOpportunityFormatted ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={r.status === "new" ? "default" : "secondary"}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link to={`/admin/revenue-audits/${r.id}`}>
                        <Button size="sm" variant="outline">Open</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
