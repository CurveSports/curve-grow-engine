import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0-100 */
  value: number;
  size?: number;
  stroke?: number;
  /** CSS color value. Defaults to hsl(var(--accent)). */
  color?: string;
  trackColor?: string;
  className?: string;
  children?: React.ReactNode;
  /** Animate from 0 -> value on mount. */
  animate?: boolean;
  duration?: number;
}

/**
 * Animated SVG progress ring. Subtle ease-out tween, no spinning.
 * Place children (like a number) inside the centered slot.
 */
export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  color = "hsl(var(--accent))",
  trackColor = "hsl(var(--secondary))",
  className,
  children,
  animate = true,
  duration = 700,
}: ProgressRingProps) {
  const target = Math.max(0, Math.min(100, value));
  const [display, setDisplay] = useState(animate ? 0 : target);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setDisplay(target);
      return;
    }
    fromRef.current = display;
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, animate, duration]);

  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (display / 100) * circ;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
