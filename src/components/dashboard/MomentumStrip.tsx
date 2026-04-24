import { ReactNode } from "react";
import { Flame, Sparkles, Target, TrendingUp } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { ProgressRing } from "@/components/motion/ProgressRing";
import { StaggerList, StaggerItem } from "@/components/motion/PageTransition";

interface MomentumStripProps {
  /** Tasks completed in the last 7 days. */
  weeklyCompleted: number;
  /** Tasks completed all-time (since plan activation). */
  totalCompleted: number;
  /** Total tasks (open + completed) in plan. */
  totalTasks: number;
  /** Optional consecutive-week streak count. */
  streakWeeks?: number;
}

/**
 * A 4-up momentum strip celebrating progress: completion ring,
 * this-week count, total wins, streak. Coaching tone.
 */
export function MomentumStrip({
  weeklyCompleted,
  totalCompleted,
  totalTasks,
  streakWeeks = 0,
}: MomentumStripProps) {
  const pct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const encouragement =
    pct >= 75 ? "You're crushing it." :
    pct >= 50 ? "Over halfway there." :
    pct >= 25 ? "Real momentum building." :
    weeklyCompleted > 0 ? "Nice — keep going." :
    "Ready when you are.";

  return (
    <StaggerList className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StaggerItem>
        <MomentumCard
          icon={<ProgressRing value={pct} size={64} stroke={6}>
            <span className="font-display text-sm font-bold tabular-nums">
              <CountUp to={pct} format={(n) => `${Math.round(n)}%`} duration={900} />
            </span>
          </ProgressRing>}
          label="Plan complete"
          value={
            <span className="text-base font-semibold text-foreground">
              {totalCompleted} of {totalTasks}
            </span>
          }
          subtitle={encouragement}
          padded
        />
      </StaggerItem>
      <StaggerItem>
        <MomentumCard
          icon={<IconBadge tone="lime"><Sparkles className="h-4 w-4" /></IconBadge>}
          label="This week"
          value={
            <span className="font-display text-3xl font-bold tabular-nums text-foreground">
              <CountUp to={weeklyCompleted} duration={700} />
            </span>
          }
          subtitle={weeklyCompleted === 0 ? "Pick one to start" : weeklyCompleted === 1 ? "task completed" : "tasks completed"}
        />
      </StaggerItem>
      <MomentumItem
        icon={<IconBadge tone="accent"><TrendingUp className="h-4 w-4" /></IconBadge>}
        label="Total wins"
        value={totalCompleted}
        subtitle="since plan activated"
      />
      <MomentumItem
        icon={<IconBadge tone="warning"><Flame className="h-4 w-4" /></IconBadge>}
        label="Active streak"
        value={streakWeeks}
        subtitle={streakWeeks === 0 ? "Start one this week" : streakWeeks === 1 ? "week in a row" : "weeks in a row"}
      />
    </StaggerList>
  );
}

function MomentumItem({ icon, label, value, subtitle }: { icon: ReactNode; label: string; value: number; subtitle: string }) {
  return (
    <StaggerItem>
      <MomentumCard
        icon={icon}
        label={label}
        value={
          <span className="font-display text-3xl font-bold tabular-nums text-foreground">
            <CountUp to={value} duration={700} />
          </span>
        }
        subtitle={subtitle}
      />
    </StaggerItem>
  );
}

function MomentumCard({
  icon, label, value, subtitle, padded,
}: {
  icon: ReactNode; label: string; value: ReactNode; subtitle: string; padded?: boolean;
}) {
  return (
    <div className="curve-card h-full">
      <div className={padded ? "flex items-center gap-3" : "flex items-center gap-2 mb-3"}>
        {icon}
        {!padded && <p className="curve-eyebrow">{label}</p>}
        {padded && (
          <div className="min-w-0">
            <p className="curve-eyebrow">{label}</p>
            <div className="mt-1">{value}</div>
          </div>
        )}
      </div>
      {!padded && <div>{value}</div>}
      <p className="text-xs text-muted-foreground mt-2 leading-snug">{subtitle}</p>
    </div>
  );
}

function IconBadge({ children, tone }: { children: ReactNode; tone: "accent" | "lime" | "warning" }) {
  const cls =
    tone === "lime" ? "bg-[hsl(var(--lime))]/15 text-[hsl(var(--accent-strong))] border-[hsl(var(--lime))]/30" :
    tone === "warning" ? "bg-warning-soft text-warning border-warning/30" :
    "bg-accent-soft text-accent border-accent/30";
  return <div className={`h-9 w-9 rounded-md border flex items-center justify-center flex-shrink-0 ${cls}`}>{children}</div>;
}

// Avoid unused import lint
void Target;
