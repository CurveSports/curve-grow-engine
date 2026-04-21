import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

// Org primary user: invite peers to their organization
export default function Team() {
  const { user, profile, isPrimary } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const load = async () => {
    if (!profile?.org_id) return;
    const [{ data: inv }, { data: mem }] = await Promise.all([
      supabase.from("invitations").select("*").eq("org_id", profile.org_id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, email, full_name").eq("org_id", profile.org_id),
    ]);
    setInvites(inv ?? []);
    setMembers(mem ?? []);
  };

  useEffect(() => { load(); }, [profile?.org_id]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("invitations").insert({
        email: email.trim(),
        org_id: profile.org_id,
        role: "org_user",
        is_primary: false,
        invited_by: user?.id,
      });
      if (error) throw error;
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (otpErr) console.warn(otpErr.message);
      toast.success("Invitation sent");
      setEmail("");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to invite");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isPrimary) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Only the organization's primary contact can manage team members.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <p className="curve-eyebrow mb-2">Team</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Manage your team</h1>
          <p className="text-sm text-muted-foreground mt-1">Invite additional people from your organization to access this workspace.</p>
        </div>

        <form onSubmit={invite} className="curve-card flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Label className="text-sm font-medium">Email address</Label>
            <Input className="mt-2 h-11" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@yourclub.com" />
          </div>
          <Button type="submit" disabled={submitting} className="h-11 bg-accent text-accent-foreground hover:bg-accent/90">
            {submitting ? "Sending…" : "Send invite"}
          </Button>
        </form>

        <section>
          <h2 className="curve-eyebrow mb-3">Members</h2>
          <div className="curve-card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {members.length === 0 && (
                  <tr><td className="px-5 py-6 text-sm text-muted-foreground">No members yet.</td></tr>
                )}
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td className="px-5 py-3">{m.full_name ?? m.email}</td>
                    <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="curve-eyebrow mb-3">Invitations</h2>
          <div className="curve-card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {invites.length === 0 && (
                  <tr><td className="px-5 py-6 text-sm text-muted-foreground">No invitations yet.</td></tr>
                )}
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td className="px-5 py-3">{i.email}</td>
                    <td className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">{i.status}</td>
                    <td className="px-5 py-3 text-muted-foreground text-right">{formatDate(i.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
