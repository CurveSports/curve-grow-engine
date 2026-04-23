import AppShell from "@/components/AppShell";
import { MonetizationTierGuide } from "@/components/admin/RiskAssessment";

export default function AdminInternalResources() {
  return (
    <AppShell title="Internal Resources">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Internal Resources
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reference material for the Curve team. More resources will be added here over time.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="curve-eyebrow mb-3">Monetization Tier Guide</h2>
          <MonetizationTierGuide currentTier={null} />
        </section>
      </div>
    </AppShell>
  );
}
