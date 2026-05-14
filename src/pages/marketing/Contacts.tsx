import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { useMarketingLink } from "@/hooks/useMarketingLink";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Upload, Plus, Trash2, Users, Filter, Loader2, ChevronRight, Calendar, Layers, FolderOpen, Archive, Mail } from "lucide-react";
import { autoMapHeaders, TARGET_FIELDS } from "@/lib/csvImportPresets";

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
  archived_at: string | null;
};

type Season = { id: string; name: string; sport: string; season_start_date: string; season_end_date: string; status: string };
type Team = { id: string; season_id: string; name: string; age_group: string | null; division: string | null };
type Membership = { id: string; team_id: string; contact_id: string; role: string; jersey_number: string | null; position: string | null };
type Group = { id: string; name: string; description: string | null; group_type: string };
type Segment = { id: string; name: string; description: string | null; filter_rules: any; is_system: boolean; contact_count: number };
type UploadRec = { id: string; filename: string | null; total_rows: number | null; successful_imports: number | null; duplicates_merged: number | null; errors: number | null; status: string; created_at: string };

// Top-level contact-type buckets for CSV import.
// "Team Manager" is NOT here — it's an in-app role assigned to a parent or coach
// after upload (Team detail → assign Team Manager).
const ROLES = [
  { v: "staff", l: "Staff (head coaches, assistants, managers)" },
  { v: "player", l: "Players" },
  { v: "parent", l: "Parents" },
  { v: "player_parent", l: "Players + Parents (one row per player, parent columns on same row)" },
];

