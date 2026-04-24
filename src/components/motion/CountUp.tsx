import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CountUpProps {
  to: number;
  /** Start value. Defaults to 0. */
  from?: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
  /** Run only once on mount, even if `to` changes. */
  once?: boolean;
}

/**
 * Like AnimatedNumber but always starts from `from` (default 0) on mount.
 * Use for hero stats where you want a "count-up" entrance feel.
 */
export function CountUp({
  to,
  from = 0,
  format,
  duration = 800,
  className,
  once = true,
}: CountUpProps) {
  const [display, setDisplay] = useState(from);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (once && ranRef.current) {
      setDisplay(to);
      return;
    }
    ranRef.current = true;
    startRef.current = null;
    const start = from;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (to - start) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration]);

  return (
    <span className={cn("tabular-nums", className)}>
      {format ? format(display) : Math.round(display).toLocaleString()}
    </span>
  );
}
