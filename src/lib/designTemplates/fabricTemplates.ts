// Hand-built Fabric.js templates for the Curve Designer (MVP editor flow).
// Each template defines:
//   - dims: canvas size (always 1080x1080 for MVP)
//   - fields: form schema rendered in the right rail
//   - build(values, brandKit, ctx): returns a fabric-JSON object that
//     loadFromJSON can hydrate into the canvas.
//
// We re-build the canvas whenever form values change so structured panels
// (starting lineup, dates list, locations list) stay in sync. The user can
// still drag/resize/restyle any individual object after build — those tweaks
// are preserved by saving the full fabric JSON snapshot to
// designs.composition_config.

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "time"
  | "photo"
  | "team_picker"
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

const fallback = {
  primary: "#1E3A5F",
  secondary: "#475569",
  accent: "#22C55E",
  dark: "#0F172A",
  light: "#FFFFFF",
  heading: "Anton, Impact, sans-serif",
  body: "Inter, system-ui, sans-serif",
};

// Always-dark base used for backgrounds & overlays. We ignore brand-kit
// "dark" because some orgs set pastel/light values there and it breaks
// text contrast across every template.
const TRUE_DARK = "#0B1220";
const TRUE_LIGHT = "#FFFFFF";

function palette(b: BrandKit) {
  return {
    primary: b.color_primary || fallback.primary,
    secondary: b.color_secondary || fallback.secondary,
    accent: b.color_accent || fallback.accent,
    dark: TRUE_DARK,
    light: TRUE_LIGHT,
    heading: b.font_heading || fallback.heading,
    body: b.font_body || fallback.body,
  };
}

// Convenience constructors -- return plain JSON Fabric understands
const rect = (o: any) => ({ type: "rect", ...o });
const text = (o: any) => ({ type: "textbox", ...o });
const img = (src: string, o: any) => ({ type: "image", src, ...o });

