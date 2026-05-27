import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  MailPlus, Copy, CheckCircle2, RefreshCw, AlertTriangle, ChevronDown, History,
} from "lucide-react";
import { format } from "date-fns";

type LogRow = {
  id: string;
  created_at: string;
  link_type: string | null;
  sent_email: boolean;
  email_error: string | null;
  user_existed: boolean | null;
  was_confirmed: boolean | null;
};

/**
 * "Send invite email again" + admin-facing diagnostics.
 * Surfaces the live error message returned by the admin-invite-link edge
 * function (missing email credentials, malformed headers, provider 4xx, etc.)
 * and shows recent attempts pulled from invite_send_log.
 */
export default function ResendInviteButton({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{
    url: string; wasConfirmed: boolean; emailSent: boolean; emailError: string | null; linkType: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<LogRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const loadHistory = async () => {
    const { data } = await supabase
      .from("invite_send_log")
      .select("id, created_at, link_type, sent_email, email_error, user_existed, was_confirmed")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory((data ?? []) as LogRow[]);
  };

  const send = async () => {
    if (!email) {
      toast.error("No primary contact email on file for this organization");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-link", {
        body: { email, redirect_to: `${window.location.origin}/`, org_id: orgId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const url = (data as any)?.action_link as string;
      const emailSent = !!(data as any)?.sent_email;
      const emailError = ((data as any)?.email_error as string | null) ?? null;
      const wasConfirmed = !!(data as any)?.was_confirmed;
      const linkType = ((data as any)?.link_type as string | null) ?? null;
      setResult({ url, wasConfirmed, emailSent, emailError, linkType });
      setOpen(true);
      void loadHistory();
      if (emailSent) toast.success("Invite email sent");
      else toast.error(`Email send failed: ${emailError ?? "unknown error"}`);
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

  const errorHint = (msg: string | null): string | null => {
    if (!msg) return null;
    const lower = msg.toLowerCase();
    if (lower.includes("lovable_api_key not configured"))
      return "Lovable Cloud email credentials are missing. Check Cloud → Emails and retry.";
    if (lower.includes("resend_api_key not configured"))
      return "Legacy email secret is missing. This invite flow now uses Lovable Cloud email; retry the send.";
    if (lower.includes("bytestring") || lower.includes("headers"))
      return "An email credential header was malformed. Re-enter the related secret without trailing newlines.";
    if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("invalid api key"))
      return "The email provider rejected the configured API key. Retry now that invite email uses Lovable Cloud email.";
    if (lower.includes("domain") && lower.includes("verified"))
      return "The sender domain is not verified. Check Cloud → Emails for domain status.";
    if (lower.includes("rate")) return "Email sending was rate-limited. Wait a minute and retry.";
    return null;
  };

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

      <Dialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (o) void loadHistory(); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result?.emailSent ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              {result?.emailSent ? "Fresh invite sent" : "Link generated — email did not send"}
            </DialogTitle>
            <DialogDescription>
              {result?.emailSent ? (
                <>A new single-use activation link was emailed to <strong>{contactName ? `${contactName} (${email})` : email}</strong>{orgName ? ` for ${orgName}` : ""}. Any previous link is now invalid.</>
              ) : (
                <>The link below is valid but the email provider returned an error. Copy and share it manually as a fallback.</>
              )}
            </DialogDescription>
          </DialogHeader>

          {result?.emailError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Edge function error
              </p>
              <p className="text-xs font-mono text-destructive break-all">{result.emailError}</p>
              {errorHint(result.emailError) && (
                <p className="text-xs text-muted-foreground pt-1 border-t border-destructive/20">
                  <strong>Fix:</strong> {errorHint(result.emailError)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 py-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              One-tap activation link
              {result?.linkType && (
                <span className="ml-2 normal-case font-normal text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                  {result.linkType}
                </span>
              )}
            </Label>
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
              Single-use. If an email scanner clicks it first, hit "Send another" below.
            </p>
          </div>

          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8">
                <span className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Recent attempts ({history.length})
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No attempts logged yet.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto border border-border rounded-md divide-y divide-border">
                  {history.map((row) => (
                    <div key={row.id} className="px-2.5 py-2 text-xs flex items-start gap-2">
                      {row.sent_email ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">
                            {row.sent_email ? "Sent" : "Failed"}
                            {row.link_type && <span className="text-muted-foreground font-normal"> · {row.link_type}</span>}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {format(new Date(row.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        {row.email_error && (
                          <p className="text-destructive font-mono text-[11px] mt-0.5 break-all line-clamp-2">
                            {row.email_error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

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
