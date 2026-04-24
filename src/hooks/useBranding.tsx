import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Branding {
  logoUrl: string | null;
  primaryHsl: string | null; // e.g. "222 47% 11%"
  accentHsl: string | null;
}

/** Parse "H S% L%" -> [h, s, l] numbers. Returns null on bad input. */
function parseHsl(raw: string): [number, number, number] | null {
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
}

const fmtHsl = (h: number, s: number, l: number) =>
  `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;

/**
 * Clamp an accent color into a "safe" lightness band so it's always readable
 * as text on white AND legible as a background under white text.
 * Target band: L 28–42%. Returns the (possibly adjusted) HSL string.
 */
function safeAccent(raw: string): string {
  const parsed = parseHsl(raw);
  if (!parsed) return raw;
  let [h, s, l] = parsed;
  // Pastels / very light: pull down. Near-black: lift up.
  if (l > 42) l = 42;
  if (l < 28) l = 28;
  // Very desaturated colors look muddy at mid-L; nudge saturation up a touch.
  if (s < 25) s = 25;
  return fmtHsl(h, s, l);
}

/**
 * Decide whether white or near-black text is more legible on top of the given HSL.
 * Returns an HSL string suitable for a *-foreground variable.
 */
function readableForeground(raw: string): string {
  const parsed = parseHsl(raw);
  if (!parsed) return "0 0% 100%";
  const [, , l] = parsed;
  // Light backgrounds → ink text; dark backgrounds → white text.
  return l >= 55 ? "220 25% 8%" : "0 0% 100%";
}

/** Same idea but for --primary which can be any hue/lightness. */
function safePrimary(raw: string): { bg: string; fg: string } {
  const parsed = parseHsl(raw);
  if (!parsed) return { bg: raw, fg: "0 0% 100%" };
  let [h, s, l] = parsed;
  // Keep primary in a usable band too — avoid neon-bright or near-white.
  if (l > 60) l = 60;
  if (l < 12) l = 12;
  const bg = fmtHsl(h, s, l);
  return { bg, fg: readableForeground(bg) };
}

interface BrandingCtx extends Branding {
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<BrandingCtx | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { profile, role } = useAuth();
  const [branding, setBranding] = useState<Branding>({ logoUrl: null, primaryHsl: null, accentHsl: null });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    // Curve admins do not get white-labeled — they keep Curve defaults
    if (role === "admin" || !profile?.org_id) {
      setBranding({ logoUrl: null, primaryHsl: null, accentHsl: null });
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("org_branding")
      .select("logo_url, primary_hsl, accent_hsl")
      .eq("org_id", profile.org_id)
      .maybeSingle();
    setBranding({
      logoUrl: data?.logo_url ?? null,
      primaryHsl: data?.primary_hsl ?? null,
      accentHsl: data?.accent_hsl ?? null,
    });
    setLoading(false);
  }, [profile?.org_id, role]);

  useEffect(() => { load(); }, [load]);

  // Inject CSS variables on the root element with contrast guards.
  useEffect(() => {
    const root = document.documentElement;

    // --- PRIMARY ---
    if (branding.primaryHsl) {
      const { bg, fg } = safePrimary(branding.primaryHsl);
      root.style.setProperty("--primary", bg);
      root.style.setProperty("--primary-foreground", fg);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
    }

    // --- ACCENT (drives badges, text-accent, focus rings, nav pill bg) ---
    if (branding.accentHsl) {
      const safe = safeAccent(branding.accentHsl);
      const navFg = readableForeground(safe);
      root.style.setProperty("--accent", safe);
      root.style.setProperty("--accent-foreground", navFg);
      root.style.setProperty("--ring", safe);
      root.style.setProperty("--nav-active-bg", safe);
      root.style.setProperty("--nav-active-fg", navFg);
      // Soft accent tint for badges = same hue at high lightness, low saturation
      const parsed = parseHsl(safe);
      if (parsed) {
        const [h, s] = parsed;
        root.style.setProperty("--accent-soft", fmtHsl(h, Math.min(s, 40), 94));
      }
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-foreground");
      root.style.removeProperty("--accent-soft");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--nav-active-bg");
      root.style.removeProperty("--nav-active-fg");
    }
  }, [branding]);

  return (
    <Ctx.Provider value={{ ...branding, loading, refresh: load }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBranding must be inside BrandingProvider");
  return ctx;
}
