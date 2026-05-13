import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { z } from "zod";
import { CheckCircle2, FileDown, Upload, PenLine } from "lucide-react";
import { jsPDF } from "jspdf";

type Survey = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  instructions: string | null;
  w9_template_url: string | null;
  is_active: boolean;
};

type W9Class = "individual" | "c_corp" | "s_corp" | "partnership" | "trust" | "llc" | "other";

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

  // W-9 mode: fill online or upload existing
  const [w9Mode, setW9Mode] = useState<"online" | "upload">("online");
  const [w9File, setW9File] = useState<File | null>(null);
  const [w9, setW9] = useState({
    legal_name: "",
    business_name: "",
    tax_class: "individual" as W9Class,
    llc_class: "",
    other_class: "",
    address: "",
    city_state_zip: "",
    tin_type: "ssn" as "ssn" | "ein",
    tin: "",
    signature: "",
    sign_date: new Date().toISOString().slice(0, 10),
    certify: false,
  });

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

  // Auto-fill W-9 legal name from first/last name if empty
  useEffect(() => {
    if (!w9.legal_name && (form.first_name || form.last_name)) {
      setW9((p) => ({ ...p, legal_name: `${form.first_name} ${form.last_name}`.trim() }));
    }
  }, [form.first_name, form.last_name]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const generateW9Pdf = (): Blob => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 50;
    doc.setFont("helvetica", "bold").setFontSize(16);
    doc.text("Form W-9 — Request for Taxpayer ID & Certification", pageW / 2, y, { align: "center" });
    y += 24;
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.text("Submitted via Curve Sports event intake form", pageW / 2, y, { align: "center" });
    y += 30;

    const row = (label: string, value: string) => {
      doc.setFont("helvetica", "bold").setFontSize(10);
      doc.text(label, 50, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(value || "—", pageW - 250);
      doc.text(lines, 220, y);
      y += Math.max(18, lines.length * 14);
    };

    row("1. Name (as shown on tax return)", w9.legal_name);
    row("2. Business / disregarded entity name", w9.business_name);
    const classText = w9.tax_class === "llc"
      ? `LLC (tax classification: ${w9.llc_class || "—"})`
      : w9.tax_class === "other"
      ? `Other: ${w9.other_class || "—"}`
      : labelForClass(w9.tax_class);
    row("3. Federal tax classification", classText);
    row("5. Address", w9.address);
    row("6. City, state, ZIP", w9.city_state_zip);
    row(`Part I — TIN (${w9.tin_type.toUpperCase()})`, w9.tin);

    y += 10;
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text("Part II — Certification", 50, y);
    y += 16;
    doc.setFont("helvetica", "normal").setFontSize(9);
    const cert = doc.splitTextToSize(
      "Under penalties of perjury, I certify that: (1) The number shown on this form is my correct taxpayer identification number; (2) I am not subject to backup withholding; (3) I am a U.S. citizen or other U.S. person; and (4) The FATCA code(s) entered on this form (if any) indicating exemption from FATCA reporting is correct.",
      pageW - 100
    );
    doc.text(cert, 50, y);
    y += cert.length * 12 + 16;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Signature of U.S. person:", 50, y);
    doc.setFont("times", "italic").setFontSize(14);
    doc.text(w9.signature, 220, y);
    doc.line(220, y + 4, 450, y + 4);
    y += 24;
    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Date:", 50, y);
    doc.setFont("helvetica", "normal");
    doc.text(w9.sign_date, 220, y);

    y += 36;
    doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(120);
    doc.text(
      `Electronically completed and signed on ${new Date().toLocaleString()} via curvesports.com.`,
      50,
      y
    );

    return doc.output("blob");
  };

  const validateW9Online = (): string | null => {
    if (!w9.legal_name.trim()) return "Enter the name on your tax return";
    if (!w9.address.trim()) return "Enter your address";
    if (!w9.city_state_zip.trim()) return "Enter city, state, ZIP";
    const digits = w9.tin.replace(/\D/g, "");
    if (w9.tin_type === "ssn" && digits.length !== 9) return "Enter a 9-digit SSN";
    if (w9.tin_type === "ein" && digits.length !== 9) return "Enter a 9-digit EIN";
    if (!w9.signature.trim()) return "Type your signature";
    if (!w9.certify) return "You must certify the W-9 information";
    return null;
  };

  const submit = async () => {
    if (!survey) return;
    const parsed = baseSchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first ?? "Please complete all required fields");
      return;
    }
    if (form.payment_method === "zelle" && !form.zelle_id.trim()) {
      toast.error("Enter your Zelle ID"); return;
    }
    if (form.payment_method === "echeck" && (!form.check_payable_to.trim() || !form.check_delivery_email.trim())) {
      toast.error("Enter check payable name and delivery email"); return;
    }
    if (w9Mode === "upload" && !w9File) {
      toast.error("Please upload your completed W-9"); return;
    }
    if (w9Mode === "online") {
      const err = validateW9Online();
      if (err) { toast.error(err); return; }
    }

    // Show feedback IMMEDIATELY before heavy work
    setSubmitting(true);
    const toastId = toast.loading("Submitting your information…");

    // Yield to the browser so the spinner/toast can paint before blocking PDF generation
    await new Promise((r) => setTimeout(r, 50));

    let uploadFile: Blob;
    let uploadName: string;
    let uploadType: string;
    let extra: Record<string, unknown> | null = null;

    if (w9Mode === "upload" && w9File) {
      uploadFile = w9File;
      uploadName = w9File.name;
      uploadType = w9File.type || "application/pdf";
    } else {
      uploadFile = generateW9Pdf();
      uploadName = `W9_${w9.legal_name.replace(/\s+/g, "_")}.pdf`;
      uploadType = "application/pdf";
      extra = {
        w9_completed_online: true,
        w9_data: {
          legal_name: w9.legal_name,
          business_name: w9.business_name,
          tax_class: w9.tax_class,
          llc_class: w9.llc_class,
          other_class: w9.other_class,
          address: w9.address,
          city_state_zip: w9.city_state_zip,
          tin_type: w9.tin_type,
          tin_last4: w9.tin.replace(/\D/g, "").slice(-4),
          signature: w9.signature,
          sign_date: w9.sign_date,
          signed_at: new Date().toISOString(),
        },
      };
    }

    setSubmitting(true);
    try {
      const ext = uploadName.split(".").pop() || "pdf";
      const path = `${survey.slug}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("event-w9s")
        .upload(path, uploadFile, { contentType: uploadType, upsert: false });
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
        w9_file_name: uploadName,
        notes: form.notes.trim() || null,
        extra: extra as any,
      });
      if (insErr) throw insErr;
      toast.success("Submission received", { id: toastId });
      setDone(true);
    } catch (err: any) {
      console.error("Event intake submit failed:", err);
      toast.error(err?.message ?? "Submission failed. Please try again.", { id: toastId });
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

          {/* W-9 section */}
          <div className="rounded-md border border-border p-4 space-y-4">
            <div>
              <Label className="text-sm font-medium">W-9 (required) *</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Without a 2026 W-9 on file, payment will not be issued.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setW9Mode("online")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition ${w9Mode === "online" ? "border-accent bg-accent/10 text-foreground" : "border-border hover:border-foreground/30 text-muted-foreground"}`}
              >
                <PenLine className="h-4 w-4" /> Fill out online
              </button>
              <button
                type="button"
                onClick={() => setW9Mode("upload")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition ${w9Mode === "upload" ? "border-accent bg-accent/10 text-foreground" : "border-border hover:border-foreground/30 text-muted-foreground"}`}
              >
                <Upload className="h-4 w-4" /> Upload completed W-9
              </button>
            </div>

            {w9Mode === "online" ? (
              <div className="space-y-4 pt-2">
                <Field label="Name as shown on your tax return *">
                  <Input value={w9.legal_name} onChange={(e) => setW9({ ...w9, legal_name: e.target.value })} className="h-11" />
                </Field>
                <Field label="Business name (if different)">
                  <Input value={w9.business_name} onChange={(e) => setW9({ ...w9, business_name: e.target.value })} className="h-11" />
                </Field>
                <Field label="Federal tax classification *">
                  <select
                    value={w9.tax_class}
                    onChange={(e) => setW9({ ...w9, tax_class: e.target.value as W9Class })}
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="individual">Individual / sole proprietor</option>
                    <option value="c_corp">C Corporation</option>
                    <option value="s_corp">S Corporation</option>
                    <option value="partnership">Partnership</option>
                    <option value="trust">Trust / estate</option>
                    <option value="llc">Limited Liability Company (LLC)</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                {w9.tax_class === "llc" && (
                  <Field label="LLC tax classification (C, S, or P) *">
                    <Input value={w9.llc_class} onChange={(e) => setW9({ ...w9, llc_class: e.target.value })} className="h-11" placeholder="C / S / P" />
                  </Field>
                )}
                {w9.tax_class === "other" && (
                  <Field label="Specify other classification *">
                    <Input value={w9.other_class} onChange={(e) => setW9({ ...w9, other_class: e.target.value })} className="h-11" />
                  </Field>
                )}
                <Field label="Address (number, street, apt) *">
                  <Input value={w9.address} onChange={(e) => setW9({ ...w9, address: e.target.value })} className="h-11" />
                </Field>
                <Field label="City, state, ZIP *">
                  <Input value={w9.city_state_zip} onChange={(e) => setW9({ ...w9, city_state_zip: e.target.value })} className="h-11" />
                </Field>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Taxpayer ID type *</Label>
                  <RadioGroup
                    value={w9.tin_type}
                    onValueChange={(v) => setW9({ ...w9, tin_type: v as "ssn" | "ein" })}
                    className="flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="ssn" /> SSN
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <RadioGroupItem value="ein" /> EIN
                    </label>
                  </RadioGroup>
                </div>
                <Field label={`${w9.tin_type === "ssn" ? "Social Security Number" : "Employer ID Number"} *`} hint="9 digits. Stored securely; only the last 4 are shown to admins.">
                  <Input
                    value={w9.tin}
                    onChange={(e) => setW9({ ...w9, tin: e.target.value })}
                    className="h-11"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={w9.tin_type === "ssn" ? "XXX-XX-XXXX" : "XX-XXXXXXX"}
                  />
                </Field>

                <div className="rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground leading-relaxed">
                  Under penalties of perjury, I certify that: (1) the TIN shown is correct; (2) I am not subject to backup withholding; (3) I am a U.S. person; and (4) any FATCA code entered is correct.
                </div>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox checked={w9.certify} onCheckedChange={(v) => setW9({ ...w9, certify: !!v })} className="mt-0.5" />
                  <span>I certify the above is true and accurate. *</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Signature (type your full name) *">
                    <Input
                      value={w9.signature}
                      onChange={(e) => setW9({ ...w9, signature: e.target.value })}
                      className="h-11 font-serif italic text-lg"
                      placeholder="Type to sign"
                    />
                  </Field>
                  <Field label="Date *">
                    <Input
                      type="date"
                      value={w9.sign_date}
                      onChange={(e) => setW9({ ...w9, sign_date: e.target.value })}
                      className="h-11"
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {survey.w9_template_url && (
                  <a href={survey.w9_template_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
                    <FileDown className="h-3.5 w-3.5" /> Download blank W-9
                  </a>
                )}
                <label className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-dashed border-border hover:border-accent cursor-pointer text-sm">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{w9File ? w9File.name : "Choose file (PDF, JPG, PNG)"}</span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setW9File(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            )}
          </div>

          <Field label="Notes (optional)">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
          </Field>

          <Button onClick={submit} disabled={submitting} className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90">
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Submitting your information…
              </span>
            ) : (
              "Submit"
            )}
          </Button>
          {submitting && (
            <p className="text-xs text-center text-muted-foreground -mt-2">
              Generating your W-9 and uploading — this can take a few seconds. Please don't close this tab.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function labelForClass(c: W9Class): string {
  switch (c) {
    case "individual": return "Individual / sole proprietor";
    case "c_corp": return "C Corporation";
    case "s_corp": return "S Corporation";
    case "partnership": return "Partnership";
    case "trust": return "Trust / estate";
    case "llc": return "LLC";
    case "other": return "Other";
  }
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
