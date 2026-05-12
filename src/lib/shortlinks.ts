import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export const SHORTLINK_BASE = `${SUPABASE_URL}/functions/v1/shortlink-redirect?s=`;
export const MAGIC_LINK_BASE = `${SUPABASE_URL}/functions/v1/magic-link-action?t=`;

export function publicShortlinkUrl(slug: string): string {
  return `${SHORTLINK_BASE}${encodeURIComponent(slug)}`;
}

export function publicMagicLinkUrl(token: string, email?: string): string {
  return `${MAGIC_LINK_BASE}${encodeURIComponent(token)}${email ? `&email=${encodeURIComponent(email)}` : ""}`;
}

const ALPHA = "abcdefghijkmnpqrstuvwxyz23456789";
export function randomSlug(len = 7): string {
  let s = "";
  const arr = crypto.getRandomValues(new Uint8Array(len));
  for (const n of arr) s += ALPHA[n % ALPHA.length];
  return s;
}

export async function createShortlink(opts: {
  org_id: string;
  target_url: string;
  label?: string;
  campaign_id?: string | null;
  design_id?: string | null;
  brand_color?: string | null;
  slug?: string;
  created_by?: string;
}): Promise<{ slug: string; url: string }> {
  let slug = opts.slug?.trim() || randomSlug();
  // Ensure unique
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase.from("org_shortlinks").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = randomSlug();
  }
  const { error } = await supabase.from("org_shortlinks").insert({
    org_id: opts.org_id,
    slug,
    target_url: opts.target_url,
    label: opts.label ?? null,
    campaign_id: opts.campaign_id ?? null,
    design_id: opts.design_id ?? null,
    brand_color: opts.brand_color ?? null,
    created_by: opts.created_by ?? null,
  });
  if (error) throw error;
  return { slug, url: publicShortlinkUrl(slug) };
}
