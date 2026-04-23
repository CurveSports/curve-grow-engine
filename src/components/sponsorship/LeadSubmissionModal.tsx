// Shared lead submission modal — used by org users on /sponsorships and (via admin variant) by Curve admins.
// Entry methods: photo/scan (AI), contacts (mobile), manual bulk multi-row, CSV/XLSX upload.
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Camera, Contact2, Pencil, FileSpreadsheet, ChevronDown, ChevronUp, X,
  Loader2, Sparkles, Download, Check, ArrowLeft,
} from "lucide-react";
import { WARM_REASON_OPTIONS, BUSINESS_TYPE_OPTIONS, supportsContactPicker } from "@/lib/orgSponsorship";

type Method = "picker" | "scan" | "contacts" | "manual" | "csv";

type Row = {
  key: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  business_type: string;
  city_state: string;
  is_warm: boolean;
  warm_reasons: string[];
  warm_notes: string;
  dsf_notes: string;
  collapsed: boolean;
  ai_extracted?: boolean;
};

const newRow = (init: Partial<Row> = {}): Row => ({
  key: crypto.randomUUID(),
  business_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  business_type: "",
  city_state: "",
  is_warm: false,
  warm_reasons: [],
  warm_notes: "",
  dsf_notes: "",
  collapsed: false,
  ...init,
});

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId: string; // org these leads belong to
  defaultCityState?: string | null;
  /** Admin invokes get a few differences: insert source defaults to 'dsf_outreach' style. */
  variant?: "org" | "admin";
  onSubmitted?: (count: number) => void;
};

