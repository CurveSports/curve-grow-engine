import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Plus, Trash2, Users, Filter, Mail, Loader2 } from "lucide-react";

type Contact = {
  id: string;
  contact_type: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  team_assignments: string[] | null;
  season: string | null;
  player_grad_year: number | null;
  unsubscribed: boolean;
};

type Segment = {
  id: string;
  name: string;
  description: string | null;
  filter_rules: any;
  is_system: boolean;
  contact_count: number;
};

type Upload = {
  id: string;
  filename: string | null;
  total_rows: number | null;
  successful_imports: number | null;
  duplicates_merged: number | null;
  errors: number | null;
  status: string;
  created_at: string;
};

export default function Contacts() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  const [tab, setTab] = useState("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [csvUploading, setCsvUploading] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newContact, setNewContact] = useState<Partial<Contact>>({ contact_type: "family" });

  const [segOpen, setSegOpen] = useState(false);
  const [editingSeg, setEditingSeg] = useState<Partial<Segment>>({});

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const [c, s, u] = await Promise.all([
      supabase.from("org_contacts").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(500),
      supabase.from("org_contact_segments").select("*").eq("org_id", orgId).order("is_system", { ascending: false }).order("name"),
      supabase.from("org_contact_uploads").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(10),
    ]);
    setContacts((c.data ?? []) as Contact[]);
    setSegments((s.data ?? []) as Segment[]);
    setUploads((u.data ?? []) as Upload[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (typeFilter !== "all" && c.contact_type !== typeFilter) return false;
      if (!q) return true;
      const blob = `${c.first_name ?? ""} ${c.last_name ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [contacts, search, typeFilter]);

  const onCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setCsvUploading(true);
    try {
      const text = await file.text();
      const { data, error } = await supabase.functions.invoke("process-csv-upload", {
        body: { org_id: orgId, filename: file.name, csv: text },
      });
      if (error) throw error;
      toast.success(`Imported ${data?.successful_imports ?? 0} contacts (${data?.duplicates_merged ?? 0} merged, ${data?.errors ?? 0} errors)`);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setCsvUploading(false);
      e.target.value = "";
    }
  };

  const downloadTemplate = () => {
    const csv = "first_name,last_name,email,phone,contact_type,team,season,grad_year\nJane,Doe,jane@example.com,5551234567,family,12U Red,Spring 2026,2030\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contacts-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const saveContact = async () => {
    if (!orgId) return;
    if (!newContact.email && !newContact.phone) return toast.error("Email or phone required");
    const { error } = await supabase.from("org_contacts").insert({ ...newContact, org_id: orgId } as any);
    if (error) return toast.error(error.message);
    toast.success("Contact added");
    setAddOpen(false);
    setNewContact({ contact_type: "family" });
    load();
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    await supabase.from("org_contacts").delete().eq("id", id);
    setContacts((cs) => cs.filter((c) => c.id !== id));
  };

  const saveSegment = async () => {
    if (!orgId || !editingSeg.name) return toast.error("Name required");
    const payload: any = {
      org_id: orgId,
      name: editingSeg.name,
      description: editingSeg.description ?? null,
      filter_rules: editingSeg.filter_rules ?? {},
    };
    let error;
    if (editingSeg.id) {
      ({ error } = await supabase.from("org_contact_segments").update(payload).eq("id", editingSeg.id));
    } else {
      ({ error } = await supabase.from("org_contact_segments").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success("Segment saved");
    setSegOpen(false);
    setEditingSeg({});
    load();
  };

  const deleteSegment = async (s: Segment) => {
    if (s.is_system) return toast.error("System segments can't be deleted");
    if (!confirm(`Delete segment "${s.name}"?`)) return;
    await supabase.from("org_contact_segments").delete().eq("id", s.id);
    setSegments((arr) => arr.filter((x) => x.id !== s.id));
  };

  return (
    <AppShell title="Contacts">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1">Your audience for every email, SMS, and campaign.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadTemplate}>Download template</Button>
          <Button onClick={() => csvInputRef.current?.click()} disabled={csvUploading}>
            {csvUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload CSV
          </Button>
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={onCsvUpload} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="contacts"><Users className="h-4 w-4 mr-2" />Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="segments"><Filter className="h-4 w-4 mr-2" />Segments ({segments.length})</TabsTrigger>
          <TabsTrigger value="uploads"><Upload className="h-4 w-4 mr-2" />Uploads</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <Card className="p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Input placeholder="Search name, email, phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="all">All types</option>
                <option value="family">Family</option>
                <option value="player">Player</option>
                <option value="coach">Coach</option>
                <option value="alumni">Alumni</option>
                <option value="prospect">Prospect</option>
                <option value="sponsor">Sponsor</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add contact
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Team(s)</th>
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No contacts. Upload a CSV to get started.</td></tr>
                  ) : filtered.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
                      <td className="p-3"><span className="text-xs px-2 py-0.5 rounded bg-muted">{c.contact_type}</span></td>
                      <td className="p-3 text-muted-foreground">
                        {c.email}{c.unsubscribed && <span className="ml-2 text-xs text-destructive">unsubscribed</span>}
                      </td>
                      <td className="p-3 text-muted-foreground">{c.phone || "—"}</td>
                      <td className="p-3 text-muted-foreground">{(c.team_assignments ?? []).join(", ") || "—"}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => deleteContact(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length >= 500 && <p className="p-3 text-xs text-muted-foreground border-t border-border">Showing first 500. Filter to narrow results.</p>}
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingSeg({ filter_rules: {} }); setSegOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New segment
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {segments.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold">{s.name}</h3>
                      {s.is_system && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">System</span>}
                    </div>
                    {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2"><Users className="inline h-3 w-3 mr-1" />{s.contact_count} contacts</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingSeg(s); setSegOpen(true); }} className="text-xs text-primary hover:underline">Edit</button>
                    {!s.is_system && (
                      <button onClick={() => deleteSegment(s)} className="ml-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {segments.length === 0 && <Card className="p-8 text-center text-muted-foreground md:col-span-2">No segments yet.</Card>}
          </div>
        </TabsContent>

        <TabsContent value="uploads" className="mt-4">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">File</th>
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-right p-3">Imported</th>
                  <th className="text-right p-3">Merged</th>
                  <th className="text-right p-3">Errors</th>
                </tr>
              </thead>
              <tbody>
                {uploads.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No uploads yet.</td></tr>
                ) : uploads.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3 font-medium">{u.filename || "—"}</td>
                    <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="p-3"><span className="text-xs px-2 py-0.5 rounded bg-muted">{u.status}</span></td>
                    <td className="p-3 text-right">{u.total_rows ?? 0}</td>
                    <td className="p-3 text-right">{u.successful_imports ?? 0}</td>
                    <td className="p-3 text-right">{u.duplicates_merged ?? 0}</td>
                    <td className="p-3 text-right">{u.errors ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add contact */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add contact</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name</Label><Input value={newContact.first_name ?? ""} onChange={(e) => setNewContact((c) => ({ ...c, first_name: e.target.value }))} /></div>
            <div><Label>Last name</Label><Input value={newContact.last_name ?? ""} onChange={(e) => setNewContact((c) => ({ ...c, last_name: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Email</Label><Input type="email" value={newContact.email ?? ""} onChange={(e) => setNewContact((c) => ({ ...c, email: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={newContact.phone ?? ""} onChange={(e) => setNewContact((c) => ({ ...c, phone: e.target.value }))} /></div>
            <div>
              <Label>Type</Label>
              <select value={newContact.contact_type} onChange={(e) => setNewContact((c) => ({ ...c, contact_type: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="family">Family</option>
                <option value="player">Player</option>
                <option value="coach">Coach</option>
                <option value="alumni">Alumni</option>
                <option value="prospect">Prospect</option>
                <option value="sponsor">Sponsor</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={saveContact}>Add contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Segment editor */}
      <Dialog open={segOpen} onOpenChange={setSegOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingSeg.id ? "Edit" : "New"} segment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={editingSeg.name ?? ""} onChange={(e) => setEditingSeg((s) => ({ ...s, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={editingSeg.description ?? ""} onChange={(e) => setEditingSeg((s) => ({ ...s, description: e.target.value }))} /></div>
            <div>
              <Label>Filter rules (JSON)</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={JSON.stringify(editingSeg.filter_rules ?? {}, null, 2)}
                onChange={(e) => {
                  try { setEditingSeg((s) => ({ ...s, filter_rules: JSON.parse(e.target.value) })); } catch { /* keep typing */ }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">Example: <code>{`{"contact_type":"family","team":"12U"}`}</code></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegOpen(false)}>Cancel</Button>
            <Button onClick={saveSegment}>Save segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
