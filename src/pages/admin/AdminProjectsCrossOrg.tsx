import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ENGINES } from "@/lib/tasks";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_STYLE } from "@/lib/projects";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Row = {
  id: string;
  org_id: string;
  org_name: string;
  name: string;
  engine: string | null;
  status: "draft" | "active" | "completed";
  task_total: number;
  task_complete: number;
  released_at: string | null;
  awaiting: boolean;
  last_activity: string | null;
};

export default function AdminProjectsCrossOrg() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("awaiting");
  const [engineFilter, setEngineFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [{ data: projects }, { data: tasks }, { data: orgs }] = await Promise.all([
      supabase.from("org_projects").select("*"),
      supabase.from("org_tasks").select("id, project_id, status, last_activity_at"),
      supabase.from("organizations").select("id, name"),
    ]);
    const orgMap = new Map<string, string>();
    for (const o of orgs ?? []) orgMap.set((o as any).id, (o as any).name);

    const r: Row[] = ((projects ?? []) as any[]).map((p) => {
      const projTasks = (tasks ?? []).filter((t: any) => t.project_id === p.id);
      const complete = projTasks.filter((t: any) => t.status === "completed").length;
      const last = projTasks.map((t: any) => t.last_activity_at).filter(Boolean).sort().reverse()[0] ?? p.updated_at;
      return {
        id: p.id,
        org_id: p.org_id,
        org_name: orgMap.get(p.org_id) ?? "—",
        name: p.name,
        engine: p.engine,
        status: p.status,
        task_total: projTasks.length,
        task_complete: complete,
        released_at: p.released_at,
        awaiting: !!p.awaiting_completion_approval,
        last_activity: last,
      };
    });

    // Sort: awaiting approval first, then active by last_activity desc
    r.sort((a, b) => {
      if (a.awaiting !== b.awaiting) return a.awaiting ? -1 : 1;
      if (a.status !== b.status) {
        const order = { active: 0, draft: 1, completed: 2 } as const;
        return order[a.status] - order[b.status];
      }
      return (b.last_activity ?? "").localeCompare(a.last_activity ?? "");
    });

    setRows(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusFilter === "awaiting" && !r.awaiting) return false;
    if (statusFilter !== "awaiting" && statusFilter !== "all" && r.status !== statusFilter) return false;
    if (engineFilter !== "all" && (r.engine ?? "Cross-Engine") !== engineFilter) return false;
    if (orgFilter !== "all" && r.org_id !== orgFilter) return false;
    return true;
  }), [rows, statusFilter, engineFilter, orgFilter]);

  const orgs = useMemo(() => Array.from(new Map(rows.map((r) => [r.org_id, r.org_name])).entries()), [rows]);

  return (
    <div className="space-y-4">
      <div className="curve-card flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="awaiting">Awaiting Approval</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={engineFilter} onValueChange={setEngineFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Engine" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All engines</SelectItem>
            <SelectItem value="Cross-Engine">Cross-Engine</SelectItem>
            {ENGINES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Org" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All orgs</SelectItem>
            {orgs.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">{filtered.length} project{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <div className="curve-card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Engine</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tasks</th>
              <th className="px-4 py-3 font-medium">Released</th>
              <th className="px-4 py-3 font-medium">Last Activity</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No projects match.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className={cn("hover:bg-secondary/40 transition-colors", r.awaiting && "bg-accent-soft/40")}>
                <td className="px-4 py-3"><Link to={`/admin/org/${r.org_id}?tab=projects`} className="hover:text-accent font-medium">{r.org_name}</Link></td>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-xs">{r.engine ?? "Cross-Engine"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border w-fit", PROJECT_STATUS_STYLE[r.status])}>
                      {PROJECT_STATUS_LABEL[r.status]}
                    </span>
                    {r.awaiting && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent text-accent-foreground w-fit">
                        Awaiting
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs tabular-nums">{r.task_complete}/{r.task_total}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.released_at ? formatDate(r.released_at) : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.last_activity ? formatDate(r.last_activity) : "—"}</td>
                <td className="px-4 py-3 text-right">
                  {r.awaiting ? (
                    <Link to={`/admin/org/${r.org_id}?tab=projects`}>
                      <Button size="sm" className="h-7 px-3 text-xs bg-accent hover:bg-accent/90 text-accent-foreground">Approve</Button>
                    </Link>
                  ) : (
                    <Link to={`/admin/org/${r.org_id}?tab=projects`} className="text-xs text-accent hover:underline">View</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
