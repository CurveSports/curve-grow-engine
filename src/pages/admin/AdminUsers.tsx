import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Row = {
  user_id: string;
  email: string;
  full_name: string | null;
  org_id: string | null;
  org_name: string | null;
  roles: string[];
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: orgs }] = await Promise.all([
      supabase.from("profiles").select("user_id, email, full_name, org_id"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("organizations").select("id, name"),
    ]);
    const orgMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));
    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    const r: Row[] = (profiles ?? []).map((p: any) => ({
      user_id: p.user_id,
      email: p.email,
      full_name: p.full_name,
      org_id: p.org_id,
      org_name: p.org_id ? (orgMap.get(p.org_id) as string ?? null) : null,
      roles: roleMap.get(p.user_id) ?? [],
    }));
    r.sort((a, b) => (a.org_name ?? "zzz").localeCompare(b.org_name ?? "zzz") || a.email.localeCompare(b.email));
    setRows(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (uid: string) => {
    setRemovingId(uid);
    try {
      const { error } = await supabase.functions.invoke("delete-user", { body: { user_id: uid } });
      if (error) throw error;
      toast.success("User deleted");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to delete user");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="curve-card p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Email</th>
            <th className="px-5 py-3 font-medium">Organization</th>
            <th className="px-5 py-3 font-medium">Role</th>
            <th className="px-5 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const isSelf = r.user_id === user?.id;
            return (
              <tr key={r.user_id} className="hover:bg-secondary/40 transition-colors">
                <td className="px-5 py-3">{r.full_name ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{r.email}</td>
                <td className="px-5 py-3">{r.org_name ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                  {r.roles.join(", ") || "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  {!isSelf && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={removingId === r.user_id} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes {r.full_name ?? r.email}'s account, profile, roles, and onboarding state. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(r.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">No users.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
