import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Copy, Check, Send, Loader2, ExternalLink, Mail, Link2, ClipboardCopy,
} from "lucide-react";
import { listPlatforms, platformMeta, type SendPlatform } from "@/lib/sendPlatforms";

type EmailConn = {
  id: string;
  provider: "gmail" | "outlook";
  email_address: string;
};

type Mode = "copy_paste" | "personal";

export default function SendHandoffModal({
  open, onOpenChange, orgId, userId,
  draft, communicationType, calendarItemId,
  defaultRecipient, defaultSubject,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId: string;
  userId: string;
  draft: string;                       // body text (may include "Subject:" first line)
  communicationType: string;
  calendarItemId?: string | null;
  defaultRecipient?: string;
  defaultSubject?: string;
  onSent?: () => void;
}) {
  // Parse subject from "Subject: …" first line if present
  const parsed = useMemo(() => {
    const lines = draft.split("\n");
    const first = lines[0]?.trim() ?? "";
    if (/^subject:/i.test(first)) {
      return {
        subject: first.replace(/^subject:\s*/i, "").trim(),
        body: lines.slice(1).join("\n").replace(/^\s*\n/, ""),
      };
    }
    return { subject: defaultSubject ?? "", body: draft };
  }, [draft, defaultSubject]);

  const [subject, setSubject] = useState(parsed.subject);
  const [body, setBody] = useState(parsed.body);
  const [recipient, setRecipient] = useState(defaultRecipient ?? "");
  const [platforms, setPlatforms] = useState<SendPlatform[]>([]);
  const [conns, setConns] = useState<EmailConn[]>([]);
  const [mode, setMode] = useState<Mode>("copy_paste");
  const [chosenConnId, setChosenConnId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"subject" | "body" | "all" | null>(null);
  const [logging, setLogging] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubject(parsed.subject);
    setBody(parsed.body);
    setRecipient(defaultRecipient ?? "");
    setMode("copy_paste");
    setChosenConnId(null);
    (async () => {
      const [plats, { data: c }] = await Promise.all([
        listPlatforms(orgId),
        supabase
          .from("user_email_connections")
          .select("id, provider, email_address")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("connected_at", { ascending: false }),
      ]);
      setPlatforms(plats);
      setConns((c ?? []) as EmailConn[]);
      if (c && c.length > 0) setChosenConnId(c[0].id);
    })();
  }, [open, orgId, userId, parsed.subject, parsed.body, defaultRecipient]);

  async function copyText(text: string, field: "subject" | "body" | "all") {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  async function logSend(channel: "copy_paste" | "gmail" | "outlook" | "platform", platformId?: string) {
    await supabase.from("org_communication_log").insert({
      org_id: orgId,
      generated_by: userId,
      generated_on_behalf_of_org: false,
      communication_type: communicationType,
      sent_at: new Date().toISOString(),
      send_channel: channel,
      send_platform_id: platformId ?? null,
      send_recipient: recipient || null,
      send_subject: subject || null,
      send_body_excerpt: body.slice(0, 500),
      calendar_item_id: calendarItemId ?? null,
    });
    if (calendarItemId) {
      await supabase.from("org_calendar_items").update({
        is_sent: true,
        sent_at: new Date().toISOString(),
        sent_by: userId,
      }).eq("id", calendarItemId);
    }
  }

  async function markSent() {
    setLogging(true);
    try {
      await logSend("copy_paste");
      toast.success("Marked as sent");
      onSent?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to log send");
    } finally {
      setLogging(false);
    }
  }

  async function openPlatform(p: SendPlatform) {
    window.open(p.url, "_blank", "noopener,noreferrer");
    await logSend("platform", p.id);
    if (calendarItemId) onSent?.();
    toast.success(`Opened ${p.label} — message logged`);
  }

  async function sendViaInbox() {
    const conn = conns.find((c) => c.id === chosenConnId);
    if (!conn) return;
    if (!recipient.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-send", {
        body: {
          connectionId: conn.id,
          orgId,
          to: recipient,
          subject,
          body,
          calendarItemId: calendarItemId ?? null,
          communicationType,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Sent from ${conn.email_address}`);
      onSent?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const fullText = subject ? `Subject: ${subject}\n\n${body}` : body;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Send this message
          </DialogTitle>
          <DialogDescription>
            Pick how you want to send. Most parent-list comms go through your team platform — use the quick links below.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 border-b border-border pb-3">
          <ModeBtn active={mode === "copy_paste"} onClick={() => setMode("copy_paste")}>
            <ClipboardCopy className="h-3.5 w-3.5 mr-1.5" /> Copy / open platform
          </ModeBtn>
          {conns.length > 0 && (
            <ModeBtn active={mode === "personal"} onClick={() => setMode("personal")}>
              <Mail className="h-3.5 w-3.5 mr-1.5" /> Send from my inbox
            </ModeBtn>
          )}
        </div>

        {/* Recipient + subject + body editors */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="hf-to">To {mode === "personal" && <span className="text-warning">*</span>}</Label>
            <Input
              id="hf-to"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={mode === "personal" ? "name@example.com" : "Recipient hint (e.g. All Parents · Youth Track)"}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="hf-sub">Subject</Label>
              <button
                onClick={() => copyText(subject, "subject")}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                {copiedField === "subject" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedField === "subject" ? "Copied" : "Copy"}
              </button>
            </div>
            <Input id="hf-sub" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="hf-body">Message</Label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => copyText(body, "body")}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {copiedField === "body" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedField === "body" ? "Copied" : "Copy body"}
                </button>
                <button
                  onClick={() => copyText(fullText, "all")}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {copiedField === "all" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedField === "all" ? "Copied" : "Copy all"}
                </button>
              </div>
            </div>
            <Textarea id="hf-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[200px] font-mono text-sm" />
          </div>
        </div>

        {/* Mode-specific actions */}
        {mode === "copy_paste" && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Link2 className="h-3 w-3 inline mr-1" /> Open in your platform
              </p>
              <a href="/settings?tab=sending" className="text-xs text-accent hover:underline">Manage platforms</a>
            </div>

            {platforms.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No sending platforms configured yet. Add SportsEngine, LeagueApps, etc. in
                {" "}<a href="/settings?tab=sending" className="text-accent underline">Settings → Sending platforms</a>{" "}
                so you can launch them in one click here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => {
                  const meta = platformMeta(p.platform_type);
                  return (
                    <Button
                      key={p.id}
                      variant="outline"
                      size="sm"
                      onClick={() => openPlatform(p)}
                      className="text-xs"
                    >
                      <span className="mr-1.5">{meta.emoji}</span>
                      {p.label}
                      <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={markSent} disabled={logging}>
                {logging ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                Mark as sent
              </Button>
            </div>
          </div>
        )}

        {mode === "personal" && conns.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">From</p>
              <div className="flex flex-wrap gap-2">
                {conns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChosenConnId(c.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                      chosenConnId === c.id
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-card text-foreground border-border hover:border-accent/50",
                    )}
                  >
                    {c.provider === "gmail" ? "✉️" : "📧"} {c.email_address}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={sendViaInbox} disabled={sending || !chosenConnId || !recipient.trim()}>
                {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Send now
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-md transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}
