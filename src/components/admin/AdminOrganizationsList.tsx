import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Org = { id: string; name: string; member_count: number };

export default function AdminOrganizationsList() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: orgsData }, { data: profiles }] = await Promise.all([
      supabase.from("organizations").select("id, name").order("name"),
      supabase.from("profiles").select("org_id"),
    ]);
    const counts = new Map<string, number>();
    for (const p of (profiles ?? []) as any[]) {
      if (!p.org_id) continue;
      counts.set(p.org_id, (counts.get(p.org_id) ?? 0) + 1);
    }
    setOrgs(((orgsData ?? []) as any[]).map((o) => ({
      id: o.id, name: o.name, member_count: counts.get(o.id) ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteOrg = async (org: Org) => {
    setDeletingId(org.id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-organization", {
        body: { org_id: org.id },
      });
      if (error) throw error;
      if ((data as any)?.partial_errors?.length) {
        console.warn("Partial errors deleting org:", (data as any).partial_errors);
      }
      toast.success(`Organization "${org.name}" deleted`);
      setOpenId(null);
      setConfirmText("");
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to delete organization");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = orgs.filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase()));

  if (loading) return <p className="text-sm text-muted-foreground">Loading organizations…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Organizations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Permanently delete an organization and all of its members and data.
          </p>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="h-9 pl-9 w-56"
          />
        </div>
      </div>

      <div className="curve-card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">Organization</th>
              <th className="px-5 py-3 font-medium">Members</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-secondary/40">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-accent" />
                    <span className="font-medium">{o.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{o.member_count}</td>
                <td className="px-5 py-3 text-right">
                  <AlertDialog
                    open={openId === o.id}
                    onOpenChange={(open) => {
                      setOpenId(open ? o.id : null);
                      if (!open) setConfirmText("");
                    }}
                  >
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{o.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the organization, all {o.member_count} member account{o.member_count === 1 ? "" : "s"}, and all of its data
                          (intake, projects, tasks, notes, communications, sponsorships, revenue share, branding, etc.).
                          This <strong>cannot be undone</strong>.
                          <br /><br />
                          Type the organization name <strong>{o.name}</strong> to confirm:
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={o.name}
                        className="h-10"
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={confirmText !== o.name || deletingId === o.id}
                          onClick={(e) => { e.preventDefault(); deleteOrg(o); }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingId === o.id ? "Deleting…" : "Permanently delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-muted-foreground">No organizations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
