import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as fabric from "fabric";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMarketingLink } from "@/hooks/useMarketingLink";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Loader2, Plus, Trash2, RefreshCw, Save, Image as ImageIcon, Users,
} from "lucide-react";
import {
  FABRIC_TEMPLATES, FabricTemplate, FabricTemplateKey, FieldDef, TemplateValues, BrandKit,
} from "@/lib/designTemplates/fabricTemplates";
import MediaPicker from "@/components/marketing/MediaPicker";

type DesignRow = {
  id: string;
  org_id: string;
  name: string | null;
  composition_config: any;
  preview_url: string | null;
};

type TeamOpt = { id: string; name: string };

const CANVAS_DISPLAY = 540; // displayed px (canvas is 1080 internal)

export default function FabricEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ml = useMarketingLink();
  const { orgId } = useEffectiveOrg();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [design, setDesign] = useState<DesignRow | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit>({});
  const [values, setValues] = useState<TemplateValues>({});
  const [templateKey, setTemplateKey] = useState<FabricTemplateKey>("game_day");
  const [teams, setTeams] = useState<TeamOpt[]>([]);

  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const template: FabricTemplate = useMemo(
    () => FABRIC_TEMPLATES[templateKey] ?? FABRIC_TEMPLATES.game_day,
    [templateKey]
  );

  // ---------- LOAD ----------
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: d } = await supabase.from("designs").select("*").eq("id", id).single();
      if (!d) { setLoading(false); return; }
      setDesign(d as any);
      const cfg = (d as any).composition_config || {};
      const tk: FabricTemplateKey = cfg.template_key || "game_day";
      setTemplateKey(tk);
      setValues(cfg.values || FABRIC_TEMPLATES[tk]?.defaults || {});

      // Brand kit
      if ((d as any).org_id) {
        const { data: bk } = await supabase
          .from("org_brand_kits")
          .select("color_primary,color_secondary,color_accent,color_dark,color_light,font_heading,font_body,logo_primary_url,logo_mark_url")
          .eq("org_id", (d as any).org_id)
          .maybeSingle();
        setBrandKit((bk as any) || {});
        // Teams for roster picker (game_day only matters but cheap to load)
        const { data: t } = await supabase
          .from("org_teams").select("id,name").eq("org_id", (d as any).org_id).order("name");
        setTeams((t ?? []) as TeamOpt[]);
      }
      setLoading(false);
    })();
  }, [id]);

  // ---------- CANVAS INIT ----------
  useEffect(() => {
    if (loading || !canvasElRef.current) return;
    const c = new fabric.Canvas(canvasElRef.current, {
      width: CANVAS_DISPLAY,
      height: CANVAS_DISPLAY,
      backgroundColor: brandKit.color_dark || "#0F172A",
      preserveObjectStacking: true,
    });
    // Render 1080-coord scene scaled into the 540 buffer
    const ratio = CANVAS_DISPLAY / template.dims.width;
    c.setZoom(ratio);
    fabricRef.current = c;
    rebuild(values);
    return () => { c.dispose(); fabricRef.current = null; };
    // eslint-disable-next-line
  }, [loading, templateKey]);

  // Rebuild canvas; after load, auto-fit images so user uploads don't
  // render at native pixel size, and re-stack so bg/photo/overlay are correct.
  const rebuild = useCallback((v: TemplateValues) => {
    const c = fabricRef.current;
    if (!c) return;
    const json = template.build(v, brandKit);
    c.loadFromJSON(json).then(() => {
      const W = template.dims.width;
      const H = template.dims.height;
      c.getObjects().forEach((obj: any) => {
        if (obj.type !== "image") return;
        const meta = obj.name as string | undefined;
        const iw = obj.width || 1;
        const ih = obj.height || 1;
        if (meta === "hero_photo") {
          const scale = Math.max(W / iw, H / ih);
          obj.set({
            scaleX: scale, scaleY: scale,
            left: (W - iw * scale) / 2, top: (H - ih * scale) / 2,
          });
        } else if (meta === "logo") {
          const max = 140;
          const scale = Math.min(max / iw, max / ih);
          obj.set({ scaleX: scale, scaleY: scale, left: 40, top: 40 });
        } else if (meta === "athlete_photo") {
          // Right-biased cutout: photo fills right 70% of canvas, full height
          const targetW = W * 0.70;
          const scale = Math.max(targetW / iw, H / ih);
          obj.set({
            scaleX: scale, scaleY: scale,
            left: W - iw * scale + (iw * scale - targetW) / 2,
            top: (H - ih * scale) / 2,
          });
        } else if (meta === "school_logo") {
          const max = 160;
          const scale = Math.min(max / iw, max / ih);
          obj.set({ scaleX: scale, scaleY: scale });
        }
        obj.setCoords();
      });
      // Re-stack: bg -> hero -> overlay -> rest -> logo on top
      const order = (n?: string) => {
        if (n === "bg") return 0;
        if (n === "hero_photo" || n === "athlete_photo") return 1;
        if (n === "overlay" || n === "gradient_overlay") return 2;
        if (n === "logo") return 99;
        return 50;
      };
      (c as any)._objects.sort((a: any, b: any) => order(a.name) - order(b.name));
      c.requestRenderAll();
    }).catch((err) => console.error("loadFromJSON failed", err));
  }, [template, brandKit]);

  useEffect(() => {
    if (!loading) rebuild(values);
    // eslint-disable-next-line
  }, [values, brandKit]);

  // ---------- HELPERS ----------
  const setField = (name: string, val: any) =>
    setValues((s) => ({ ...s, [name]: val }));

  const importRoster = async (teamId: string) => {
    if (!teamId) return;
    setField("team_id", teamId);
    const { data, error } = await supabase
      .from("org_team_memberships")
      .select("jersey_number, position, role, contact_id, org_contacts(first_name,last_name)")
      .eq("team_id", teamId)
      .eq("role", "player")
      .order("jersey_number");
    if (error) return toast.error(error.message);
    const lineup = (data ?? []).slice(0, 11).map((m: any) => ({
      jersey: m.jersey_number || "",
      name: [m.org_contacts?.first_name, m.org_contacts?.last_name].filter(Boolean).join(" ") || "PLAYER",
      position: m.position || "",
    }));
    if (lineup.length === 0) return toast.info("No players found on this team yet.");
    setField("lineup", lineup);
    toast.success(`Loaded ${lineup.length} starters`);
  };

  // ---------- SAVE / EXPORT ----------
  const save = async () => {
    if (!id || !fabricRef.current) return;
    setSaving(true);
    try {
      const fabricJson = fabricRef.current.toJSON();
      const cfg = {
        engine: "fabric_editor",
        template_key: templateKey,
        values,
        fabric: fabricJson,
      };
      const { error } = await (supabase.from("designs") as any)
        .update({ composition_config: cfg, status: "draft" })
        .eq("id", id);
      if (error) throw error;
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const exportPng = async () => {
    if (!fabricRef.current) return;
    // Render at full 1080 by temporarily resetting zoom
    const c = fabricRef.current;
    const prevZoom = c.getZoom();
    c.setDimensions({ width: template.dims.width, height: template.dims.height });
    c.setZoom(1);
    const url = c.toDataURL({ format: "png", quality: 1, multiplier: 1 });
    // Restore display size
    c.setDimensions({ width: CANVAS_DISPLAY, height: CANVAS_DISPLAY });
    c.setZoom(prevZoom);
    c.renderAll();

    const a = document.createElement("a");
    a.href = url;
    a.download = `${design?.name || "design"}.png`;
    a.click();
    toast.success("PNG downloaded");
  };

  // ---------- RENDER ----------
  if (loading) {
    return <AppShell title="Editor"><Card className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></Card></AppShell>;
  }

  return (
    <AppShell title={design?.name || "Editor"}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(ml("/marketing/designs"))}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Input
            value={design?.name || ""}
            onChange={(e) => setDesign((d) => d && ({ ...d, name: e.target.value }))}
            onBlur={async (e) => {
              if (!id) return;
              await (supabase.from("designs") as any).update({ name: e.target.value }).eq("id", id);
            }}
            className="h-9 w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (!confirm("Reset all fields to template defaults? Your edits will be lost.")) return;
            setValues(template.defaults);
          }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reset to defaults
          </Button>
          <Button variant="outline" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
          <Button size="sm" onClick={exportPng}>
            <Download className="h-4 w-4 mr-1" /> Download PNG
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Canvas */}
        <Card className="p-6 flex items-center justify-center bg-muted/30">
          <div
            className="shadow-lg rounded-md overflow-hidden"
            style={{ width: CANVAS_DISPLAY, height: CANVAS_DISPLAY }}
          >
            <canvas ref={canvasElRef} width={CANVAS_DISPLAY} height={CANVAS_DISPLAY} />
          </div>
        </Card>

        {/* Right rail: form */}
        <Card className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <p className="font-display font-bold text-lg">{template.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{template.blurb}</p>
          </div>

          {template.fields.map((f) => (
            <FieldRenderer
              key={f.name}
              field={f}
              value={values[f.name]}
              onChange={(v) => setField(f.name, v)}
              orgId={orgId || ""}
              teams={teams}
              onImportRoster={importRoster}
              onUseLineupSlot={(i, slot) => {
                const list = [...(values.lineup || [])];
                list[i] = slot;
                setField("lineup", list);
              }}
            />
          ))}
        </Card>
      </div>
    </AppShell>
  );
}

