import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <label className="block text-base font-medium text-foreground leading-snug">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({
  label, value, onChange, type = "text", hint, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; hint?: string; required?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="h-12 text-base bg-background border-border focus-visible:ring-accent"
      />
    </Field>
  );
}

export function NumberField({
  label, value, onChange, hint, min, currency,
}: {
  label: string; value: number | ""; onChange: (v: number | "") => void;
  hint?: string; min?: number; currency?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        {currency && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground pointer-events-none">$</span>
        )}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value === "" ? "" : String(value)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            if (raw === "") onChange("");
            else {
              const n = Number(raw);
              if (!Number.isNaN(n) && (min === undefined || n >= min)) onChange(n);
            }
          }}
          className={cn(
            "w-full h-12 rounded-md border border-border bg-background text-base text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition",
            currency ? "pl-9 pr-4" : "px-4",
          )}
        />
      </div>
    </Field>
  );
}

export function PillSelectField({
  label, value, onChange, options, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-medium border transition-all",
                selected
                  ? "bg-accent text-accent-foreground border-accent shadow-sm"
                  : "bg-background text-foreground border-border hover:border-foreground/30",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function DropdownField({
  label, value, onChange, options, hint, placeholder = "Select an option",
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; hint?: string; placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-12 w-full text-base bg-background border-border focus:ring-accent">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o} className="text-base py-2.5">{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** Auto-picks pills for ≤4 options, dropdown for 5+ */
export function SelectField({
  label, value, onChange, options, hint, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; hint?: string; placeholder?: string;
}) {
  if (options.length <= 4) {
    return <PillSelectField label={label} value={value} onChange={onChange} options={options} hint={hint} />;
  }
  return <DropdownField label={label} value={value} onChange={onChange} options={options} hint={hint} placeholder={placeholder} />;
}

export function MultiCheckField({
  label, values, onChange, options, hint,
}: {
  label: string; values: string[]; onChange: (v: string[]) => void;
  options: readonly string[]; hint?: string;
}) {
  const toggle = (opt: string) => {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = values.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-medium border transition-all",
                selected
                  ? "bg-accent text-accent-foreground border-accent shadow-sm"
                  : "bg-background text-foreground border-border hover:border-foreground/30",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </Field>
  );
}
