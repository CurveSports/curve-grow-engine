import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * Full-card overlay shown while a logo is being enhanced by AI.
 * The progress bar is a deterministic ease-out fake that asymptotes to ~95%
 * over ~45s, so it never visually "stalls" but also doesn't reach 100% until
 * the parent flips `open` to false.
 */
export function LogoEnhancingOverlay({ open }: { open: boolean }) {
  const [pct, setPct] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) { setPct(100); return; }
    setPct(0);
    setElapsed(0);
    const start = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - start) / 1000; // seconds
      setElapsed(t);
      // Ease-out toward 95% over ~45s
      const target = 95 * (1 - Math.exp(-t / 18));
      setPct(target);
    }, 250);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const remaining = Math.max(0, Math.round(45 - elapsed));
  const stage =
    elapsed < 8 ? "Analyzing your logo…"
    : elapsed < 20 ? "Removing background…"
    : elapsed < 35 ? "Sharpening and upscaling…"
    : "Almost done — finishing touches…";

  return (
    <div className="absolute inset-0 z-10 rounded-lg bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="relative h-12 w-12 mb-4">
        <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
      <p className="font-display text-base font-semibold mb-1">Enhancing your logo</p>
      <p className="text-xs text-muted-foreground mb-4">{stage}</p>

      <div className="w-full max-w-xs">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
          <span>{Math.round(pct)}%</span>
          <span>{remaining > 0 ? `~${remaining}s remaining` : "Finishing up…"}</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 max-w-xs">
        This usually takes 30–60 seconds. You can keep working — we'll update the preview when it's ready.
      </p>
    </div>
  );
}
