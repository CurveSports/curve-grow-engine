import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { recoveryStatus, STATUS_LABEL, STATUS_COLOR, sweepOverdueInvoices, type RevenueShareSummary } from "@/lib/revenueShare";
import RecoveryBar from "@/components/revenueShare/RecoveryBar";
import { TrendingUp, DollarSign, Award, AlertCircle, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import GenerateInvoiceModal from "@/components/revenueShare/GenerateInvoiceModal";

type OrgRow = {
  org_id: string;
  org_name: string;
  summary: RevenueShareSummary | null;
  contract_status: string | null;
  last_entry_at: string | null;
};

type Portfolio = {
  total_orgs_active: number;
  total_investment_deployed: number;
  total_investment_recovered: number;
  total_new_revenue_generated: number;
  total_curve_share_earned: number;
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  curve_share_this_quarter: number;
  curve_share_this_month: number;
};

type InvoiceRow = {
  id: string;
  org_id: string;
  org_name: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  curve_share_this_period: number;
  status: string;
  invoice_date: string;
  due_date: string | null;
};

export default function RevenueShare() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"portfolio" | "organizations" | "invoices">("portfolio");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [recoveryFilter, setRecoveryFilter] = useState<"all" | "recovering" | "recovered" | "sharing">("all");
  const [contractFilter, setContractFilter] = useState<"all" | "active" | "completed">("all");

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [invoiceOrgFilter, setInvoiceOrgFilter] = useState<string>("all");

  const [genOpen, setGenOpen] = useState(false);
  const [genOrg, setGenOrg] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    await sweepOverdueInvoices();

    const [portRes, orgsRes, summariesRes, contractsRes, lastEntriesRes, invRes] = await Promise.all([
      supabase.from("curve_portfolio_summary").select("*").maybeSingle(),
      supabase.from("organizations").select("id, name").order("name"),
      supabase.from("org_revenue_share_summary").select("*"),
      supabase.from("org_engagement_contracts").select("org_id, contract_status"),
      supabase.from("org_revenue_entries").select("org_id, revenue_date").order("revenue_date", { ascending: false }),
      supabase.from("org_revenue_share_invoices").select("id, org_id, invoice_number, period_start, period_end, curve_share_this_period, status, invoice_date, due_date").order("invoice_date", { ascending: false }),
    ]);

    setPortfolio(portRes.data as any);

    const summaryByOrg = new Map((summariesRes.data ?? []).map((s: any) => [s.org_id, s as RevenueShareSummary]));
    const contractByOrg = new Map((contractsRes.data ?? []).map((c: any) => [c.org_id, c.contract_status]));
    const lastEntryByOrg = new Map<string, string>();
    for (const e of (lastEntriesRes.data ?? []) as any[]) {
      if (!lastEntryByOrg.has(e.org_id)) lastEntryByOrg.set(e.org_id, e.revenue_date);
    }
    const orgsList = (orgsRes.data ?? []).map((o: any) => ({
      org_id: o.id,
      org_name: o.name,
      summary: summaryByOrg.get(o.id) ?? null,
      contract_status: contractByOrg.get(o.id) ?? null,
      last_entry_at: lastEntryByOrg.get(o.id) ?? null,
    }));
    setOrgs(orgsList);

    const orgNameById = new Map(orgsList.map((o) => [o.org_id, o.org_name]));
    setInvoices(((invRes.data ?? []) as any[]).map((i) => ({ ...i, org_name: orgNameById.get(i.org_id) ?? "Unknown" })));

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredOrgs = useMemo(() => {
    return orgs.filter((o) => {
      if (contractFilter !== "all" && o.contract_status !== contractFilter) return false;
      const status = o.summary ? recoveryStatus(o.summary) : "none";
      if (recoveryFilter !== "all" && status !== recoveryFilter) return false;
      return true;
    });
  }, [orgs, contractFilter, recoveryFilter]);

  const topOrgs = useMemo(() => {
    return [...orgs]
      .filter((o) => o.summary)
      .sort((a, b) => (b.summary?.curve_share_earned ?? 0) - (a.summary?.curve_share_earned ?? 0))
      .slice(0, 10);
  }, [orgs]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      if (invoiceStatusFilter !== "all" && i.status !== invoiceStatusFilter) return false;
      if (invoiceOrgFilter !== "all" && i.org_id !== invoiceOrgFilter) return false;
      return true;
    });
  }, [invoices, invoiceStatusFilter, invoiceOrgFilter]);

  const invoiceTotals = useMemo(() => {
    let invoiced = 0, collected = 0, outstanding = 0, overdue = 0;
    for (const i of filteredInvoices) {
      const v = Number(i.curve_share_this_period) || 0;
      if (i.status === "sent" || i.status === "paid" || i.status === "overdue") invoiced += v;
      if (i.status === "paid") collected += v;
      if (i.status === "sent" || i.status === "overdue") outstanding += v;
      if (i.status === "overdue") overdue += v;
    }
    return { invoiced, collected, outstanding, overdue };
  }, [filteredInvoices]);

  return (
    <AppShell title="Revenue Share">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Revenue Share</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tracking Curve's 25% revenue share across all Allegiance engagements.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-card border border-border h-auto p-1">
          <TabsTrigger value="portfolio" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">Portfolio</TabsTrigger>
          <TabsTrigger value="organizations" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">Organizations</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground gap-1.5">Invoices</TabsTrigger>
        </TabsList>

        {/* PORTFOLIO */}
        <TabsContent value="portfolio" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Investment Deployed" value={formatCurrency(portfolio?.total_investment_deployed)} sub={`Across ${portfolio?.total_orgs_active ?? 0} active engagements`} icon={DollarSign} />
            <StatCard label="Total Investment Recovered" value={formatCurrency(portfolio?.total_investment_recovered)} sub={recoverySubtext(portfolio)} icon={TrendingUp} accentClass={recoveryAccent(portfolio)} />
            <StatCard label="Total New Revenue Generated" value={formatCurrency(portfolio?.total_new_revenue_generated)} sub="Above baseline across all orgs" icon={TrendingUp} />
            <StatCard label="Curve Share Earned (All Time)" value={formatCurrency(portfolio?.total_curve_share_earned)} sub="25% of revenue above thresholds" icon={Award} accentClass="text-health" />
            <StatCard label="Outstanding Balance" value={formatCurrency(portfolio?.total_outstanding)} sub={portfolio && portfolio.total_outstanding > 0 ? "Across open invoices" : "All invoices settled"} icon={AlertCircle} accentClass={portfolio && portfolio.total_outstanding > 0 ? "text-destructive" : ""} />
            <StatCard label="Collected This Quarter" value={formatCurrency(portfolio?.curve_share_this_quarter)} sub={`${formatCurrency(portfolio?.curve_share_this_month)} this month`} icon={Award} accentClass="text-health" />
          </div>

          <Card className="p-5">
            <h3 className="font-display text-lg font-semibold mb-4">Portfolio Performance</h3>
            <PortfolioBarChart orgs={orgs} />
          </Card>

          <Card className="p-5">
            <h3 className="font-display text-lg font-semibold mb-4">Top Performing Orgs</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Org</TableHead>
                  <TableHead className="text-right">New Revenue</TableHead>
                  <TableHead className="text-right">Recovery</TableHead>
                  <TableHead className="text-right">Curve Share</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Last Entry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topOrgs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No revenue logged yet.</TableCell></TableRow>
                )}
                {topOrgs.map((o) => {
                  const s = o.summary!;
                  return (
                    <TableRow key={o.org_id} className="cursor-pointer" onClick={() => navigate(`/admin/revenue-share/${o.org_id}`)}>
                      <TableCell className="font-medium">{o.org_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(s.total_new_revenue)}</TableCell>
                      <TableCell className="text-right">{Number(s.investment_recovered_pct).toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-accent">{formatCurrency(s.curve_share_earned)}</TableCell>
                      <TableCell className={cn("text-right font-mono", s.outstanding_balance > 0 && "text-destructive")}>{formatCurrency(s.outstanding_balance)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{o.last_entry_at ? formatDate(o.last_entry_at) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ORGANIZATIONS */}
        <TabsContent value="organizations" className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Recovery</span>
              <Select value={recoveryFilter} onValueChange={(v) => setRecoveryFilter(v as any)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="recovering">Recovering</SelectItem>
                  <SelectItem value="recovered">Recovered</SelectItem>
                  <SelectItem value="sharing">Sharing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Contract</span>
              <Select value={contractFilter} onValueChange={(v) => setContractFilter(v as any)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrgs.map((o) => (
                <OrgCard key={o.org_id} org={o} onGenerate={() => { setGenOrg({ id: o.org_id, name: o.org_name }); setGenOpen(true); }} onRefresh={load} />
              ))}
              {filteredOrgs.length === 0 && (
                <Card className="p-8 text-center text-sm text-muted-foreground col-span-full">No orgs match these filters.</Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices" className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={invoiceOrgFilter} onValueChange={setInvoiceOrgFilter}>
                <SelectTrigger className="w-56"><SelectValue placeholder="All orgs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All orgs</SelectItem>
                  {orgs.map((o) => <SelectItem key={o.org_id} value={o.org_id}>{o.org_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-health text-health-foreground hover:bg-health/90" onClick={() => { /* pick org first */ document.getElementById("inv-pick-org")?.scrollIntoView(); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Generate Invoice
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Total Invoiced" value={formatCurrency(invoiceTotals.invoiced)} />
            <MiniStat label="Total Collected" value={formatCurrency(invoiceTotals.collected)} accent="text-health" />
            <MiniStat label="Outstanding" value={formatCurrency(invoiceTotals.outstanding)} accent={invoiceTotals.outstanding > 0 ? "text-destructive" : ""} />
            <MiniStat label="Overdue" value={formatCurrency(invoiceTotals.overdue)} accent={invoiceTotals.overdue > 0 ? "text-destructive" : ""} />
          </div>

          <Card className="p-4">
            <div id="inv-pick-org" className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Generate invoice for:</span>
              <Select onValueChange={(v) => { const o = orgs.find((x) => x.org_id === v); if (o) { setGenOrg({ id: o.org_id, name: o.org_name }); setGenOpen(true); } }}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Choose org…" /></SelectTrigger>
                <SelectContent>
                  {orgs.filter((o) => o.summary && o.summary.contract_value > 0).map((o) => <SelectItem key={o.org_id} value={o.org_id}>{o.org_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Curve Share</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No invoices.</TableCell></TableRow>
                )}
                {filteredInvoices.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`/admin/revenue-share/${i.org_id}?invoice=${i.id}`)}>
                    <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                    <TableCell>{i.org_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(i.period_start)} – {formatDate(i.period_end)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(Number(i.curve_share_this_period))}</TableCell>
                    <TableCell><InvoiceStatusBadge status={i.status} /></TableCell>
                    <TableCell className="text-xs">{formatDate(i.invoice_date)}</TableCell>
                    <TableCell className="text-xs">{i.due_date ? formatDate(i.due_date) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {genOrg && (
        <GenerateInvoiceModal open={genOpen} onOpenChange={setGenOpen} orgId={genOrg.id} orgName={genOrg.name} onSaved={load} />
      )}
    </AppShell>
  );
}

function recoverySubtext(p: Portfolio | null) {
  if (!p || p.total_investment_deployed === 0) return "—";
  const pct = Math.round((p.total_investment_recovered / p.total_investment_deployed) * 100);
  return `${pct}% of deployed`;
}
function recoveryAccent(p: Portfolio | null) {
  if (!p || p.total_investment_deployed === 0) return "";
  const pct = (p.total_investment_recovered / p.total_investment_deployed) * 100;
  if (pct >= 100) return "text-health";
  if (pct >= 50) return "text-warning";
  return "text-destructive";
}

function StatCard({ label, value, sub, icon: Icon, accentClass = "" }: { label: string; value: string; sub?: string; icon: any; accentClass?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="curve-eyebrow">{label}</p>
        <Icon className={cn("h-4 w-4 text-muted-foreground", accentClass)} />
      </div>
      <p className={cn("mt-2 font-display text-2xl font-semibold", accentClass)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function MiniStat({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="p-4">
      <p className="curve-eyebrow">{label}</p>
      <p className={cn("mt-1 font-display text-xl font-semibold", accent)}>{value}</p>
    </Card>
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground border-border",
    sent: "bg-info-soft text-info border-info/30",
    paid: "bg-health-soft text-health border-health/30",
    overdue: "bg-destructive/10 text-destructive border-destructive/30",
    void: "bg-muted text-muted-foreground border-border opacity-60",
  };
  return <Badge variant="outline" className={cn("capitalize", styles[status] ?? "")}>{status}</Badge>;
}

function PortfolioBarChart({ orgs }: { orgs: OrgRow[] }) {
  const data = orgs.filter((o) => o.summary && o.summary.total_new_revenue > 0)
    .sort((a, b) => (b.summary!.total_new_revenue) - (a.summary!.total_new_revenue))
    .slice(0, 12);
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No revenue data yet.</p>;
  const max = Math.max(...data.map((d) => d.summary!.total_new_revenue));
  return (
    <div className="space-y-2">
      {data.map((o) => {
        const s = o.summary!;
        const status = recoveryStatus(s);
        const color = status === "sharing" ? "bg-accent" : status === "recovered" ? "bg-health" : status === "recovering" ? "bg-warning" : "bg-muted";
        const w = (s.total_new_revenue / max) * 100;
        return (
          <div key={o.org_id} className="group">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{o.org_name}</span>
              <span className="text-muted-foreground font-mono">
                {formatCurrency(s.total_new_revenue)} · {Number(s.investment_recovered_pct).toFixed(0)}% recovered · share {formatCurrency(s.curve_share_earned)}
              </span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <div className={cn("h-full transition-all", color)} style={{ width: `${w}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrgCard({ org, onGenerate, onRefresh }: { org: OrgRow; onGenerate: () => void; onRefresh: () => void }) {
  const s = org.summary;
  const status = s ? recoveryStatus(s) : "none";

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-display font-semibold text-lg">{org.org_name}</h4>
          <p className="text-xs text-muted-foreground capitalize">Contract: {org.contract_status ?? "not set"}</p>
        </div>
        <Badge variant="outline" className={cn(STATUS_COLOR[status])}>{STATUS_LABEL[status]}</Badge>
      </div>

      {!s || s.contract_value === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No engagement contract recorded yet.
        </div>
      ) : (
        <>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Recovery</span>
              <span className="font-mono">{formatCurrency(s.revenue_toward_recovery)} of {formatCurrency(s.recovery_threshold)} ({Number(s.investment_recovered_pct).toFixed(0)}%)</span>
            </div>
            <RecoveryBar totalNewRevenue={s.total_new_revenue} threshold={s.recovery_threshold} curveShare={s.curve_share_earned} compact />
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground">New revenue</p>
              <p className="font-semibold font-mono">{formatCurrency(s.total_new_revenue)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Curve share (25%)</p>
              <p className={cn("font-semibold font-mono", s.curve_share_earned > 0 ? "text-accent" : "text-muted-foreground")}>
                {s.curve_share_earned > 0 ? formatCurrency(s.curve_share_earned) : "Not yet"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Outstanding</p>
              <p className={cn("font-semibold font-mono", s.outstanding_balance > 0 && "text-destructive")}>{formatCurrency(s.outstanding_balance)}</p>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button asChild size="sm" variant="outline">
          <Link to={`/admin/revenue-share/${org.org_id}`}>View Detail</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={`/admin/revenue-share/${org.org_id}#log`}>Log Revenue</Link>
        </Button>
        {s && s.contract_value > 0 && (
          <Button size="sm" variant="outline" onClick={onGenerate}>
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Generate Invoice
          </Button>
        )}
      </div>
    </Card>
  );
}
