// Hand-built Fabric.js templates for the Curve Designer.
// V2 (2026-05-16): Rebuilt with athletic display fonts (Bebas Neue, Anton,
// Archivo Black, Oswald) and asymmetric, edge-bleeding composition.
// Goal: ditch the 2010s clip-art aesthetic. Look like sports-design Twitter,
// not Microsoft Publisher.

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "time"
  | "photo"
  | "team_picker"
  | "school_picker"
  | "lineup_repeater"
  | "date_repeater"
  | "location_repeater";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  helper?: string;
};

export type TemplateValues = Record<string, any>;

export type BrandKit = {
  color_primary?: string | null;
  color_secondary?: string | null;
  color_accent?: string | null;
  color_dark?: string | null;
  color_light?: string | null;
  font_heading?: string | null;
  font_body?: string | null;
  logo_primary_url?: string | null;
  logo_mark_url?: string | null;
};

export type FabricTemplateKey = "game_day" | "college_commit" | "tryout";

export type FabricTemplate = {
  key: FabricTemplateKey;
  name: string;
  blurb: string;
  dims: { width: number; height: number };
  fields: FieldDef[];
  defaults: TemplateValues;
  build: (values: TemplateValues, brand: BrandKit) => any;
};

const W = 1080;
const H = 1080;

// Athletic display fonts now bundled via @fontsource (see main.tsx).
// We hard-pin so the design looks identical regardless of brand-kit fonts.
const DISPLAY = "Anton, Impact, sans-serif";          // Tall condensed display
const DISPLAY_WIDE = "Archivo Black, Impact, sans-serif"; // Heavy wide blocks
const ACCENT = "Bebas Neue, Impact, sans-serif";      // Tracked-out labels
const BODY = "Oswald, Inter, system-ui, sans-serif";  // Meta / lineup rows

const TRUE_DARK = "#0B1220";
const TRUE_LIGHT = "#FFFFFF";

const fallback = {
  primary: "#1E3A5F",
  secondary: "#475569",
  accent: "#E11D48",
};

function palette(b: BrandKit) {
  return {
    primary: b.color_primary || fallback.primary,
    secondary: b.color_secondary || fallback.secondary,
    accent: b.color_accent || fallback.accent,
    dark: TRUE_DARK,
    light: TRUE_LIGHT,
  };
}

// Convenience constructors
const rect = (o: any) => ({ type: "rect", ...o });
const text = (o: any) => ({ type: "textbox", ...o });
const img = (src: string, o: any) => ({ type: "image", src, ...o });
const tri = (points: { x: number; y: number }[], o: any) => ({
  type: "polygon", points, ...o,
});

