// Walks a composition_spec object and replaces {{variable}} tokens in any
// string field with values from the merged context (org name, brand kit
// colors/logo, user prompt inputs). Used right before posting to the
// composite worker so templates can carry placeholders like {{event_date}}.

type Ctx = Record<string, any>;

function fmt(v: any): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function interp(s: string, ctx: Ctx): string {
  return s.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key) => {
    const v = ctx[key];
    return v === undefined || v === null ? "" : fmt(v);
  });
}

function walk(node: any, ctx: Ctx): any {
  if (typeof node === "string") return interp(node, ctx);
  if (Array.isArray(node)) return node.map((x) => walk(x, ctx));
  if (node && typeof node === "object") {
    const out: any = {};
    for (const k of Object.keys(node)) out[k] = walk(node[k], ctx);
    return out;
  }
  return node;
}

export function buildSpecContext(opts: {
  orgName: string;
  brandKit: any;
  promptInput: Record<string, any>;
}): Ctx {
  const bk = opts.brandKit || {};
  return {
    org_name: opts.orgName || "",
    logo_url: bk.logo_primary_url || bk.logo_secondary_url || "",
    color_primary: bk.color_primary || "#1E3A5F",
    color_secondary: bk.color_secondary || "#475569",
    color_accent: bk.color_accent || "#22C55E",
    color_dark: bk.color_dark || "#0F172A",
    color_light: bk.color_light || "#FFFFFF",
    font_heading: bk.font_heading || "Inter",
    font_body: bk.font_body || "Inter",
    ...(opts.promptInput || {}),
  };
}

export function interpolateSpec(spec: any, ctx: Ctx): any {
  return walk(spec, ctx);
}
