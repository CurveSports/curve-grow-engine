import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn } from "@/lib/utils";

interface ImpactStatProps {
  value: number;
  label?: string;
  size?: "lg" | "xl";
  /** When true, treats positive as good (green) and negative as bad (red). Default true. */
  positiveIsGood?: boolean;
  prefix?: string;
  className?: string;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.abs(n));

export function ImpactStat({
  value,
  label,
  size = "xl",
  positiveIsGood = true,
  prefix = "$",
  className,
}: ImpactStatProps) {
  const isPositive = value > 0.5;
  const isNegative = value < -0.5;
  const tone = isPositive
    ? positiveIsGood ? "text-accent" : "text-destructive"
    : isNegative
    ? positiveIsGood ? "text-destructive" : "text-accent"
    : "text-warning";

  const Arrow = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
  const sign = isPositive ? "+" : isNegative ? "-" : "";

  const sizeCls = size === "xl" ? "text-5xl" : "text-3xl";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && <p className="curve-eyebrow">{label}</p>}
      <div className={cn("flex items-baseline gap-2 font-display font-semibold", sizeCls, tone)}>
        <span>{sign}</span>
        <AnimatedNumber value={Math.abs(value)} format={(n) => `${prefix}${fmtMoney(n).replace("$", "")}`} />
        <Arrow className={cn(size === "xl" ? "h-7 w-7" : "h-5 w-5")} strokeWidth={2.5} />
      </div>
    </div>
  );
}
