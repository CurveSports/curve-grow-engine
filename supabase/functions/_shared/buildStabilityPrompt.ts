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
  hero_source?: string | null;
}

const SPORT_ATMOSPHERE: Record<string, string> = {
  tryout: "competitive youth tryout atmosphere, athletes in motion, field environment",
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

// Per-sport equipment/setting cues so Stability stops defaulting to soccer.
const SPORT_SPECIFICS: Record<string, { include: string; exclude: string }> = {
  baseball: {
    include: "baseball diamond, dirt infield, baseball glove, bat, baseball, dugout, outfield grass, foul lines, batting cage",
    exclude: "soccer ball, soccer field, football, basketball, hockey, volleyball, lacrosse",
  },
  softball: {
    include: "softball field, dirt infield, softball glove, bat, yellow softball, dugout, outfield grass, batting cage",
    exclude: "soccer ball, soccer field, football, basketball, hockey, volleyball, lacrosse",
  },
  basketball: {
    include: "basketball court, hardwood floor, hoop and net, basketball, gymnasium, painted three-point line",
    exclude: "baseball, soccer, football, hockey, volleyball, lacrosse, grass field, dirt",
  },
  soccer: {
    include: "soccer pitch, soccer ball, goal net, grass field, soccer cleats, corner flag",
    exclude: "baseball, football, basketball, hockey, lacrosse, dirt infield, bats, gloves",
  },
  football: {
    include: "football field, yard lines, end zone, football, helmet, shoulder pads, goal posts",
    exclude: "baseball, soccer, basketball, hockey, lacrosse",
  },
  lacrosse: {
    include: "lacrosse field, lacrosse stick, lacrosse ball, helmet and pads, goal net",
    exclude: "baseball, soccer, football, basketball, hockey",
  },
  hockey: {
    include: "ice rink, hockey stick, puck, helmet and pads, goal net, boards and glass",
    exclude: "baseball, soccer, football, basketball, lacrosse, grass, dirt",
  },
  volleyball: {
    include: "volleyball court, net, volleyball, knee pads, indoor gymnasium",
    exclude: "baseball, soccer, football, basketball, hockey, lacrosse",
  },
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
  const parts: string[] = [];
  if (promptInput.age_groups) parts.push(`youth athletes, ages ${String(promptInput.age_groups).toLowerCase()}`);
  if (promptInput.season) parts.push(`${String(promptInput.season).toLowerCase()} season`);
  if (promptInput.location_type) parts.push(`${promptInput.location_type} setting`);
  if (parts.length === 0) parts.push("youth sports environment");
  return parts.join(", ");
}

function normalizeSport(s?: string | null): string | null {
  if (!s) return null;
  const lower = s.trim().toLowerCase();
  // Map common synonyms
  if (lower === "bb" || lower === "baseball") return "baseball";
  if (lower === "sb" || lower === "softball" || lower === "fastpitch") return "softball";
  if (lower === "basketball" || lower === "hoops") return "basketball";
  if (lower === "soccer" || lower === "futbol" || lower === "football (soccer)") return "soccer";
  if (lower === "football" || lower === "american football") return "football";
  if (lower === "lacrosse" || lower === "lax") return "lacrosse";
  if (lower === "hockey" || lower === "ice hockey") return "hockey";
  if (lower === "volleyball" || lower === "vball") return "volleyball";
  return lower;
}

function buildSportDirection(sport: string | null): string {
  if (!sport) return "youth sports environment";
  const spec = SPORT_SPECIFICS[sport];
  if (!spec) return `${sport} environment, ${sport}-specific equipment and setting clearly visible`;
  return `SPORT: ${sport}. Setting and equipment must be unmistakably ${sport} — ${spec.include}`;
}

export function buildStabilitySportNegative(sport: string | null): string {
  if (!sport) return "";
  const spec = SPORT_SPECIFICS[sport];
  if (!spec) return "";
  return spec.exclude;
}

export function buildStabilityPrompt(
  template: DesignTemplate,
  brandKit: BrandKit,
  promptInput: Record<string, any>,
  orgSport?: string | null,
): string {
  const sport = normalizeSport(orgSport || promptInput.sport || null);
  const sportDirection = buildSportDirection(sport);

  // Hybrid mode: AI generates ONLY the environment, no people (a real photo is composited on top).
  const heroSource = template.hero_source || "ai_background";
  const environmentOnly = heroSource === "hybrid"
    ? "EMPTY ENVIRONMENT ONLY — no people, no athletes, no players, no humans, no faces, no silhouettes. Composition leaves clear central negative space for a subject to be added later."
    : "";

  // If template has its own custom template string, do variable substitution.
  if (template.stability_prompt_template) {
    return template.stability_prompt_template
      .replace(/\{mood\}/g, template.mood || "high energy, dynamic")
      .replace(/\{color_direction\}/g, buildColorDirection(brandKit))
      .replace(/\{sport_atmosphere\}/g, SPORT_ATMOSPHERE[template.category || "general"] || SPORT_ATMOSPHERE.general)
      .replace(/\{sport_direction\}/g, sportDirection)
      .replace(/\{visual_style\}/g, VISUAL_STYLE[template.design_type] || VISUAL_STYLE.social_post_square)
      .replace(/\{content_context\}/g, buildContentContext(promptInput))
      .replace(/\{environment_only\}/g, environmentOnly)
      .replace(/\{quality_direction\}/g, QUALITY_SUFFIX);
  }

  // Default prompt assembly — sport leads so it dominates model attention.
  const atmosphere = SPORT_ATMOSPHERE[template.category || "general"] || SPORT_ATMOSPHERE.general;
  const mood = template.mood || "high energy, dynamic, explosive";
  const style = VISUAL_STYLE[template.design_type] || VISUAL_STYLE.social_post_square;
  const colors = buildColorDirection(brandKit);
  const context = buildContentContext(promptInput);

  const parts = [
    sportDirection,
    atmosphere,
    mood,
    style,
    colors,
    context,
    environmentOnly,
    QUALITY_SUFFIX,
  ].filter(Boolean);

  return parts.join(", ");
}
