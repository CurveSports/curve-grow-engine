import { useEffect, useRef, useState } from "react";
import { Lock, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  defaultValue?: string;
  editing: boolean;
  multiline?: boolean;
  onSave: (next: string) => void | Promise<void>;
  className?: string;
  placeholder?: string;
};

/**
 * Click-to-edit text. Saves onBlur or Enter (single line) / Cmd+Enter (multi).
 * Shows a subtle pencil affordance when in edit mode.
 */
export function EditableText({ value, editing, multiline, onSave, className, placeholder }: Props) {
  const [draft, setDraft] = useState(value);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => { setDraft(value); }, [value]);

  useEffect(() => {
    if (active && ref.current) {
      ref.current.focus();
      // place cursor at end
      const el = ref.current as any;
      el.setSelectionRange?.(el.value.length, el.value.length);
    }
  }, [active]);

  if (!editing) {
    return <span className={className}>{value || placeholder || ""}</span>;
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className={cn(
          "inline-flex items-start gap-1.5 text-left rounded-md px-1 -mx-1 hover:bg-accent/10 hover:ring-1 hover:ring-accent/40 transition-colors group",
          className,
        )}
      >
        <span className="flex-1">{value || placeholder || ""}</span>
        <Pencil className="h-3 w-3 mt-1 opacity-0 group-hover:opacity-60 flex-shrink-0" />
      </button>
    );
  }

  const commit = () => {
    setActive(false);
    if (draft !== value) onSave(draft);
  };

  if (multiline) {
    return (
      <textarea
        ref={ref as any}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(value); setActive(false); }
        }}
        rows={Math.max(2, Math.min(10, draft.split("\n").length + 1))}
        className={cn(
          "w-full resize-none rounded-md border border-accent/40 bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40",
          className,
        )}
      />
    );
  }

  return (
    <input
      ref={ref as any}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setDraft(value); setActive(false); }
      }}
      className={cn(
        "w-full rounded-md border border-accent/40 bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40",
        className,
      )}
    />
  );
}

export function LockedHint({ className }: { className?: string }) {
  return (
    <span title="System-generated — not editable" className={cn("inline-flex items-center text-muted-foreground/70", className)}>
      <Lock className="h-3 w-3" />
    </span>
  );
}
