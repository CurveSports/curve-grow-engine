import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresentationData = {
  loading: boolean;
  org: any | null;
  intake: any | null;
  metrics: any | null;
  tasks: any[];
  projects: any[];
  notes: any[];
  activity: any[];
  scenarios: any[];
};

export function usePresentationData(orgId: string): PresentationData {
  const [state, setState] = useState<PresentationData>({
    loading: true, org: null, intake: null, metrics: null,
    tasks: [], projects: [], notes: [], activity: [], scenarios: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [
        { data: org }, { data: intake }, { data: metrics },
        { data: tasks }, { data: projects }, { data: notes },
        { data: activity }, { data: scenarios },
      ] = await Promise.all([
        supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
        supabase.from("organization_intake").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("derived_metrics").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("org_tasks").select("*").eq("org_id", orgId),
        supabase.from("org_projects").select("*").eq("org_id", orgId).order("display_order", { ascending: true }),
        supabase.from("org_notes").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
        supabase.from("task_activity_log").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(20),
        supabase.from("org_calculator_scenarios").select("*").eq("org_id", orgId).order("saved_at", { ascending: false }).limit(10),
      ]);
      if (cancelled) return;
      setState({
        loading: false,
        org, intake, metrics,
        tasks: tasks ?? [], projects: projects ?? [], notes: notes ?? [],
        activity: activity ?? [], scenarios: scenarios ?? [],
      });
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  return state;
}
