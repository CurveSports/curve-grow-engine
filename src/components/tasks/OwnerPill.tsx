import { OWNER_LABEL, OWNER_STYLE, type TaskOwnerType } from "@/lib/tasks";
import { cn } from "@/lib/utils";

interface Props {
  owner: TaskOwnerType;
  className?: string;
  size?: "xs" | "sm";
}

export default function OwnerPill({ owner, className, size = "sm" }: Props) {
  return (
    <span
      title={OWNER_LABEL[owner]}
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5",
        OWNER_STYLE[owner],
        className,
      )}
    >
      {OWNER_LABEL[owner]}
    </span>
  );
}
