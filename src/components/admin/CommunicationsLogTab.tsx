import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

type LogRow = {
  id: string;
  generated_at: string;
  communication_type: string;
  tone: string | null;
  format: string | null;
  prompt_text: string | null;
  generated_by: string;
  generated_on_behalf_of_org: boolean;
  drafter_email?: string | null;
};

export default function CommunicationsLogTab({ orgId }: { orgId: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("org_communication_log")
        .select("*")
        .eq("org_id", orgId)
        .order("generated_at", { ascending: false })
        .limit(100);

      const userIds = Array.from(new Set((data ?? []).map((r: any) => r.generated_by)));
      let emailMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds);
        (profs ?? []).forEach((p: any) => emailMap.set(p.user_id, p.full_name || p.email));
      }
      setRows(
        (data ?? []).map((r: any) => ({ ...r, drafter_email: emailMap.get(r.generated_by) ?? "—" })),
      );
      setLoading(false);
    })();
  }, [orgId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Communication Activity</h2>
          <p className="text-sm text-muted-foreground">All AI-drafted communications for this organization (metadata only).</p>
        </div>
        <Button
          onClick={() => navigate(`/communications/${orgId}`)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Draft Communication for This Org
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="curve-card text-center py-12">
          <p className="text-sm text-muted-foreground mb-3">No communications drafted yet.</p>
          <Button
            onClick={() => navigate(`/communications/${orgId}`)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Draft Communication
          </Button>
        </div>
      ) : (
        <div className="curve-card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Tone</th>
                <th className="text-left px-4 py-2 font-medium">Format</th>
                <th className="text-left px-4 py-2 font-medium">Drafted By</th>
                <th className="text-left px-4 py-2 font-medium">Prompt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <>
                    <tr key={r.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {new Date(r.generated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3">{r.communication_type}</td>
                      <td className="px-4 py-3">
                        {r.tone && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{r.tone}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.format && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{r.format}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{r.drafter_email}</span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              r.generated_on_behalf_of_org
                                ? "bg-info-soft text-info"
                                : "bg-accent-soft text-accent",
                            )}
                          >
                            {r.generated_on_behalf_of_org ? "Curve Admin" : "Org User"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground truncate flex-1">
                            {r.prompt_text?.slice(0, 60) || "—"}
                            {r.prompt_text && r.prompt_text.length > 60 ? "…" : ""}
                          </span>
                          {r.prompt_text && (
                            <button
                              onClick={() => setExpanded(isOpen ? null : r.id)}
                              className="text-accent text-xs font-medium hover:underline inline-flex items-center"
                            >
                              {isOpen ? <>Hide <ChevronUp className="h-3 w-3" /></> : <>View <ChevronDown className="h-3 w-3" /></>}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && r.prompt_text && (
                      <tr key={r.id + "-exp"} className="bg-secondary/30">
                        <td colSpan={6} className="px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Full prompt</p>
                          <p className="text-sm whitespace-pre-wrap">{r.prompt_text}</p>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
