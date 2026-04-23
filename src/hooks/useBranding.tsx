import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Branding {
  logoUrl: string | null;
  primaryHsl: string | null; // e.g. "222 47% 11%"
  accentHsl: string | null;
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

  // Inject CSS variables on the root element
  useEffect(() => {
    const root = document.documentElement;
    if (branding.primaryHsl) root.style.setProperty("--primary", branding.primaryHsl);
    else root.style.removeProperty("--primary");
    if (branding.accentHsl) {
      root.style.setProperty("--accent", branding.accentHsl);
      root.style.setProperty("--ring", branding.accentHsl);
      root.style.setProperty("--nav-active-bg", branding.accentHsl);
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--nav-active-bg");
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
