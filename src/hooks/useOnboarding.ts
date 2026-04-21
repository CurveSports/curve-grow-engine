import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface OnboardingState {
  password_set_at: string | null;
  welcomed_at: string | null;
  intake_started_at: string | null;
  intake_completed_at: string | null;
  report_viewed_at: string | null;
}

const empty: OnboardingState = {
  password_set_at: null,
  welcomed_at: null,
  intake_started_at: null,
  intake_completed_at: null,
  report_viewed_at: null,
};

export function useOnboarding() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setState(null); setLoading(false); return; }
    const { data } = await supabase
      .from("user_onboarding")
      .select("password_set_at, welcomed_at, intake_started_at, intake_completed_at, report_viewed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setState((data as OnboardingState) ?? empty);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const mark = useCallback(async (field: keyof OnboardingState) => {
    if (!user) return;
    const now = new Date().toISOString();
    setState((s) => ({ ...(s ?? empty), [field]: now }));
    await supabase
      .from("user_onboarding")
      .upsert({ user_id: user.id, [field]: now }, { onConflict: "user_id" });
  }, [user]);

  return { state, loading, mark, refresh: load };
}
