import { OrgTask, STATUS_LABEL, STATUS_STYLE, PRIORITY_STYLE, groupByEngine, ENGINES } from "@/lib/tasks";
import { formatDate } from "@/lib/format";

interface Props {
  tasks: OrgTask[];
  scores?: Record<string, number | null>;
  onSelect: (task: OrgTask) => void;
}

export default function TaskList({ tasks, scores, onSelect }: Props) {
  const grouped = groupByEngine(tasks);
  const engineOrder = ENGINES.filter(e => grouped[e]?.length);

  if (engineOrder.length === 0) {
    return <div className="curve-card text-sm text-muted-foreground">No tasks yet.</div>;
  }

  return (
    <div className="space-y-6">
      {engineOrder.map(engine => {
        const list = grouped[engine];
        const completed = list.filter(t => t.status === "completed").length;
        const score = scores?.[engine];
        return (
          <div key={engine} className="curve-card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-3">
                <h3 className="font-display font-semibold">{engine}</h3>
                {score !== null && score !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-border tabular-nums">
                    Score {score}/10
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{completed} / {list.length} complete</span>
            </div>
            <ul className="divide-y divide-border">
              {list.map(t => (
                <li key={t.id}>
                  <button onClick={() => onSelect(t)} className="w-full text-left px-5 py-3 hover:bg-secondary/40 transition-colors flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.task_type}{t.due_date ? ` · Due ${formatDate(t.due_date)}` : ""}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
