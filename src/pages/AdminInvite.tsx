import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ORG_TYPES } from "@/lib/intakeOptions";
import { Copy, CheckCircle2, Mail, RefreshCw } from "lucide-react";

// Curve Admin: create an organization and invite the primary user via magic link.
export default function AdminInvite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cityState, setCityState] = useState("");
  const [orgType, setOrgType] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createdOrgName, setCreatedOrgName] = useState<string>("");
  const [regenerating, setRegenerating] = useState(false);

  const copyUrl = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = async () => {
    if (!email) return;
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-link", {
        body: { email: email.trim(), redirect_to: `${window.location.origin}/` },
      });
      if (error) throw error;
      const url = (data as any)?.action_link as string | undefined;
      if (!url) throw new Error("No link returned");
      setInviteUrl(url);
      toast.success("Fresh single-use link generated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to regenerate link");
    } finally {
      setRegenerating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .insert({
          name: name.trim(),
          contact_name: contactName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          city_state: cityState.trim() || null,
          org_type: orgType || null,
        })
        .select()
        .single();
      if (orgErr) throw orgErr;

      const { error: invErr } = await supabase.from("invitations").insert({
        email: email.trim(),
        org_id: org.id,
        role: "org_user",
        is_primary: true,
        invited_by: user?.id,
      });
      if (invErr) throw invErr;

      // Generate invite link via admin edge function (also sends the email)
      const { data: linkRes, error: linkErr } = await supabase.functions.invoke("admin-invite-link", {
        body: { email: email.trim(), redirect_to: `${window.location.origin}/` },
      });
      if (linkErr) console.warn("Invite link warning:", linkErr.message);
      const url = (linkRes as any)?.action_link as string | undefined;
      const emailSent = !!(linkRes as any)?.sent_email;
      const emailError = (linkRes as any)?.email_error as string | undefined;

      if (emailSent) {
        toast.success("Organization created — invitation sent");
      } else {
        toast.error(`Organization created, but email failed: ${emailError ?? "unknown error"}`, { duration: 12000 });
      }
      setCreatedOrgName(name.trim());
      if (url) {
        setInviteUrl(url);
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to create organization");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <p className="curve-eyebrow mb-2">Curve Admin</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-2">New organization</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Create a client organization and send a magic-link invitation to the primary contact.
        </p>

        <form onSubmit={submit} className="curve-card space-y-5">
          <div>
            <Label className="text-sm font-medium">Organization Name</Label>
            <Input className="mt-2" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Primary Contact Name</Label>
              <Input className="mt-2" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium">Primary Contact Email</Label>
              <Input className="mt-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium">Phone</Label>
              <Input className="mt-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium">City / State</Label>
              <Input className="mt-2" value={cityState} onChange={(e) => setCityState(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-sm font-medium">Organization Type</Label>
              <Select value={orgType || undefined} onValueChange={setOrgType}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate("/admin")}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {submitting ? "Creating…" : "Create & send invite"}
            </Button>
          </div>
        </form>
      </div>

      <Dialog open={!!inviteUrl} onOpenChange={(o) => { if (!o) { setInviteUrl(null); navigate("/admin"); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              {createdOrgName} is live
            </DialogTitle>
            <DialogDescription>
              Copy the one-tap sign-in link below as a backup. If email delivery fails,
              this link lets you text or DM access directly to <strong>{email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">One-tap sign-in link</Label>
              <div className="mt-1.5 flex gap-2">
                <Input readOnly value={inviteUrl ?? ""} className="font-mono text-xs h-10" onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" onClick={copyUrl} className="h-10 shrink-0">
                  {copied ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
                <Mail className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  Single-use link. Email scanners sometimes click it first and
                  burn the token — if the recipient lands on the login screen,
                  hit <strong>Regenerate</strong> below and resend a fresh one.
                </span>
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={regenerate} disabled={regenerating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Generating…" : "Regenerate link"}
            </Button>
            <Button variant="outline" onClick={() => { setInviteUrl(null); navigate("/admin"); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
