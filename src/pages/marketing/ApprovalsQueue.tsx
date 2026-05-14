import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Mail,
  Inbox,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

type Approval = {
  id: string;
  org_id: string;
  campaign_id: string | null;
  subject_type: string;
  design_id: string | null;
  email_send_id: string | null;
  current_stage: string;
  status: string;
  curve_decision: string | null;
  curve_review_notes: string | null;
  org_decision: string | null;
  org_review_notes: string | null;
  submitted_at: string;
  priority: string;
  org_name?: string | null;
  campaign_name?: string | null;
  design?: { name: string | null; preview_url: string | null; status: string } | null;
  email?: { subject: string | null; status: string } | null;
};

export default function ApprovalsQueue({ mode }: { mode: "curve" | "org" }) {
  const { user } = useAuth();
  const { orgId } = useEffectiveOrg();

  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>("pending");

  const [index, setIndex] = useState(0);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const active = items[index] ?? null;

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("approval_queue")
      .select(
        "id,org_id,campaign_id,subject_type,design_id,email_send_id,current_stage,status,curve_decision,curve_review_notes,org_decision,org_review_notes,submitted_at,priority"
      )
      .order("submitted_at", { ascending: false })
      .limit(200);

    if (mode === "curve") {
      if (stageFilter === "pending") q = q.eq("current_stage", "curve_review").eq("status", "pending");
      else if (stageFilter === "decided") q = q.in("status", ["approved", "rejected", "changes_requested"]);
    } else {
      if (orgId) q = q.eq("org_id", orgId);
      if (stageFilter === "pending") q = q.eq("current_stage", "org_review").eq("status", "pending");
      else if (stageFilter === "submitted") q = q.eq("current_stage", "curve_review").eq("status", "pending");
      else if (stageFilter === "decided") q = q.in("status", ["approved", "rejected"]);
    }

    const { data } = await q;
    const rows = (data ?? []) as Approval[];

    const orgIds = Array.from(new Set(rows.map((r) => r.org_id)));
    const designIds = rows.filter((r) => r.design_id).map((r) => r.design_id!) as string[];
    const emailIds = rows.filter((r) => r.email_send_id).map((r) => r.email_send_id!) as string[];
    const campaignIds = rows.filter((r) => r.campaign_id).map((r) => r.campaign_id!) as string[];

    const [{ data: orgs }, { data: ds }, { data: es }, { data: cs }] = await Promise.all([
      orgIds.length ? supabase.from("organizations").select("id,name").in("id", orgIds) : Promise.resolve({ data: [] }),
      designIds.length ? supabase.from("designs").select("id,name,preview_url,status").in("id", designIds) : Promise.resolve({ data: [] }),
      emailIds.length ? supabase.from("org_email_sends").select("id,subject,status").in("id", emailIds) : Promise.resolve({ data: [] }),
      campaignIds.length ? supabase.from("campaigns").select("id,name").in("id", campaignIds) : Promise.resolve({ data: [] }),
    ]);
    const oMap = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));
    const dMap = new Map((ds ?? []).map((d: any) => [d.id, d]));
    const eMap = new Map((es ?? []).map((e: any) => [e.id, e]));
    const cMap = new Map((cs ?? []).map((c: any) => [c.id, c.name]));

    setItems(
      rows.map((r) => ({
        ...r,
        org_name: oMap.get(r.org_id) ?? null,
        campaign_name: r.campaign_id ? cMap.get(r.campaign_id) ?? null : null,
        design: r.design_id ? dMap.get(r.design_id) ?? null : null,
        email: r.email_send_id ? eMap.get(r.email_send_id) ?? null : null,
      }))
    );
    setIndex(0);
    setDecisionNotes("");
    setLoading(false);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [mode, stageFilter, orgId]);

  const decide = async (decision: "approved" | "rejected" | "changes_requested") => {
    if (!active || !user) return;
    setBusy(true);

    const updates: any = {};
    if (mode === "curve") {
      updates.curve_reviewer_id = user.id;
      updates.curve_reviewed_at = new Date().toISOString();
      updates.curve_review_notes = decisionNotes || null;
      updates.curve_decision = decision;
      if (decision === "approved") {
        updates.current_stage = "org_review";
        updates.status = "pending";
      } else {
        updates.status = decision === "rejected" ? "rejected" : "changes_requested";
        updates.finalized_at = new Date().toISOString();
      }
    } else {
      updates.org_reviewer_id = user.id;
      updates.org_reviewed_at = new Date().toISOString();
      updates.org_review_notes = decisionNotes || null;
      updates.org_decision = decision;
      updates.status = decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "changes_requested";
      updates.finalized_at = new Date().toISOString();

      if (decision === "approved") {
        if (active.design_id) {
          await supabase
            .from("designs")
            .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
            .eq("id", active.design_id);
        }
        if (active.email_send_id) {
          await supabase.from("org_email_sends").update({ status: "approved" }).eq("id", active.email_send_id);
        }
      }
    }

    const { error } = await supabase.from("approval_queue").update(updates).eq("id", active.id);
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    await supabase.from("approval_comments").insert({
      approval_id: active.id,
      author_id: user.id,
      author_role: mode === "curve" ? "curve_admin" : "org",
      comment_type: decision === "approved" ? "approval" : decision === "rejected" ? "rejection" : "change_request",
      comment_text: decisionNotes || (decision === "approved" ? "Approved." : decision === "rejected" ? "Rejected." : "Changes requested."),
    });

    setBusy(false);
    toast.success(`${decision === "approved" ? "✓ Approved" : decision === "rejected" ? "Rejected" : "Changes requested"}`);

    // Pop the card off the stack
    setItems((prev) => prev.filter((p) => p.id !== active.id));
    setDecisionNotes("");
    setIndex((i) => Math.min(i, items.length - 2));
  };

  const stageLabel = (a: Approval) => {
    if (a.status !== "pending") return a.status;
    return a.current_stage === "curve_review" ? "Awaiting Curve" : "Awaiting your team";
  };

  const canDecide = useMemo(() => {
    if (!active || active.status !== "pending") return false;
    return (mode === "curve" && active.current_stage === "curve_review") ||
      (mode === "org" && active.current_stage === "org_review");
  }, [active, mode]);

  // Keyboard shortcuts: A approve, R reject, C changes, ←/→ navigate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (!active) return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, items.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      else if (canDecide && (e.key === "a" || e.key === "A")) decide("approved");
      else if (canDecide && (e.key === "r" || e.key === "R")) decide("rejected");
      else if (canDecide && (e.key === "c" || e.key === "C")) decide("changes_requested");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [active, items.length, canDecide]);

  return (
    <AppShell title={mode === "curve" ? "Curve Approval Queue" : "Approvals"}>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {mode === "curve" ? "Curve approval queue" : "Approvals"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {mode === "curve"
              ? "Swipe through org submissions. A=approve, R=reject, C=changes, ←/→ navigate."
              : "Tap through assets cleared by Curve. A=approve, R=reject, C=changes."}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-1" />Refresh
        </Button>
      </div>

      <Card className="p-3 mb-4 flex gap-2 flex-wrap">
        {mode === "curve" ? (
          <>
            <Button size="sm" variant={stageFilter === "pending" ? "default" : "outline"} onClick={() => setStageFilter("pending")}>Pending Curve</Button>
            <Button size="sm" variant={stageFilter === "decided" ? "default" : "outline"} onClick={() => setStageFilter("decided")}>Decided</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant={stageFilter === "pending" ? "default" : "outline"} onClick={() => setStageFilter("pending")}>Awaiting your team</Button>
            <Button size="sm" variant={stageFilter === "submitted" ? "default" : "outline"} onClick={() => setStageFilter("submitted")}>With Curve</Button>
            <Button size="sm" variant={stageFilter === "decided" ? "default" : "outline"} onClick={() => setStageFilter("decided")}>Decided</Button>
          </>
        )}
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-semibold">All clear ✨</p>
          <p className="text-sm text-muted-foreground mt-1">Nothing waiting on you. Go enjoy practice.</p>
        </Card>
      ) : !active ? null : (
        <>
          {/* Stack indicator */}
          <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
            <span className="font-mono">{index + 1} / {items.length}</span>
            <div className="flex gap-1">
              {items.slice(0, 12).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-6 rounded-full ${i === index ? "bg-primary" : "bg-muted"}`}
                />
              ))}
              {items.length > 12 && <span className="ml-1">…</span>}
            </div>
          </div>

          {/* Card stack */}
          <div className="relative">
            {/* Background cards (peek) */}
            {items[index + 1] && (
              <Card className="absolute inset-0 translate-y-3 scale-[0.97] opacity-50 pointer-events-none" />
            )}
            {items[index + 2] && (
              <Card className="absolute inset-0 translate-y-6 scale-[0.94] opacity-25 pointer-events-none" />
            )}

            <Card key={active.id} className="relative p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Preview */}
                <div>
                  {active.design_id ? (
                    <Link
                      to={`/marketing/designs/${active.design_id}`}
                      className="block aspect-square bg-muted rounded-lg overflow-hidden border border-border"
                    >
                      {active.design?.preview_url ? (
                        <img src={active.design.preview_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg p-6 flex flex-col justify-center border border-border">
                      <Mail className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="font-medium text-lg">{active.email?.subject ?? "Email"}</p>
                      <p className="text-xs text-muted-foreground mt-1">Status: {active.email?.status}</p>
                    </div>
                  )}
                </div>

                {/* Meta + actions */}
                <div className="space-y-4 flex flex-col">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {active.subject_type}
                      </span>
                      {active.priority !== "normal" && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                          {active.priority}
                        </span>
                      )}
                      <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        {stageLabel(active)}
                      </span>
                    </div>
                    <h2 className="font-display text-xl font-bold">
                      {active.design?.name ?? active.email?.subject ?? "Untitled"}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mode === "curve" && active.org_name ? `${active.org_name} · ` : ""}
                      {active.campaign_name ? `Campaign: ${active.campaign_name} · ` : ""}
                      Submitted {new Date(active.submitted_at).toLocaleDateString()}
                    </p>
                  </div>

                  {active.curve_review_notes && (
                    <div className="text-sm p-3 rounded bg-muted/50 border border-border">
                      <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">Curve notes</p>
                      <p>{active.curve_review_notes}</p>
                    </div>
                  )}
                  {active.org_review_notes && (
                    <div className="text-sm p-3 rounded bg-muted/50 border border-border">
                      <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">Org notes</p>
                      <p>{active.org_review_notes}</p>
                    </div>
                  )}

                  {canDecide ? (
                    <div className="space-y-2 pt-2 border-t border-border mt-auto">
                      <Textarea
                        rows={2}
                        placeholder="Notes (optional)…"
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Button onClick={() => decide("approved")} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                          <kbd className="ml-1 hidden md:inline text-[10px] opacity-70">A</kbd>
                        </Button>
                        <Button onClick={() => decide("changes_requested")} disabled={busy} variant="outline">
                          Changes
                          <kbd className="ml-1 hidden md:inline text-[10px] opacity-70">C</kbd>
                        </Button>
                        <Button onClick={() => decide("rejected")} disabled={busy} variant="destructive">
                          <XCircle className="h-4 w-4 mr-1" />Reject
                          <kbd className="ml-1 hidden md:inline text-[10px] opacity-70">R</kbd>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto p-3 rounded bg-muted/30 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4 inline mr-1" />
                      Read-only — this asset isn't waiting on your decision.
                    </div>
                  )}
                </div>
              </div>

              {/* Nav arrows */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                  disabled={index === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />Prev
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIndex((i) => Math.min(i + 1, items.length - 1))}
                  disabled={index === items.length - 1}
                >
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