// ---------- GAME DAY ----------
const gameDay: FabricTemplate = {
  key: "game_day",
  name: "Game Day",
  blurb: "Matchup poster with starting lineup. Drop a hero photo, set the matchup, add your starters.",
  dims: { width: W, height: H },
  fields: [
    { name: "opponent", label: "Opponent", type: "text", required: true, placeholder: "Eastside Wolves" },
    { name: "game_date", label: "Date", type: "date", required: true },
    { name: "game_time", label: "Time", type: "time", placeholder: "7:00 PM" },
    { name: "venue", label: "Venue", type: "text", placeholder: "Home / Memorial Field" },
    { name: "hero_photo_url", label: "Hero photo", type: "photo", helper: "Full-bleed background photo" },
    { name: "team_id", label: "Team (for roster auto-fill)", type: "team_picker", helper: "Optional. Loads starters from your roster." },
    { name: "lineup", label: "Starting lineup", type: "lineup_repeater", helper: "Up to 11 starters shown on the design." },
  ],
  defaults: {
    opponent: "OPPONENT",
    game_date: "",
    game_time: "7:00 PM",
    venue: "HOME",
    hero_photo_url: "",
    team_id: "",
    lineup: [
      { jersey: "7", name: "FIRST LAST", position: "P" },
      { jersey: "12", name: "FIRST LAST", position: "C" },
      { jersey: "3", name: "FIRST LAST", position: "1B" },
      { jersey: "4", name: "FIRST LAST", position: "2B" },
      { jersey: "5", name: "FIRST LAST", position: "3B" },
      { jersey: "6", name: "FIRST LAST", position: "SS" },
      { jersey: "9", name: "FIRST LAST", position: "LF" },
      { jersey: "8", name: "FIRST LAST", position: "CF" },
      { jersey: "11", name: "FIRST LAST", position: "RF" },
    ],
  },
  build: (v, b) => {
    const p = palette(b);
    const objects: any[] = [];
    const lineup = (v.lineup || []).slice(0, 11);

    // 1. Background (true dark — overlay sits on top of photo)
    objects.push(rect({
      left: 0, top: 0, width: W, height: H, fill: p.dark,
      selectable: false, evented: false, name: "bg",
    }));

    // 2. Hero photo — sized to cover post-load in the editor
    if (v.hero_photo_url) {
      objects.push(img(v.hero_photo_url, {
        left: 0, top: 0, scaleX: 1, scaleY: 1, name: "hero_photo",
        cropX: 0, cropY: 0,
      }));
    }

    // 3. Dark gradient on bottom 65% so text is readable on any photo
    objects.push({
      type: "rect",
      left: 0, top: H * 0.35, width: W, height: H * 0.65,
      name: "gradient_overlay", selectable: false, evented: false,
      fill: {
        type: "linear",
        coords: { x1: 0, y1: 0, x2: 0, y2: H * 0.65 },
        colorStops: [
          { offset: 0, color: "rgba(11,18,32,0)" },
          { offset: 0.45, color: "rgba(11,18,32,0.75)" },
          { offset: 1, color: "rgba(11,18,32,0.95)" },
        ],
      },
    });

    // 4. Accent stripe
    objects.push(rect({
      left: 60, top: H - 320, width: 120, height: 8,
      fill: p.accent, name: "accent_stripe",
    }));

    // 5. GAME DAY headline (bottom-left)
    objects.push(text({
      text: "GAME DAY",
      left: 60, top: H - 300, width: W - 120,
      fontFamily: p.heading, fontWeight: 900, fontSize: 140,
      fill: p.light, lineHeight: 0.9, name: "headline",
    }));

    // 6. Matchup
    objects.push(text({
      text: `VS ${(v.opponent || "OPPONENT").toUpperCase()}`,
      left: 60, top: H - 150, width: W - 120,
      fontFamily: p.heading, fontWeight: 700, fontSize: 52,
      fill: p.accent, name: "matchup",
    }));

    // 7. Date / time / venue
    const formatDate = (d: string) => {
      if (!d) return "";
      try {
        const dt = new Date(d + "T00:00:00");
        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
      } catch { return d; }
    };
    const meta = [formatDate(v.game_date), v.game_time, v.venue]
      .filter(Boolean).join("   ·   ").toUpperCase();
    objects.push(text({
      text: meta || "DATE   ·   TIME   ·   VENUE",
      left: 60, top: H - 80, width: W - 120,
      fontFamily: p.body, fontWeight: 600, fontSize: 24,
      fill: p.light, opacity: 0.85, name: "meta",
    }));

    // 8. Lineup panel (top-right, sized to roster length)
    if (lineup.length > 0) {
      const panelW = 360;
      const panelX = W - panelW - 40;
      const panelY = 40;
      const rowH = 38;
      const panelH = 70 + lineup.length * rowH + 16;
      objects.push(rect({
        left: panelX, top: panelY, width: panelW, height: panelH,
        fill: p.primary, opacity: 0.92, rx: 10, ry: 10, name: "lineup_panel",
      }));
      objects.push(text({
        text: "STARTING LINEUP",
        left: panelX + 24, top: panelY + 22, width: panelW - 48,
        fontFamily: p.heading, fontWeight: 800, fontSize: 22,
        fill: p.accent, name: "lineup_title",
      }));
      lineup.forEach((row: any, i: number) => {
        const ty = panelY + 70 + i * rowH;
        objects.push(text({
          text: `#${row.jersey || "—"}`,
          left: panelX + 24, top: ty, width: 60,
          fontFamily: p.heading, fontWeight: 800, fontSize: 22, fill: p.accent,
          name: `lineup_jersey_${i}`,
        }));
        objects.push(text({
          text: (row.name || "").toUpperCase(),
          left: panelX + 90, top: ty + 2, width: panelW - 170,
          fontFamily: p.body, fontWeight: 600, fontSize: 18,
          fill: p.light, name: `lineup_name_${i}`,
        }));
        objects.push(text({
          text: row.position || "",
          left: panelX + panelW - 70, top: ty + 2, width: 60,
          fontFamily: p.body, fontWeight: 700, fontSize: 16, fill: p.light,
          opacity: 0.75, textAlign: "right", name: `lineup_pos_${i}`,
        }));
      });
    }

    // 9. Logo with white backing chip (auto-fit to 140px post-load)
    if (b.logo_primary_url) {
      objects.push(rect({
        left: 30, top: 30, width: 160, height: 160,
        rx: 12, ry: 12, fill: "rgba(255,255,255,0.92)", name: "logo_chip",
      }));
      objects.push(img(b.logo_primary_url, {
        left: 40, top: 40, scaleX: 1, scaleY: 1, name: "logo",
      }));
    }

    return { version: "6.0.0", objects, background: p.dark };
  },
};

