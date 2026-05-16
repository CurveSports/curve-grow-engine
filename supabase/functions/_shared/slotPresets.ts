// Default composition_config presets per design_type.
// Templates without their own custom layout fall back to these. Tokens like
// {{org_name}}, {{logo_url}}, {{headline}}, {{event_date}}, etc. are resolved
// by interpolateSpec at render time.

type Spec = {
  canvas: { width: number; height: number };
  layers: any[];
};

const SQUARE: Spec = {
  canvas: { width: 1080, height: 1080 },
  layers: [
    { type: "rect", x: 0, y: 0,   width: 1080, height: 360,  fill: "{{color_dark}}", opacity: 0.55 },
    { type: "rect", x: 0, y: 560, width: 1080, height: 520,  fill: "{{color_dark}}", opacity: 0.78 },
    { type: "rect", x: 0, y: 552, width: 1080, height: 8,    fill: "{{color_accent}}", opacity: 1 },
    { type: "image", x: 60, y: 60, width: 160, height: 160, url: "{{logo_url}}" },
    { type: "text", x: 60, y: 200, size: 28,  weight: 700, color: "#FFFFFF",        text: "{{org_name}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 260, size: 18,  weight: 600, color: "{{color_accent}}", text: "{{eyebrow}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 720, size: 128, weight: 900, color: "#FFFFFF",        text: "{{headline}}", font: "Inter, Arial, sans-serif" },
    { type: "rect", x: 60, y: 760, width: 320, height: 6, fill: "{{color_accent}}", opacity: 1 },
    { type: "text", x: 60, y: 830, size: 36,  weight: 700, color: "{{color_accent}}", text: "{{subhead}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 890, size: 38,  weight: 700, color: "#FFFFFF",        text: "{{detail_line}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 940, size: 30,  weight: 500, color: "#E5E7EB",        text: "{{location}}", font: "Inter, Arial, sans-serif" },
    { type: "rect", x: 60, y: 980, width: 360, height: 72, fill: "{{color_accent}}", opacity: 1, radius: 12 },
    { type: "text", x: 240, y: 1028, size: 28, weight: 800, color: "{{color_dark}}", text: "{{cta}}", font: "Inter, Arial, sans-serif", align: "center" },
  ],
};

const STORY: Spec = {
  canvas: { width: 1080, height: 1920 },
  layers: [
    { type: "rect", x: 0, y: 0,    width: 1080, height: 600,  fill: "{{color_dark}}", opacity: 0.55 },
    { type: "rect", x: 0, y: 1200, width: 1080, height: 720,  fill: "{{color_dark}}", opacity: 0.78 },
    { type: "rect", x: 0, y: 1192, width: 1080, height: 8,    fill: "{{color_accent}}", opacity: 1 },
    { type: "image", x: 80, y: 100, width: 180, height: 180, url: "{{logo_url}}" },
    { type: "text", x: 80, y: 320, size: 36,  weight: 700, color: "#FFFFFF",          text: "{{org_name}}",  font: "Inter, Arial, sans-serif" },
    { type: "text", x: 80, y: 380, size: 22,  weight: 600, color: "{{color_accent}}", text: "{{eyebrow}}",   font: "Inter, Arial, sans-serif" },
    { type: "text", x: 80, y: 1380, size: 180, weight: 900, color: "#FFFFFF",         text: "{{headline}}",  font: "Inter, Arial, sans-serif" },
    { type: "rect", x: 80, y: 1430, width: 320, height: 8, fill: "{{color_accent}}", opacity: 1 },
    { type: "text", x: 80, y: 1530, size: 48,  weight: 700, color: "{{color_accent}}", text: "{{subhead}}",   font: "Inter, Arial, sans-serif" },
    { type: "text", x: 80, y: 1610, size: 44,  weight: 700, color: "#FFFFFF",          text: "{{detail_line}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 80, y: 1680, size: 36,  weight: 500, color: "#E5E7EB",          text: "{{location}}",  font: "Inter, Arial, sans-serif" },
    { type: "rect", x: 80, y: 1740, width: 420, height: 90, fill: "{{color_accent}}", opacity: 1, radius: 14 },
    { type: "text", x: 290, y: 1800, size: 34, weight: 800, color: "{{color_dark}}",   text: "{{cta}}", font: "Inter, Arial, sans-serif", align: "center" },
  ],
};

const LANDSCAPE: Spec = {
  canvas: { width: 1200, height: 630 },
  layers: [
    { type: "rect", x: 0, y: 0, width: 700, height: 630, fill: "{{color_dark}}", opacity: 0.82 },
    { type: "rect", x: 700, y: 0, width: 8, height: 630, fill: "{{color_accent}}", opacity: 1 },
    { type: "image", x: 60, y: 60, width: 120, height: 120, url: "{{logo_url}}" },
    { type: "text", x: 60, y: 220, size: 24, weight: 700, color: "#FFFFFF",          text: "{{org_name}}",   font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 260, size: 18, weight: 600, color: "{{color_accent}}", text: "{{eyebrow}}",    font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 360, size: 72, weight: 900, color: "#FFFFFF",          text: "{{headline}}",   font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 440, size: 26, weight: 600, color: "{{color_accent}}", text: "{{detail_line}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 490, size: 22, weight: 500, color: "#E5E7EB",          text: "{{location}}",   font: "Inter, Arial, sans-serif" },
    { type: "rect", x: 60, y: 540, width: 260, height: 56, fill: "{{color_accent}}", opacity: 1, radius: 10 },
    { type: "text", x: 190, y: 578, size: 22, weight: 800, color: "{{color_dark}}",  text: "{{cta}}",        font: "Inter, Arial, sans-serif", align: "center" },
  ],
};

const EMAIL_HEADER: Spec = {
  canvas: { width: 1200, height: 400 },
  layers: [
    { type: "rect", x: 0, y: 0, width: 1200, height: 400, fill: "{{color_dark}}", opacity: 0.7 },
    { type: "rect", x: 0, y: 392, width: 1200, height: 8, fill: "{{color_accent}}", opacity: 1 },
    { type: "image", x: 60, y: 60, width: 110, height: 110, url: "{{logo_url}}" },
    { type: "text", x: 200, y: 110, size: 26, weight: 700, color: "#FFFFFF",          text: "{{org_name}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 200, y: 148, size: 18, weight: 600, color: "{{color_accent}}", text: "{{eyebrow}}",  font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 280, size: 64, weight: 900, color: "#FFFFFF",           text: "{{headline}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 340, size: 22, weight: 500, color: "#E5E7EB",           text: "{{subhead}}",  font: "Inter, Arial, sans-serif" },
  ],
};

const FLYER: Spec = {
  canvas: { width: 1275, height: 1650 },
  layers: [
    { type: "rect", x: 0, y: 0,    width: 1275, height: 700,  fill: "{{color_dark}}", opacity: 0.6 },
    { type: "rect", x: 0, y: 1100, width: 1275, height: 550,  fill: "{{color_dark}}", opacity: 0.85 },
    { type: "rect", x: 0, y: 1092, width: 1275, height: 8,    fill: "{{color_accent}}", opacity: 1 },
    { type: "image", x: 80, y: 80, width: 180, height: 180, url: "{{logo_url}}" },
    { type: "text", x: 80, y: 290, size: 32, weight: 700, color: "#FFFFFF",          text: "{{org_name}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 80, y: 340, size: 22, weight: 600, color: "{{color_accent}}", text: "{{eyebrow}}",  font: "Inter, Arial, sans-serif" },
    { type: "text", x: 80, y: 560, size: 160, weight: 900, color: "#FFFFFF",         text: "{{headline}}", font: "Inter, Arial, sans-serif" },
    { type: "rect", x: 80, y: 620, width: 400, height: 8, fill: "{{color_accent}}", opacity: 1 },
    { type: "text", x: 80, y: 1240, size: 44, weight: 700, color: "{{color_accent}}", text: "{{subhead}}",   font: "Inter, Arial, sans-serif" },
    { type: "text", x: 80, y: 1320, size: 40, weight: 700, color: "#FFFFFF",          text: "{{detail_line}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 80, y: 1380, size: 32, weight: 500, color: "#E5E7EB",          text: "{{location}}",  font: "Inter, Arial, sans-serif" },
    { type: "rect", x: 80, y: 1460, width: 420, height: 90, fill: "{{color_accent}}", opacity: 1, radius: 14 },
    { type: "text", x: 290, y: 1520, size: 34, weight: 800, color: "{{color_dark}}",  text: "{{cta}}", font: "Inter, Arial, sans-serif", align: "center" },
  ],
};

const SCHEDULE: Spec = {
  canvas: { width: 1080, height: 1080 },
  layers: [
    { type: "rect", x: 0, y: 0,   width: 1080, height: 200, fill: "{{color_dark}}", opacity: 0.9 },
    { type: "rect", x: 0, y: 192, width: 1080, height: 8,   fill: "{{color_accent}}", opacity: 1 },
    { type: "image", x: 40, y: 40, width: 120, height: 120, url: "{{logo_url}}" },
    { type: "text", x: 180, y: 100, size: 36, weight: 700, color: "#FFFFFF",          text: "{{org_name}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 180, y: 148, size: 22, weight: 600, color: "{{color_accent}}", text: "{{eyebrow}}",  font: "Inter, Arial, sans-serif" },
    { type: "rect", x: 0, y: 200, width: 1080, height: 880, fill: "#FFFFFF", opacity: 0.92 },
    { type: "text", x: 60, y: 320, size: 72, weight: 900, color: "{{color_dark}}",    text: "{{headline}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 400, size: 28, weight: 600, color: "{{color_primary}}", text: "{{subhead}}",  font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 500, size: 32, weight: 500, color: "{{color_dark}}",    text: "{{detail_line}}", font: "Inter, Arial, sans-serif" },
    { type: "text", x: 60, y: 560, size: 28, weight: 500, color: "{{color_dark}}",    text: "{{location}}", font: "Inter, Arial, sans-serif" },
  ],
};

export const SLOT_PRESETS: Record<string, Spec> = {
  social_post_square: SQUARE,
  social_post_story: STORY,
  social_post_landscape: LANDSCAPE,
  email_header: EMAIL_HEADER,
  flyer_letter: FLYER,
  flyer_half: LANDSCAPE,
  schedule_graphic: SCHEDULE,
  roster_card: SQUARE,
  announcement: SQUARE,
  sponsor_recognition: SQUARE,
};

export function getSlotPreset(designType: string): Spec {
  return SLOT_PRESETS[designType] || SQUARE;
}
