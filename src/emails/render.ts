import mjml2html from "mjml-browser";
import Mustache from "mustache";
import { SYSTEM_TEMPLATE_BY_KEY } from "./mjmlTemplates";

export type BrandContext = {
  orgName: string;
  primary: string;
  secondary: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  logoUrl: string;
  address: string;
};

export const DEFAULT_BRAND: BrandContext = {
  orgName: "Your Organization",
  primary: "#0F172A",
  secondary: "#1E293B",
  accent: "#22C55E",
  headingFont: "Helvetica, Arial, sans-serif",
  bodyFont: "Helvetica, Arial, sans-serif",
  logoUrl: "",
  address: "",
};

// Disable Mustache HTML escaping for URLs/colors (sanitize at the source)
Mustache.escape = (text: string) => String(text);

export type RenderInput = {
  // Either pass a system template key OR a raw mjml string.
  templateKey?: string;
  mjmlSource?: string;
  props: Record<string, any>;
  brand?: Partial<BrandContext>;
  unsubscribeUrl?: string;
};

export type RenderResult = {
  html: string;
  errors: { line: number; message: string; tagName?: string }[];
};

export function renderEmail({
  templateKey,
  mjmlSource,
  props,
  brand,
  unsubscribeUrl,
}: RenderInput): RenderResult {
  const fullBrand: BrandContext = { ...DEFAULT_BRAND, ...(brand ?? {}) };
  const source = mjmlSource ?? (templateKey ? SYSTEM_TEMPLATE_BY_KEY[templateKey]?.mjml : undefined);
  if (!source) {
    return { html: `<p>Template not found.</p>`, errors: [{ line: 0, message: "no source" }] };
  }
  const view = {
    ...props,
    brand: fullBrand,
    unsubscribeUrl: unsubscribeUrl || "#",
  };
  const interpolated = Mustache.render(source, view);
  try {
    const result = mjml2html(interpolated, { validationLevel: "soft" });
    return {
      html: result.html,
      errors: (result.errors ?? []).map((e: any) => ({
        line: e.line ?? 0,
        message: e.message ?? String(e),
        tagName: e.tagName,
      })),
    };
  } catch (e: any) {
    return { html: `<p>Render error: ${e.message}</p>`, errors: [{ line: 0, message: e.message }] };
  }
}

// Strip HTML to plain text for a basic text fallback.
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|tr|li|h[1-6]|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
