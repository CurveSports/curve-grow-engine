import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
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
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </Field>
  );
}

export function NumberField({
  label, value, onChange, hint, min,
}: {
  label: string; value: number | ""; onChange: (v: number | "") => void; hint?: string; min?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    </Field>
  );
}

export function SelectField({
  label, value, onChange, options, hint, placeholder = "Select…",
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; hint?: string; placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm cursor-pointer py-1">
            <Checkbox checked={values.includes(o)} onCheckedChange={() => toggle(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </Field>
  );
}
