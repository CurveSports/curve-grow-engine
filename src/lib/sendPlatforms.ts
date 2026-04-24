// Helpers for org_send_platforms (per-org communication-platform quick-links).
import { supabase } from "@/integrations/supabase/client";

export type SendPlatform = {
  id: string;
  org_id: string;
  label: string;
  url: string;
  platform_type: PlatformType;
  display_order: number;
};

export type PlatformType =
  | "sportsengine"
  | "leagueapps"
  | "teamsnap"
  | "mailchimp"
  | "statstack"
  | "gmail"
  | "outlook"
  | "other";

export const PLATFORM_TYPES: { value: PlatformType; label: string; emoji: string }[] = [
  { value: "sportsengine", label: "SportsEngine", emoji: "⚾" },
  { value: "leagueapps", label: "LeagueApps", emoji: "📱" },
  { value: "teamsnap", label: "TeamSnap", emoji: "📅" },
  { value: "mailchimp", label: "Mailchimp", emoji: "🐵" },
  { value: "statstack", label: "StatStack", emoji: "📊" },
  { value: "gmail", label: "Gmail", emoji: "✉️" },
  { value: "outlook", label: "Outlook", emoji: "📧" },
  { value: "other", label: "Other", emoji: "🔗" },
];

export function platformMeta(type: string) {
  return PLATFORM_TYPES.find((p) => p.value === type) ?? PLATFORM_TYPES[PLATFORM_TYPES.length - 1];
}

export async function listPlatforms(orgId: string): Promise<SendPlatform[]> {
  const { data, error } = await supabase
    .from("org_send_platforms")
    .select("*")
    .eq("org_id", orgId)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SendPlatform[];
}
