import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ENGINES,
  OWNER_LABEL,
  OWNER_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
  type Engine,
  type TaskOwnerType,
  type TaskStatus,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { Search, AlertCircle, Building2, Users, ListChecks, ChevronDown, ChevronRight } from "lucide-react";

type TaskRow = {
  id: string;
  org_id: string;
  title: string;
  engine: Engine;
  status: TaskStatus;
  owner_type: TaskOwnerType;
  due_date: string | null;
  priority: string;
  task_type: string;
  project_id: string | null;
  last_activity_at: string | null;
};

type OrgInfo = { id: string; name: string };

const STATUS_FILTERS = ["all", "open", "not_started", "in_progress", "overdue", "completed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function AdminTaskTracker() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [orgs, setOrgs] = useState<Record<string, OrgInfo>>({});
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    (async () => {
      const [tasksRes, orgsRes] = await Promise.all([
        supabase
          .from("org_tasks")
          .select("id, org_id, title, engine, status, owner_type, due_date, priority, task_type, project_id, last_activity_at")
          .eq("plan_status", "active")
          .order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("organizations").select("id, name"),
      ]);
      const orgMap: Record<string, OrgInfo> = {};
      for (const o of (orgsRes.data ?? []) as OrgInfo[]) orgMap[o.id] = o;
      setOrgs(orgMap);
      setTasks((tasksRes.data ?? []) as TaskRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell title="Task Tracker">
      <div className="mb-8">
        <p className="curve-eyebrow mb-2">Curve OS</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Task Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Cross-org visibility into every active task and the Curve team's workload.
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">
            <ListChecks className="h-4 w-4 mr-2" /> All Tasks
          </TabsTrigger>
          <TabsTrigger value="curve">
            <Users className="h-4 w-4 mr-2" /> Curve Team Workload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <AllTasksView tasks={tasks} orgs={orgs} today={today} />
          )}
        </TabsContent>

        <TabsContent value="curve">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <CurveWorkloadView
              tasks={tasks.filter((t) => t.owner_type === "curve_team" || t.owner_type === "combo")}
              orgs={orgs}
              today={today}
            />
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ---------------- All Tasks ---------------- */

function AllTasksView({ tasks, orgs, today }: { tasks: TaskRow[]; orgs: Record<string, OrgInfo>; today: string }) {
  const [search, setSearch] = useState("");
  const [engine, setEngine] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [orgId, setOrgId] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (engine !== "all" && t.engine !== engine) return false;
      if (owner !== "all" && t.owner_type !== owner) return false;
      if (orgId !== "all" && t.org_id !== orgId) return false;
      if (status === "open" && t.status === "completed") return false;
      if (status === "overdue") {
        const od = t.status === "overdue" || (t.due_date && t.due_date < today && t.status !== "completed");
        if (!od) return false;
      } else if (status !== "all" && status !== "open" && t.status !== status) return false;
      if (q) {
        const orgName = orgs[t.org_id]?.name?.toLowerCase() ?? "";
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.engine.toLowerCase().includes(q) &&
          !orgName.includes(q)
        )
          return false;
      }
      return true;
    });
  }, [tasks, search, engine, owner, status, orgId, orgs, today]);

  const orgOptions = useMemo(
    () =>
      Object.values(orgs).sort((a, b) => a.name.localeCompare(b.name)),
    [orgs]
  );

  const counts = useMemo(() => {
    const overdue = filtered.filter((t) => t.due_date && t.due_date < today && t.status !== "completed").length;
    return { total: filtered.length, overdue };
  }, [filtered, today]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task, engine, or org…"
            className="pl-9"
          />
        </div>
        <FilterSelect value={orgId} onChange={setOrgId} placeholder="All orgs" width="w-[180px]"
          options={[{ value: "all", label: "All orgs" }, ...orgOptions.map((o) => ({ value: o.id, label: o.name }))]}
        />
        <FilterSelect value={engine} onChange={setEngine} placeholder="All engines"
          options={[{ value: "all", label: "All engines" }, ...ENGINES.map((e) => ({ value: e, label: e }))]}
        />
        <FilterSelect value={owner} onChange={setOwner} placeholder="All owners"
          options={[
            { value: "all", label: "All owners" },
            { value: "curve_team", label: OWNER_LABEL.curve_team },
            { value: "org_user", label: OWNER_LABEL.org_user },
            { value: "combo", label: OWNER_LABEL.combo },
            { value: "third_party", label: OWNER_LABEL.third_party },
          ]}
        />
        <FilterSelect value={status} onChange={(v) => setStatus(v as StatusFilter)} placeholder="Status"
          options={[
            { value: "open", label: "Open" },
            { value: "all", label: "All" },
            { value: "overdue", label: "Overdue only" },
            { value: "not_started", label: STATUS_LABEL.not_started },
            { value: "in_progress", label: STATUS_LABEL.in_progress },
            { value: "completed", label: STATUS_LABEL.completed },
          ]}
        />
      </div>

      <div className="text-xs text-muted-foreground mb-3 tabular-nums">
        {counts.total} task{counts.total === 1 ? "" : "s"}
        {counts.overdue > 0 && <span className="text-destructive font-semibold"> · {counts.overdue} overdue</span>}
      </div>

      <TaskTable tasks={filtered} orgs={orgs} today={today} showOrg />
    </>
  );
}

