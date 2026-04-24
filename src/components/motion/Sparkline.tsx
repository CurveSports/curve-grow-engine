import { cn } from "@/lib/utils";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** CSS color */
  color?: string;
  fill?: boolean;
  className?: string;
}

/**
 * Tiny inline sparkline. Animates the stroke draw on mount via CSS.
 * Designed to sit inside a stat card. Quiet, not playful.
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  color = "hsl(var(--accent))",
  fill = true,
  className,
}: SparklineProps) {
  if (!values || values.length < 2) {
    return <div className={cn("h-7", className)} style={{ width }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const lastX = points[points.length - 1][0];
  const lastY = points[points.length - 1][1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      {fill && (
        <path d={area} fill={color} fillOpacity="0.08" />
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 400,
          strokeDashoffset: 400,
          animation: "spark-draw 700ms ease-out forwards",
        }}
      />
      <circle cx={lastX} cy={lastY} r="2.25" fill={color} />
      <style>{`@keyframes spark-draw { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}
