import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Sparkles, RotateCcw } from "lucide-react";
import {
  TIERS,
  type Tier,
  type ApprovedSponsorshipTiers,
  recommendedTierAmounts,
  TIER_MULTIPLIERS,
} from "@/lib/sponsorship";
import { formatCurrency } from "@/lib/format";

type Props = {
  orgId: string;
  fmvMid: number;
  sourceInputs?: Record<string, unknown>;
};

export default function TierApprovalCard({ orgId, fmvMid, sourceInputs }: Props) {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";

  const [existing, setExisting] = useState<ApprovedSponsorshipTiers | null>(null);
  const [amounts, setAmounts] = useState<Record<Tier, string>>({
    Presenting: "",
    Supporting: "",
    Community: "",
  });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const recommended = useMemo(() => {
    const base = recommendedTierAmounts(fmvMid || 0);
    return {
      ...base,
      Presenting: Math.round(fmvMid * 3),
    };
  }, [fmvMid]);

  const load = async () => {
    const { data } = await supabase
      .from("org_sponsorship_tiers")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();
    const row = (data ?? null) as ApprovedSponsorshipTiers | null;
    setExisting(row);
    if (row) {
      setAmounts({
        Presenting: String(row.presenting_amount),
        Supporting: String(row.supporting_amount),
        Community: String(row.community_amount),
      });
      setNotes(row.notes ?? "");
    } else {
      setAmounts({
        Presenting: String(recommended.Presenting),
        Supporting: String(recommended.Supporting),
        Community: String(recommended.Community),
      });
    }
    setLoaded(true);
  };

  useEffect(() => {
    load();
  }, [orgId]);

  useEffect(() => {
    if (!loaded) return;
    if (existing) return;
    setAmounts({
      Presenting: String(recommended.Presenting),
      Supporting: String(recommended.Supporting),
      Community: String(recommended.Community),
    });
  }, [recommended, existing, loaded]);

  const useRecommended = () => {
    setAmounts({
      Presenting: String(recommended.Presenting),
      Supporting: String(recommended.Supporting),
      Community: String(recommended.Community),
    });
  };

  const approve = async () => {
    if (!user) return;
    const p = Number(amounts.Presenting);
    const s = Number(amounts.Supporting);
    const c = Number(amounts.Community);
    if (![p, s, c].every((n) => Number.isFinite(n) && n >= 0)) {
      toast.error("Enter valid amounts for all three tiers");
      return;
    }
    setBusy(true);
    const payload = {
      org_id: orgId,
      presenting_amount: p,
      supporting_amount: s,
      community_amount: c,
      fmv_per_sponsor_mid: fmvMid || null,
      source_inputs: (sourceInputs ?? null) as never,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      notes: notes.trim() || null,
    };
    const { error } = await supabase
      .from("org_sponsorship_tiers")
      .upsert(payload, { onConflict: "org_id" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(existing ? "Tiers updated" : "Tiers approved");
    load();
  };

  if (!isAdmin) {
    if (!existing) return null;
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="curve-eyebrow mb-3">Approved Sponsorship Tiers</p>
        <div className="grid grid-cols-3 gap-3">
          {TIERS.map((t) => (
            <TierReadout key={t} tier={t} amount={Number(amounts[t])} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent/40 bg-accent-soft/30 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="curve-eyebrow text-accent">Sponsorship Tiers · Curve Admin</p>
          <h3 className="font-display text-lg font-semibold mt-0.5">
            {existing ? "Approved tier amounts" : "Approve tier amounts for this org"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            These pre-fill the proposed value when a new lead is added with this tier.
            FMV midpoint: <span className="font-semibold text-foreground">{formatCurrency(fmvMid || 0)}</span>
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={useRecommended} className="flex-shrink-0">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Use recommended
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {TIERS.map((t) => (
          <TierEditor
            key={t}
            tier={t}
            value={amounts[t]}
            recommended={recommended[t]}
            multiplier={t === "Presenting" ? 3 : TIER_MULTIPLIERS[t]}
            onChange={(v) => setAmounts({ ...amounts, [t]: v })}
          />
        ))}
      </div>

      <div className="mb-4">
        <Label className="text-xs text-muted-foreground">Approval notes (optional)</Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Adjusted Presenting up given strong audience metrics"
          className="mt-1.5"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={approve} disabled={busy} className="bg-health text-health-foreground hover:bg-health/90">
          <Check className="h-4 w-4 mr-1.5" />
          {busy ? "Saving…" : existing ? "Update approved tiers" : "Approve tiers for this org"}
        </Button>
        {existing && (
          <button
            type="button"
            onClick={useRecommended}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to recommended
          </button>
        )}
        {existing && (
          <span className="text-xs text-muted-foreground ml-auto">
            Last approved {new Date(existing.approved_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function TierEditor({
  tier, value, recommended, multiplier, onChange,
}: {
  tier: Tier;
  value: string;
  recommended: number;
  multiplier: number;
  onChange: (v: string) => void;
}) {
  const isCustom = Number(value) !== recommended;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold">{tier}</p>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {multiplier}× FMV
        </span>
      </div>
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 font-display text-lg font-semibold"
      />
      <p className="text-[11px] text-muted-foreground mt-1.5">
        Recommended: {formatCurrency(recommended)}{isCustom && " · custom"}
      </p>
    </div>
  );
}

function TierReadout({ tier, amount }: { tier: Tier; amount: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{tier}</p>
      <p className="font-display text-lg font-semibold mt-1">{formatCurrency(amount)}</p>
    </div>
  );
}