export default function Contacts() {
  const { orgId } = useEffectiveOrg();
  const [tab, setTab] = useState("seasons");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [uploads, setUploads] = useState<UploadRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  // Modals
  const [importOpen, setImportOpen] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [segOpen, setSegOpen] = useState(false);
  const [editingSeg, setEditingSeg] = useState<Partial<Segment>>({});
  const [newSeason, setNewSeason] = useState<Partial<Season>>({ sport: "baseball" });
  const [newTeam, setNewTeam] = useState<Partial<Team>>({});
  const [newGroup, setNewGroup] = useState<Partial<Group>>({ group_type: "mailing_list" });
  const [newContact, setNewContact] = useState<Partial<Contact>>({ contact_type: "family" });

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const [c, sn, t, m, g, s, u] = await Promise.all([
      supabase.from("org_contacts").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(1000),
      supabase.from("org_seasons").select("*").eq("org_id", orgId).order("season_start_date", { ascending: false }),
      supabase.from("org_teams").select("*").eq("org_id", orgId).order("name"),
      supabase.from("org_team_memberships").select("*").eq("org_id", orgId),
      supabase.from("org_contact_groups").select("*").eq("org_id", orgId).order("name"),
      supabase.from("org_contact_segments").select("*").eq("org_id", orgId).order("is_system", { ascending: false }).order("name"),
      supabase.from("org_contact_uploads").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(10),
    ]);
    setContacts((c.data ?? []) as any);
    setSeasons((sn.data ?? []) as any);
    setTeams((t.data ?? []) as any);
    setMemberships((m.data ?? []) as any);
    setGroups((g.data ?? []) as any);
    setSegments((s.data ?? []) as any);
    setUploads((u.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!showArchived && c.archived_at) return false;
      if (showArchived && !c.archived_at) return false;
      if (typeFilter !== "all" && c.contact_type !== typeFilter) return false;
      if (!q) return true;
      const blob = `${c.first_name ?? ""} ${c.last_name ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [contacts, search, typeFilter, showArchived]);

  // ---------- Season / Team CRUD ----------
  const saveSeason = async () => {
    if (!orgId || !newSeason.name || !newSeason.season_start_date || !newSeason.season_end_date) return toast.error("Name, start, and end dates required");
    const { error } = await supabase.from("org_seasons").insert({
      org_id: orgId, name: newSeason.name, sport: newSeason.sport as any,
      season_start_date: newSeason.season_start_date, season_end_date: newSeason.season_end_date,
    });
    if (error) return toast.error(error.message);
    toast.success("Season created");
    setSeasonOpen(false); setNewSeason({ sport: "baseball" }); load();
  };

  const saveTeam = async () => {
    if (!orgId || !newTeam.season_id || !newTeam.name) return toast.error("Season and name required");
    const { error } = await supabase.from("org_teams").insert({
      org_id: orgId, season_id: newTeam.season_id, name: newTeam.name,
      age_group: newTeam.age_group || null, division: newTeam.division || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Team created");
    setTeamOpen(false); setNewTeam({}); load();
  };

  const deleteSeason = async (id: string) => {
    if (!confirm("Delete this season and all its teams?")) return;
    await supabase.from("org_seasons").delete().eq("id", id);
    load();
  };
  const deleteTeam = async (id: string) => {
    if (!confirm("Delete this team and all memberships?")) return;
    await supabase.from("org_teams").delete().eq("id", id);
    load();
  };

  // ---------- Group CRUD ----------
  const saveGroup = async () => {
    if (!orgId || !newGroup.name) return toast.error("Name required");
    const { error } = await supabase.from("org_contact_groups").insert({
      org_id: orgId, name: newGroup.name, description: newGroup.description || null, group_type: newGroup.group_type as any,
    });
    if (error) return toast.error(error.message);
    toast.success("Group created");
    setGroupOpen(false); setNewGroup({ group_type: "mailing_list" }); load();
  };
  const deleteGroup = async (id: string) => {
    if (!confirm("Delete this group?")) return;
    await supabase.from("org_contact_groups").delete().eq("id", id);
    load();
  };

  // ---------- Contact CRUD ----------
  const saveContact = async () => {
    if (!orgId) return;
    if (!newContact.email && !newContact.phone && !newContact.first_name) return toast.error("Need at least a name, email, or phone");
    const { error } = await supabase.from("org_contacts").insert({ ...newContact, org_id: orgId } as any);
    if (error) return toast.error(error.message);
    toast.success("Contact added");
    setAddOpen(false); setNewContact({ contact_type: "family" }); load();
  };

  const archiveContact = async (id: string) => {
    await supabase.from("org_contacts").update({ archived_at: new Date().toISOString() }).eq("id", id);
    load();
  };
  const unarchiveContact = async (id: string) => {
    await supabase.from("org_contacts").update({ archived_at: null }).eq("id", id);
    load();
  };

  // ---------- Segment CRUD ----------
  const saveSegment = async () => {
    if (!orgId || !editingSeg.name) return toast.error("Name required");
    const payload: any = {
      org_id: orgId, name: editingSeg.name,
      description: editingSeg.description ?? null,
      filter_rules: editingSeg.filter_rules ?? {},
    };
    const { error } = editingSeg.id
      ? await supabase.from("org_contact_segments").update(payload).eq("id", editingSeg.id)
      : await supabase.from("org_contact_segments").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Segment saved");
    setSegOpen(false); setEditingSeg({}); load();
  };

  return (
    <AppShell title="Contacts">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1">Seasons, teams, groups — your entire audience in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="seasons"><Calendar className="h-4 w-4 mr-2" />Seasons & Teams</TabsTrigger>
          <TabsTrigger value="groups"><FolderOpen className="h-4 w-4 mr-2" />Groups ({groups.length})</TabsTrigger>
          <TabsTrigger value="contacts"><Users className="h-4 w-4 mr-2" />All Contacts ({contacts.filter(c => !c.archived_at).length})</TabsTrigger>
          <TabsTrigger value="segments"><Filter className="h-4 w-4 mr-2" />Segments ({segments.length})</TabsTrigger>
          <TabsTrigger value="uploads"><Layers className="h-4 w-4 mr-2" />Uploads</TabsTrigger>
        </TabsList>

        {/* SEASONS & TEAMS */}
        <TabsContent value="seasons" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTeamOpen(true)} disabled={seasons.length === 0}>
              <Plus className="h-4 w-4 mr-2" /> New team
            </Button>
            <Button onClick={() => setSeasonOpen(true)}><Plus className="h-4 w-4 mr-2" /> New season</Button>
          </div>
          {loading ? <Card className="p-8 text-center text-muted-foreground">Loading…</Card> :
           seasons.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No seasons yet. Create one to start organizing teams.</Card> :
           seasons.map((s) => {
            const seasonTeams = teams.filter((t) => t.season_id === s.id);
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-lg">{s.name}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.sport}</span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${s.status === "active" ? "bg-lime/20 text-lime-strong" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.season_start_date} → {s.season_end_date} · {seasonTeams.length} team{seasonTeams.length === 1 ? "" : "s"}</p>
                  </div>
                  <button onClick={() => deleteSeason(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="space-y-2">
                  {seasonTeams.length === 0 && <p className="text-sm text-muted-foreground italic">No teams in this season yet.</p>}
                  {seasonTeams.map((t) => {
                    const tm = memberships.filter((m) => m.team_id === t.id);
                    const players = tm.filter((m) => m.role === "player");
                    const coaches = tm.filter((m) => m.role === "coach" || m.role === "assistant_coach" || m.role === "team_manager");
                    const parents = tm.filter((m) => m.role === "parent");
                    return (
                      <Collapsible key={t.id}>
                        <div className="border border-border rounded-md">
                          <div className="flex items-center justify-between p-3">
                            <CollapsibleTrigger className="flex items-center gap-2 hover:underline group flex-1 text-left">
                              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                              <span className="font-medium">{t.name}</span>
                              {t.age_group && <span className="text-xs text-muted-foreground">{t.age_group}</span>}
                              <span className="text-xs text-muted-foreground ml-2">
                                {players.length} players · {coaches.length} coaches · {parents.length} parents
                              </span>
                            </CollapsibleTrigger>
                            <button onClick={() => deleteTeam(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                          </div>
                          <CollapsibleContent>
                            <div className="border-t border-border px-3 py-2 space-y-2 bg-muted/20">
                              {[
                                { label: "Coaches", list: coaches },
                                { label: "Players", list: players },
                                { label: "Parents", list: parents },
                              ].map(({ label, list }) => list.length > 0 && (
                                <div key={label}>
                                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">{label}</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                                    {list.map((m) => {
                                      const c = contactById.get(m.contact_id);
                                      if (!c) return null;
                                      return (
                                        <div key={m.id} className="flex items-center gap-2">
                                          {m.jersey_number && <span className="text-xs px-1.5 py-0.5 rounded bg-muted">#{m.jersey_number}</span>}
                                          <span>{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "—"}</span>
                                          {m.position && <span className="text-xs text-muted-foreground">({m.position})</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                              {tm.length === 0 && <p className="text-sm text-muted-foreground italic">No members yet. Use Import CSV with this team selected.</p>}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </TabsContent>

        {/* GROUPS */}
        <TabsContent value="groups" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setGroupOpen(true)}><Plus className="h-4 w-4 mr-2" /> New group</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground md:col-span-2">No groups yet. Use groups for evergreen lists like "Alumni" or "Newsletter".</Card>
            ) : groups.map((g) => (
              <Card key={g.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-semibold">{g.name}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{g.group_type}</span>
                    {g.description && <p className="text-sm text-muted-foreground mt-2">{g.description}</p>}
                  </div>
                  <button onClick={() => deleteGroup(g.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ALL CONTACTS */}
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
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                Archived only
              </label>
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
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No contacts.</td></tr>
                  ) : filtered.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
                      <td className="p-3"><span className="text-xs px-2 py-0.5 rounded bg-muted">{c.contact_type}</span></td>
                      <td className="p-3 text-muted-foreground">
                        {c.email}{c.unsubscribed && <span className="ml-2 text-xs text-destructive">unsubscribed</span>}
                      </td>
                      <td className="p-3 text-muted-foreground">{c.phone || "—"}</td>
                      <td className="p-3 text-right">
                        {c.archived_at ? (
                          <button onClick={() => unarchiveContact(c.id)} className="text-xs text-primary hover:underline">Restore</button>
                        ) : (
                          <button onClick={() => archiveContact(c.id)} className="text-muted-foreground hover:text-foreground" title="Archive"><Archive className="h-4 w-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* SEGMENTS */}
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
                  <button onClick={() => { setEditingSeg(s); setSegOpen(true); }} className="text-xs text-primary hover:underline">Edit</button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* UPLOADS */}
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

      {/* IMPORT WIZARD */}
      <ImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        orgId={orgId}
        seasons={seasons}
        teams={teams}
        onDone={load}
      />

      {/* New season */}
      <Dialog open={seasonOpen} onOpenChange={setSeasonOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New season</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input placeholder="Spring 2026 Baseball" value={newSeason.name ?? ""} onChange={(e) => setNewSeason((s) => ({ ...s, name: e.target.value }))} /></div>
            <div>
              <Label>Sport</Label>
              <select value={newSeason.sport} onChange={(e) => setNewSeason((s) => ({ ...s, sport: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="baseball">Baseball</option>
                <option value="softball">Softball</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div></div>
            <div><Label>Start date</Label><Input type="date" value={newSeason.season_start_date ?? ""} onChange={(e) => setNewSeason((s) => ({ ...s, season_start_date: e.target.value }))} /></div>
            <div><Label>End date</Label><Input type="date" value={newSeason.season_end_date ?? ""} onChange={(e) => setNewSeason((s) => ({ ...s, season_end_date: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSeasonOpen(false)}>Cancel</Button><Button onClick={saveSeason}>Create season</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New team */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New team</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Season</Label>
              <select value={newTeam.season_id ?? ""} onChange={(e) => setNewTeam((t) => ({ ...t, season_id: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Select…</option>
                {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><Label>Team name</Label><Input placeholder="12U Red" value={newTeam.name ?? ""} onChange={(e) => setNewTeam((t) => ({ ...t, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Age group</Label><Input placeholder="12U" value={newTeam.age_group ?? ""} onChange={(e) => setNewTeam((t) => ({ ...t, age_group: e.target.value }))} /></div>
              <div><Label>Division</Label><Input value={newTeam.division ?? ""} onChange={(e) => setNewTeam((t) => ({ ...t, division: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTeamOpen(false)}>Cancel</Button><Button onClick={saveTeam}>Create team</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New group */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New group</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={newGroup.name ?? ""} onChange={(e) => setNewGroup((g) => ({ ...g, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={newGroup.description ?? ""} onChange={(e) => setNewGroup((g) => ({ ...g, description: e.target.value }))} /></div>
            <div>
              <Label>Type</Label>
              <select value={newGroup.group_type} onChange={(e) => setNewGroup((g) => ({ ...g, group_type: e.target.value }))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="mailing_list">Mailing list</option>
                <option value="event">Event</option>
                <option value="alumni">Alumni</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setGroupOpen(false)}>Cancel</Button><Button onClick={saveGroup}>Create group</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={saveContact}>Add contact</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Segment editor */}
      <Dialog open={segOpen} onOpenChange={setSegOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingSeg.id ? "Edit" : "New"} segment</DialogTitle>
            <DialogDescription>
              A segment is a saved group of contacts. Pick the filters below — we'll only include people who match every filter you set. Leave a filter blank to ignore it.
            </DialogDescription>
          </DialogHeader>
          <SegmentBuilder
            value={editingSeg}
            onChange={setEditingSeg}
            seasons={seasons}
            teams={teams}
            groups={groups}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegOpen(false)}>Cancel</Button>
            <Button onClick={saveSegment} disabled={!editingSeg.name?.trim()}>Save segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

// =================== Import Wizard ===================
function ImportWizard({
  open, onOpenChange, orgId, seasons, teams, onDone,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  orgId: string | null;
  seasons: Season[];
  teams: Team[];
  onDone: () => void;
}) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [autoMappedCount, setAutoMappedCount] = useState(0);
  const [fileFormat, setFileFormat] = useState<"single" | "multitab">("single");
  const [seasonId, setSeasonId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [role, setRole] = useState("player");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1); setFile(null); setCsvText(""); setHeaders([]);
    setMapping({}); setAutoMappedCount(0); setFileFormat("single");
    setSeasonId(""); setTeamId(""); setRole("player");
  };

  useEffect(() => { if (!open) reset(); }, [open]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f);
    let text = "";
    const isExcel = /\.(xlsx|xls)$/i.test(f.name);
    if (isExcel) {
      try {
        const XLSX = await import("xlsx");
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });

        if (fileFormat === "multitab") {
          // Flatten every sheet, using sheet name as Team
          const allRows: Record<string, string>[] = [];
          const allHeaders = new Set<string>();
          for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
            for (const row of rows) {
              const norm: Record<string, string> = { Team: sheetName };
              for (const k of Object.keys(row)) {
                const key = k.trim();
                if (!key) continue;
                norm[key] = String(row[k] ?? "").trim();
                allHeaders.add(key);
              }
              allHeaders.add("Team");
              allRows.push(norm);
            }
          }
          const headerList = ["Team", ...Array.from(allHeaders).filter((h) => h !== "Team")];
          const escape = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          text = [headerList.join(","), ...allRows.map((r) => headerList.map((h) => escape(r[h] ?? "")).join(","))].join("\n");
          toast.success(`Loaded ${wb.SheetNames.length} tab(s) → ${allRows.length} rows. Sheet names used as team names.`);
        } else {
          // Single-tab mode: just use the first sheet as-is
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          text = XLSX.utils.sheet_to_csv(firstSheet);
        }
      } catch (err: any) {
        toast.error("Could not read spreadsheet: " + (err?.message || err));
        return;
      }
    } else {
      text = await f.text();
    }
    setCsvText(text);
    const firstLine = text.split(/\r?\n/)[0] || "";
    const hdrs: string[] = [];
    let cur = "", q = false;
    for (let i = 0; i < firstLine.length; i++) {
      const c = firstLine[i];
      if (c === '"') q = !q;
      else if (c === "," && !q) { hdrs.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    hdrs.push(cur.trim());
    setHeaders(hdrs);
    const auto = autoMapHeaders(hdrs);
    setMapping(auto);
    setAutoMappedCount(Object.keys(auto).length);
  };

  const teamsForSeason = teams.filter((t) => t.season_id === seasonId);

  const submit = async () => {
    if (!orgId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-csv-upload", {
        body: {
          org_id: orgId, csv_text: csvText, column_mapping: mapping,
          filename: file?.name, season_id: seasonId || null, team_id: teamId || null, role,
          duplicate_strategy: "merge",
        },
      });
      if (error) throw error;
      toast.success(`Imported ${data?.imported ?? 0} · merged ${data?.merged ?? 0} · ${data?.parents_linked ?? 0} parents linked · ${data?.errors ?? 0} errors`);
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import contacts — Step {step} of 3</DialogTitle>
          <DialogDescription>
            {step === 1 && "Pick the season, team, and role for this CSV."}
            {step === 2 && "Choose your file format and upload — columns are auto-mapped."}
            {step === 3 && "Review the column mapping before importing."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Season (optional — leave blank for evergreen contacts)</Label>
              <select value={seasonId} onChange={(e) => { setSeasonId(e.target.value); setTeamId(""); }} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">— No season —</option>
                {seasons.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sport})</option>)}
              </select>
            </div>
            <div>
              <Label>Team (optional)</Label>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={!seasonId} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50">
                <option value="">— No team —</option>
                {teamsForSeason.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {!seasonId && <p className="text-xs text-muted-foreground mt-1">Pick a season first to assign contacts to a team.</p>}
            </div>
            <div>
              <Label>Role being imported</Label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-1">If you map parent fields, parent contacts are auto-created and linked.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 text-sm space-y-2">
              <div className="font-medium text-amber-900 dark:text-amber-200">How to format your file</div>
              <div className="text-amber-900/90 dark:text-amber-100/90">
                Pick what kind of contacts this file holds in Step 1: <strong>Staff</strong>,
                <strong> Players</strong>, <strong>Parents</strong>, or
                <strong> Players + Parents</strong> (one row per player with parent columns on the same row).
              </div>
              <div className="text-xs text-amber-800 dark:text-amber-200/80">
                Required columns: <code>First Name</code>, <code>Last Name</code>, and at least one of <code>Email</code> or <code>Phone</code>. All staff (head coach, assistant, manager) import as one <em>Staff</em> group — <strong>Team Manager</strong> is assigned in-app from the team detail page after upload.
              </div>
            </div>

            <div>
              <Label>File format</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button type="button" onClick={() => setFileFormat("single")}
                  className={`text-left p-3 rounded-md border text-sm ${fileFormat === "single" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                  <div className="font-medium">Single file</div>
                  <div className="text-xs text-muted-foreground">One CSV or single-tab spreadsheet. Add a <code>Team</code> column if rows belong to different teams.</div>
                </button>
                <button type="button" onClick={() => setFileFormat("multitab")}
                  className={`text-left p-3 rounded-md border text-sm ${fileFormat === "multitab" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                  <div className="font-medium">Multi-tab spreadsheet</div>
                  <div className="text-xs text-muted-foreground">One <code>.xlsx</code>, one tab per team. Tab name = team name. Teams are auto-created.</div>
                </button>
              </div>
            </div>

            <div>
              <Label>{fileFormat === "multitab" ? "Excel file (.xlsx)" : "CSV or Excel file"}</Label>
              <input ref={fileRef} type="file"
                accept={fileFormat === "multitab" ? ".xlsx,.xls" : ".csv,.xlsx,.xls"}
                onChange={onFile} className="block w-full text-sm mt-1" />
              {file && (
                <p className="text-xs text-muted-foreground mt-1">
                  {file.name} · {headers.length} columns detected · auto-mapped {autoMappedCount} of {headers.length}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Columns are auto-detected from any platform export (LeagueApps, SportsEngine, Futures App, TeamSnap, etc.) — you'll review the mapping in the next step.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Map each CSV column to a contact field. Unmapped columns are ignored.</p>
            <div className="border border-border rounded-md divide-y divide-border max-h-80 overflow-y-auto">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-3 p-2">
                  <div className="flex-1 text-sm font-mono truncate">{h}</div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <select value={mapping[h] || ""} onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                    className="flex-1 h-9 px-2 rounded-md border border-input bg-background text-sm">
                    {TARGET_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 3 && <Button onClick={() => setStep(step + 1)} disabled={step === 2 && !file}>Next</Button>}
          {step === 3 && (
            <Button onClick={submit} disabled={submitting || headers.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================== Segment Builder ===================
function SegmentBuilder({
  value,
  onChange,
  seasons,
  teams,
  groups,
}: {
  value: Partial<Segment>;
  onChange: (updater: (s: Partial<Segment>) => Partial<Segment>) => void;
  seasons: Season[];
  teams: Team[];
  groups: Group[];
}) {
  const rules: any = value.filter_rules ?? {};
  const setRule = (key: string, v: any) => {
    onChange((s) => {
      const next = { ...(s.filter_rules ?? {}) };
      if (v === undefined || v === "" || v === null || v === "any") delete next[key];
      else next[key] = v;
      return { ...s, filter_rules: next };
    });
  };

  const filteredTeams = rules.season_id ? teams.filter((t) => t.season_id === rules.season_id) : teams;

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label>Segment name</Label>
          <Input
            placeholder="e.g. 14U Black parents"
            value={value.name ?? ""}
            onChange={(e) => onChange((s) => ({ ...s, name: e.target.value }))}
          />
        </div>
        <div>
          <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input
            placeholder="What is this list for?"
            value={value.description ?? ""}
            onChange={(e) => onChange((s) => ({ ...s, description: e.target.value }))}
          />
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
        <div className="text-sm font-medium">Who should be included?</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Contact type</Label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-background"
              value={rules.contact_type ?? "any"}
              onChange={(e) => setRule("contact_type", e.target.value)}
            >
              <option value="any">Any type</option>
              <option value="family">Family</option>
              <option value="player">Player</option>
              <option value="alumni">Alumni</option>
              <option value="prospect">Prospect</option>
              <option value="sponsor">Sponsor</option>
            </select>
          </div>

          <div>
            <Label className="text-xs">Season</Label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-background"
              value={rules.season_id ?? "any"}
              onChange={(e) => {
                setRule("season_id", e.target.value);
                if (rules.team_id) setRule("team_id", "any");
              }}
            >
              <option value="any">Any season</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Team</Label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-background"
              value={rules.team_id ?? "any"}
              onChange={(e) => setRule("team_id", e.target.value)}
            >
              <option value="any">Any team</option>
              {filteredTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Team role</Label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-background"
              value={rules.team_role ?? "any"}
              onChange={(e) => setRule("team_role", e.target.value)}
            >
              <option value="any">Any role</option>
              {ROLES.map((r) => (
                <option key={r.v} value={r.v}>{r.l}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Group / mailing list</Label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-background"
              value={rules.group_id ?? "any"}
              onChange={(e) => setRule("group_id", e.target.value)}
            >
              <option value="any">Any group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Graduation year</Label>
            <Input
              type="number"
              placeholder="e.g. 2026"
              value={rules.grad_year ?? ""}
              onChange={(e) => setRule("grad_year", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>

        <div className="border-t pt-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rules.sms_opt_in === true}
                onChange={(e) => setRule("sms_opt_in", e.target.checked ? true : undefined)}
              />
              Only people opted in to SMS
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rules.unsubscribed === false}
                onChange={(e) => setRule("unsubscribed", e.target.checked ? false : undefined)}
              />
              Exclude unsubscribed
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rules.archived === true}
                onChange={(e) => setRule("archived", e.target.checked ? true : undefined)}
              />
              Only archived contacts
            </label>
          </div>
        </div>
      </div>

      {Object.keys(rules).length === 0 && (
        <div className="text-xs text-muted-foreground italic">
          No filters set — this segment will include every contact in the org.
        </div>
      )}
    </div>
  );
}
