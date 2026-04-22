import { CurveBadge, ENGINE_HEX, type EngineName } from "../shared";

const COLUMNS = [
  { label: "Now (Week 1–2)", sub: "Starting here because…" },
  { label: "Month 1", sub: "Building on momentum" },
  { label: "Month 2–3", sub: "Expanding into" },
];

export function KickoffSlide5({ projects, tasks }: { projects: any[]; tasks: any[] }) {
  // Projects sorted by display_order, take first 3 with engine
  const sorted = [...projects].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const cards = sorted.slice(0, 3);
  const totalTasksReady = tasks.filter((t) => t.project_id && projects.find((p) => p.id === t.project_id)).length;
  const priorityAreas = new Set(cards.map((c) => c.engine).filter(Boolean)).size;

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl md:text-4xl font-bold">Where we start</h2>
        <CurveBadge light />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col, i) => {
          const card = cards[i];
          const taskCount = card ? tasks.filter((t) => t.project_id === card.id).length : 0;
          const hex = card?.engine ? ENGINE_HEX[card.engine as EngineName] ?? "#94a3b8" : "#94a3b8";
          return (
            <div key={i} className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{col.label}</p>
              {card ? (
                <div className="rounded-2xl border-2 p-5 bg-card" style={{ borderColor: hex + "66" }}>
                  <p className="font-display text-xl font-bold leading-tight">{card.name}</p>
                  {card.engine && (
                    <p className="text-xs font-semibold mt-1" style={{ color: hex }}>{card.engine}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2 tabular-nums">{taskCount} tasks ready</p>
                  <p className="text-xs text-foreground/70 mt-3 italic">{col.sub}</p>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-border p-5 text-center text-muted-foreground bg-card/50">
                  <p className="text-sm">Coming in your kickoff session</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-foreground/80 mt-6">
        Your action plan is ready. <span className="font-semibold">{totalTasksReady} tasks</span> have been prepared
        across <span className="font-semibold">{priorityAreas || cards.length}</span> priority areas.
      </p>
    </div>
  );
}
