// Small dashboard summary card for org users, placed on /dashboard.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/format";
import { IN_PROGRESS_STAGES } from "@/lib/orgSponsorship";

export default function SponsorshipSummaryCard() {
  const { profile } = useAuth();
  const [data, setData] = useState<{ active: number; warm: number; cold: number; closed: number; total: number } | null>(null);

  useEffect(() => {
    if (!profile?.org_id) return;
    (async () => {
      const { data: rows } = await supabase.rpc("get_org_sponsorship_view", { p_org_id: profile.org_id });
      const list = (rows ?? []) as any[];
      const active = list.filter(l => IN_PROGRESS_STAGES.includes(l.stage));
      const closed = list.filter(l => l.stage === "closed_won");
      setData({
        active: active.length,
        warm: active.filter(l => l.is_warm).length,
        cold: active.filter(l => !l.is_warm).length,
        closed: closed.length,
        total: closed.reduce((a, l) => a + Number(l.closed_value || 0), 0),
      });
    })();
  }, [profile?.org_id]);

  if (!data) return null;

  const empty = data.active === 0 && data.closed === 0;

  return (
    <div className="curve-card-hero">
      <p className="curve-eyebrow mb-3">Sponsorship Pipeline</p>
      {empty ? (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">No leads submitted yet</p>
          <Link to="/sponsorships" className="text-sm font-semibold text-health hover:underline">
            Add Your First Leads →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <p className="font-display text-2xl font-semibold tabular-nums">{data.active}</p>
            <p className="text-xs text-muted-foreground">Active leads · {data.warm} warm · {data.cold} cold</p>
          </div>
          <div>
            <p className={`font-display text-2xl font-semibold tabular-nums ${data.closed > 0 ? "text-health" : ""}`}>{data.closed}</p>
            <p className="text-xs text-muted-foreground">Deals closed · {formatCurrency(data.total)} secured</p>
          </div>
          <div className="sm:text-right">
            <Link to="/sponsorships" className="text-sm font-semibold text-health hover:underline">View Pipeline →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
