import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, FileText, Sparkles, Loader2 } from "lucide-react";

type Row = {
  org_id: string;
  org_name: string;
  audit_id: string | null;
  audit_type: string | null;
  status: string | null;
  overall_score: number | null;
  website_score: number | null;
  social_score: number | null;
  completed_at: string | null;
  created_at: string | null;
};

type Filter = "all" | "has_audit" | "no_audit" | "stale";

const STALE_DAYS = 90;

export default function AdminAudits() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [orgsRes, auditsRes] = await Promise.all([
        supabase.from("organizations").select("id, name").order("name", { ascending: true }),
        supabase
          .from("org_digital_audits")
          .select("id, org_id, audit_type, status, overall_score, website_score, social_score, completed_at, created_at")
          .order("created_at", { ascending: false }),
      ]);
      const latestByOrg = new Map<string, any>();
      for (const a of (auditsRes.data ?? []) as any[]) {
        if (!latestByOrg.has(a.org_id)) latestByOrg.set(a.org_id, a);
      }
      const merged: Row[] = ((orgsRes.data ?? []) as any[]).map((o) => {
        const a = latestByOrg.get(o.id);
        return {
          org_id: o.id,
          org_name: o.name,
          audit_id: a?.id ?? null,
          audit_type: a?.audit_type ?? null,
          status: a?.status ?? null,
          overall_score: a?.overall_score ?? null,
          website_score: a?.website_score ?? null,
          social_score: a?.social_score ?? null,
          completed_at: a?.completed_at ?? null,
          created_at: a?.created_at ?? null,
        };
      });
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
    return rows.filter((r) => {
      if (q && !r.org_name.toLowerCase().includes(q)) return false;
      if (filter === "no_audit" && r.audit_id) return false;
      if (filter === "has_audit" && !r.audit_id) return false;
      if (filter === "stale") {
        const ts = r.completed_at ?? r.created_at;
        if (!ts) return true; // never audited counts as stale
        return new Date(ts).getTime() < cutoff;
      }
      return true;
    });
  }, [rows, search, filter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const audited = rows.filter((r) => !!r.audit_id).length;
    const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
    const stale = rows.filter((r) => {
      const ts = r.completed_at ?? r.created_at;
      return !ts || new Date(ts).getTime() < cutoff;
    }).length;
    return { total, audited, stale };
  }, [rows]);

  return (
    <AppShell title="Digital Audits">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-accent" />
              <h1 className="font-display text-3xl font-bold tracking-tight">Digital Audits</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Every club's latest website + social audit. Open a report or jump to the slide deck in two clicks.
            </p>
          </div>
          <Button onClick={() => navigate("/admin/presentations")}>
            <Sparkles className="h-4 w-4 mr-2" /> Run new audit
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Clubs" value={stats.total} />
          <Stat label="Audited" value={stats.audited} />
          <Stat label={`Stale (>${STALE_DAYS}d) or never`} value={stats.stale} />
        </div>

        <div className="curve-card">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder="Search clubs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clubs</SelectItem>
                <SelectItem value="has_audit">Has audit</SelectItem>
                <SelectItem value="no_audit">No audit yet</SelectItem>
                <SelectItem value="stale">Needs re-audit / never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2 pr-4">Club</th>
                    <th className="py-2 pr-4">Last audit</th>
                    <th className="py-2 pr-4">Overall</th>
                    <th className="py-2 pr-4">Website</th>
                    <th className="py-2 pr-4">Social</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const ts = r.completed_at ?? r.created_at;
                    return (
                      <tr key={r.org_id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 pr-4 font-medium">{r.org_name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {ts ? new Date(ts).toLocaleDateString() : <span className="italic">Never</span>}
                        </td>
                        <td className="py-3 pr-4">{r.overall_score != null ? `${r.overall_score}/100` : "—"}</td>
                        <td className="py-3 pr-4">{r.website_score != null ? `${r.website_score}/100` : "—"}</td>
                        <td className="py-3 pr-4">{r.social_score != null ? `${r.social_score}/100` : "—"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{r.status ?? "—"}</td>
                        <td className="py-3 pr-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!r.audit_id}
                              onClick={() => navigate(`/admin/presentations?org=${r.org_id}`)}
                            >
                              <ClipboardList className="h-3.5 w-3.5 mr-1" /> Report
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/admin/org/${r.org_id}?tab=presentations`)}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" /> Presentation
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No clubs match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="curve-card">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-display font-semibold">{value}</div>
    </div>
  );
}
