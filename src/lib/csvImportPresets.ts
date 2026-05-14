// Column-mapping presets for common youth-sports platforms.
// Each preset maps source CSV column names → target contact fields.

export type ImportPreset = {
  id: string;
  label: string;
  description: string;
  // Mapping for the PRIMARY contact (player or coach being imported)
  mapping: Record<string, string>;
};

// Target field keys understood by process-csv-upload:
//   first_name, last_name, email, phone, contact_type,
//   jersey_number, position, player_grad_year,
//   parent_first_name, parent_last_name, parent_email, parent_phone,
//   sms_opt_in, season (legacy text), team_assignments (legacy text[])

export const IMPORT_PRESETS: ImportPreset[] = [
  {
    id: "leagueapps",
    label: "LeagueApps",
    description: "Standard LeagueApps roster export",
    mapping: {
      "First Name": "first_name",
      "Last Name": "last_name",
      "Email": "email",
      "Phone": "phone",
      "Mobile Phone": "phone",
      "Jersey Number": "jersey_number",
      "Position": "position",
      "Graduation Year": "player_grad_year",
      "Parent First Name": "parent_first_name",
      "Parent Last Name": "parent_last_name",
      "Parent Email": "parent_email",
      "Parent Phone": "parent_phone",
    },
  },
  {
    id: "sportsengine",
    label: "SportsEngine",
    description: "SportsEngine roster CSV export",
    mapping: {
      "First Name": "first_name",
      "Last Name": "last_name",
      "Player Email": "email",
      "Player Phone": "phone",
      "Jersey #": "jersey_number",
      "Primary Position": "position",
      "Grad Year": "player_grad_year",
      "Guardian First Name": "parent_first_name",
      "Guardian Last Name": "parent_last_name",
      "Guardian Email": "parent_email",
      "Guardian Phone": "parent_phone",
    },
  },
  {
    id: "future",
    label: "Future App",
    description: "Future / FutureApp roster export",
    mapping: {
      "first_name": "first_name",
      "last_name": "last_name",
      "email": "email",
      "phone_number": "phone",
      "jersey_number": "jersey_number",
      "position": "position",
      "graduation_year": "player_grad_year",
      "parent_first_name": "parent_first_name",
      "parent_last_name": "parent_last_name",
      "parent_email": "parent_email",
      "parent_phone": "parent_phone",
    },
  },
  {
    id: "curve_multiteam",
    label: "Curve Multi-team",
    description: "One CSV → many teams; auto-creates teams in the selected season",
    mapping: {
      "Team": "team_name",
      "Role": "role",
      "First Name": "first_name",
      "Last Name": "last_name",
      "Email": "email",
      "Phone": "phone",
      "Jersey": "jersey_number",
      "Position": "position",
      "Grad Year": "player_grad_year",
      "Parent First Name": "parent_first_name",
      "Parent Last Name": "parent_last_name",
      "Parent Email": "parent_email",
      "Parent Phone": "parent_phone",
      "SMS Opt-in": "sms_opt_in",
    },
  },
  {
    id: "generic",
    label: "Generic CSV",
    description: "Map columns yourself",
    mapping: {},
  },
];

export const TARGET_FIELDS: { key: string; label: string }[] = [
  { key: "", label: "— skip —" },
  { key: "team_name", label: "Team name (auto-creates)" },
  { key: "role", label: "Role (player/coach/parent)" },
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
