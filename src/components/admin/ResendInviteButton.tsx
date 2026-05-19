import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MailPlus, Copy, CheckCircle2, RefreshCw } from "lucide-react";

/**
 * "Send invite email again" — regenerates a fresh single-use invite/magic-link
 * token via the admin-invite-link edge function and resends the activation
 * email to the org's primary contact. Safe to click repeatedly: each call
 * mints a brand-new token (the previous one is invalidated by Supabase).
 */
export default function ResendInviteButton({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ url: string; wasConfirmed: boolean; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("name, email, contact_name, primary_user_id")
        .eq("id", orgId)
        .maybeSingle();
      if (!data) return;
      setOrgName(data.name ?? "");
      setContactName(data.contact_name ?? null);
      // Prefer primary user's auth email if linked, else fall back to org.email
      if (data.primary_user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", data.primary_user_id)
          .maybeSingle();
        setEmail(prof?.email ?? data.email ?? null);
      } else {
        setEmail(data.email ?? null);
      }
    })();
  }, [orgId]);

  const send = async () => {
    if (!email) {
      toast.error("No primary contact email on file for this organization");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-link", {
        body: { email, redirect_to: `${window.location.origin}/` },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any)?.action_link as string;
      const emailSent = !!(data as any)?.sent_email;
      const wasConfirmed = !!(data as any)?.was_confirmed;
      setResult({ url, wasConfirmed, emailSent });
      setOpen(true);
      toast.success(emailSent ? "Invite email sent" : "Link generated (email send failed — copy & share)");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to send invite email");
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!email) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={send}
        disabled={sending}
        className="gap-1.5"
        title={`Send a fresh activation email to ${email}`}
      >
        {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <MailPlus className="h-3.5 w-3.5" />}
        {sending ? "Sending…" : "Send invite email"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Fresh invite sent
            </DialogTitle>
            <DialogDescription>
              A new single-use activation link was emailed to{" "}
              <strong>{contactName ? `${contactName} (${email})` : email}</strong>
              {orgName ? ` for ${orgName}` : ""}. Any previous link is now invalid.
              {result?.wasConfirmed ? (
                <> The user already has an account — this is a one-tap sign-in link.</>
              ) : (
                <> Clicking it will take them through password setup, then intake.</>
              )}
            </DialogDescription>
          </DialogHeader>

          {result?.emailSent === false && (
            <p className="text-xs rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-700">
              Email delivery returned an error. Copy the link below and send it via text/DM as a fallback.
            </p>
          )}

          <div className="space-y-2 py-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">One-tap activation link</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={result?.url ?? ""}
                className="font-mono text-xs h-10"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button type="button" onClick={copy} className="h-10 shrink-0">
                {copied ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Single-use. If an email scanner clicks it first, just hit "Send invite email" again to mint a new one.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={send}
              disabled={sending}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
              Send another
            </Button>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
