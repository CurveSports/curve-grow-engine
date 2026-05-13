import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { z } from "zod";
import { CheckCircle2, FileDown, Upload } from "lucide-react";

type Survey = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  instructions: string | null;
  w9_template_url: string | null;
  is_active: boolean;
};

const baseSchema = z.object({
  first_name: z.string().trim().min(1, "Required").max(80),
  last_name: z.string().trim().min(1, "Required").max(80),
  organization: z.string().trim().min(1, "Required").max(160),
  phone: z.string().trim().min(7, "Enter a valid phone").max(40),
  personal_email: z.string().trim().email("Enter a valid email").max(160),
  payment_method: z.enum(["zelle", "echeck"]),
  zelle_id: z.string().trim().max(160).optional().or(z.literal("")),
  zelle_id_type: z.enum(["phone", "email"]).optional(),
  check_payable_to: z.string().trim().max(160).optional().or(z.literal("")),
  check_delivery_email: z.string().trim().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export default function EventIntake() {
  const { slug = "payment-intake" } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [w9File, setW9File] = useState<File | null>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", organization: "", phone: "", personal_email: "",
    payment_method: "zelle" as "zelle" | "echeck",
    zelle_id: "", zelle_id_type: "phone" as "phone" | "email",
    check_payable_to: "", check_delivery_email: "",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("event_surveys")
        .select("id, slug, title, description, instructions, w9_template_url, is_active")
        .eq("slug", slug)
        .maybeSingle();
      setSurvey(data as Survey | null);
      setLoading(false);
    })();
  }, [slug]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!survey) return;
    const parsed = baseSchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first ?? "Please complete all required fields");
      return;
    }
    if (form.payment_method === "zelle" && !form.zelle_id.trim()) {
      toast.error("Enter your Zelle ID");
      return;
    }
    if (form.payment_method === "echeck" && (!form.check_payable_to.trim() || !form.check_delivery_email.trim())) {
      toast.error("Enter check payable name and delivery email");
      return;
    }
    if (!w9File) {
      toast.error("Please upload your completed W-9");
      return;
    }
    setSubmitting(true);
    try {
      const ext = w9File.name.split(".").pop() || "pdf";
      const path = `${survey.slug}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("event-w9s")
        .upload(path, w9File, { contentType: w9File.type || "application/octet-stream", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("event_survey_responses").insert({
        survey_id: survey.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        organization: form.organization.trim(),
        phone: form.phone.trim(),
        personal_email: form.personal_email.trim(),
        payment_method: form.payment_method,
        zelle_id: form.payment_method === "zelle" ? form.zelle_id.trim() : null,
        zelle_id_type: form.payment_method === "zelle" ? form.zelle_id_type : null,
        check_payable_to: form.payment_method === "echeck" ? form.check_payable_to.trim() : null,
        check_delivery_email: form.payment_method === "echeck" ? form.check_delivery_email.trim() : null,
        w9_file_path: path,
        w9_file_name: w9File.name,
        notes: form.notes.trim() || null,
      });
      if (insErr) throw insErr;
      setDone(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  if (!survey) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">This form is not available.</div>;

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="max-w-md text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-accent mx-auto" />
          <h1 className="font-display text-2xl font-semibold">Submission received</h1>
          <p className="text-sm text-muted-foreground">
            Thanks, {form.first_name}. Your information and W-9 have been recorded. The Curve team will be in touch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{survey.title}</h1>
          {survey.description && <p className="mt-2 text-muted-foreground">{survey.description}</p>}
          {survey.instructions && (
            <div className="mt-4 rounded-md border border-border bg-secondary/40 p-4 text-sm leading-relaxed whitespace-pre-line">
              {survey.instructions}
            </div>
          )}
        </div>

        <div className="curve-card p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First name *">
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className="h-11" />
            </Field>
            <Field label="Last name *">
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className="h-11" />
            </Field>
          </div>

          <Field label="Organization / School *">
            <Input value={form.organization} onChange={(e) => set("organization", e.target.value)} className="h-11" />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Phone number *">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-11" inputMode="tel" />
            </Field>
            <Field label="Personal email *" hint="Important — school/work emails often block E-checks.">
              <Input value={form.personal_email} onChange={(e) => set("personal_email", e.target.value)} className="h-11" type="email" />
            </Field>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Payment method *</Label>
            <RadioGroup
              value={form.payment_method}
              onValueChange={(v) => set("payment_method", v as "zelle" | "echeck")}
              className="grid grid-cols-2 gap-3"
            >
              <PayOption value="zelle" current={form.payment_method} label="Zelle" />
              <PayOption value="echeck" current={form.payment_method} label="E-check" />
            </RadioGroup>
          </div>

          {form.payment_method === "zelle" && (
            <div className="rounded-md border border-border p-4 space-y-4 bg-secondary/30">
              <Field label="Is your Zelle ID a phone or email?">
                <RadioGroup
                  value={form.zelle_id_type}
                  onValueChange={(v) => set("zelle_id_type", v as "phone" | "email")}
                  className="flex gap-4"
                >
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="phone" /> Phone
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="email" /> Email
                  </label>
                </RadioGroup>
              </Field>
              <Field label="Zelle ID *">
                <Input value={form.zelle_id} onChange={(e) => set("zelle_id", e.target.value)} className="h-11" placeholder={form.zelle_id_type === "phone" ? "(555) 123-4567" : "name@example.com"} />
              </Field>
            </div>
          )}

          {form.payment_method === "echeck" && (
            <div className="rounded-md border border-border p-4 space-y-4 bg-secondary/30">
              <Field label="Make check out to *">
                <Input value={form.check_payable_to} onChange={(e) => set("check_payable_to", e.target.value)} className="h-11" />
              </Field>
              <Field label="Personal email for check delivery *">
                <Input value={form.check_delivery_email} onChange={(e) => set("check_delivery_email", e.target.value)} className="h-11" type="email" />
              </Field>
            </div>
          )}

          <div className="rounded-md border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-sm font-medium">W-9 (required) *</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload your completed 2026 W-9. Without it, payment will not be issued.
                </p>
              </div>
              {survey.w9_template_url && (
                <a href={survey.w9_template_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline whitespace-nowrap">
                  <FileDown className="h-3.5 w-3.5" /> Download blank W-9
                </a>
              )}
            </div>
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-dashed border-border hover:border-accent cursor-pointer text-sm">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{w9File ? w9File.name : "Choose file (PDF, JPG, PNG)"}</span>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setW9File(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <Field label="Notes (optional)">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </Field>

          <Button onClick={submit} disabled={submitting} className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90">
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PayOption({ value, current, label }: { value: string; current: string; label: string }) {
  const selected = value === current;
  return (
    <label className={`flex items-center gap-3 px-4 py-3 rounded-md border cursor-pointer transition ${selected ? "border-accent bg-accent/10" : "border-border hover:border-foreground/30"}`}>
      <RadioGroupItem value={value} />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}
