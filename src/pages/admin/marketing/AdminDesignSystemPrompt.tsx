import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, RotateCcw, Info } from "lucide-react";

type Row = {
  id: string;
  name: string;
  description: string | null;
  prompt_template: string;
  version: number;
  is_active: boolean;
  updated_at: string;
};

const TOKENS: { token: string; what: string }[] = [
  { token: "{{org_name}}", what: "Organization name" },
  { token: "{{org_tagline}}", what: "Org tagline (from brand kit)" },
  { token: "{{brand_voice}}", what: "Brand voice notes" },
  { token: "{{color_primary}}", what: "Brand primary hex" },
  { token: "{{color_secondary}}", what: "Brand secondary hex" },
  { token: "{{color_accent}}", what: "Brand accent hex" },
  { token: "{{color_dark}}", what: "Brand dark hex" },
  { token: "{{color_light}}", what: "Brand light hex" },
  { token: "{{font_heading}}", what: "Heading font family name" },
  { token: "{{font_body}}", what: "Body font family name" },
  { token: "{{font_heading_url}}", what: "Heading font, URL-encoded (spaces → +)" },
  { token: "{{font_body_url}}", what: "Body font, URL-encoded" },
  { token: "{{logo_primary_url}}", what: "Org primary logo URL" },
  { token: "{{style_spec}}", what: "Selected style direction's full spec (bold_sport, editorial…)" },
  { token: "{{layout_spec}}", what: "Layout rules for the chosen format (square, story, flyer…)" },
  { token: "{{template_intent}}", what: "The template's base_prompt (design intent only)" },
  { token: "{{hero_photo_url}}", what: "User-selected hero photo URL" },
  { token: "{{secondary_photo_url}}", what: "User-selected secondary photo URL" },
  { token: "{{sponsor_logo_url}}", what: "User-selected sponsor logo URL" },
  { token: "{{fields_list}}", what: "Bullet list of all user-entered field values" },
  { token: "{{canvas_width}}", what: "Canvas width in px" },
  { token: "{{canvas_height}}", what: "Canvas height in px" },
];

export default function AdminDesignSystemPrompt() {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("design_system_prompts")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (error) toast.error(error.message);
    setRow(data as Row | null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase
      .from("design_system_prompts")
      .update({
        name: row.name,
        description: row.description,
        prompt_template: row.prompt_template,
        version: row.version + 1,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("System prompt saved");
    load();
  }

  if (loading) {
    return <AppShell><div className="p-6 text-muted-foreground">Loading…</div></AppShell>;
  }

  if (!row) {
    return (
      <AppShell>
        <div className="p-6 max-w-2xl">
          <Card className="p-6">
            <h1 className="text-xl font-semibold mb-2">No active system prompt</h1>
            <p className="text-sm text-muted-foreground">
              No active row found in <code>design_system_prompts</code>. Contact engineering to re-seed.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Design System Prompt</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The master instructions sent to the AI for every design generation, across every template.
              Edit once here instead of in 24 separate templates.
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Version {row.version}</div>
            <div>Updated {new Date(row.updated_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2 space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={row.name}
                onChange={(e) => setRow({ ...row, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={row.description || ""}
                onChange={(e) => setRow({ ...row, description: e.target.value })}
                placeholder="Short note about what this prompt does"
              />
            </div>
            <div>
              <Label>Prompt template</Label>
              <Textarea
                className="font-mono text-xs min-h-[600px]"
                value={row.prompt_template}
                onChange={(e) => setRow({ ...row, prompt_template: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use <code>{`{{token_name}}`}</code> placeholders — they're replaced at generation time.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={load} disabled={saving}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reload
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <h2 className="font-semibold">Available tokens</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Click to copy. These are filled in automatically when a user generates a design.
            </p>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {TOKENS.map((t) => (
                <button
                  key={t.token}
                  className="w-full text-left p-2 rounded hover:bg-accent transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(t.token);
                    toast.success(`Copied ${t.token}`);
                  }}
                >
                  <code className="text-xs text-primary block">{t.token}</code>
                  <span className="text-xs text-muted-foreground">{t.what}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
