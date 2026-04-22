import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { CalculatorType } from "@/lib/calculators";

export type ScenarioLabel = "best_case" | "worst_case";

export async function saveScenario(
  orgId: string,
  calculatorType: CalculatorType,
  label: ScenarioLabel,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    toast({ title: "Not signed in", variant: "destructive" });
    return;
  }
  const { error } = await supabase
    .from("org_calculator_scenarios")
    .upsert(
      {
        org_id: orgId,
        calculator_type: calculatorType,
        scenario_label: label,
        input_values: inputs as any,
        output_values: outputs as any,
        saved_by: uid,
        saved_at: new Date().toISOString(),
      },
      { onConflict: "org_id,calculator_type,scenario_label" },
    );
  if (error) {
    toast({ title: "Couldn't save scenario", description: error.message, variant: "destructive" });
    return;
  }
  toast({
    title: label === "best_case" ? "Saved as best case" : "Saved as worst case",
    description: "Visible in Saved Scenarios above.",
  });
}

export async function deleteScenario(scenarioId: string) {
  const { error } = await supabase.from("org_calculator_scenarios").delete().eq("id", scenarioId);
  if (error) {
    toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
    return false;
  }
  return true;
}
