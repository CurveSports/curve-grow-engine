import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, UserPlus, Palette } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";

type Row = {
  user_id: string;
  email: string;
  full_name: string | null;
  org_id: string | null;
  org_name: string | null;
  roles: string[];
  module_access: string[];
};

type Org = { id: string; name: string };

export default function AdminUsers() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingModulesId, setSavingModulesId] = useState<string | null>(null);

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "org_user">("admin");
  const [newOrgId, setNewOrgId] = useState<string>("");
  const [newAllegiance, setNewAllegiance] = useState(true);
  const [newAcquisitions, setNewAcquisitions] = useState(true);
  const [newMarketing, setNewMarketing] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: orgsData }] = await Promise.all([
      supabase.from("profiles").select("user_id, email, full_name, org_id, module_access"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("organizations").select("id, name").order("name"),
    ]);
    const orgMap = new Map((orgsData ?? []).map((o: any) => [o.id, o.name]));
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
      module_access: Array.isArray(p.module_access) ? p.module_access : [],
    }));
    r.sort((a, b) => (a.org_name ?? "zzz").localeCompare(b.org_name ?? "zzz") || a.email.localeCompare(b.email));
    setRows(r);
    setOrgs((orgsData ?? []) as Org[]);
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

  const resetCreateForm = () => {
    setNewEmail("");
    setNewFullName("");
    setNewRole("admin");
    setNewOrgId("");
    setNewAllegiance(true);
    setNewAcquisitions(true);
    setNewMarketing(true);
  };

  const toggleModule = async (row: Row, mod: "allegiance" | "acquisitions" | "marketing", checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...(row.module_access ?? []), mod]))
      : (row.module_access ?? []).filter((m) => m !== mod);
    setSavingModulesId(row.user_id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ module_access: next })
        .eq("user_id", row.user_id);
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.user_id === row.user_id ? { ...r, module_access: next } : r)));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to update access");
    } finally {
      setSavingModulesId(null);
    }
  };

  const createUser = async () => {
    if (!newEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    if (newRole === "org_user" && !newOrgId) {
      toast.error("Select an organization for org users");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newEmail.trim(),
          full_name: newFullName.trim() || null,
          role: newRole,
          org_id: newRole === "org_user" ? newOrgId : null,
          module_access: [
            ...(newAllegiance ? ["allegiance"] : []),
            ...(newAcquisitions ? ["acquisitions"] : []),
            ...(newMarketing ? ["marketing"] : []),
          ],
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(newRole === "admin" ? "Curve admin invited" : "Org user invited");
      setCreateOpen(false);
      resetCreateForm();
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Create New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                An invitation email will be sent. The user sets their own password on first sign-in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm font-medium">Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "org_user")}>
                  <SelectTrigger className="mt-2 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Curve Admin</SelectItem>
                    <SelectItem value="org_user">Organization User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <Input
                  className="mt-2 h-11"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Full name (optional)</Label>
                <Input
                  className="mt-2 h-11"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              {newRole === "org_user" && (
                <div>
                  <Label className="text-sm font-medium">Organization</Label>
                  <Select value={newOrgId} onValueChange={setNewOrgId}>
                    <SelectTrigger className="mt-2 h-11">
                      <SelectValue placeholder="Select an organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Module access</Label>
                <div className="mt-2 space-y-2 rounded-md border border-border p-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={newAllegiance} onCheckedChange={(v) => setNewAllegiance(!!v)} />
                    <span>Curve OS (Allegiance)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={newAcquisitions} onCheckedChange={(v) => setNewAcquisitions(!!v)} />
                    <span>Curve Acquisitions</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={newMarketing} onCheckedChange={(v) => setNewMarketing(!!v)} />
                    <span>Curve Marketing</span>
                  </label>
                  {!newAllegiance && !newAcquisitions && !newMarketing && (
                    <p className="text-xs text-destructive">Select at least one module.</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={createUser} disabled={creating || (!newAllegiance && !newAcquisitions)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {creating ? "Creating…" : "Create & Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="curve-card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Organization</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Module access</th>
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
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={r.module_access.includes("allegiance")}
                          disabled={savingModulesId === r.user_id}
                          onCheckedChange={(v) => toggleModule(r, "allegiance", !!v)}
                        />
                        <span>Curve OS</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={r.module_access.includes("acquisitions")}
                          disabled={savingModulesId === r.user_id}
                          onCheckedChange={(v) => toggleModule(r, "acquisitions", !!v)}
                        />
                        <span>Acquisitions</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.org_id && (
                        <Link
                          to={`/admin/org/${r.org_id}/branding`}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Customize branding for this organization"
                        >
                          <Palette className="h-3.5 w-3.5" /> Customize
                        </Link>
                      )}
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
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
