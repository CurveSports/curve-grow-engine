import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CurveBadge, ENGINE_HEX, getEngineRows, type EngineName } from "../shared";
import { formatCurrency } from "@/lib/format";
import { EditableText, LockedHint } from "../EditableField";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Suggestion = { name: string; engine: EngineName; rationale: string };

function rationaleFor(e: EngineName, score: number, oppHigh: number): string {
  if (e === "Sponsorship") return `Lead with Sponsorship — score ${score}/10, ${formatCurrency(oppHigh)} upside, doesn't require family buy-in. First deal closes within 30–45 days.`;
  if (e === "Pricing") return `Pricing is high leverage — score ${score}/10. Restructure fees with tiered packaging to capture ${formatCurrency(oppHigh)} without losing price-sensitive families.`;
  if (e === "Retention") return `Retention work protects existing revenue. Score ${score}/10, ${formatCurrency(oppHigh)} at risk + referral upside.`;
  if (e === "Apparel") return `Apparel margin opportunity worth ${formatCurrency(oppHigh)}. Vendor selection and team store mechanics drive the gap.`;
  if (e === "Events") return `Showcases, camps, clinics — ${formatCurrency(oppHigh)} of incremental revenue at the $500/player benchmark.`;
  if (e === "Add-Ons") return `Training and add-on adoption — ${formatCurrency(oppHigh)} via remote training and a-la-carte programming.`;
  if (e === "Facility") return `Facility utilization — ${formatCurrency(oppHigh)} via instruction and external rental.`;
  if (e === "Affiliate") return `Affiliate program rate alignment — ${formatCurrency(oppHigh)} from fee structure adjustments.`;
  return `${e} opportunity — ${formatCurrency(oppHigh)}.`;
}

export function Slide5Engines({
  orgId, metrics, tasks, get, save, editing,
}: {
  orgId: string;
  metrics: any;
  tasks: any[];
  get: (slide: number, field: string, fallback: string) => string;
  save: (slide: number, field: string, value: string) => Promise<void>;
  editing: boolean;
}) {
  const engines = getEngineRows(metrics);
  const execRisk = metrics?.execution_risk as string | null;

  const sequence = useMemo<EngineName[]>(() => {
    const sorted = [...engines].sort((a, b) => {
      const aQuick = a.score <= 4 && a.oppHigh > 20000 && (a.name === "Sponsorship" || a.name === "Affiliate") ? 0 : 1;
      const bQuick = b.score <= 4 && b.oppHigh > 20000 && (b.name === "Sponsorship" || b.name === "Affiliate") ? 0 : 1;
      if (aQuick !== bQuick) return aQuick - bQuick;
      // High opp + low score next
      const aPri = a.score <= 4 ? a.oppHigh : 0;
      const bPri = b.score <= 4 ? b.oppHigh : 0;
      if (bPri !== aPri) return bPri - aPri;
      return a.score - b.score;
    });
    return sorted.slice(0, 5).map((e) => e.name);
  }, [engines]);

  const top3 = sequence.slice(0, 3);
  const suggestions: Suggestion[] = top3.map((eng) => {
    const e = engines.find((x) => x.name === eng)!;
    return { name: `${eng} Activation`, engine: eng, rationale: rationaleFor(eng, e.score, e.oppHigh) };
  });

  const [creating, setCreating] = useState(false);
  const createProjects = async () => {
    setCreating(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      // current max display_order
      const { data: existing } = await supabase
        .from("org_projects")
        .select("display_order").eq("org_id", orgId).order("display_order", { ascending: false }).limit(1);
      let nextOrder = (existing?.[0]?.display_order ?? 0) + 1;

      let createdCount = 0;
      for (const s of suggestions) {
        // Insert draft project
        const { data: project, error: projErr } = await supabase.from("org_projects").insert({
          org_id: orgId,
          name: s.name,
          engine: s.engine as any,
          description: s.rationale,
          status: "draft",
          display_order: nextOrder++,
          created_by: u.user.id,
        }).select("id").single();
        if (projErr || !project) continue;

        // Top 5 unassigned active tasks for this engine
        const eligible = tasks
          .filter((t) => t.engine === s.engine && !t.project_id && t.plan_status === "active")
          .sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
            return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
          })
          .slice(0, 5);
        if (eligible.length > 0) {
          await supabase.from("org_tasks")
            .update({ project_id: project.id })
            .in("id", eligible.map((t) => t.id));
        }
        createdCount++;
      }
      toast.success(`${createdCount} projects created in draft. Review and activate from the Projects tab.`);
    } catch (e: any) {
      toast.error("Could not create projects: " + (e?.message ?? "unknown"));
    } finally {
      setCreating(false);
    }
  };

  const readiness = (e: typeof engines[number]) => {
    if (execRisk === "High" && (e.name === "Pricing" || e.name === "Apparel")) return { label: "Foundation First", hex: "#ef4444" };
    if (e.score <= 4 && (e.name === "Sponsorship" || e.name === "Affiliate")) return { label: "Ready Now", hex: "#10b981" };
    if (e.score <= 6) return { label: "Ready Soon", hex: "#f59e0b" };
    return { label: "Ready Now", hex: "#10b981" };
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-bold">Engine Deep Dive + Activation Sequence</p>
        <CurveBadge />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-4">Recommended Activation Sequence</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {sequence.map((eng, i) => {
            const e = engines.find((x) => x.name === eng)!;
            const fieldKey = `seq_${i}_rationale`;
            const defaultRat = rationaleFor(eng, e.score, e.oppHigh);
            const value = get(5, fieldKey, defaultRat);
            return (
              <div key={eng} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold" style={{ color: ENGINE_HEX[eng] }}>{i + 1}</span>
                  <span className="text-[10px] uppercase text-white/50 tabular-nums">{e.score}/10</span>
                </div>
                <p className="font-semibold text-sm mt-1">{eng}</p>
                <p className="text-[11px] text-white/60 tabular-nums">{formatCurrency(e.oppLow)}–{formatCurrency(e.oppHigh)}</p>
                <div className="mt-2 text-xs text-white/80 leading-snug">
                  <EditableText
                    value={value}
                    editing={editing}
                    multiline
                    onSave={(v) => save(5, fieldKey, v)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {engines.map((e) => {
          const r = readiness(e);
          return (
            <div key={e.name} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-baseline justify-between mb-2">
                <p className="font-semibold" style={{ color: ENGINE_HEX[e.name] }}>{e.name}</p>
                <span className="text-xs tabular-nums">{e.score}/10</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${(e.score / 10) * 100}%`, backgroundColor: ENGINE_HEX[e.name] }} />
              </div>
              <p className="text-xs text-white/70 mt-2 tabular-nums">Opp: {formatCurrency(e.oppLow)} – {formatCurrency(e.oppHigh)}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  style={{ borderColor: r.hex + "66", backgroundColor: r.hex + "22", color: r.hex }}>
                  {r.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold">Suggested Initial Project Structure</p>
          <LockedHint />
        </div>
        <div className="space-y-3">
          {suggestions.map((s, i) => {
            const taskCount = tasks.filter((t) => t.engine === s.engine && !t.project_id && t.plan_status === "active").slice(0, 5).length;
            return (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">Project {i + 1} — {s.name}</p>
                  <span className="text-xs text-white/60">{taskCount} tasks ready</span>
                </div>
                <p className="text-xs text-white/70 mt-1">{s.rationale}</p>
              </div>
            );
          })}
        </div>
        <Button onClick={createProjects} disabled={creating || suggestions.length === 0} className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white">
          {creating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Creating…</> : "Create These Projects"}
        </Button>
      </div>
    </div>
  );
}
