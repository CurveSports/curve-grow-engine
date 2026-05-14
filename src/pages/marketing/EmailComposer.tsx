import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Send, Save, Smartphone, Tablet, Monitor, Moon, FileText, Shield } from "lucide-react";
import { renderEmail, htmlToText, wrapCustomHtml, type BrandContext, DEFAULT_BRAND } from "@/emails/render";
import { localSpamCheck } from "@/lib/spamCheck";
import { useMarketingLink } from "@/hooks/useMarketingLink";

type Template = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  rendering_engine: string;
  jsx_source: string | null;
  mjml_source: string | null;
  input_fields: any;
  preview_props: any;
};
type Segment = { id: string; name: string; contact_count: number; team_id?: string | null };
type Domain = { id: string; from_email: string | null; from_name: string | null; is_default: boolean };
type Team = { id: string; name: string; season_id: string | null };
type Season = { id: string; name: string };
type AudienceMode = "segment" | "teams";

type Preview = "desktop" | "tablet" | "mobile" | "dark" | "text";
const WIDTHS: Record<Preview, number | undefined> = { desktop: 800, tablet: 600, mobile: 375, dark: 800, text: 800 };

export default function EmailComposer() {
  const { profile } = useAuth();
  const { orgId } = useEffectiveOrg();
  const navigate = useNavigate();
  const ml = useMarketingLink();
  const [params] = useSearchParams();
  const presetTemplateId = params.get("template");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [brand, setBrand] = useState<BrandContext>(DEFAULT_BRAND);

  const [templateId, setTemplateId] = useState<string>("");
  const [propsState, setPropsState] = useState<Record<string, any>>({});
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [previewMode, setPreviewMode] = useState<Preview>("desktop");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const [t, s, d, b] = await Promise.all([
        supabase.from("email_templates").select("*").eq("active", true).order("sort_order"),
        supabase.from("org_contact_segments").select("id,name,contact_count").eq("org_id", orgId).order("name"),
        supabase.from("org_email_domains").select("id,from_email,from_name,is_default").eq("org_id", orgId),
        supabase.from("org_brand_kits").select("*").eq("org_id", orgId).maybeSingle(),
        supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      ]);
      setTemplates((t.data ?? []) as Template[]);
      setSegments((s.data ?? []) as Segment[]);
      setDomains((d.data ?? []) as Domain[]);
      const def = (d.data ?? []).find((x: any) => x.is_default) ?? (d.data ?? [])[0];
      if (def) { setFromEmail(def.from_email ?? ""); setFromName(def.from_name ?? ""); }
      const bk: any = b.data;
      if (bk) {
        setBrand({
          ...DEFAULT_BRAND,
          orgName: bk.org_name || DEFAULT_BRAND.orgName,
          primary: bk.primary_color || DEFAULT_BRAND.primary,
          secondary: bk.secondary_color || DEFAULT_BRAND.secondary,
          accent: bk.accent_color || DEFAULT_BRAND.accent,
          headingFont: bk.heading_font || DEFAULT_BRAND.headingFont,
          bodyFont: bk.body_font || DEFAULT_BRAND.bodyFont,
          logoUrl: bk.logo_primary_url || "",
          address: bk.address || "",
        });
      }
    })();
  }, [orgId]);

  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);
  useEffect(() => {
    if (presetTemplateId && templates.length && !templateId) setTemplateId(presetTemplateId);
  }, [presetTemplateId, templates, templateId]);
  useEffect(() => {
    if (template) setPropsState((p) => ({ ...(template.preview_props ?? {}), ...p }));
  }, [template]);

  const isBlank = templateId === "__blank__";
  const [customHtml, setCustomHtml] = useState("");
  const [rendered, setRendered] = useState<{ html: string; errors: any[] }>({ html: "", errors: [] });

  useEffect(() => {
    let cancelled = false;
    if (isBlank) {
      setRendered({ html: wrapCustomHtml(customHtml, brand), errors: [] });
      return;
    }
    if (!template) { setRendered({ html: "", errors: [] }); return; }
    renderEmail({
      templateKey: template.jsx_source ?? undefined,
      mjmlSource: !template.jsx_source ? template.mjml_source ?? "" : undefined,
      props: propsState,
      brand,
    }).then((r) => { if (!cancelled) setRendered(r); });
    return () => { cancelled = true; };
  }, [template, propsState, brand, isBlank, customHtml]);

  const spam = useMemo(() => localSpamCheck({ subject, html: rendered.html, from: fromEmail }), [subject, rendered.html, fromEmail]);
  const recipientEstimate = segments.find((s) => s.id === segmentId)?.contact_count ?? 0;

  const save = async (sendNow: boolean) => {
    if (!orgId) return;
    if (!subject) return toast.error("Subject required");
    if (!segmentId) return toast.error("Pick a segment");
    if (!template && !isBlank) return toast.error("Pick a template");
    if (isBlank && !customHtml.trim()) return toast.error("Write your email body");
    setSaving(true);
    try {
      const payload: any = {
        org_id: orgId,
        subject, preview_text: previewText || null,
        from_email: fromEmail || null, from_name: fromName || null,
        segment_id: segmentId,
        template_id: isBlank ? null : template!.id,
        rendering_engine: isBlank ? "html" : template!.rendering_engine,
        template_props: isBlank ? { custom_html: customHtml } : propsState,
        html_body: rendered.html,
        text_body: htmlToText(rendered.html),
        spam_score: spam.score,
        spam_check_details: spam,
        spam_check_at: new Date().toISOString(),
        status: "draft",
        created_by: profile?.user_id,
      };
      const { data, error } = await supabase.from("org_email_sends").insert(payload).select().single();
      if (error) throw error;
      if (sendNow) {
        if (spam.score > 5 && !confirm(`Spam score is ${spam.score}/10. Send anyway?`)) {
          setSaving(false); return;
        }
        const { error: sendErr } = await supabase.functions.invoke("send-marketing-email", { body: { send_id: data.id } });
        if (sendErr) throw sendErr;
        toast.success("Email sent");
      } else {
        toast.success("Draft saved");
      }
      navigate(ml("/marketing/emails"));
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setSaving(false); }
  };

  const previewWidth = WIDTHS[previewMode];
  const isDark = previewMode === "dark";

  return (
    <AppShell title="New email">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-4 h-[calc(100vh-8rem)]">
        {/* LEFT: setup */}
        <Card className="p-4 overflow-y-auto space-y-4">
          <div>
            <Label>Template</Label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
              className="w-full h-10 px-2 rounded-md border border-input bg-background text-sm">
              <option value="">Pick a template…</option>
              <option value="__blank__">✏️ Blank email — write your own</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {template?.description && <p className="text-xs text-muted-foreground mt-1">{template.description}</p>}
            {isBlank && <p className="text-xs text-muted-foreground mt-1">Write HTML or plain text — it'll be wrapped in your brand shell.</p>}
          </div>

          {isBlank && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email body</p>
              <Textarea
                rows={14}
                className="font-mono text-xs"
                value={customHtml}
                placeholder={"<h2>Hi {{first_name}},</h2>\n<p>Write your message here. Basic HTML is supported.</p>\n<p><a href=\"https://example.com\">Click here</a></p>"}
                onChange={(e) => setCustomHtml(e.target.value)}
              />
            </div>
          )}

          {template && Array.isArray(template.input_fields) && template.input_fields.length > 0 && (
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Variables</p>
              {(template.input_fields as any[]).map((f) => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}{f.required && " *"}</Label>
                  {f.type === "textarea" ? (
                    <Textarea rows={3} value={propsState[f.key] ?? ""} placeholder={f.placeholder}
                      onChange={(e) => setPropsState((p) => ({ ...p, [f.key]: e.target.value }))} />
                  ) : (
                    <Input value={propsState[f.key] ?? ""} placeholder={f.placeholder}
                      onChange={(e) => setPropsState((p) => ({ ...p, [f.key]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Audience</p>
            <select value={segmentId} onChange={(e) => setSegmentId(e.target.value)}
              className="w-full h-10 px-2 rounded-md border border-input bg-background text-sm">
              <option value="">Pick a segment…</option>
              {segments.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.contact_count})</option>)}
            </select>
            {segmentId && <p className="text-xs text-muted-foreground">~{recipientEstimate} recipients</p>}
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Subject & sender</p>
            <div><Label className="text-xs">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label className="text-xs">Preview text</Label>
              <Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} /></div>
            <div><Label className="text-xs">From email</Label>
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></div>
            <div><Label className="text-xs">From name</Label>
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} /></div>
          </div>
        </Card>

        {/* CENTER: preview */}
        <Card className="overflow-hidden flex flex-col">
          <div className="border-b border-border px-3 py-2 flex items-center gap-1 bg-muted/30">
            {[
              { k: "desktop", icon: Monitor, label: "Desktop" },
              { k: "tablet", icon: Tablet, label: "Tablet" },
              { k: "mobile", icon: Smartphone, label: "Mobile" },
              { k: "dark", icon: Moon, label: "Dark" },
              { k: "text", icon: FileText, label: "Plain" },
            ].map(({ k, icon: Icon, label }) => (
              <button key={k} onClick={() => setPreviewMode(k as Preview)}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${previewMode === k ? "bg-background border border-border" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-3 w-3" />{label}
              </button>
            ))}
          </div>
          <div className={`flex-1 overflow-auto p-4 ${isDark ? "bg-zinc-950" : "bg-zinc-100"}`}>
            {!template && !isBlank ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Pick a template or "Blank email" to preview</div>
            ) : previewMode === "text" ? (
              <pre className="bg-background p-4 rounded text-xs whitespace-pre-wrap max-w-2xl mx-auto">{htmlToText(rendered.html)}</pre>
            ) : (
              <div className="mx-auto bg-white shadow" style={{ maxWidth: previewWidth, colorScheme: isDark ? "dark" : "light" }}>
                <iframe title="preview" srcDoc={isDark
                  ? `<style>html{color-scheme:dark;}body{background:#0a0a0a !important;color:#e5e5e5 !important;}</style>${rendered.html}`
                  : rendered.html}
                  className="w-full" style={{ minHeight: 600, border: "none" }} />
              </div>
            )}
          </div>
        </Card>

        {/* RIGHT: actions */}
        <Card className="p-4 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Spam score</p>
            </div>
            <div className={`text-3xl font-bold ${spam.score <= 3 ? "text-green-600" : spam.score <= 5 ? "text-amber-600" : "text-destructive"}`}>
              {spam.score} <span className="text-base font-normal text-muted-foreground">/ 10</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {spam.verdict === "likely_to_deliver" ? "Likely to deliver" :
               spam.verdict === "may_get_filtered" ? "May get filtered" : "High spam risk"}
            </p>
            {spam.rules.length > 0 && (
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                {spam.rules.map((r) => <li key={r.rule}>• {r.description} <span className="text-amber-600">+{r.score}</span></li>)}
              </ul>
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <Button onClick={() => save(false)} disabled={saving} variant="outline" className="w-full">
              <Save className="h-4 w-4 mr-2" />Save draft
            </Button>
            <Button onClick={() => save(true)} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Send now
            </Button>
            <Button onClick={() => navigate(ml("/marketing/emails"))} variant="ghost" className="w-full">Cancel</Button>
          </div>

          {rendered.errors.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs uppercase tracking-wider text-amber-600 font-semibold mb-1">Render warnings</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {rendered.errors.slice(0, 5).map((e, i) => <li key={i}>• {e.message}</li>)}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
