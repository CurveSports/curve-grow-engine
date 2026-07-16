// Org-level retention settings: team name options + age group options + survey defaults.
// These feed the public parent-survey form and the default toggles when a new survey is created.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Smartphone } from "lucide-react";
import { toast } from "sonner";

type Settings = {
  team_name_options: string[];
  age_group_options: string[];
  default_collect_team: boolean;
  default_collect_age_group: boolean;
};

const DEFAULTS: Settings = {
  team_name_options: [],
  age_group_options: ["8U", "10U", "12U", "14U", "16U", "18U"],
  default_collect_team: true,
  default_collect_age_group: false,
};

export default function RetentionSettings() {
  const navigate = useNavigate();
  const { orgId, isImpersonating } = useEffectiveOrg();
  const backTo = isImpersonating && orgId ? `/admin/orgs/${orgId}/retention` : "/retention";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [newTeam, setNewTeam] = useState("");
  const [newAge, setNewAge] = useState("");

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const [{ data: row }, { data: t }] = await Promise.all([
        (supabase as any).from("org_retention_settings").select("*").eq("org_id", orgId).maybeSingle(),
        (supabase as any).from("org_teams").select("id,name").eq("org_id", orgId).order("name"),
      ]);
      if (row) {
        setS({
          team_name_options: row.team_name_options ?? [],
          age_group_options: row.age_group_options ?? DEFAULTS.age_group_options,
          default_collect_team: row.default_collect_team ?? true,
          default_collect_age_group: row.default_collect_age_group ?? false,
        });
      }
      setTeams(t || []);
      setLoading(false);
    })();
  }, [orgId]);

  const addTeam = () => {
    const v = newTeam.trim();
    if (!v) return;
    if (s.team_name_options.includes(v)) { toast.error("Already in the list"); return; }
    setS({ ...s, team_name_options: [...s.team_name_options, v] });
    setNewTeam("");
  };
  const removeTeam = (v: string) =>
    setS({ ...s, team_name_options: s.team_name_options.filter((x) => x !== v) });

  const moveTeam = (idx: number, dir: -1 | 1) => {
    const next = [...s.team_name_options];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setS({ ...s, team_name_options: next });
  };

  const addAge = () => {
    const v = newAge.trim();
    if (!v) return;
    if (s.age_group_options.includes(v)) { toast.error("Already in the list"); return; }
    setS({ ...s, age_group_options: [...s.age_group_options, v] });
    setNewAge("");
  };
  const removeAge = (v: string) =>
    setS({ ...s, age_group_options: s.age_group_options.filter((x) => x !== v) });

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("org_retention_settings")
      .upsert({ org_id: orgId, ...s }, { onConflict: "org_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Settings saved");
  };

  return (
    <AppShell title="Retention settings">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <button onClick={() => navigate(backTo)} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Retention
        </button>

        <div>
          <h1 className="text-2xl font-bold">Parent survey settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the team and age options that appear on your public survey form, and set the default fields shown when you create a new survey.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Default fields on new surveys</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ask for team</Label>
                    <p className="text-xs text-muted-foreground">Parents pick or type their child's team.</p>
                  </div>
                  <Switch checked={s.default_collect_team} onCheckedChange={(v) => setS({ ...s, default_collect_team: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ask for age group</Label>
                    <p className="text-xs text-muted-foreground">Adds an age group question (e.g. 12U).</p>
                  </div>
                  <Switch checked={s.default_collect_age_group} onCheckedChange={(v) => setS({ ...s, default_collect_age_group: v })} />
                </div>
                <p className="text-xs text-muted-foreground">These control the defaults. You can still override on each survey.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Team name options</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Extra team names shown on the survey dropdown. Your official teams below are always included automatically.
                </p>

                {teams.length > 0 && (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">From your roster ({teams.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {teams.map((t) => (
                        <span key={t.id} className="text-xs px-2 py-1 rounded bg-background border">{t.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {s.team_name_options.length === 0 && (
                    <div className="text-sm text-muted-foreground italic">No custom team names yet.</div>
                  )}
                  {s.team_name_options.map((v, idx) => (
                    <div key={v} className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card">
                      <div className="flex flex-col">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveTeam(idx, -1)} disabled={idx === 0} aria-label="Move up">
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveTeam(idx, 1)} disabled={idx === s.team_name_options.length - 1} aria-label="Move down">
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground w-6 tabular-nums">#{idx + 1}</span>
                      <span className="text-sm flex-1">{v}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeTeam(v)} aria-label={`Remove ${v}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a team name (e.g. 2013 Boys Elite)"
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTeam(); } }}
                  />
                  <Button variant="outline" onClick={addTeam}><Plus className="h-4 w-4 mr-1" />Add</Button>
                </div>

                <div className="pt-4 mt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-medium">Live preview — public survey dropdown</div>
                  </div>
                  <div className="mx-auto max-w-xs rounded-2xl border-4 border-muted bg-background p-4 shadow-sm">
                    <div className="text-xs font-medium mb-1">Team *</div>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm pointer-events-none"
                      value=""
                      onChange={() => {}}
                    >
                      <option value="">— Choose your team —</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      {s.team_name_options.map((name) => <option key={`c:${name}`} value={`__custom:${name}`}>{name}</option>)}
                      <option value="__other">Other / not listed</option>
                    </select>
                    <ul className="mt-3 space-y-1 max-h-56 overflow-auto text-sm">
                      {teams.map((t) => (
                        <li key={`p-r-${t.id}`} className="flex items-center justify-between px-2 py-1 rounded bg-muted/40">
                          <span>{t.name}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">roster</span>
                        </li>
                      ))}
                      {s.team_name_options.map((name) => (
                        <li key={`p-c-${name}`} className="flex items-center justify-between px-2 py-1 rounded bg-primary/10">
                          <span>{name}</span>
                          <span className="text-[10px] uppercase text-primary">custom</span>
                        </li>
                      ))}
                      <li className="flex items-center justify-between px-2 py-1 rounded bg-muted/20 text-muted-foreground italic">
                        <span>Other / not listed</span>
                        <span className="text-[10px] uppercase">fallback</span>
                      </li>
                    </ul>
                    {teams.length === 0 && s.team_name_options.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2 text-center italic">
                        Parents will see a free-text field until you add options here or add teams to your roster.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Age group options</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Shown as a dropdown when "Ask for age group" is enabled on a survey.
                </p>

                <div className="space-y-2">
                  {s.age_group_options.length === 0 && (
                    <div className="text-sm text-muted-foreground italic">No age groups configured — parents will see a free-text field.</div>
                  )}
                  {s.age_group_options.map((v) => (
                    <div key={v} className="flex items-center justify-between px-3 py-2 rounded-md border">
                      <span className="text-sm">{v}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeAge(v)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add an age group (e.g. 12U)"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAge(); } }}
                  />
                  <Button variant="outline" onClick={addAge}><Plus className="h-4 w-4 mr-1" />Add</Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate(backTo)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
