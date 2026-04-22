import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DriverInput = { label: string; value: string | number | null | undefined };

export type ExplainContent = {
  metric: string;
  currentValue?: string | number | null;
  drivers: DriverInput[];
  meaning: string;
  whatToDo: string;
  conversationStarter?: string;
};

type Ctx = {
  open: (content: ExplainContent) => void;
};

const ExplainCtx = createContext<Ctx | null>(null);

export function ExplainProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<ExplainContent | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((c: ExplainContent) => {
    setContent(c);
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <ExplainCtx.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {content && (
            <>
              <SheetHeader className="text-left mb-6">
                <p className="curve-eyebrow mb-1">Explain · Admin only</p>
                <SheetTitle className="font-display text-2xl">{content.metric}</SheetTitle>
                {content.currentValue !== undefined && content.currentValue !== null && (
                  <SheetDescription>
                    Current value:{" "}
                    <span className="font-semibold text-foreground">{content.currentValue}</span>
                  </SheetDescription>
                )}
              </SheetHeader>

              <div className="space-y-6">
                <Section eyebrow="What drives this">
                  {content.drivers.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No specific inputs available.</p>
                  ) : (
                    <dl className="space-y-2">
                      {content.drivers.map((d, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 text-sm">
                          <dt className="text-muted-foreground">{d.label}</dt>
                          <dd className="text-foreground font-medium text-right max-w-[55%]">
                            {d.value === null || d.value === undefined || d.value === ""
                              ? <span className="italic text-muted-foreground">Not provided</span>
                              : String(d.value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </Section>

                <Section eyebrow="What it means">
                  <p className="text-sm text-foreground leading-relaxed">{content.meaning}</p>
                </Section>

                <Section eyebrow="What to do">
                  <p className="text-sm text-foreground leading-relaxed">{content.whatToDo}</p>
                </Section>

                {content.conversationStarter && (
                  <Section eyebrow="Conversation starter">
                    <blockquote className="text-sm text-foreground leading-relaxed border-l-4 border-accent pl-3 italic">
                      "{content.conversationStarter}"
                    </blockquote>
                  </Section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </ExplainCtx.Provider>
  );
}

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="curve-card">
      <p className="curve-eyebrow mb-3">{eyebrow}</p>
      {children}
    </div>
  );
}

export function useExplain() {
  const ctx = useContext(ExplainCtx);
  if (!ctx) throw new Error("useExplain must be used inside ExplainProvider");
  return ctx;
}

/** Small "?" button. Place next to any score/rating label. Admin-only by convention. */
export function ExplainButton({
  content,
  className,
  ariaLabel,
}: {
  content: ExplainContent;
  className?: string;
  ariaLabel?: string;
}) {
  const { open } = useExplain();
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? `Explain ${content.metric}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        open(content);
      }}
      className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0",
        className,
      )}
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </button>
  );
}
