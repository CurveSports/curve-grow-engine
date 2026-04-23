import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  SOURCES, SOURCE_LABELS, TIERS, tierAmount,
  type Source, type Tier, type ApprovedSponsorshipTiers,
} from "@/lib/sponsorship";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { Lock } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId?: string;       // when set, org is locked to this value
  onCreated?: (leadId: string) => void;
};

type Org = { id: string; name: string };
type Admin = { user_id: string; full_name: string | null; email: string };

export default function AddLeadModal({ open, onOpenChange, orgId: lockedOrgId, onCreated }: Props) {
  const { user } = useAuth();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [cityState, setCityState] = useState("");

  const [source, setSource] = useState<Source>("dsf_outreach");
  const [sourceOther, setSourceOther] = useState("");

  const [isWarm, setIsWarm] = useState(false);
  const [warmFlaggedBy, setWarmFlaggedBy] = useState<"org" | "dsf" | "both">("dsf");
  const [warmNotes, setWarmNotes] = useState("");

  const [orgIdSel, setOrgIdSel] = useState<string>(lockedOrgId ?? "");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [tier, setTier] = useState<Tier | "">("");
  const [proposedValue, setProposedValue] = useState("");
  const [stage, setStage] = useState<"new_lead" | "contacted">("new_lead");

  const [approvedTiers, setApprovedTiers] = useState<ApprovedSponsorshipTiers | null>(null);
  const [proposedTouched, setProposedTouched] = useState(false);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [orgRes, adminRes] = await Promise.all([
        supabase.from("organizations").select("id, name").order("name"),
        // admins via profiles+user_roles
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      const adminIds = (adminRes.data ?? []).map((r: any) => r.user_id);
      const profRes = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", adminIds.length ? adminIds : ["00000000-0000-0000-0000-000000000000"]);
      setOrgs((orgRes.data ?? []) as Org[]);
      setAdmins((profRes.data ?? []) as Admin[]);
    })();
    // reset
    setBusinessName(""); setContactName(""); setContactEmail(""); setContactPhone("");
    setBusinessType(""); setCityState(""); setSource("dsf_outreach"); setSourceOther("");
    setIsWarm(false); setWarmFlaggedBy("dsf"); setWarmNotes("");
    setOrgIdSel(lockedOrgId ?? ""); setAssignedTo(user?.id ?? "");
    setTier(""); setProposedValue(""); setStage("new_lead");
    setProposedTouched(false);
  }, [open, lockedOrgId, user?.id]);

  // Load approved tiers for the selected org so we can prefill proposed value.
  useEffect(() => {
    if (!open || !orgIdSel) { setApprovedTiers(null); return; }
    (async () => {
      const { data } = await supabase
        .from("org_sponsorship_tiers")
        .select("*")
        .eq("org_id", orgIdSel)
        .maybeSingle();
      setApprovedTiers((data ?? null) as ApprovedSponsorshipTiers | null);
    })();
  }, [open, orgIdSel]);

  // When the user picks a tier (and hasn't manually edited proposed value), prefill it.
  useEffect(() => {
    if (!tier) return;
    if (proposedTouched) return;
    const amt = tierAmount(tier as Tier, approvedTiers);
    if (amt !== null && amt > 0) setProposedValue(String(amt));
  }, [tier, approvedTiers, proposedTouched]);

  const submit = async () => {
    if (!businessName.trim()) return toast.error("Business name required");
    if (!orgIdSel) return toast.error("Organization required");
    if (!user) return toast.error("Not signed in");
    if (source === "other" && !sourceOther.trim()) return toast.error("Specify the source");
    if (source === "org_warm") setIsWarm(true);
    setBusy(true);

    const warm_org = isWarm && (warmFlaggedBy === "org" || warmFlaggedBy === "both");
    const warm_dsf = isWarm && (warmFlaggedBy === "dsf" || warmFlaggedBy === "both");
    const finalIsWarm = isWarm || source === "org_warm";

    const { data, error } = await supabase
      .from("sponsorship_leads")
      .insert({
        org_id: orgIdSel,
        business_name: businessName.trim(),
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        business_type: businessType.trim() || null,
        city_state: cityState.trim() || null,
        source,
        source_other: source === "other" ? sourceOther.trim() : null,
        is_warm: finalIsWarm,
        warm_flagged_by_org: warm_org || source === "org_warm",
        warm_flagged_by_dsf: warm_dsf,
        warm_notes: finalIsWarm ? (warmNotes.trim() || null) : null,
        sponsorship_tier: tier || null,
        proposed_value: proposedValue ? Number(proposedValue) : null,
        assigned_to: assignedTo || null,
        stage,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (!error && data?.id) {
      // Initial stage history record
      await supabase.from("sponsorship_lead_stage_history").insert({
        lead_id: data.id,
        org_id: orgIdSel,
        from_stage: null,
        to_stage: stage,
        changed_by: user.id,
        notes: "Lead created",
      });
    }

    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lead added");
    onCreated?.(data!.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Sponsorship Lead</DialogTitle>
          <DialogDescription>Track a potential sponsor for one of your client organizations.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* 1. Business Info */}
          <Section title="Business Info">
            <Field label="Business name *">
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Smith Auto Group" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact name"><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
              <Field label="Business type"><Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="e.g. auto dealership" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact email"><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
              <Field label="Contact phone"><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></Field>
            </div>
            <Field label="City / State"><Input value={cityState} onChange={(e) => setCityState(e.target.value)} placeholder="e.g. Dallas, TX" /></Field>
          </Section>

          {/* 2. Source */}
          <Section title="Lead Source">
            <PillGroup
              options={SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))}
              value={source}
              onChange={(v) => setSource(v as Source)}
            />
            {source === "other" && (
              <Field label="Specify source">
                <Input value={sourceOther} onChange={(e) => setSourceOther(e.target.value)} placeholder="e.g. Trade show contact" />
              </Field>
            )}
          </Section>

          {/* 3. Warm */}
          <Section title="Warm Lead">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Is this a warm lead?</Label>
              <Switch checked={isWarm} onCheckedChange={setIsWarm} />
            </div>
            {isWarm && (
              <>
                <Field label="Who flagged it?">
                  <PillGroup
                    options={[
                      { value: "org", label: "Org" },
                      { value: "dsf", label: "DSF" },
                      { value: "both", label: "Both" },
                    ]}
                    value={warmFlaggedBy}
                    onChange={(v) => setWarmFlaggedBy(v as any)}
                  />
                </Field>
                <Field label="Why is it warm?">
                  <Textarea
                    rows={3}
                    value={warmNotes}
                    onChange={(e) => setWarmNotes(e.target.value)}
                    placeholder="e.g. Owner is a current family, previously expressed interest, referred by a board member"
                  />
                </Field>
              </>
            )}
          </Section>

          {/* 4. Deal */}
          <Section title="Deal Details">
            {!lockedOrgId && (
              <Field label="Organization this lead is for *">
                <Select value={orgIdSel} onValueChange={setOrgIdSel}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Assigned to">
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select rep" /></SelectTrigger>
                <SelectContent>
                  {admins.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.full_name ?? a.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sponsorship tier">
                {!orgIdSel ? (
                  <p className="text-xs text-muted-foreground italic py-2">Select an organization first.</p>
                ) : !approvedTiers ? (
                  <div className="rounded-md border border-dashed border-border bg-muted/30 p-2.5 flex items-start gap-2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Sponsorship tiers haven't been approved for this org. A Curve admin can approve them in the Sponsorship Value calculator.
                    </p>
                  </div>
                ) : (
                  <>
                    <PillGroup
                      options={[
                        { value: "", label: "—" },
                        ...TIERS.map((t) => {
                          const amt = tierAmount(t, approvedTiers) ?? 0;
                          return { value: t, label: `${t} · ${formatCurrency(amt)}` };
                        }),
                      ]}
                      value={tier}
                      onChange={(v) => { setTier(v as Tier | ""); setProposedTouched(false); }}
                    />
                    {tier && (
                      <p className="text-[11px] text-accent mt-1.5">
                        Pre-filled from approved tier — edit below if needed.
                      </p>
                    )}
                  </>
                )}
              </Field>
              <Field label="Proposed value ($)">
                <Input
                  type="number"
                  value={proposedValue}
                  onChange={(e) => { setProposedValue(e.target.value); setProposedTouched(true); }}
                  placeholder="0"
                />
              </Field>
            </div>
            <Field label="Initial stage">
              <PillGroup
                options={[{ value: "new_lead", label: "New Lead" }, { value: "contacted", label: "Contacted" }]}
                value={stage}
                onChange={(v) => setStage(v as any)}
              />
            </Field>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-health text-health-foreground hover:bg-health/90">
            {busy ? "Adding…" : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="curve-eyebrow">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
function PillGroup({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
            value === o.value
              ? "bg-accent text-accent-foreground border-accent"
              : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
