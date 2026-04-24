import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

interface UpcomingComm {
  id: string;
  title: string;
  calculated_due_date: string | null;
  stakeholder: string;
  is_sent: boolean;
}

/**
 * Compact list of next 3 upcoming (un-sent) communications across all active
 * seasons. Quietly hides itself if there's nothing to show.
 */
export function UpcomingComms({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<UpcomingComm[] | null>(null);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("org_calendar_items")
        .select("id, title, calculated_due_date, stakeholder, is_sent")
        .eq("org_id", orgId)
        .eq("is_sent", false)
        .gte("calculated_due_date", today)
        .lte("calculated_due_date", in60)
        .order("calculated_due_date", { ascending: true })
        .limit(3);
      setItems((data as UpcomingComm[]) ?? []);
    })();
  }, [orgId]);

  if (!items || items.length === 0) return null;

  return (
    <div className="curve-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent" />
          <p className="curve-eyebrow">Upcoming communications</p>
        </div>
        <Link to="/communications" className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1">
          Calendar <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {items.map((it) => (
          <li key={it.id} className="py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-secondary border border-border flex items-center justify-center flex-shrink-0 text-muted-foreground">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{it.title}</p>
              <p className="text-xs text-muted-foreground">
                To {it.stakeholder}
                {it.calculated_due_date ? ` · ${formatDate(it.calculated_due_date)}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
