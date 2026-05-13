import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobilePageHeaderProps {
  title: string;
  /** Optional explicit destination. If omitted, uses navigate(-1). */
  backTo?: string;
  /** Optional right-side action (icon button, etc.) */
  action?: ReactNode;
  /** Hide the back button entirely (e.g. top-level tabs) */
  hideBack?: boolean;
  className?: string;
}

/**
 * Apple-style mobile sub-header: back chevron, centered title, optional right action.
 * Hidden on md+ — desktop uses its own page header.
 */
export function MobilePageHeader({
  title,
  backTo,
  action,
  hideBack = false,
  className,
}: MobilePageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <div
      className={cn(
        "md:hidden sticky top-14 z-20 -mx-4 mb-3 flex h-12 items-center justify-between gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {!hideBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-foreground/80 active:bg-muted"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
      </div>
      {action && <div className="flex shrink-0 items-center">{action}</div>}
    </div>
  );
}

export default MobilePageHeader;
