// Smart auto-mapper for contact CSV imports.
// Replaces the old per-platform presets — we now auto-detect columns from any file
// (LeagueApps, SportsEngine, Futures App, TeamSnap, custom spreadsheets, etc.)
// by matching normalized header names against a synonym dictionary.

// Target field keys understood by process-csv-upload:
//   first_name, last_name, email, phone, contact_type,
//   jersey_number, position, player_grad_year,
//   parent_first_name, parent_last_name, parent_email, parent_phone,
//   sms_opt_in, team_name, role

// Each entry: target field → array of header synonyms (case/punct/space-insensitive).
const FIELD_SYNONYMS: Record<string, string[]> = {
  team_name: [
    "team", "team name", "teamname", "roster", "roster name", "squad", "group name",
  ],
  role: [
    "role", "type", "member type", "membership type", "participant type",
  ],
  first_name: [
    "first name", "firstname", "first", "given name", "player first name",
    "athlete first name", "child first name", "participant first name",
  ],
  last_name: [
    "last name", "lastname", "last", "surname", "family name",
    "player last name", "athlete last name", "child last name", "participant last name",
  ],
  email: [
    "email", "email address", "e-mail", "primary email", "player email",
    "athlete email", "contact email", "user email", "participant email",
  ],
  phone: [
    "phone", "phone number", "mobile", "mobile phone", "cell", "cell phone",
    "contact phone", "primary phone", "player phone", "athlete phone", "tel",
    "telephone",
  ],
  jersey_number: [
    "jersey", "jersey number", "jersey #", "jersey no", "number", "uniform",
    "uniform number", "shirt number", "#",
  ],
  position: [
    "position", "primary position", "playing position", "pos", "positions",
  ],
  player_grad_year: [
    "grad year", "graduation year", "graduating year", "class year", "class of",
    "grad", "year of graduation", "class",
  ],
  parent_first_name: [
    "parent first name", "parent first", "guardian first name", "guardian first",
    "mother first name", "father first name", "emergency contact first name",
    "primary contact first name",
  ],
  parent_last_name: [
    "parent last name", "parent last", "guardian last name", "guardian last",
    "mother last name", "father last name", "emergency contact last name",
    "primary contact last name",
  ],
  parent_email: [
    "parent email", "guardian email", "mother email", "father email",
    "emergency contact email", "primary contact email", "parent e-mail",
  ],
  parent_phone: [
    "parent phone", "parent mobile", "guardian phone", "guardian mobile",
    "mother phone", "father phone", "emergency contact phone",
    "primary contact phone", "parent cell",
  ],
  sms_opt_in: [
    "sms", "sms opt-in", "sms opt in", "text opt-in", "text opt in",
    "sms consent", "sms subscribed", "text subscribed",
  ],
};

// Normalize for matching: lowercase, strip non-alphanumeric.
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Pre-build a reverse lookup: normalized synonym → target field.
const REVERSE_LOOKUP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [target, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    for (const syn of synonyms) m.set(norm(syn), target);
    // Also map the bare target key itself (e.g. "first_name" → "first_name")
    m.set(norm(target), target);
  }
  return m;
})();

// Given a list of source CSV headers, return a mapping { header → target_field }.
// Headers we don't recognize are simply omitted (the user can fix them in step 3).
export function autoMapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const h of headers) {
    const key = norm(h);
    if (!key) continue;
    const target = REVERSE_LOOKUP.get(key);
    if (target) mapping[h] = target;
  }
  return mapping;
}

// Used by the manual override dropdown in step 3.
export const TARGET_FIELDS: { key: string; label: string }[] = [
  { key: "", label: "— skip —" },
  { key: "team_name", label: "Team name (auto-creates)" },
  { key: "role", label: "Role (player/staff/parent)" },
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "jersey_number", label: "Jersey number" },
  { key: "position", label: "Position" },
  { key: "player_grad_year", label: "Grad year" },
  { key: "parent_first_name", label: "Parent first name" },
  { key: "parent_last_name", label: "Parent last name" },
  { key: "parent_email", label: "Parent email" },
  { key: "parent_phone", label: "Parent phone" },
  { key: "sms_opt_in", label: "SMS opt-in" },
];
