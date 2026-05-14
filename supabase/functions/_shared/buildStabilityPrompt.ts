// Builds the Stability AI image prompt from template + brand kit + user inputs.
// Image prompts intentionally do NOT include any text content (no headlines,
// dates, names) — text gets composited later via sharp. The prompt focuses
// only on the visual atmosphere of the background image.

interface BrandKit {
  color_primary?: string | null;
  color_secondary?: string | null;
  color_accent?: string | null;
  color_dark?: string | null;
  color_light?: string | null;
  brand_voice_notes?: string | null;
}

interface DesignTemplate {
  design_type: string;
  category?: string | null;
  mood?: string | null;
  stability_prompt_template?: string | null;
}

const SPORT_ATMOSPHERE: Record<string, string> = {
  tryout: "competitive youth baseball tryout atmosphere, athletes in motion, field environment",
  commit: "celebration moment, victory, achievement, confetti, crowd energy",
  event: "stadium atmosphere, competitive energy, action sports photography",
  tournament: "stadium atmosphere, competitive energy, action sports photography",
  sponsor: "professional business partnership, premium brand feel",
  general: "youth sports community, team culture, energy and motion",
  announcement: "youth sports community, team culture, energy and motion",
  off_season: "intense training facility, athletic dedication, focused athletes",
  training: "intense training facility, athletic dedication, focused athletes",
};

const VISUAL_STYLE: Record<string, string> = {
  social_post_square: "cinematic sports photography style, dramatic lighting, shallow depth of field",
  social_post_landscape: "cinematic sports photography style, dramatic lighting, shallow depth of field",
  social_post_story: "vertical composition, full-bleed dramatic imagery, mobile-optimized",
  email_header: "wide panoramic sports photography, cinematic widescreen composition",
  flyer_letter: "bold graphic design, high contrast, striking visual impact",
  flyer_half: "bold graphic design, high contrast, striking visual impact",
  roster_card: "portrait-style sports photography, premium feel",
  schedule_graphic: "clean sports photography, dynamic composition",
  announcement: "cinematic sports photography style, dramatic lighting",
  sponsor_recognition: "premium professional photography, clean composition",
};

const QUALITY_SUFFIX =
  "professional sports photography, 8k resolution, sharp focus, dramatic lighting, " +
  "award-winning sports photography quality, no text, no watermarks, no borders";

function buildColorDirection(bk: BrandKit): string {
  const primary = bk.color_primary || "#1E3A5F";
  const dark = bk.color_dark || "#0F172A";
  const accent = bk.color_accent || "#22C55E";
  return `color palette dominated by ${primary} and ${dark}, complementary accent of ${accent}, overall tone should feel cohesive with these brand colors`;
}

function buildContentContext(promptInput: Record<string, any>): string {
  // Translate user inputs to atmosphere descriptors WITHOUT including raw text.
  const parts: string[] = [];
  if (promptInput.age_groups) parts.push(`youth athletes, ages ${String(promptInput.age_groups).toLowerCase()}`);
  if (promptInput.sport) parts.push(`${promptInput.sport} environment`);
  if (promptInput.season) parts.push(`${String(promptInput.season).toLowerCase()} season`);
  if (promptInput.location_type) parts.push(`${promptInput.location_type} setting`);
  if (parts.length === 0) parts.push("youth sports environment");
  return parts.join(", ");
}

export function buildStabilityPrompt(
  template: DesignTemplate,
  brandKit: BrandKit,
  promptInput: Record<string, any>,
): string {
  // If template has its own custom template string, do variable substitution.
  if (template.stability_prompt_template) {
    return template.stability_prompt_template
      .replace(/\{mood\}/g, template.mood || "high energy, dynamic")
      .replace(/\{color_direction\}/g, buildColorDirection(brandKit))
      .replace(/\{sport_atmosphere\}/g, SPORT_ATMOSPHERE[template.category || "general"] || SPORT_ATMOSPHERE.general)
      .replace(/\{visual_style\}/g, VISUAL_STYLE[template.design_type] || VISUAL_STYLE.social_post_square)
      .replace(/\{content_context\}/g, buildContentContext(promptInput))
      .replace(/\{quality_direction\}/g, QUALITY_SUFFIX);
  }

  // Default prompt assembly
  const atmosphere = SPORT_ATMOSPHERE[template.category || "general"] || SPORT_ATMOSPHERE.general;
  const mood = template.mood || "high energy, dynamic, explosive";
  const style = VISUAL_STYLE[template.design_type] || VISUAL_STYLE.social_post_square;
  const colors = buildColorDirection(brandKit);
  const context = buildContentContext(promptInput);

  return `${atmosphere}, ${mood}, ${style}, ${colors}, ${context}, ${QUALITY_SUFFIX}`;
}