export default function LeadSubmissionModal({
  open, onOpenChange, orgId, defaultCityState, variant = "org", onSubmitted,
}: Props) {
  const { user } = useAuth();
  const [method, setMethod] = useState<Method>("picker");
  const [rows, setRows] = useState<Row[]>([newRow({ city_state: defaultCityState ?? "" })]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMethod("picker");
    setRows([newRow({ city_state: defaultCityState ?? "" })]);
  }, [open, defaultCityState]);

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key: string) =>
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.key !== key)));
  const addRow = () =>
    setRows((rs) => (rs.length >= 20 ? rs : [...rs, newRow({ city_state: defaultCityState ?? "" })]));

  const submitAll = async () => {
    if (!user) return toast.error("Not signed in");
    const valid = rows.filter((r) => r.business_name.trim().length > 0);
    if (valid.length === 0) return toast.error("Add at least one lead with a business name");

    setBusy(true);
    const inserts = valid.map((r) => ({
      org_id: orgId,
      business_name: r.business_name.trim(),
      contact_name: r.contact_name.trim() || null,
      contact_email: r.contact_email.trim() || null,
      contact_phone: r.contact_phone.trim() || null,
      business_type: r.business_type.trim() || null,
      city_state: r.city_state.trim() || null,
      source: variant === "admin" ? "dsf_outreach" : (r.is_warm ? "org_warm" : "org_cold"),
      is_warm: r.is_warm,
      warm_flagged_by_org: variant === "org" && r.is_warm,
      warm_flagged_by_dsf: variant === "admin" && r.is_warm,
      warm_reasons: r.warm_reasons,
      warm_notes: r.warm_notes.trim() || r.dsf_notes.trim() || null,
      stage: "new_lead",
      created_by: user.id,
    }));

    const { data, error } = await supabase.from("sponsorship_leads").insert(inserts).select("id");
    setBusy(false);
    if (error) {
      console.error(error);
      return toast.error(error.message);
    }
    toast.success(`${data?.length ?? valid.length} lead${(data?.length ?? valid.length) === 1 ? "" : "s"} submitted`);
    onSubmitted?.(data?.length ?? valid.length);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <div className="p-6 border-b border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add Sponsorship Leads</DialogTitle>
            <DialogDescription>
              {variant === "org"
                ? "Add businesses you'd like the DSF team to reach out to on your behalf."
                : "Add prospects to this organization's pipeline."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {method === "picker" && (
          <MethodPicker onPick={setMethod} />
        )}

        {method !== "picker" && (
          <div className="p-6 space-y-4">
            <button
              onClick={() => setMethod("picker")}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Choose another method
            </button>

            {method === "scan" && (
              <ScanFlow
                onExtracted={(data) => {
                  setRows((rs) => [...rs, newRow({ ...data, ai_extracted: true, city_state: data.city_state || defaultCityState || "" })]);
                  setMethod("manual");
                }}
              />
            )}

            {method === "contacts" && (
              <ContactsFlow
                onPicked={(data) => {
                  setRows((rs) => [...rs, newRow({ ...data, city_state: defaultCityState ?? "" })]);
                  setMethod("manual");
                }}
              />
            )}

            {method === "csv" && (
              <CsvFlow
                defaultCityState={defaultCityState ?? ""}
                onParsed={(parsedRows) => {
                  setRows(parsedRows);
                  setMethod("manual");
                }}
              />
            )}

            {method === "manual" && (
              <ManualBulkForm
                rows={rows}
                onUpdate={updateRow}
                onAdd={addRow}
                onRemove={removeRow}
                onSubmit={submitAll}
                busy={busy}
                onCancel={() => onOpenChange(false)}
                variant={variant}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Method picker ---------- */
function MethodPicker({ onPick }: { onPick: (m: Method) => void }) {
  const canContacts = supportsContactPicker();
  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <MethodCard
        icon={<Camera className="h-5 w-5" />}
        title="Scan or Photo"
        body="Take a photo of a business card, sign, or any business info. We'll extract the details automatically."
        onClick={() => onPick("scan")}
      />
      {canContacts && (
        <MethodCard
          icon={<Contact2 className="h-5 w-5" />}
          title="From Contacts"
          body="Select directly from your phone's contacts."
          onClick={() => onPick("contacts")}
        />
      )}
      <MethodCard
        icon={<Pencil className="h-5 w-5" />}
        title="Enter Manually"
        body="Type in business details directly."
        onClick={() => onPick("manual")}
      />
      <MethodCard
        icon={<FileSpreadsheet className="h-5 w-5" />}
        title="Upload CSV"
        body="Have a list ready? Upload a spreadsheet with multiple leads at once."
        onClick={() => onPick("csv")}
      />
    </div>
  );
}

function MethodCard({ icon, title, body, onClick }: { icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-border bg-card hover:border-accent hover:shadow-md transition-all p-4 group"
    >
      <div className="h-10 w-10 rounded-md bg-accent-soft text-accent flex items-center justify-center mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
        {icon}
      </div>
      <p className="font-display font-semibold text-sm mb-1">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </button>
  );
}

/* ---------- Scan flow ---------- */
function ScanFlow({ onExtracted }: { onExtracted: (data: Partial<Row>) => void }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image is too large (max 8MB)");

    setBusy(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("extract-business-card", {
        body: { image_data_url: dataUrl },
      });
      if (error) throw error;
      const e = (data as any)?.extracted ?? {};
      onExtracted({
        business_name: e.business_name || "",
        contact_name: e.contact_name || "",
        contact_email: e.contact_email || "",
        contact_phone: e.contact_phone || "",
        business_type: e.business_type || "",
        city_state: e.city_state || "",
        warm_notes: e.additional_notes || "",
      });
      toast.success("Details extracted — review and edit below");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Extraction failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
      {busy ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Extracting business details from image…</p>
          <div className="h-1 w-32 rounded-full bg-accent/20 overflow-hidden">
            <div className="h-full w-1/3 bg-accent animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <Camera className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-display font-semibold mb-1">Capture a business</p>
          <p className="text-xs text-muted-foreground mb-4">
            Business cards, store signs, vehicles — anything with business info.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button onClick={() => inputRef.current?.click()} className="bg-health text-health-foreground hover:bg-health/90">
              <Camera className="h-4 w-4 mr-1.5" /> Take Photo / Choose Image
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Contacts flow ---------- */
function ContactsFlow({ onPicked }: { onPicked: (data: Partial<Row>) => void }) {
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    setBusy(true);
    try {
      // @ts-expect-error - non-standard API
      const contacts = await navigator.contacts.select(["name", "email", "tel"], { multiple: false });
      if (!contacts || contacts.length === 0) return;
      const c = contacts[0];
      onPicked({
        contact_name: Array.isArray(c.name) ? c.name[0] ?? "" : c.name ?? "",
        contact_email: Array.isArray(c.email) ? c.email[0] ?? "" : c.email ?? "",
        contact_phone: Array.isArray(c.tel) ? c.tel[0] ?? "" : c.tel ?? "",
      });
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(e);
        toast.error("Couldn't access contacts");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-6 text-center">
      <Contact2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <p className="font-display font-semibold mb-1">Pick from contacts</p>
      <p className="text-xs text-muted-foreground mb-4">Your browser will ask permission to share one contact.</p>
      <Button onClick={pick} disabled={busy} className="bg-health text-health-foreground hover:bg-health/90">
        {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Contact2 className="h-4 w-4 mr-1.5" />}
        Choose Contact
      </Button>
    </div>
  );
}

/* ---------- CSV/XLSX flow ---------- */
function CsvFlow({ defaultCityState, onParsed }: { defaultCityState: string; onParsed: (rows: Row[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      "business_name", "contact_name", "contact_email", "contact_phone",
      "business_type", "city_state", "is_warm", "warm_reason", "dsf_notes",
    ];
    const sample = [
      ["Smith Auto Group", "Pat Smith", "pat@smithauto.com", "555-0100", "Auto Dealer", defaultCityState || "City, ST", "TRUE", "Current family", "Owner is parent of youth player"],
    ];
    const csv = [headers.join(","), ...sample.map(r => r.map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sponsorship-leads-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("Spreadsheet is empty");
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const rows: Row[] = json.slice(0, 100).map((r) => {
        const isWarmRaw = String(r.is_warm ?? r.warm ?? "").trim().toLowerCase();
        const isWarm = ["true", "yes", "y", "1"].includes(isWarmRaw);
        const reason = String(r.warm_reason ?? "").trim();
        return newRow({
          business_name: String(r.business_name ?? r.business ?? "").trim(),
          contact_name: String(r.contact_name ?? "").trim(),
          contact_email: String(r.contact_email ?? r.email ?? "").trim(),
          contact_phone: String(r.contact_phone ?? r.phone ?? "").trim(),
          business_type: String(r.business_type ?? "").trim(),
          city_state: String(r.city_state ?? "").trim() || defaultCityState,
          is_warm: isWarm,
          warm_reasons: reason ? [reason] : [],
          dsf_notes: String(r.dsf_notes ?? r.notes ?? "").trim(),
          collapsed: true,
        });
      }).filter(r => r.business_name);

      if (rows.length === 0) throw new Error("No rows with a business_name found");
      toast.success(`${rows.length} leads parsed — review and submit below`);
      onParsed(rows);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Couldn't parse file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 p-3">
        <div>
          <p className="text-sm font-medium">Need a starting point?</p>
          <p className="text-xs text-muted-foreground">Download the template, fill it in, then upload.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Template
        </Button>
      </div>
      <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
        {busy ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm">Parsing spreadsheet…</p>
          </div>
        ) : (
          <>
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-display font-semibold mb-1">Upload CSV or XLSX</p>
            <p className="text-xs text-muted-foreground mb-4">Up to 100 rows per file.</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button onClick={() => inputRef.current?.click()} className="bg-health text-health-foreground hover:bg-health/90">
              Choose File
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Manual bulk form ---------- */
function ManualBulkForm({
  rows, onUpdate, onAdd, onRemove, onSubmit, busy, onCancel, variant,
}: {
  rows: Row[];
  onUpdate: (key: string, patch: Partial<Row>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onCancel: () => void;
  variant: "org" | "admin";
}) {
  const valid = rows.filter(r => r.business_name.trim().length > 0).length;

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <RowCard
          key={row.key}
          row={row}
          index={idx}
          canRemove={rows.length > 1}
          onUpdate={(patch) => onUpdate(row.key, patch)}
          onRemove={() => onRemove(row.key)}
        />
      ))}

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={rows.length >= 20}
        >
          + Add Another Lead
        </Button>
        <span className="text-xs text-muted-foreground">{rows.length}/20</span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button
          onClick={onSubmit}
          disabled={busy || valid === 0}
          className="bg-health text-health-foreground hover:bg-health/90 flex-1 sm:flex-initial"
        >
          {busy ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</>
          ) : (
            <>{variant === "org" ? `Submit ${valid} lead${valid === 1 ? "" : "s"} to DSF team` : `Add ${valid} lead${valid === 1 ? "" : "s"}`}</>
          )}
        </Button>
      </div>
    </div>
  );
}

function RowCard({
  row, index, canRemove, onUpdate, onRemove,
}: {
  row: Row;
  index: number;
  canRemove: boolean;
  onUpdate: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const heading = row.business_name.trim() || `Lead ${index + 1} — not yet named`;
  const collapsed = row.collapsed;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40">
        <button
          onClick={() => onUpdate({ collapsed: !collapsed })}
          className="text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        <p className="text-sm font-medium flex-1 truncate">
          <span className="text-muted-foreground mr-1.5">#{index + 1}</span>
          {heading}
          {row.ai_extracted && <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold">AI</span>}
        </p>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          <FieldRow>
            <Field label="Business name *" highlight={row.ai_extracted && !!row.business_name}>
              <Input value={row.business_name} onChange={(e) => onUpdate({ business_name: e.target.value })} placeholder="e.g. Smith Auto Group" />
            </Field>
          </FieldRow>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Contact name" highlight={row.ai_extracted && !!row.contact_name}>
              <Input value={row.contact_name} onChange={(e) => onUpdate({ contact_name: e.target.value })} />
            </Field>
            <Field label="Business type" highlight={row.ai_extracted && !!row.business_type}>
              <PillSelect
                options={BUSINESS_TYPE_OPTIONS as readonly string[]}
                value={row.business_type}
                onChange={(v) => onUpdate({ business_type: v })}
                allowCustom
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Contact email" highlight={row.ai_extracted && !!row.contact_email}>
              <Input type="email" value={row.contact_email} onChange={(e) => onUpdate({ contact_email: e.target.value })} />
            </Field>
            <Field label="Contact phone" highlight={row.ai_extracted && !!row.contact_phone}>
              <Input value={row.contact_phone} onChange={(e) => onUpdate({ contact_phone: e.target.value })} />
            </Field>
          </div>
          <Field label="City / State" highlight={row.ai_extracted && !!row.city_state}>
            <Input value={row.city_state} onChange={(e) => onUpdate({ city_state: e.target.value })} placeholder="e.g. Dallas, TX" />
          </Field>

          <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Is this a warm contact?</Label>
              <Switch checked={row.is_warm} onCheckedChange={(v) => onUpdate({ is_warm: v })} />
            </div>
            {row.is_warm && (
              <>
                <Field label="Why is it warm? (select all that apply)">
                  <div className="flex flex-wrap gap-1.5">
                    {WARM_REASON_OPTIONS.map((r) => {
                      const on = row.warm_reasons.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() =>
                            onUpdate({
                              warm_reasons: on ? row.warm_reasons.filter((x) => x !== r) : [...row.warm_reasons, r],
                            })
                          }
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors",
                            on ? "bg-accent text-accent-foreground border-accent" : "bg-background text-muted-foreground border-border hover:border-foreground/40",
                          )}
                        >
                          {on && <Check className="inline h-3 w-3 mr-1" />}{r}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </>
            )}
          </div>

          <Field label="Notes for DSF team (optional)">
            <Textarea
              rows={2}
              value={row.dsf_notes}
              onChange={(e) => onUpdate({ dsf_notes: e.target.value })}
              placeholder="Anything the DSF team should know — best time to call, who to ask for, helpful context"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
function Field({ label, highlight, children }: { label: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className={cn("text-xs", highlight ? "text-health" : "text-muted-foreground")}>
        {label}{highlight && <span className="ml-1">✓ extracted</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function PillSelect({
  options, value, onChange, allowCustom,
}: { options: readonly string[]; value: string; onChange: (v: string) => void; allowCustom?: boolean }) {
  const known = options.includes(value);
  const [custom, setCustom] = useState(!known && value ? value : "");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => { onChange(o); setCustom(""); }}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors",
              value === o ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-foreground/30",
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {allowCustom && (
        <Input
          value={custom}
          placeholder="Other (custom)"
          onChange={(e) => { setCustom(e.target.value); onChange(e.target.value); }}
          className="h-8 text-xs"
        />
      )}
    </div>
  );
}