// ===================== FIELD RENDERER =====================
function FieldRenderer({
  field, value, onChange, orgId, teams, onImportRoster, onUseLineupSlot,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
  orgId: string;
  teams: TeamOpt[];
  onImportRoster: (teamId: string) => void;
  onUseLineupSlot: (i: number, slot: { jersey: string; name: string; position: string }) => void;
}) {
  const labelEl = (
    <div className="flex items-baseline justify-between">
      <Label className="text-sm">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {field.helper && <span className="text-[10px] text-muted-foreground">{field.helper}</span>}
    </div>
  );

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-1">
          {labelEl}
          <Input value={value || ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1">
          {labelEl}
          <Textarea rows={3} value={value || ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "date":
      return (
        <div className="space-y-1">
          {labelEl}
          <Input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "time":
      return (
        <div className="space-y-1">
          {labelEl}
          <Input value={value || ""} placeholder="7:00 PM" onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "photo":
      return (
        <div className="space-y-1">
          {labelEl}
          {orgId ? (
            <MediaPicker
              orgId={orgId}
              mode="image"
              value={value || ""}
              onChange={(url) => onChange(url ?? "")}
              compact
            />
          ) : (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Loading…
            </div>
          )}
        </div>
      );
    case "team_picker":
      return (
        <div className="space-y-1">
          {labelEl}
          <div className="flex gap-2">
            <select
              className="flex-1 h-9 px-2 rounded-md border border-input bg-background text-sm"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">— Manual entry —</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button
              type="button" size="sm" variant="outline"
              disabled={!value}
              onClick={() => onImportRoster(value)}
            >
              <Users className="h-3.5 w-3.5 mr-1" /> Import
            </Button>
          </div>
        </div>
      );
    case "lineup_repeater": {
      const list: Array<{ jersey: string; name: string; position: string }> = value || [];
      return (
        <div className="space-y-2">
          {labelEl}
          <div className="space-y-2">
            {list.map((row, i) => (
              <div key={i} className="grid grid-cols-[60px_1fr_60px_28px] gap-1 items-center">
                <Input
                  value={row.jersey || ""} placeholder="#"
                  onChange={(e) => onUseLineupSlot(i, { ...row, jersey: e.target.value })}
                />
                <Input
                  value={row.name || ""} placeholder="Player name"
                  onChange={(e) => onUseLineupSlot(i, { ...row, name: e.target.value })}
                />
                <Input
                  value={row.position || ""} placeholder="POS"
                  onChange={(e) => onUseLineupSlot(i, { ...row, position: e.target.value })}
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(list.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {list.length < 11 && (
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => onChange([...list, { jersey: "", name: "", position: "" }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add starter
            </Button>
          )}
        </div>
      );
    }
    case "date_repeater": {
      const list: Array<{ date: string; time: string }> = value || [];
      return (
        <div className="space-y-2">
          {labelEl}
          {list.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_28px] gap-1 items-center">
              <Input type="date" value={row.date || ""} onChange={(e) => {
                const next = [...list]; next[i] = { ...row, date: e.target.value }; onChange(next);
              }} />
              <Input placeholder="Time (opt)" value={row.time || ""} onChange={(e) => {
                const next = [...list]; next[i] = { ...row, time: e.target.value }; onChange(next);
              }} />
              <button type="button" className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange(list.filter((_, idx) => idx !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {list.length < 5 && (
            <Button type="button" variant="outline" size="sm"
              onClick={() => onChange([...list, { date: "", time: "" }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add date
            </Button>
          )}
        </div>
      );
    }
    case "location_repeater": {
      const list: Array<{ name: string; address: string }> = value || [];
      return (
        <div className="space-y-2">
          {labelEl}
          {list.map((row, i) => (
            <div key={i} className="space-y-1 border-l-2 border-muted pl-2">
              <div className="grid grid-cols-[1fr_28px] gap-1 items-center">
                <Input placeholder="Field / venue name" value={row.name || ""} onChange={(e) => {
                  const next = [...list]; next[i] = { ...row, name: e.target.value }; onChange(next);
                }} />
                <button type="button" className="text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(list.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input placeholder="Address (opt)" value={row.address || ""} onChange={(e) => {
                const next = [...list]; next[i] = { ...row, address: e.target.value }; onChange(next);
              }} />
            </div>
          ))}
          {list.length < 5 && (
            <Button type="button" variant="outline" size="sm"
              onClick={() => onChange([...list, { name: "", address: "" }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add location
            </Button>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