// ─────────────────────────────────────────────────────────────
// GAME DAY — edge-bleeding hero, oversized headline, lineup
// stack runs vertically up the right edge like a stadium sign
// ─────────────────────────────────────────────────────────────
const gameDay: FabricTemplate = {
  key: "game_day",
  name: "Game Day",
  blurb: "Edge-bleeding hero, massive type, lineup down the side.",
  dims: { width: W, height: H },
  fields: [
    { name: "opponent", label: "Opponent", type: "text", required: true, placeholder: "Eastside Wolves" },
    { name: "game_date", label: "Date", type: "date", required: true },
    { name: "game_time", label: "Time", type: "time", placeholder: "7:00 PM" },
    { name: "venue", label: "Venue", type: "text", placeholder: "Memorial Field" },
    { name: "hero_photo_url", label: "Hero photo", type: "photo", helper: "Will bleed full-canvas with dark wash for contrast." },
    { name: "team_id", label: "Team (for lineup auto-fill)", type: "team_picker", helper: "Optional." },
    { name: "lineup", label: "Starting lineup", type: "lineup_repeater", helper: "Up to 9 starters shown." },
  ],
  defaults: {
    opponent: "OPPONENT",
    game_date: "",
    game_time: "7:00 PM",
    venue: "HOME",
    hero_photo_url: "",
    team_id: "",
    lineup: [
      { jersey: "7",  name: "FIRST LAST", position: "P" },
      { jersey: "12", name: "FIRST LAST", position: "C" },
      { jersey: "3",  name: "FIRST LAST", position: "1B" },
      { jersey: "4",  name: "FIRST LAST", position: "2B" },
      { jersey: "5",  name: "FIRST LAST", position: "3B" },
      { jersey: "6",  name: "FIRST LAST", position: "SS" },
      { jersey: "9",  name: "FIRST LAST", position: "LF" },
      { jersey: "8",  name: "FIRST LAST", position: "CF" },
      { jersey: "11", name: "FIRST LAST", position: "RF" },
    ],
  },
  build: (v, b) => {
    const p = palette(b);
    const objects: any[] = [];
    const lineup = (v.lineup || []).slice(0, 9);

    // 1. Base dark
    objects.push(rect({
      left: 0, top: 0, width: W, height: H, fill: p.dark,
      selectable: false, evented: false, name: "bg",
    }));

    // 2. Full-bleed hero photo
    if (v.hero_photo_url) {
      objects.push(img(v.hero_photo_url, {
        left: 0, top: 0, name: "hero_photo",
        cropX: 0, cropY: 0,
      }));
    }

    // 3. Hard left-side color slab (the brand color anchor)
    objects.push(rect({
      left: 0, top: 0, width: 24, height: H, fill: p.accent,
      selectable: false, name: "edge_accent",
    }));

    // 4. Top-to-bottom gradient wash (more on bottom)
    objects.push({
      type: "rect",
      left: 0, top: 0, width: W, height: H,
      name: "wash", selectable: false, evented: false,
      fill: {
        type: "linear",
        coords: { x1: 0, y1: 0, x2: 0, y2: H },
        colorStops: [
          { offset: 0, color: "rgba(11,18,32,0.55)" },
          { offset: 0.40, color: "rgba(11,18,32,0.15)" },
          { offset: 0.75, color: "rgba(11,18,32,0.85)" },
          { offset: 1, color: "rgba(11,18,32,0.98)" },
        ],
      },
    });

    // 5. Diagonal accent slash (bottom-right)
    objects.push(tri(
      [
        { x: W - 280, y: H }, { x: W, y: H }, { x: W, y: H - 280 },
      ],
      { left: W - 280, top: H - 280, fill: p.accent, opacity: 0.92, name: "slash" }
    ));

    // 6. Top eyebrow — small tracked label
    objects.push(text({
      text: "TONIGHT  ·  HOME GAME",
      left: 60, top: 56, width: W - 120,
      fontFamily: ACCENT, fontSize: 28, letterSpacing: 8,
      fill: p.light, opacity: 0.85, name: "eyebrow",
    }));

    // 7. GAME DAY — massive, bleeds off bottom-left
    objects.push(text({
      text: "GAME\nDAY",
      left: 48, top: H - 470, width: 800,
      fontFamily: DISPLAY, fontSize: 280, lineHeight: 0.82,
      fill: p.light, name: "headline",
    }));

    // 8. VS opponent
    objects.push(text({
      text: `VS  ${(v.opponent || "OPPONENT").toUpperCase()}`,
      left: 60, top: H - 180, width: W - 380,
      fontFamily: DISPLAY_WIDE, fontSize: 56,
      fill: p.accent, name: "matchup",
    }));

    // 9. Meta row
    const formatDate = (d: string) => {
      if (!d) return "";
      try {
        const dt = new Date(d + "T00:00:00");
        return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
      } catch { return d; }
    };
    const meta = [formatDate(v.game_date), v.game_time, v.venue]
      .filter(Boolean).join("   /   ").toUpperCase();
    objects.push(text({
      text: meta || "DATE  /  TIME  /  VENUE",
      left: 60, top: H - 100, width: W - 380,
      fontFamily: ACCENT, fontSize: 26, letterSpacing: 4,
      fill: p.light, opacity: 0.9, name: "meta",
    }));

    // 10. Lineup — vertical strip down the right edge, no panel chrome
    if (lineup.length > 0) {
      const rightX = W - 320;
      objects.push(text({
        text: "STARTING 9",
        left: rightX, top: 56, width: 280,
        fontFamily: ACCENT, fontSize: 22, letterSpacing: 6,
        fill: p.accent, name: "lineup_title",
      }));
      // Accent rule under the title
      objects.push(rect({
        left: rightX, top: 90, width: 60, height: 4, fill: p.accent, name: "lineup_rule",
      }));
      const rowH = 56;
      lineup.forEach((row: any, i: number) => {
        const ty = 120 + i * rowH;
        // Big jersey number
        objects.push(text({
          text: row.jersey || "—",
          left: rightX, top: ty, width: 70,
          fontFamily: DISPLAY, fontSize: 44, fill: p.accent,
          name: `lineup_jersey_${i}`,
        }));
        // Name
        objects.push(text({
          text: (row.name || "").toUpperCase(),
          left: rightX + 80, top: ty + 6, width: 180,
          fontFamily: BODY, fontWeight: 700, fontSize: 18,
          fill: p.light, name: `lineup_name_${i}`,
        }));
        // Position (small caps)
        objects.push(text({
          text: row.position || "",
          left: rightX + 80, top: ty + 30, width: 180,
          fontFamily: ACCENT, fontSize: 16, letterSpacing: 2,
          fill: p.light, opacity: 0.65, name: `lineup_pos_${i}`,
        }));
      });
    }

    // 11. Logo — clean, top-right of left column, no white chip
    if (b.logo_primary_url) {
      objects.push(img(b.logo_primary_url, {
        left: 60, top: 96, scaleX: 0.18, scaleY: 0.18, name: "logo",
      }));
    }

    return { version: "6.0.0", objects, background: p.dark };
  },
};

