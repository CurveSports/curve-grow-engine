import { supabase } from "@/integrations/supabase/client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type SendTimeRec = {
  id: string;
  day_of_week: number;
  hour_of_day: number;
  open_rate: number;
  click_rate: number;
  sample_size: number;
  confidence: "low" | "medium" | "high";
  is_recommended: boolean;
};

export const formatSlot = (dow: number, hour: number) => {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${DAYS[dow]} ${h12}:00 ${ampm}`;
};

// Seed sensible defaults for an org if no recommendations exist yet.
// Defaults reflect typical youth-sports email engagement: Tue/Thu 6–8pm, Sun 7pm.
export async function ensureSendTimeSeed(orgId: string) {
  const { count } = await supabase
    .from("org_send_time_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  if ((count ?? 0) > 0) return;

  const seeds = [
    { day_of_week: 2, hour_of_day: 18, open_rate: 38.4, click_rate: 7.2, sample_size: 0, confidence: "low", is_recommended: true },
    { day_of_week: 4, hour_of_day: 19, open_rate: 36.1, click_rate: 6.8, sample_size: 0, confidence: "low", is_recommended: true },
    { day_of_week: 0, hour_of_day: 19, open_rate: 34.7, click_rate: 6.1, sample_size: 0, confidence: "low", is_recommended: true },
    { day_of_week: 3, hour_of_day: 12, open_rate: 28.2, click_rate: 4.4, sample_size: 0, confidence: "low", is_recommended: false },
    { day_of_week: 6, hour_of_day: 9,  open_rate: 24.1, click_rate: 3.8, sample_size: 0, confidence: "low", is_recommended: false },
  ];
  await supabase.from("org_send_time_recommendations").insert(
    seeds.map((s) => ({ ...s, org_id: orgId }))
  );
}