/* ---------------- Curve Team Workload ---------------- */

function CurveWorkloadView({ tasks, orgs, today }: { tasks: TaskRow[]; orgs: Record<string, OrgInfo>; today: string }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setCollapsed((s) => ({ ...s, [k]: !s[k] }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (t.status === "completed") return false;
      if (!q) return true;
      const orgName = orgs[t.org_id]?.name?.toLowerCase() ?? "";
      return (
        t.title.toLowerCase().includes(q) ||
        t.engine.toLowerCase().includes(q) ||
        orgName.includes(q)
      );
    });
  }, [tasks, search, orgs]);

  // Group by org
  const grouped = useMemo(() => {
    const map: Record<string, TaskRow[]> = {};
    for (const t of filtered) (map[t.org_id] ??= []).push(t);
    return map;
  }, [filtered]);

  const orgIds = useMemo(
    () =>
      Object.keys(grouped).sort((a, b) =>
        (orgs[a]?.name ?? "").localeCompare(orgs[b]?.name ?? "")
      ),
    [grouped, orgs]
  );

  const totals = useMemo(() => {
    const overdue = filtered.filter((t) => t.due_date && t.due_date < today).length;
    return { total: filtered.length, overdue };
  }, [filtered, today]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {totals.total} open · {orgIds.length} org{orgIds.length === 1 ? "" : "s"}
          {totals.overdue > 0 && <span className="text-destructive font-semibold"> · {totals.overdue} overdue</span>}
        </div>
      </div>

      {orgIds.length === 0 ? (
        <div className="curve-card text-center py-12">
          <Users className="h-10 w-10 mx-auto text-neutral mb-3" />
          <h3 className="font-display text-lg font-semibold mb-1">Nothing on the Curve plate</h3>
          <p className="text-sm text-muted-foreground">No open Curve-team or combo tasks right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orgIds.map((id) => {
            const list = grouped[id];
            const isCollapsed = search.trim() ? false : !!collapsed[id];
            const orgOverdue = list.filter((t) => t.due_date && t.due_date < today).length;
            return (
              <div key={id} className="curve-card p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-secondary/40 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-accent transition"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="font-display font-semibold truncate">{orgs[id]?.name ?? "Unknown org"}</span>
                  </button>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                    <span className="text-muted-foreground tabular-nums">{list.length}</span>
                    {orgOverdue > 0 && (
                      <span className="text-destructive font-semibold tabular-nums">{orgOverdue} overdue</span>
                    )}
                    <Link to={`/admin/org/${id}`} className="text-accent hover:underline">Open org</Link>
                  </div>
                </div>
                {!isCollapsed && <TaskTable tasks={list} orgs={orgs} today={today} showOrg={false} />}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ---------------- Reusable bits ---------------- */

function FilterSelect({
  value, onChange, options, placeholder, width = "w-[160px]",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  width?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", width)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TaskTable({
  tasks, orgs, today, showOrg,
}: {
  tasks: TaskRow[];
  orgs: Record<string, OrgInfo>;
  today: string;
  showOrg: boolean;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground px-5 py-6">No tasks match.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-5 py-2.5 font-medium">Task</th>
            {showOrg && <th className="px-5 py-2.5 font-medium">Org</th>}
            <th className="px-5 py-2.5 font-medium">Engine</th>
            <th className="px-5 py-2.5 font-medium">Owner</th>
            <th className="px-5 py-2.5 font-medium">Status</th>
            <th className="px-5 py-2.5 font-medium text-right">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tasks.map((t) => {
            const overdue = !!t.due_date && t.due_date < today && t.status !== "completed";
            return (
              <tr key={t.id} className="hover:bg-muted/30 transition">
                <td className="px-5 py-2.5">
                  <Link to={`/admin/org/${t.org_id}/tasks`} className="font-medium hover:text-accent transition">
                    {t.title}
                  </Link>
                </td>
                {showOrg && (
                  <td className="px-5 py-2.5">
                    <Link to={`/admin/org/${t.org_id}`} className="text-muted-foreground hover:text-accent transition">
                      {orgs[t.org_id]?.name ?? "—"}
                    </Link>
                  </td>
                )}
                <td className="px-5 py-2.5 text-muted-foreground">{t.engine}</td>
                <td className="px-5 py-2.5">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", OWNER_STYLE[t.owner_type])}>
                    {OWNER_LABEL[t.owner_type]}
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", STATUS_STYLE[t.status])}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </td>
                <td className={cn("px-5 py-2.5 text-right tabular-nums", overdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                  {t.due_date ? (
                    <span className="inline-flex items-center gap-1 justify-end">
                      {overdue && <AlertCircle className="h-3 w-3" />}
                      {t.due_date}
                    </span>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
