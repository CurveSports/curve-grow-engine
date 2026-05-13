import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";

/**
 * Returns a function that prefixes /marketing/* paths with
 * /admin/orgs/:orgId when an admin is impersonating an org.
 * No-op for org users.
 */
export function useMarketingLink() {
  const { isImpersonating, orgId } = useEffectiveOrg();
  return (path: string): string => {
    if (!isImpersonating || !orgId) return path;
    if (!path.startsWith("/marketing")) return path;
    return `/admin/orgs/${orgId}${path}`;
  };
}
