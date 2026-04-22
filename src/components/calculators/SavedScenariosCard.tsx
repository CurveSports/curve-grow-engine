import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CALCULATOR_LABELS, keyOutputFor, type CalculatorType } from "@/lib/calculators";
import { deleteScenario } from "./scenarioStore";

export interface SavedScenario {
  id: string;
  org_id: string;
  calculator_type: CalculatorType;
  scenario_label: "best_case" | "worst_case";
  input_values: any;
  output_values: any;
  saved_at: string;
  saved_by: string;
}

interface Props {
  orgId: string;
  refreshKey: number;
  onView: (s: SavedScenario) => void;
}

export function SavedScenariosCard({ orgId, refreshKey, onView }: Props) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [namesByUser, setNamesByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("org_calculator_scenarios")
        .select("*")
        .eq("org_id", orgId)
        .order("saved_at", { ascending: false });
      if (error) { console.error(error); return; }
      const list = (data ?? []) as SavedScenario[];
      setScenarios(list);
      const userIds = Array.from(new Set(list.map((s) => s.saved_by)));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: any) => { map[p.user_id] = p.full_name ?? p.email ?? "Someone"; });
        setNamesByUser(map);
      }
    })();
  }, [orgId, refreshKey]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scenario?")) return;
    const ok = await deleteScenario(id);
    if (ok) {
      setScenarios((arr) => arr.filter((s) => s.id !== id));
      toast({ title: "Scenario deleted" });
    }
  };

  return (
    <section className="curve-card">
      <div className="flex items-baseline justify-between mb-4">
        <p className="curve-eyebrow">Saved Scenarios</p>
        <span className="text-xs text-muted-foreground">{scenarios.length} of 10 max</span>
      </div>
      {scenarios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Save scenarios below to compare best case and worst case projections.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {scenarios.map((s) => {
            const k = keyOutputFor(s.calculator_type, s.output_values);
            const isBest = s.scenario_label === "best_case";
            return (
              <div key={s.id} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm text-foreground truncate">
                      {CALCULATOR_LABELS[s.calculator_type]}
                    </p>
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isBest ? "bg-accent-soft text-accent border-accent/30" : "bg-destructive/10 text-destructive border-destructive/30"
                    }`}>
                      {isBest ? "Best Case" : "Worst Case"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Delete scenario"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="font-display text-xl font-semibold tabular-nums text-foreground">{k.value}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1">
                  <span className="truncate">
                    {namesByUser[s.saved_by] ?? "—"} · {new Date(s.saved_at).toLocaleDateString()}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => onView(s)} className="h-7 px-2">
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