// ─────────────────────────────────────────────────────────────
// COLLEGE COMMIT — full-bleed photo, oversized COMMITTED type
// running diagonal, school name as wide block at bottom
// ─────────────────────────────────────────────────────────────
const collegeCommit: FabricTemplate = {
  key: "college_commit",
  name: "College Commit",
  blurb: "Photo-driven announcement with monumental COMMITTED typography.",
  dims: { width: W, height: H },
  fields: [
    { name: "athlete_name", label: "Athlete name", type: "text", required: true, placeholder: "Jordan Smith" },
    { name: "school_name", label: "College / University", type: "text", required: true, placeholder: "State University" },
    { name: "school_logo_url", label: "School logo", type: "photo", helper: "PNG with transparent background." },
    { name: "athlete_photo_url", label: "Athlete photo", type: "photo", required: true, helper: "Background-removed cutout works best." },
    { name: "class_of", label: "Class of", type: "text", placeholder: "2026" },
    { name: "sport_position", label: "Sport / position", type: "text", placeholder: "Baseball  ·  Pitcher" },
    { name: "quote", label: "Quote (optional)", type: "textarea", placeholder: "Thank you to my family, coaches, and teammates…" },
  ],
  defaults: {
    athlete_name: "ATHLETE NAME",
    school_name: "UNIVERSITY",
    school_logo_url: "",
    athlete_photo_url: "",
    class_of: "2026",
    sport_position: "",
    quote: "",
  },
  build: (v, b) => {
    const p = palette(b);
    const objects: any[] = [];

    // 1. Brand-color full background
    objects.push(rect({
      left: 0, top: 0, width: W, height: H, fill: p.primary,
      selectable: false, name: "bg",
    }));

    // 2. Athlete photo — right-biased full-bleed cutout (positioned by rebuild)
    if (v.athlete_photo_url) {
      objects.push(img(v.athlete_photo_url, {
        left: W * 0.30, top: 0, scaleX: 1, scaleY: 1, name: "athlete_photo",
      }));
    } else {
      objects.push(rect({
        left: W * 0.30, top: 0, width: W * 0.70, height: H,
        fill: "rgba(0,0,0,0.18)", name: "photo_placeholder_bg", selectable: false,
      }));
      objects.push(text({
        text: "DROP ATHLETE PHOTO\n(BACKGROUND REMOVED)",
        left: W * 0.30, top: H / 2 - 30, width: W * 0.70,
        fontFamily: ACCENT, fontSize: 24, letterSpacing: 4,
        fill: p.light, opacity: 0.55, textAlign: "center",
        name: "photo_placeholder",
      }));
    }

    // 3. Bottom wash gradient — dark band so headline + school text stay legible
    objects.push({
      type: "rect",
      left: 0, top: H * 0.45, width: W, height: H * 0.55,
      name: "bottom_wash", selectable: false, evented: false,
      fill: {
        type: "linear",
        coords: { x1: 0, y1: 0, x2: 0, y2: H * 0.55 },
        colorStops: [
          { offset: 0, color: "rgba(11,18,32,0)" },
          { offset: 0.6, color: "rgba(11,18,32,0.75)" },
          { offset: 1, color: "rgba(11,18,32,0.95)" },
        ],
      },
    });

    // 4. Top band — athlete name + sport/position
    objects.push(text({
      text: (v.athlete_name || "ATHLETE NAME").toUpperCase(),
      left: 60, top: 60, width: W - 280,
      fontFamily: DISPLAY_WIDE, fontSize: 56, lineHeight: 0.95,
      fill: p.light, name: "athlete_name",
    }));
    if (v.sport_position) {
      objects.push(text({
        text: v.sport_position.toUpperCase(),
        left: 60, top: 130, width: W - 280,
        fontFamily: ACCENT, fontSize: 22, letterSpacing: 6,
        fill: p.accent, name: "sport_position",
      }));
    }

    // 5. Class-of chip (top-right) — only when value present
    if (v.class_of) {
      objects.push(rect({
        left: W - 200, top: 50, width: 140, height: 70,
        fill: p.accent, name: "class_chip",
      }));
      objects.push(text({
        text: `'${String(v.class_of).slice(-2)}`,
        left: W - 200, top: 60, width: 140,
        fontFamily: DISPLAY_WIDE, fontSize: 48,
        fill: p.dark, textAlign: "center", name: "class_chip_text",
      }));
    }

    // 6. COMMITTED — single line, anchored bottom-left, bleeds gracefully
    objects.push(text({
      text: "COMMITTED.",
      left: 60, top: H - 380, width: W - 120,
      fontFamily: DISPLAY, fontSize: 200, lineHeight: 0.9,
      fill: p.light, name: "headline",
    }));

    // 7. Thin accent rule under headline
    objects.push(rect({
      left: 60, top: H - 215, width: 120, height: 5,
      fill: p.accent, name: "headline_rule",
    }));

    // 8. "IS COMMITTING TO" eyebrow
    objects.push(text({
      text: "IS COMMITTING TO",
      left: 60, top: H - 195, width: W - 120,
      fontFamily: ACCENT, fontSize: 20, letterSpacing: 6,
      fill: p.accent, name: "is_committing_label",
    }));

    // 9. School name
    objects.push(text({
      text: (v.school_name || "UNIVERSITY").toUpperCase(),
      left: 60, top: H - 155, width: v.school_logo_url ? W - 260 : W - 120,
      fontFamily: DISPLAY_WIDE, fontSize: 56, lineHeight: 0.95,
      fill: p.light, name: "school_name",
    }));

    // 10. School logo (bottom-right)
    if (v.school_logo_url) {
      objects.push(img(v.school_logo_url, {
        left: W - 200, top: H - 200, scaleX: 0.35, scaleY: 0.35, name: "school_logo",
      }));
    }

    // 11. Quote
    if (v.quote) {
      objects.push(text({
        text: `"${v.quote}"`,
        left: 60, top: H - 55, width: W - 120,
        fontFamily: BODY, fontStyle: "italic", fontSize: 16,
        fill: p.light, opacity: 0.7, name: "quote",
      }));
    }

    // 12. Org logo — top-left subtle (above athlete name? No — small in corner)
    if (b.logo_primary_url) {
      objects.push(img(b.logo_primary_url, {
        left: 60, top: 40, scaleX: 0.10, scaleY: 0.10,
        opacity: 0.0, name: "logo",
      }));
    }

    return { version: "6.0.0", objects, background: p.primary };
  },
};

