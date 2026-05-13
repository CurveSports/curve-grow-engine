import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileActionBarProps {
  children: ReactNode;
  /** If true, sits at bottom: 0 (use on full-screen flows without the 4-tab nav). Default false (sits above the 64px bottom nav). */
  fullBottom?: boolean;
  className?: string;
}

/**
 * Sticky bottom CTA bar for mobile. Hidden on md+.
 * IMPORTANT: pages using this must add `pb-32` to their content so nothing is covered.
 */
export function MobileActionBar({ children, fullBottom = false, className }: MobileActionBarProps) {
  return (
    <div
      className={cn(
        "md:hidden fixed inset-x-0 z-40 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        fullBottom ? "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "bottom-16 pb-3",
        className
      )}
    >
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export default MobileActionBar;
