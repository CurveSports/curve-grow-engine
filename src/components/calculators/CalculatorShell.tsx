import { ReactNode, useState } from "react";
import { ChevronDown, RotateCcw, Bookmark, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CalculatorType } from "@/lib/calculators";

interface CalculatorShellProps {
  type: CalculatorType;
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  isAdminContext: boolean;
  isImpersonating: boolean;
  onSaveBest: () => void;
  onSaveWorst: () => void;
  onReset: () => void;
  onShare?: () => void;
  children: ReactNode;
}

export function CalculatorShell({
  title,
  subtitle,
  defaultOpen = false,
  isAdminContext,
  isImpersonating,
  onSaveBest,
  onSaveWorst,
  onReset,
  onShare,
  children,
}: CalculatorShellProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Hide "Share with Curve Team" on admin self-service & admin impersonation views.
  const showShare = !isAdminContext && !isImpersonating && onShare;

  return (
    <section
      className={cn(
        "rounded-xl border bg-card transition-all overflow-hidden",
        open ? "border-accent/40 shadow-[0_4px_20px_rgba(34,197,94,0.08)]" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t border-border">
          <div className="p-5 md:p-6">{children}</div>
          <div className="border-t border-border bg-muted/30 px-5 py-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={onSaveBest}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Bookmark className="h-3.5 w-3.5 mr-1.5" /> Save as Best Case
            </Button>
            <Button size="sm" variant="outline" onClick={onSaveWorst}>
              <Bookmark className="h-3.5 w-3.5 mr-1.5" /> Save as Worst Case
            </Button>
            <button
              type="button"
              onClick={onReset}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 ml-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to Current
            </button>
            <div className="flex-1" />
            {showShare && (
              <Button size="sm" variant="outline" onClick={onShare}>
                <Send className="h-3.5 w-3.5 mr-1.5" /> Share with Curve Team
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
