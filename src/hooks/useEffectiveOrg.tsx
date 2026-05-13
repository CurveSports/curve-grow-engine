import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the org_id that the current page should operate on.
 *
 * - For org users: their own profile.org_id.
 * - For admins inside an /admin/orgs/:orgId/marketing/... route:
 *   the :orgId from the URL (impersonation mode).
 *
 * The `isImpersonating` flag lets UI surface a "Acting as..." banner
 * and rewrite internal links so navigation stays inside the admin scope.
 */
export function useEffectiveOrg() {
  const { profile, role, user } = useAuth();
  const location = useLocation();

  const match = location.pathname.match(
    /^\/admin\/orgs\/([0-9a-fA-F-]{36})(?:\/|$)/,
  );
  const isImpersonating = !!match && role === "admin";
  const impersonatedOrgId = isImpersonating ? match![1] : null;
  const orgId = impersonatedOrgId ?? profile?.org_id ?? null;

  const [orgName, setOrgName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!isImpersonating || !impersonatedOrgId) {
      setOrgName(null);
      return;
    }
    supabase
      .from("organizations")
      .select("name")
      .eq("id", impersonatedOrgId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOrgName(data?.name ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [impersonatedOrgId, isImpersonating]);

  return {
    orgId,
    isImpersonating,
    orgName,
    actingAdminUserId: isImpersonating ? user?.id ?? null : null,
  };
}