// ---------- COLLEGE COMMIT ----------
const collegeCommit: FabricTemplate = {
  key: "college_commit",
  name: "College Commit",
  blurb: "Announce a college commitment. Player photo, school logo, the headline writes itself.",
  dims: { width: W, height: H },
  fields: [
    { name: "athlete_name", label: "Athlete name", type: "text", required: true, placeholder: "Jordan Smith" },
    { name: "school_name", label: "College / University", type: "text", required: true, placeholder: "State University" },
    { name: "school_logo_url", label: "School logo", type: "photo", helper: "Recommended: PNG with transparent background" },
    { name: "athlete_photo_url", label: "Athlete photo", type: "photo", required: true },
    { name: "class_of", label: "Class of", type: "text", placeholder: "2026" },
    { name: "quote", label: "Quote (optional)", type: "textarea", placeholder: "Thank you to my family, coaches, and teammates…" },
  ],
  defaults: {
    athlete_name: "ATHLETE NAME",
    school_name: "UNIVERSITY",
    school_logo_url: "",
    athlete_photo_url: "",
    class_of: "",
    quote: "",
  },
  build: (v, b) => {
    const p = palette(b);
    const objects: any[] = [];

    // Background
    objects.push(rect({ left: 0, top: 0, width: W, height: H, fill: p.light, selectable: false, name: "bg" }));

    // Color block (left side)
    objects.push(rect({
      left: 0, top: 0, width: W * 0.45, height: H, fill: p.primary,
      name: "color_block",
    }));

    // Athlete photo placeholder (left side)
    if (v.athlete_photo_url) {
      objects.push(img(v.athlete_photo_url, {
        left: 0, top: 0, name: "athlete_photo",
      }));
    } else {
      objects.push(rect({
        left: 40, top: 200, width: W * 0.45 - 80, height: H - 400,
        fill: p.dark, opacity: 0.4, name: "athlete_photo_placeholder",
      }));
      objects.push(text({
        text: "PHOTO", left: 40, top: H / 2 - 20, width: W * 0.45 - 80,
        fontFamily: p.body, fontSize: 32, fill: p.light, opacity: 0.6,
        textAlign: "center", name: "photo_placeholder_label",
      }));
    }

    // "COMMITTED" banner
    objects.push(rect({
      left: W * 0.45 - 30, top: 100, width: 280, height: 60,
      fill: p.accent, name: "committed_banner",
    }));
    objects.push(text({
      text: "COMMITTED", left: W * 0.45 - 30, top: 115, width: 280,
      fontFamily: p.heading, fontSize: 36, fontWeight: 900, fill: p.dark,
      textAlign: "center", name: "committed_text",
    }));

    // Athlete name (huge)
    objects.push(text({
      text: (v.athlete_name || "ATHLETE NAME").toUpperCase(),
      left: W * 0.48, top: 220, width: W * 0.48,
      fontFamily: p.heading, fontWeight: 900, fontSize: 90, lineHeight: 0.9,
      fill: p.dark, name: "athlete_name",
    }));

    // "is committing to"
    objects.push(text({
      text: "IS COMMITTING TO",
      left: W * 0.48, top: 440, width: W * 0.48,
      fontFamily: p.body, fontWeight: 600, fontSize: 24,
      fill: p.secondary, name: "is_committing_label",
    }));

    // School name
    objects.push(text({
      text: (v.school_name || "UNIVERSITY").toUpperCase(),
      left: W * 0.48, top: 480, width: W * 0.48,
      fontFamily: p.heading, fontWeight: 800, fontSize: 64, lineHeight: 0.95,
      fill: p.primary, name: "school_name",
    }));

    // School logo
    if (v.school_logo_url) {
      objects.push(img(v.school_logo_url, {
        left: W * 0.48, top: 660, scaleX: 0.4, scaleY: 0.4, name: "school_logo",
      }));
    }

    // Class of
    if (v.class_of) {
      objects.push(text({
        text: `CLASS OF ${v.class_of}`,
        left: W * 0.48, top: 850, width: W * 0.48,
        fontFamily: p.heading, fontWeight: 700, fontSize: 32,
        fill: p.accent, name: "class_of",
      }));
    }

    // Quote
    if (v.quote) {
      objects.push(text({
        text: `"${v.quote}"`,
        left: W * 0.48, top: 900, width: W * 0.48,
        fontFamily: p.body, fontStyle: "italic", fontSize: 18,
        fill: p.secondary, name: "quote",
      }));
    }

    // Org logo
    if (b.logo_primary_url) {
      objects.push(img(b.logo_primary_url, {
        left: 40, top: 40, scaleX: 0.25, scaleY: 0.25, name: "logo",
      }));
    }

    return { version: "6.0.0", objects, background: p.light };
  },
};

