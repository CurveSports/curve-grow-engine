import { Link } from "react-router-dom";
import { Eye, X } from "lucide-react";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";

export default function ImpersonationBanner() {
  const { isImpersonating, orgId, orgName } = useEffectiveOrg();
  if (!isImpersonating || !orgId) return null;
  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 border-b border-amber-700">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 shrink-0" />
          <span className="truncate">
            Acting on behalf of{" "}
            <span className="font-bold">{orgName ?? "organization"}</span>{" "}
            — every change is logged.
          </span>
        </div>
        <Link
          to={`/admin/org/${orgId}`}
          className="flex items-center gap-1 px-2 py-1 rounded bg-amber-950/10 hover:bg-amber-950/20 transition shrink-0"
        >
          <X className="h-3.5 w-3.5" /> Exit
        </Link>
      </div>
    </div>
  );
}
