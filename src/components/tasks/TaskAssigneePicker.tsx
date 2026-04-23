import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Plus, X, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface AdminProfile {
  user_id: string;
  full_name: string | null;
  email: string;
}

interface Props {
  taskId: string;
  orgId: string;
  /** Read-only display only — no add/remove controls. */
  readOnly?: boolean;
  /** Compact mode (used inside lists). */
  compact?: boolean;
  onChanged?: () => void;
}

export default function TaskAssigneePicker({ taskId, orgId, readOnly = false, compact = false, onChanged }: Props) {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: roles }, { data: assignees }] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
      supabase.from("org_task_assignees" as any).select("user_id").eq("task_id", taskId),
    ]);
    const adminIds = (roles ?? []).map((r: any) => r.user_id);
    if (adminIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", adminIds);
      setAdmins(((profs ?? []) as any[]).sort((a, b) =>
        (a.full_name || a.email).localeCompare(b.full_name || b.email),
      ));
    } else {
      setAdmins([]);
    }
    setAssignedIds(new Set(((assignees ?? []) as any[]).map((a) => a.user_id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const assigned = admins.filter((a) => assignedIds.has(a.user_id));

  const toggle = async (uid: string) => {
    if (busy || !user) return;
    setBusy(true);
    if (assignedIds.has(uid)) {
      const { error } = await supabase
        .from("org_task_assignees" as any)
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", uid);
      if (error) toast.error(error.message);
      else {
        const next = new Set(assignedIds);
        next.delete(uid);
        setAssignedIds(next);
        onChanged?.();
      }
    } else {
      const { error } = await supabase
        .from("org_task_assignees" as any)
        .insert({ task_id: taskId, user_id: uid, org_id: orgId, assigned_by: user.id } as any);
      if (error) toast.error(error.message);
      else {
        const next = new Set(assignedIds);
        next.add(uid);
        setAssignedIds(next);
        onChanged?.();
      }
    }
    setBusy(false);
  };

  if (compact) {
    if (loading || assigned.length === 0) return null;
    return (
      <div className="flex items-center -space-x-1.5">
        {assigned.slice(0, 3).map((a) => (
          <span
            key={a.user_id}
            title={a.full_name || a.email}
            className="h-5 w-5 rounded-full bg-accent/15 border border-accent/40 text-[10px] font-semibold flex items-center justify-center text-accent"
          >
            {(a.full_name || a.email).charAt(0).toUpperCase()}
          </span>
        ))}
        {assigned.length > 3 && (
          <span className="h-5 w-5 rounded-full bg-secondary border border-border text-[10px] font-semibold flex items-center justify-center text-muted-foreground">
            +{assigned.length - 3}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {assigned.length === 0 && !readOnly && (
          <span className="text-xs text-muted-foreground">No admin assigned</span>
        )}
        {assigned.map((a) => (
          <span
            key={a.user_id}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs bg-accent/10 border border-accent/30 text-foreground"
          >
            <UserCircle2 className="h-3 w-3 text-accent" />
            {a.full_name || a.email}
            {!readOnly && (
              <button
                type="button"
                aria-label={`Unassign ${a.full_name || a.email}`}
                onClick={() => toggle(a.user_id)}
                className="ml-0.5 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                disabled={busy}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {!readOnly && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Assign
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-1">
              {loading && <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>}
              {!loading && admins.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">No admins found.</p>
              )}
              <ul className="max-h-64 overflow-y-auto">
                {admins.map((a) => {
                  const active = assignedIds.has(a.user_id);
                  return (
                    <li key={a.user_id}>
                      <button
                        type="button"
                        onClick={() => toggle(a.user_id)}
                        disabled={busy}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-secondary transition-colors text-left",
                          active && "bg-secondary/60",
                        )}
                      >
                        <span className="h-6 w-6 rounded-full bg-accent/15 border border-accent/40 text-[11px] font-semibold flex items-center justify-center text-accent flex-shrink-0">
                          {(a.full_name || a.email).charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-foreground">{a.full_name || a.email}</span>
                          {a.full_name && (
                            <span className="block truncate text-[11px] text-muted-foreground">{a.email}</span>
                          )}
                        </span>
                        {active && <Check className="h-4 w-4 text-accent flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
