import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { recoveryStatus, STATUS_COLOR, STATUS_LABEL, type RevenueShareSummary } from "@/lib/revenueShare";
import RecoveryBar from "@/components/revenueShare/RecoveryBar";
import LogRevenueModal from "@/components/revenueShare/LogRevenueModal";
import GenerateInvoiceModal from "@/components/revenueShare/GenerateInvoiceModal";
import ContractSetupModal from "@/components/revenueShare/ContractSetupModal";
import { InvoiceStatusBadge } from "@/pages/admin/RevenueShare";
import { ArrowLeft, Plus, FileText, CheckCircle2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrgRevenueShareDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  const [search] = useSearchParams();
  const focusInvoice = search.get("invoice");

  const [orgName, setOrgName] = useState("");
  const [summary, setSummary] = useState<RevenueShareSummary | null>(null);
  const [contract, setContract] = useState<any | null>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [logOpen, setLogOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const [orgRes, sumRes, contractRes, entriesRes, invRes] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      supabase.from("org_revenue_share_summary").select("*").eq("org_id", orgId).maybeSingle(),
      supabase.from("org_engagement_contracts").select("*").eq("org_id", orgId).maybeSingle(),
      supabase.from("org_revenue_entries").select("*").eq("org_id", orgId).order("revenue_date", { ascending: false }),
      supabase.from("org_revenue_share_invoices").select("*").eq("org_id", orgId).order("invoice_date", { ascending: false }),
    ]);
    setOrgName(orgRes.data?.name ?? "Unknown Org");
    setSummary(sumRes.data as any);
    setContract(contractRes.data);
    setEntries(entriesRes.data ?? []);
    setInvoices(invRes.data ?? []);

    if (contractRes.data) {
      const { data: inst } = await supabase
        .from("org_contract_installments")
        .select("*")
        .eq("contract_id", contractRes.data.id)
        .order("installment_number");
      setInstallments(inst ?? []);
    } else {
      setInstallments([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [orgId]);

  const status = summary ? recoveryStatus(summary) : "none";

  const engineSubtotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.engine, (m.get(e.engine) ?? 0) + Number(e.amount));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const verifyEntry = async (id: string) => {
    if (!user) return;
    await supabase.from("org_revenue_entries").update({
      is_verified: true, verified_by: user.id, verified_at: new Date().toISOString(),
    }).eq("id", id);
    load();
  };
  const deleteEntry = async (id: string) => {
    if (!confirm("Delete this revenue entry? Recalculation will run automatically.")) return;
    await supabase.from("org_revenue_entries").delete().eq("id", id);
    load();
  };

  const markInvoice = async (id: string, status: "sent" | "paid" | "void") => {
    const patch: any = { status };
    if (status === "sent") patch.sent_at = new Date().toISOString();
    if (status === "paid") patch.paid_at = new Date().toISOString();
    await supabase.from("org_revenue_share_invoices").update(patch).eq("id", id);
    toast({ title: `Invoice marked ${status}` });
    load();
  };

  const downloadPdf = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", { body: { invoice_id: invoiceId } });
      if (error) throw error;
      const blob = new Blob([new Uint8Array(data.pdf)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${data.invoice_number || "invoice"}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Could not download PDF", description: e.message ?? "Edge function not yet deployed.", variant: "destructive" });
    }
  };

  if (loading) return <AppShell title="Revenue Share"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  return (
    <AppShell title={`Revenue Share — ${orgName}`}>
      <div className="mb-4">
        <Button asChild size="sm" variant="ghost"><Link to="/admin/revenue-share"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back</Link></Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{orgName}</h1>
            <Badge variant="outline" className={cn(STATUS_COLOR[status])}>{STATUS_LABEL[status]}</Badge>
          </div>
          {contract && <p className="text-sm text-muted-foreground mt-1 capitalize">Contract status: {contract.contract_status}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setLogOpen(true)} className="bg-health text-health-foreground hover:bg-health/90"><Plus className="h-4 w-4 mr-1.5" />Log Revenue Entry</Button>
          {contract && <Button onClick={() => setGenOpen(true)} variant="outline"><FileText className="h-4 w-4 mr-1.5" />Generate Invoice</Button>}
          <Button onClick={() => setContractOpen(true)} variant="ghost" size="sm">{contract ? "Edit Contract" : "Set Up Contract"}</Button>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Mini label="Contract Value" value={formatCurrency(summary?.contract_value)} />
        <Mini label="Total New Revenue" value={formatCurrency(summary?.total_new_revenue)} />
        <Mini label="Recovery" value={`${Number(summary?.investment_recovered_pct ?? 0).toFixed(0)}%`} sub={`${formatCurrency(summary?.revenue_toward_recovery)} of ${formatCurrency(summary?.recovery_threshold)}`} />
        <Mini label="Curve Share Earned" value={formatCurrency(summary?.curve_share_earned)} accent="text-accent" />
        <Mini label="Outstanding" value={formatCurrency(summary?.outstanding_balance)} accent={summary && summary.outstanding_balance > 0 ? "text-destructive" : ""} />
      </div>

      {/* Recovery visualization */}
      {summary && summary.recovery_threshold > 0 && (
        <Card className="p-5 mb-6 space-y-3">
          <h3 className="font-display text-base font-semibold">Recovery Progress</h3>
          <RecoveryBar totalNewRevenue={summary.total_new_revenue} threshold={summary.recovery_threshold} curveShare={summary.curve_share_earned} />
          {summary.curve_share_earned > 0 ? (
            <div className="rounded-md bg-health-soft border border-health/30 p-3 text-sm text-health flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Investment recovered. Curve is earning 25% on all new revenue above {formatCurrency(summary.recovery_threshold)}.</p>
            </div>
          ) : (
            <p className="text-xs text-warning">
              Curve share begins after {formatCurrency(Math.max(0, summary.recovery_threshold - summary.total_new_revenue))} more in new revenue.
            </p>
          )}
        </Card>
      )}

      {/* Contract & installments */}
      <Card className="p-5 mb-6">
        <h3 className="curve-eyebrow mb-3">Contract & Payments</h3>
        {!contract ? (
          <p className="text-sm text-muted-foreground">No contract recorded. <button onClick={() => setContractOpen(true)} className="text-accent underline">Set one up</button>.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
              <KV label="Value" v={formatCurrency(Number(contract.contract_value))} />
              <KV label="Signed" v={contract.contract_signed_date ? formatDate(contract.contract_signed_date) : "—"} />
              <KV label="Installments" v={`${contract.installment_count ?? 0} × ${formatCurrency(Number(contract.installment_amount ?? 0))}`} />
              <KV label="Frequency" v={contract.installment_frequency ?? "—"} />
            </div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>#</TableHead><TableHead>Amount</TableHead><TableHead>Due</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead><TableHead></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.installment_number}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(Number(i.amount))}</TableCell>
                    <TableCell className="text-xs">{i.due_date ? formatDate(i.due_date) : "—"}</TableCell>
                    <TableCell className="text-xs">{i.paid_date ? formatDate(i.paid_date) : "—"}</TableCell>
                    <TableCell>{i.is_paid ? <Badge variant="outline" className="bg-health-soft text-health border-health/30">Paid</Badge> : <Badge variant="outline">Due</Badge>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.payment_notes ?? ""}</TableCell>
                    <TableCell>
                      {!i.is_paid && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          await supabase.from("org_contract_installments").update({ is_paid: true, paid_date: new Date().toISOString().slice(0,10), logged_by: user?.id }).eq("id", i.id);
                          load();
                        }}>Mark paid</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {installments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm">No installments scheduled.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              Total paid: <span className="font-semibold text-foreground">{formatCurrency(Number(contract.total_paid_to_date))}</span> of {formatCurrency(Number(contract.contract_value))}
            </p>
          </>
        )}
      </Card>

      {/* Revenue entries */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="curve-eyebrow">New Revenue Entries</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Revenue generated above baseline through the Allegiance engagement.</p>
          </div>
          <Button size="sm" onClick={() => setLogOpen(true)} className="bg-health text-health-foreground hover:bg-health/90"><Plus className="h-4 w-4 mr-1.5" />Log Entry</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Date</TableHead><TableHead>Engine</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead>Verified</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{formatDate(e.revenue_date)}</TableCell>
                <TableCell><Badge variant="outline">{e.engine}</Badge></TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(Number(e.amount))}</TableCell>
                <TableCell className="text-xs max-w-md truncate">{e.description}</TableCell>
                <TableCell><Badge variant="outline" className={e.entry_type === "auto" ? "bg-info-soft text-info border-info/30" : ""}>{e.entry_type === "auto" ? "🔄 Auto" : "✏️ Manual"}</Badge></TableCell>
                <TableCell>{e.is_verified ? <CheckCircle2 className="h-4 w-4 text-health" /> : <span className="h-2 w-2 rounded-full bg-warning inline-block" />}</TableCell>
                <TableCell className="text-right">
                  {e.entry_type === "manual" && (
                    <div className="flex justify-end gap-1">
                      {!e.is_verified && <Button size="sm" variant="ghost" onClick={() => verifyEntry(e.id)}>Verify</Button>}
                      <Button size="sm" variant="ghost" onClick={() => deleteEntry(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No revenue logged.</TableCell></TableRow>}
          </TableBody>
        </Table>
        {engineSubtotals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {engineSubtotals.map(([eng, total]) => (
              <span key={eng}><span className="text-muted-foreground">{eng}:</span> <span className="font-mono font-semibold">{formatCurrency(total)}</span></span>
            ))}
            <span className="ml-auto"><span className="text-muted-foreground">Total:</span> <span className="font-mono font-bold">{formatCurrency(summary?.total_new_revenue)}</span></span>
          </div>
        )}
      </Card>

      {/* Curve share calculation */}
      {summary && (
        <Card className="p-5 mb-6 font-mono text-sm space-y-1">
          <h3 className="curve-eyebrow font-sans mb-2">Curve Share Calculation</h3>
          <CalcRow label="Total new revenue" value={formatCurrency(summary.total_new_revenue)} />
          <CalcRow label="Recovery threshold" value={`− ${formatCurrency(summary.recovery_threshold)}`} />
          <div className="border-t border-border my-1" />
          <CalcRow label="Revenue above threshold" value={formatCurrency(summary.revenue_above_threshold)} />
          <CalcRow label="Curve share rate" value="× 25%" />
          <div className="border-t border-border my-1" />
          <CalcRow label="Curve share earned" value={formatCurrency(summary.curve_share_earned)} bold />
        </Card>
      )}

      {/* Invoices */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="curve-eyebrow">Invoices</h3>
          {contract && <Button size="sm" onClick={() => setGenOpen(true)} variant="outline"><FileText className="h-4 w-4 mr-1.5" />Generate Invoice</Button>}
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Invoice #</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Curve Share</TableHead><TableHead>Status</TableHead><TableHead>Invoice Date</TableHead><TableHead>Due Date</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((i) => (
              <TableRow key={i.id} className={cn(focusInvoice === i.id && "bg-accent-soft")}>
                <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                <TableCell className="text-xs">{formatDate(i.period_start)} – {formatDate(i.period_end)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(Number(i.curve_share_this_period))}</TableCell>
                <TableCell><InvoiceStatusBadge status={i.status} /></TableCell>
                <TableCell className="text-xs">{formatDate(i.invoice_date)}</TableCell>
                <TableCell className="text-xs">{i.due_date ? formatDate(i.due_date) : "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => downloadPdf(i.id)}>PDF</Button>
                    {i.status === "draft" && <Button size="sm" variant="ghost" onClick={() => markInvoice(i.id, "sent")}>Mark sent</Button>}
                    {(i.status === "sent" || i.status === "overdue") && <Button size="sm" variant="ghost" onClick={() => markInvoice(i.id, "paid")}>Mark paid</Button>}
                    {i.status !== "void" && i.status !== "paid" && <Button size="sm" variant="ghost" onClick={() => markInvoice(i.id, "void")}>Void</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {invoices.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No invoices yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <LogRevenueModal open={logOpen} onOpenChange={setLogOpen} orgId={orgId!} onSaved={load} />
      {contract && <GenerateInvoiceModal open={genOpen} onOpenChange={setGenOpen} orgId={orgId!} orgName={orgName} onSaved={load} />}
      <ContractSetupModal open={contractOpen} onOpenChange={setContractOpen} orgId={orgId!} orgName={orgName} onSaved={load} />
    </AppShell>
  );
}

function Mini({ label, value, sub, accent = "" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Card className="p-4">
      <p className="curve-eyebrow">{label}</p>
      <p className={cn("mt-1 font-display text-xl font-semibold", accent)}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}
function KV({ label, v }: { label: string; v: string }) {
  return <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="font-medium capitalize">{v}</p></div>;
}
function CalcRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className={cn("flex justify-between", bold && "text-base font-bold text-accent")}><span className="text-muted-foreground font-sans">{label}</span><span>{value}</span></div>;
}
