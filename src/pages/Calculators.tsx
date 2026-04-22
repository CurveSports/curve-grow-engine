import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PricingSensitivityCalculator } from "@/components/calculators/PricingSensitivityCalculator";
import { SponsorshipValueCalculator } from "@/components/calculators/SponsorshipValueCalculator";
import { FamilyWalletShareCalculator } from "@/components/calculators/FamilyWalletShareCalculator";
import { RosterGrowthCalculator } from "@/components/calculators/RosterGrowthCalculator";
import { RetentionImpactCalculator } from "@/components/calculators/RetentionImpactCalculator";
import { SavedScenariosCard, type SavedScenario } from "@/components/calculators/SavedScenariosCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";
import type { CalculatorType } from "@/lib/calculators";

export default function Calculators() {
  const { orgId: orgIdParam } = useParams<{ orgId?: string }>();
  const { role, profile } = useAuth();

  const isAdminContext = role === "admin";
  // Admin landed on /calculators (no orgId): show org picker
  const [pickedOrgId, setPickedOrgId] = useState<string | null>(orgIdParam ?? null);
  const [adminOrgs, setAdminOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [orgName, setOrgName] = useState<string>("");

  // Effective org_id we operate on
  const effectiveOrgId = isAdminContext ? pickedOrgId : profile?.org_id ?? null;
  // Admin viewing a specific org's data = impersonating
  const isImpersonating = isAdminContext && !!effectiveOrgId;

  const [intake, setIntake] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [savedKey, setSavedKey] = useState(0);
  const [initialInputsByType, setInitialInputsByType] = useState<Partial<Record<CalculatorType, any>>>({});

  const calculatorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load admin org list when needed
  useEffect(() => {
    if (!isAdminContext) return;
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name", { ascending: true });
      setAdminOrgs((data ?? []) as any);
    })();
  }, [isAdminContext]);

  // Sync orgIdParam → pickedOrgId
  useEffect(() => {
    if (orgIdParam) setPickedOrgId(orgIdParam);
  }, [orgIdParam]);

  // Load intake + metrics for effective org
  useEffect(() => {
    if (!effectiveOrgId) return;
    setLoading(true);
    (async () => {
      const [{ data: i }, { data: m }, { data: o }] = await Promise.all([
        supabase.from("organization_intake").select("*").eq("org_id", effectiveOrgId).maybeSingle(),
        supabase.from("derived_metrics").select("*").eq("org_id", effectiveOrgId).maybeSingle(),
        supabase.from("organizations").select("name").eq("id", effectiveOrgId).maybeSingle(),
      ]);
      setIntake(i);
      setMetrics(m);
      setOrgName((o as any)?.name ?? "");
      setLoading(false);
    })();
  }, [effectiveOrgId]);

  const handleViewScenario = (s: SavedScenario) => {
    setInitialInputsByType((prev) => ({ ...prev, [s.calculator_type]: s.input_values }));
    const el = calculatorRefs.current[s.calculator_type];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setRef = (type: CalculatorType) => (el: HTMLDivElement | null) => {
    calculatorRefs.current[type] = el;
  };

  // --- Render shell with picker if admin and no org chosen ---
  if (isAdminContext && !effectiveOrgId) {
    return (
      <AppShell title="Revenue Calculators">
        <PageHeader />
        <div className="curve-card max-w-xl">
          <p className="curve-eyebrow mb-3">Select an organization</p>
          <Select value={pickedOrgId ?? ""} onValueChange={(v) => setPickedOrgId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an organization to load their data" />
            </SelectTrigger>
            <SelectContent>
              {adminOrgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-3">
            Calculators will be pre-populated with the selected organization's intake and derived metrics.
          </p>
        </div>
      </AppShell>
    );
  }

  if (loading || !intake || !metrics || !effectiveOrgId) {
    return (
      <AppShell title="Revenue Calculators">
        <PageHeader />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Revenue Calculators">
      <PageHeader />

      {isImpersonating && (
        <div className="mb-6 rounded-lg border border-warning/40 bg-warning-soft p-4 flex gap-3 items-start">
          <Info className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm text-foreground">
            Viewing calculators for <strong>{orgName}</strong> — values pre-populated with their data.
            Changes you make here are not saved unless you click <em>Save Scenario</em>.
          </div>
        </div>
      )}

      <div className="space-y-6">
        <SavedScenariosCard
          orgId={effectiveOrgId}
          refreshKey={savedKey}
          onView={handleViewScenario}
        />

        <div ref={setRef("pricing_sensitivity")}>
          <PricingSensitivityCalculator
            orgId={effectiveOrgId}
            intake={intake}
            metrics={metrics}
            isAdminContext={isAdminContext}
            isImpersonating={isImpersonating}
            initialInputs={initialInputsByType.pricing_sensitivity}
            onSaved={() => setSavedKey((k) => k + 1)}
            defaultOpen
          />
        </div>
        <div ref={setRef("sponsorship_value")}>
          <SponsorshipValueCalculator
            orgId={effectiveOrgId}
            intake={intake}
            metrics={metrics}
            isAdminContext={isAdminContext}
            isImpersonating={isImpersonating}
            initialInputs={initialInputsByType.sponsorship_value}
            onSaved={() => setSavedKey((k) => k + 1)}
          />
        </div>
        <div ref={setRef("family_wallet_share")}>
          <FamilyWalletShareCalculator
            orgId={effectiveOrgId}
            intake={intake}
            metrics={metrics}
            isAdminContext={isAdminContext}
            isImpersonating={isImpersonating}
            initialInputs={initialInputsByType.family_wallet_share}
            onSaved={() => setSavedKey((k) => k + 1)}
          />
        </div>
        <div ref={setRef("roster_growth")}>
          <RosterGrowthCalculator
            orgId={effectiveOrgId}
            intake={intake}
            metrics={metrics}
            isAdminContext={isAdminContext}
            isImpersonating={isImpersonating}
            initialInputs={initialInputsByType.roster_growth}
            onSaved={() => setSavedKey((k) => k + 1)}
          />
        </div>
        <div ref={setRef("retention_impact")}>
          <RetentionImpactCalculator
            orgId={effectiveOrgId}
            intake={intake}
            metrics={metrics}
            isAdminContext={isAdminContext}
            isImpersonating={isImpersonating}
            initialInputs={initialInputsByType.retention_impact}
            onSaved={() => setSavedKey((k) => k + 1)}
          />
        </div>
      </div>
    </AppShell>
  );
}

function PageHeader() {
  return (
    <div className="mb-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Revenue Calculators
      </h1>
      <p className="text-muted-foreground mt-1 max-w-2xl">
        Interactive tools to model your revenue potential. Move the sliders and watch your numbers change in real time.
      </p>
    </div>
  );
}
