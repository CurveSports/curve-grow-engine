import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Image as ImageIcon, Mail, Inbox, MessageSquare } from "lucide-react";

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

type Comment = {
  id: string;
  comment_text: string;
  comment_type: string;
  author_role: string | null;
  created_at: string;
};

export default function ApprovalsQueue({ mode }: { mode: "curve" | "org" }) {
  const { profile, user, role } = useAuth();
  const { orgId } = useEffectiveOrg();

  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>("pending");

  const [active, setActive] = useState<Approval | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("approval_queue")
      .select("id,org_id,campaign_id,subject_type,design_id,email_send_id,current_stage,status,curve_decision,curve_review_notes,org_decision,org_review_notes,submitted_at,priority")
      .order("submitted_at", { ascending: false })
      .limit(200);

    if (mode === "curve") {
      // Curve admins see only items currently in curve_review
      if (stageFilter === "pending") q = q.eq("current_stage", "curve_review").eq("status", "pending");
      else if (stageFilter === "decided") q = q.in("status", ["approved", "rejected", "changes_requested"]);
    } else {
      // Org sees items in their org. Filter by stage they care about.
      if (orgId) q = q.eq("org_id", orgId);
      if (stageFilter === "pending") q = q.eq("current_stage", "org_review").eq("status", "pending");
      else if (stageFilter === "submitted") q = q.eq("current_stage", "curve_review").eq("status", "pending");
      else if (stageFilter === "decided") q = q.in("status", ["approved", "rejected"]);
    }

    const { data } = await q;
    const rows = (data ?? []) as Approval[];

    // Hydrate
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

    setItems(rows.map((r) => ({
      ...r,
      org_name: oMap.get(r.org_id) ?? null,
      campaign_name: r.campaign_id ? cMap.get(r.campaign_id) ?? null : null,
      design: r.design_id ? dMap.get(r.design_id) ?? null : null,
      email: r.email_send_id ? eMap.get(r.email_send_id) ?? null : null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mode, stageFilter, orgId]);

  const openItem = async (a: Approval) => {
    setActive(a);
    setDecisionNotes("");
    setNewComment("");
    const { data } = await supabase
      .from("approval_comments")
      .select("id,comment_text,comment_type,author_role,created_at")
      .eq("approval_id", a.id)
      .order("created_at");
    setComments((data ?? []) as Comment[]);
  };

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

      // If org approves, mark the underlying design / email as approved
      if (decision === "approved") {
        if (active.design_id) {
          await supabase.from("designs").update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() }).eq("id", active.design_id);
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

    // Log a comment for the decision
    await supabase.from("approval_comments").insert({
      approval_id: active.id,
      author_id: user.id,
      author_role: mode === "curve" ? "curve_admin" : "org",
      comment_type: decision === "approved" ? "approval" : decision === "rejected" ? "rejection" : "change_request",
      comment_text: decisionNotes || (decision === "approved" ? "Approved." : decision === "rejected" ? "Rejected." : "Changes requested."),
    });

    setBusy(false);
    toast.success(`Marked ${decision.replace("_", " ")}`);
    setActive(null);
    load();
  };

  const addComment = async () => {
    if (!active || !user || !newComment.trim()) return;
    const { error } = await supabase.from("approval_comments").insert({
      approval_id: active.id,
      author_id: user.id,
      author_role: mode === "curve" ? "curve_admin" : "org",
      comment_text: newComment.trim(),
      comment_type: "comment",
    });
    if (error) return toast.error(error.message);
    setNewComment("");
    const { data } = await supabase.from("approval_comments").select("id,comment_text,comment_type,author_role,created_at").eq("approval_id", active.id).order("created_at");
    setComments((data ?? []) as Comment[]);
  };

  const stageLabel = (a: Approval) => {
    if (a.status !== "pending") return a.status;
    return a.current_stage === "curve_review" ? "Awaiting Curve" : "Awaiting your team";
  };

  return (
    <AppShell title={mode === "curve" ? "Curve Approval Queue" : "Approvals"}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {mode === "curve" ? "Curve approval queue" : "Approvals"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {mode === "curve"
            ? "Review and approve org-submitted assets before they return for final org sign-off."
            : "Final review for assets that have cleared Curve review."}
        </p>
      </div>

      <Card className="p-3 mb-4 flex gap-2 flex-wrap">
        {mode === "curve" ? (
          <>
            <Button size="sm" variant={stageFilter === "pending" ? "default" : "outline"} onClick={() => setStageFilter("pending")}>Pending Curve</Button>
            <Button size="sm" variant={stageFilter === "decided" ? "default" : "outline"} onClick={() => setStageFilter("decided")}>Decided</Button>
            <Button size="sm" variant={stageFilter === "all" ? "default" : "outline"} onClick={() => setStageFilter("all")}>All</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant={stageFilter === "pending" ? "default" : "outline"} onClick={() => setStageFilter("pending")}>Awaiting your team</Button>
            <Button size="sm" variant={stageFilter === "submitted" ? "default" : "outline"} onClick={() => setStageFilter("submitted")}>With Curve</Button>
            <Button size="sm" variant={stageFilter === "decided" ? "default" : "outline"} onClick={() => setStageFilter("decided")}>Decided</Button>
            <Button size="sm" variant={stageFilter === "all" ? "default" : "outline"} onClick={() => setStageFilter("all")}>All</Button>
          </>
        )}
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-display font-semibold">Nothing in this queue</p>
          <p className="text-sm text-muted-foreground mt-1">You're all caught up.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <button key={a.id} onClick={() => openItem(a)} className="w-full text-left">
              <Card className="p-4 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4">
                <div className="h-14 w-14 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {a.design?.preview_url ? <img src={a.design.preview_url} alt="" className="w-full h-full object-cover" /> : a.subject_type === "email" ? <Mail className="h-6 w-6 text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{a.design?.name ?? a.email?.subject ?? "Untitled"}</p>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a.subject_type}</span>
                    {a.priority !== "normal" && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{a.priority}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mode === "curve" && a.org_name ? `${a.org_name} · ` : ""}{a.campaign_name ? `Campaign: ${a.campaign_name} · ` : ""}Submitted {new Date(a.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider font-bold px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {stageLabel(a)}
                  </span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Detail / decision dialog */}
      <Dialog open={!!active} onOpenChange={(o) => { if (!o) setActive(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.design?.name ?? active.email?.subject ?? "Review asset"}</DialogTitle>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  {active.design_id ? (
                    <Link to={`/marketing/designs/${active.design_id}`} className="block aspect-square bg-muted rounded overflow-hidden border border-border">
                      {active.design?.preview_url ? <img src={active.design.preview_url} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-10 w-10 text-muted-foreground" /></div>}
                    </Link>
                  ) : (
                    <div className="p-6 bg-muted rounded text-sm">
                      <Mail className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="font-medium">{active.email?.subject ?? "Email"}</p>
                      <p className="text-xs text-muted-foreground mt-1">Status: {active.email?.status}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">Stage</p>
                    <p>{stageLabel(active)}</p>
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

                  {/* Decision controls — only when this user is the active reviewer */}
                  {active.status === "pending" && (
                    (mode === "curve" && active.current_stage === "curve_review") ||
                    (mode === "org" && active.current_stage === "org_review")
                  ) && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Textarea rows={3} placeholder="Add notes for your decision (optional)…" value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
                      <div className="flex gap-2">
                        <Button onClick={() => decide("approved")} disabled={busy} className="flex-1"><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
                        <Button onClick={() => decide("changes_requested")} disabled={busy} variant="outline" className="flex-1">Request changes</Button>
                        <Button onClick={() => decide("rejected")} disabled={busy} variant="destructive"><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-2">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4" />Discussion ({comments.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
                  {comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  ) : comments.map((c) => (
                    <div key={c.id} className="text-sm p-2 rounded bg-muted/40">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                        {c.author_role === "curve_admin" ? "Curve" : "Org"} · {c.comment_type.replace("_", " ")} · {new Date(c.created_at).toLocaleString()}
                      </p>
                      <p>{c.comment_text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea rows={2} placeholder="Add a comment…" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                  <Button variant="outline" onClick={addComment} disabled={!newComment.trim()}>Post</Button>
                </div>
              </div>

              <DialogFooter><Button variant="outline" onClick={() => setActive(null)}>Close</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