// ─────────────────────────────────────────────────────────────
// TRYOUT ANNOUNCEMENT — brutalist poster, big TRYOUTS bleed,
// dates/locations as left-aligned data stack
// ─────────────────────────────────────────────────────────────
const tryout: FabricTemplate = {
  key: "tryout",
  name: "Tryout Announcement",
  blurb: "Brutalist poster flyer. Bold type, supports multiple dates and locations.",
  dims: { width: W, height: H },
  fields: [
    { name: "program_name", label: "Program / team", type: "text", required: true, placeholder: "12U Tryouts" },
    { name: "age_group", label: "Age group / division", type: "text", placeholder: "Boys 12U" },
    { name: "dates", label: "Date(s)", type: "date_repeater", required: true, helper: "Add one date or multiple." },
    { name: "locations", label: "Location(s)", type: "location_repeater", required: true, helper: "Add one location or multiple." },
    { name: "register_url", label: "Register URL", type: "text", placeholder: "register.example.com" },
    { name: "hero_photo_url", label: "Background photo (optional)", type: "photo" },
  ],
  defaults: {
    program_name: "TRYOUTS",
    age_group: "",
    dates: [{ date: "", time: "" }],
    locations: [{ name: "", address: "" }],
    register_url: "",
    hero_photo_url: "",
  },
  build: (v, b) => {
    const p = palette(b);
    const objects: any[] = [];

    // 1. Dark background
    objects.push(rect({
      left: 0, top: 0, width: W, height: H, fill: p.dark,
      selectable: false, name: "bg",
    }));

    // 2. Hero photo with heavy dark wash (if provided)
    if (v.hero_photo_url) {
      objects.push(img(v.hero_photo_url, {
        left: 0, top: 0, name: "hero_photo",
      }));
      objects.push(rect({
        left: 0, top: 0, width: W, height: H,
        fill: p.dark, opacity: 0.78, name: "wash",
      }));
    }

    // 3. Top accent bar
    objects.push(rect({
      left: 0, top: 0, width: W, height: 14, fill: p.accent, name: "top_bar",
    }));

    // 4. NOW RECRUITING eyebrow
    objects.push(text({
      text: "NOW RECRUITING",
      left: 60, top: 50, width: W - 120,
      fontFamily: ACCENT, fontSize: 28, letterSpacing: 10,
      fill: p.accent, name: "eyebrow",
    }));

    // 5. TRYOUTS — massive bleed (rotated style sit it tight to top-left)
    objects.push(text({
      text: "TRY-\nOUTS.",
      left: 40, top: 100, width: 1000,
      fontFamily: DISPLAY, fontSize: 360, lineHeight: 0.82,
      fill: p.light, name: "headline",
    }));

    // 6. Program name
    objects.push(text({
      text: (v.program_name || "PROGRAM").toUpperCase(),
      left: 60, top: 720, width: W - 120,
      fontFamily: DISPLAY_WIDE, fontSize: 52,
      fill: p.accent, name: "program",
    }));

    // 7. Age group
    if (v.age_group) {
      objects.push(text({
        text: v.age_group.toUpperCase(),
        left: 60, top: 790, width: W - 120,
        fontFamily: ACCENT, fontSize: 26, letterSpacing: 6,
        fill: p.light, opacity: 0.85, name: "age_group",
      }));
    }

    // 8. Dates column
    const dates = (v.dates || []).filter((d: any) => d.date || d.time);
    if (dates.length > 0) {
      const baseY = 850;
      objects.push(text({
        text: dates.length === 1 ? "WHEN" : "DATES",
        left: 60, top: baseY, width: 360,
        fontFamily: ACCENT, fontSize: 18, letterSpacing: 4,
        fill: p.accent, name: "dates_label",
      }));
      dates.slice(0, 3).forEach((d: any, i: number) => {
        const ty = baseY + 30 + i * 56;
        objects.push(text({
          text: d.date || "",
          left: 60, top: ty, width: 360,
          fontFamily: DISPLAY, fontSize: 36, lineHeight: 1,
          fill: p.light, name: `date_${i}`,
        }));
        if (d.time) {
          objects.push(text({
            text: d.time.toUpperCase(),
            left: 280, top: ty + 8, width: 200,
            fontFamily: BODY, fontWeight: 600, fontSize: 22,
            fill: p.light, opacity: 0.8, name: `date_time_${i}`,
          }));
        }
      });
    }

    // 9. Locations column
    const locs = (v.locations || []).filter((l: any) => l.name || l.address);
    if (locs.length > 0) {
      const baseY = 850;
      const lx = 560;
      objects.push(text({
        text: locs.length === 1 ? "WHERE" : "LOCATIONS",
        left: lx, top: baseY, width: 460,
        fontFamily: ACCENT, fontSize: 18, letterSpacing: 4,
        fill: p.accent, name: "locations_label",
      }));
      locs.slice(0, 3).forEach((l: any, i: number) => {
        const ty = baseY + 30 + i * 56;
        objects.push(text({
          text: (l.name || "").toUpperCase(),
          left: lx, top: ty, width: 460,
          fontFamily: DISPLAY, fontSize: 32, lineHeight: 1,
          fill: p.light, name: `loc_${i}`,
        }));
        if (l.address) {
          objects.push(text({
            text: l.address, left: lx, top: ty + 38, width: 460,
            fontFamily: BODY, fontWeight: 500, fontSize: 16,
            fill: p.light, opacity: 0.75, name: `loc_addr_${i}`,
          }));
        }
      });
    }

    // 10. Register footer — bold strip, no rounded chip
    if (v.register_url) {
      objects.push(rect({
        left: 0, top: H - 80, width: W, height: 80,
        fill: p.accent, name: "register_bg",
      }));
      objects.push(text({
        text: `REGISTER  →  ${v.register_url.toUpperCase()}`,
        left: 60, top: H - 60, width: W - 120,
        fontFamily: DISPLAY_WIDE, fontSize: 32,
        fill: p.dark, textAlign: "center", name: "register",
      }));
    }

    // 11. Org logo — top-right
    if (b.logo_primary_url) {
      objects.push(img(b.logo_primary_url, {
        left: W - 160, top: 50, scaleX: 0.18, scaleY: 0.18, name: "logo",
      }));
    }

    return { version: "6.0.0", objects, background: p.dark };
  },
};

export const FABRIC_TEMPLATES: Record<FabricTemplateKey, FabricTemplate> = {
  game_day: gameDay,
  college_commit: collegeCommit,
  tryout: tryout,
};

export const FABRIC_TEMPLATE_LIST: FabricTemplate[] = [gameDay, collegeCommit, tryout];
