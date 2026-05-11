import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Bell, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { isOverdue, statusPillClass, STATUS_LABEL } from "@/lib/compliance";

export default function StaffDetailPanel({ staffId, onClose, onChanged }: {
  staffId: string; onClose: () => void; onChanged: () => void;
}) {
  const [staff, setStaff] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [token, setToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: it }, { data: tk }] = await Promise.all([
      supabase.from("acquisition_staff").select("*").eq("id", staffId).maybeSingle(),
      supabase.from("acquisition_compliance_items").select("*").eq("staff_id", staffId).order("requirement_type"),
      supabase.from("acquisition_staff_tokens").select("*").eq("staff_id", staffId).maybeSingle(),
    ]);
    setStaff(s); setItems(it ?? []); setToken(tk);
    setLoading(false);
  };
  useEffect(() => { load(); }, [staffId]);

  const generateToken = async () => {
    if (!staff) return;
    const tok = Array.from({ length: 32 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 62))).join("");
    const { error } = await supabase.from("acquisition_staff_tokens").insert({
      acquisition_id: staff.acquisition_id, staff_id: staff.id, token: tok, is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Onboarding link generated"); load();
  };

  const copyLink = () => {
    if (!token?.token) return;
    navigator.clipboard.writeText(`${window.location.origin}/onboard/${token.token}`);
    toast.success("Link copied");
  };

  const markSent = async () => {
    if (!token) return;
    await supabase.from("acquisition_staff_tokens").update({ link_sent_at: new Date().toISOString() }).eq("id", token.id);
    toast.success("Marked as sent"); load();
  };

  const updateItem = async (id: string, patch: any) => {
    const { error } = await supabase.from("acquisition_compliance_items").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await load(); onChanged();
  };

  const markComplete = async (item: any) => {
    if (!item.documentation_url && !item.documentation_notes) {
      return toast.error("Add documentation URL or notes before marking complete");
    }
    const { data: u } = await supabase.auth.getUser();
    await updateItem(item.id, {
      status: "complete",
      completed_date: new Date().toISOString().slice(0, 10),
      verified_by: u?.user?.id ?? null,
      verified_at: new Date().toISOString(),
    });
    toast.success("Marked complete");
  };

  const waive = async (item: any) => {
    const reason = prompt(`Reason for waiving "${item.requirement_name}" for ${staff.first_name} ${staff.last_name}?`);
    if (!reason) return;
    await updateItem(item.id, { status: "waived", notes: `WAIVED: ${reason}` });
    toast.success("Requirement waived");
  };

  const sendReminder = async (item: any) => {
    if (!staff.email) return toast.error("No email on file for this staff member");
    const { error } = await supabase.functions.invoke("send-compliance-reminders", {
      body: { staff_id: staff.id, item_ids: [item.id] },
    });
    if (error) return toast.error(error.message);
    toast.success("Reminder sent");
    await load();
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        {loading || !staff ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-2xl">{staff.first_name} {staff.last_name}</SheetTitle>
              <div className="text-sm text-muted-foreground space-y-0.5 pt-1">
                <p>Role: <span className="text-foreground font-medium">{staff.role}</span></p>
                <p className="capitalize">Type: {staff.role_type} · {staff.employment_type}</p>
                {staff.team_or_department && <p>Team: {staff.team_or_department}</p>}
                {staff.email && <p>{staff.email}</p>}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm">Overall:</span>
                <span className="font-bold tabular-nums">{Number(staff.compliance_pct).toFixed(0)}%</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusPillClass(staff.compliance_status)}`}>
                  {STATUS_LABEL[staff.compliance_status]}
                </span>
              </div>
            </SheetHeader>

            <div className="mt-5 p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-[11px] uppercase font-bold text-muted-foreground mb-2">Onboarding Link</p>
              {!token ? (
                <Button size="sm" variant="outline" onClick={generateToken}><Link2 className="h-3.5 w-3.5 mr-1" /> Generate onboarding link</Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={copyLink}><Copy className="h-3.5 w-3.5 mr-1" /> Copy link</Button>
                  {!token.link_sent_at && <Button size="sm" variant="outline" onClick={markSent}>Mark sent</Button>}
                  <span className="text-xs text-muted-foreground">
                    {token.last_accessed_at ? `Accessed ${new Date(token.last_accessed_at).toLocaleDateString()} (${token.access_count}×)` :
                      token.link_sent_at ? `Sent ${new Date(token.link_sent_at).toLocaleDateString()}` : "Not sent"}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {items.length === 0 && <p className="text-sm text-muted-foreground italic">No compliance items.</p>}
              {items.map((item) => (
                <ItemCard key={item.id} item={item}
                  onChange={(patch) => updateItem(item.id, patch)}
                  onComplete={() => markComplete(item)}
                  onWaive={() => waive(item)}
                  onRemind={() => sendReminder(item)}
                  hasEmail={!!staff.email} />
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ItemCard({ item, onChange, onComplete, onWaive, onRemind, hasEmail }: any) {
  const overdue = isOverdue(item);
  const [local, setLocal] = useState({
    reference_number: item.reference_number ?? "",
    vendor: item.vendor ?? "",
    ori_number: item.ori_number ?? "",
    documentation_url: item.documentation_url ?? "",
    documentation_notes: item.documentation_notes ?? "",
    notes: item.notes ?? "",
  });
  const setL = (k: string, v: string) => setLocal((p) => ({ ...p, [k]: v }));
  const save = () => onChange(local);

  return (
    <div className={`rounded-lg border p-3 ${overdue ? "border-rose-300 bg-rose-50/50" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold">{item.requirement_name}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusPillClass(overdue ? "overdue" : item.status)}`}>
            {overdue ? "Overdue" : STATUS_LABEL[item.status]}
          </span>
        </div>
        <div className="text-right text-xs">
          {item.due_date && <p className={overdue ? "text-rose-600 font-semibold" : "text-muted-foreground"}>Due {item.due_date}</p>}
          {item.completed_date && <p className="text-emerald-700">Done {item.completed_date}</p>}
          {item.expiration_date && <p className="text-muted-foreground">Expires {item.expiration_date}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        <Mini label="Reference #"><Input className="h-8 text-xs" value={local.reference_number} onChange={(e) => setL("reference_number", e.target.value)} onBlur={save} /></Mini>
        <Mini label="Vendor"><Input className="h-8 text-xs" value={local.vendor} onChange={(e) => setL("vendor", e.target.value)} onBlur={save} /></Mini>
        {item.requirement_type === "fingerprinting" && (
          <Mini label="ORI #"><Input className="h-8 text-xs" value={local.ori_number} onChange={(e) => setL("ori_number", e.target.value)} onBlur={save} /></Mini>
        )}
        <Mini label="Doc URL"><Input className="h-8 text-xs" placeholder="https://…" value={local.documentation_url} onChange={(e) => setL("documentation_url", e.target.value)} onBlur={save} /></Mini>
      </div>
      <Mini label="Documentation notes" className="mt-2"><Textarea rows={2} className="text-xs" value={local.documentation_notes} onChange={(e) => setL("documentation_notes", e.target.value)} onBlur={save} /></Mini>
      <Mini label="Internal notes" className="mt-2"><Textarea rows={2} className="text-xs" value={local.notes} onChange={(e) => setL("notes", e.target.value)} onBlur={save} /></Mini>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {item.status !== "in_progress" && item.status !== "complete" && item.status !== "waived" && (
          <Button size="sm" variant="outline" onClick={() => onChange({ status: "in_progress" })}>In progress</Button>
        )}
        {item.status !== "submitted" && item.status !== "complete" && item.status !== "waived" && (
          <Button size="sm" variant="outline" onClick={() => onChange({ status: "submitted" })}>Submitted</Button>
        )}
        {item.status !== "complete" && item.status !== "waived" && (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onComplete}>Mark complete</Button>
        )}
        {item.status !== "waived" && (
          <Button size="sm" variant="outline" onClick={onWaive}>Waive</Button>
        )}
        {item.status !== "complete" && item.status !== "waived" && hasEmail && (
          <Button size="sm" variant="outline" onClick={onRemind}><Bell className="h-3 w-3 mr-1" /> Remind</Button>
        )}
        {item.reminder_count > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">Reminders: {item.reminder_count}</span>
        )}
      </div>
    </div>
  );
}

function Mini({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className ?? ""}`}><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>{children}</div>;
}