// ---------- TRYOUT ANNOUNCEMENT ----------
const tryout: FabricTemplate = {
  key: "tryout",
  name: "Tryout Announcement",
  blurb: "Recruit for tryouts. Supports one date or many, one location or many.",
  dims: { width: W, height: H },
  fields: [
    { name: "program_name", label: "Program / team", type: "text", required: true, placeholder: "12U Tryouts" },
    { name: "age_group", label: "Age group / division", type: "text", placeholder: "Boys 12U" },
    { name: "dates", label: "Date(s)", type: "date_repeater", required: true, helper: "Add one date or multiple." },
    { name: "locations", label: "Location(s)", type: "location_repeater", required: true, helper: "Add one location or multiple." },
    { name: "register_url", label: "Register URL", type: "text", placeholder: "https://…" },
    { name: "hero_photo_url", label: "Hero photo", type: "photo" },
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

    // Background
    objects.push(rect({ left: 0, top: 0, width: W, height: H, fill: p.dark, name: "bg" }));

    // Hero photo (top half) with dark overlay
    if (v.hero_photo_url) {
      objects.push(img(v.hero_photo_url, {
        left: 0, top: 0, name: "hero_photo",
      }));
      objects.push(rect({
        left: 0, top: 0, width: W, height: H,
        fill: p.dark, opacity: 0.55, name: "overlay",
      }));
    }

    // Top stripe
    objects.push(rect({ left: 0, top: 0, width: W, height: 70, fill: p.accent, name: "top_stripe" }));
    objects.push(text({
      text: "NOW RECRUITING", left: 0, top: 18, width: W,
      fontFamily: p.heading, fontWeight: 800, fontSize: 32,
      fill: p.dark, textAlign: "center", name: "tag",
    }));

    // TRYOUTS headline
    objects.push(text({
      text: "TRYOUTS", left: 60, top: 140, width: W - 120,
      fontFamily: p.heading, fontWeight: 900, fontSize: 200,
      fill: p.light, lineHeight: 0.9, textAlign: "center", name: "headline",
    }));

    // Program name
    objects.push(text({
      text: (v.program_name || "PROGRAM").toUpperCase(),
      left: 60, top: 360, width: W - 120,
      fontFamily: p.heading, fontWeight: 700, fontSize: 56,
      fill: p.accent, textAlign: "center", name: "program",
    }));

    // Age group
    if (v.age_group) {
      objects.push(text({
        text: v.age_group, left: 60, top: 430, width: W - 120,
        fontFamily: p.body, fontWeight: 600, fontSize: 28,
        fill: p.light, opacity: 0.85, textAlign: "center", name: "age_group",
      }));
    }

    // Dates column (left)
    const dates = (v.dates || []).filter((d: any) => d.date || d.time);
    if (dates.length > 0) {
      const baseY = 520;
      objects.push(text({
        text: dates.length === 1 ? "DATE" : "DATES",
        left: 60, top: baseY, width: W / 2 - 80,
        fontFamily: p.heading, fontWeight: 800, fontSize: 28,
        fill: p.accent, name: "dates_label",
      }));
      dates.slice(0, 5).forEach((d: any, i: number) => {
        const ty = baseY + 50 + i * 70;
        objects.push(text({
          text: d.date || "",
          left: 60, top: ty, width: W / 2 - 80,
          fontFamily: p.heading, fontWeight: 700, fontSize: 36,
          fill: p.light, name: `date_${i}`,
        }));
        if (d.time) {
          objects.push(text({
            text: d.time, left: 60, top: ty + 42, width: W / 2 - 80,
            fontFamily: p.body, fontWeight: 500, fontSize: 22,
            fill: p.light, opacity: 0.8, name: `date_time_${i}`,
          }));
        }
      });
    }

    // Locations column (right)
    const locs = (v.locations || []).filter((l: any) => l.name || l.address);
    if (locs.length > 0) {
      const baseY = 520;
      const lx = W / 2 + 20;
      objects.push(text({
        text: locs.length === 1 ? "LOCATION" : "LOCATIONS",
        left: lx, top: baseY, width: W / 2 - 80,
        fontFamily: p.heading, fontWeight: 800, fontSize: 28,
        fill: p.accent, name: "locations_label",
      }));
      locs.slice(0, 5).forEach((l: any, i: number) => {
        const ty = baseY + 50 + i * 70;
        objects.push(text({
          text: (l.name || "").toUpperCase(),
          left: lx, top: ty, width: W / 2 - 80,
          fontFamily: p.heading, fontWeight: 700, fontSize: 30,
          fill: p.light, name: `loc_${i}`,
        }));
        if (l.address) {
          objects.push(text({
            text: l.address, left: lx, top: ty + 38, width: W / 2 - 80,
            fontFamily: p.body, fontWeight: 500, fontSize: 18,
            fill: p.light, opacity: 0.8, name: `loc_addr_${i}`,
          }));
        }
      });
    }

    // Register URL footer
    if (v.register_url) {
      objects.push(rect({
        left: 60, top: H - 130, width: W - 120, height: 70,
        fill: p.accent, rx: 8, ry: 8, name: "register_bg",
      }));
      objects.push(text({
        text: `REGISTER → ${v.register_url}`,
        left: 60, top: H - 110, width: W - 120,
        fontFamily: p.heading, fontWeight: 800, fontSize: 28,
        fill: p.dark, textAlign: "center", name: "register",
      }));
    }

    // Org logo
    if (b.logo_primary_url) {
      objects.push(img(b.logo_primary_url, {
        left: W - 160, top: 90, scaleX: 0.25, scaleY: 0.25, name: "logo",
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
