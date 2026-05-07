import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateComplianceItemsForStaff } from "@/lib/compliance";

const HEADERS = ["first_name","last_name","email","phone","role","role_type","employment_type","team_or_department"];
const TEMPLATE = HEADERS.join(",") + "\nJane,Doe,jane@example.com,555-1234,Head Coach,coach,employee,14U National\n";

function parseCsv(text: string): any[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: any = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

export default function ImportStaffCsvModal({ open, onOpenChange, acquisition, onImported }: {
  open: boolean; onOpenChange: (v: boolean) => void; acquisition: any; onImported: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCsv(String(e.target?.result ?? ""));
      const valid = parsed.filter((r) => r.first_name && r.last_name && r.role);
      setRows(valid);
      if (valid.length === 0) toast.error("No valid rows found. Required: first_name, last_name, role");
    };
    reader.readAsText(f);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "staff_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const inserts = rows.map((r) => ({
        acquisition_id: acquisition.id,
        first_name: r.first_name, last_name: r.last_name,
        email: r.email || null, phone: r.phone || null,
        role: r.role,
        role_type: ["coach","staff","admin","director"].includes(r.role_type) ? r.role_type : "staff",
        employment_type: ["employee","contractor","volunteer"].includes(r.employment_type) ? r.employment_type : "employee",
        team_or_department: r.team_or_department || null,
        created_by: u?.user?.id ?? null,
      }));
      const { data: created, error } = await supabase.from("acquisition_staff").insert(inserts).select();
      if (error) throw error;
      let total = 0;
      for (const s of created ?? []) {
        total += await generateComplianceItemsForStaff(supabase, s, acquisition, u?.user?.id);
      }
      toast.success(`${created?.length ?? 0} staff imported — ${total} compliance items generated`);
      onImported(); onOpenChange(false); setRows([]);
    } catch (e: any) { toast.error(e?.message ?? "Import failed"); }
    finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Import Staff Members</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Expected columns: <code className="text-xs">{HEADERS.join(", ")}</code>
            {" "}<button onClick={downloadTemplate} className="text-emerald-700 underline">Download template</button>
          </p>
          <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block w-full text-sm border border-dashed border-border rounded-md p-6 text-center" />
          {rows.length > 0 && (
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Email</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="p-2">{r.first_name} {r.last_name}</td>
                      <td className="p-2">{r.role}</td>
                      <td className="p-2">{r.role_type}</td>
                      <td className="p-2 text-muted-foreground">{r.email || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Cancel</Button>
          <Button onClick={doImport} disabled={importing || rows.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Import {rows.length} Staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
