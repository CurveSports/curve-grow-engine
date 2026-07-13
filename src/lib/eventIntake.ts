export type CustomFieldType = "short_text" | "long_text" | "single_choice" | "yes_no";

export type CustomField = {
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[]; // for single_choice
  required?: boolean;
};

export type EventPreset = {
  id: string;
  name: string;
  description: string;
  seed: {
    title?: string;
    description?: string;
    instructions?: string;
    w9_required: boolean;
    role_required: boolean;
    role_options: string[];
    fields: CustomField[];
  };
};

export const EVENT_PRESETS: EventPreset[] = [
  {
    id: "tournament-staff",
    name: "Tournament staff W-9",
    description: "Umpires, scorekeepers, and field crew — collect payment info + W-9.",
    seed: {
      title: "Tournament Staff Payment Intake",
      description: "Please complete this form so we can pay you for your work at the event.",
      instructions:
        "A current-year W-9 is required before any payment can be issued.\nSubmissions typically take 3–5 minutes.",
      w9_required: true,
      role_required: true,
      role_options: ["Umpire", "Scorekeeper", "Field Crew", "Announcer", "Concessions", "Other"],
      fields: [
        { key: "shirt_size", label: "Shirt size", type: "single_choice", options: ["S", "M", "L", "XL", "XXL"], required: false },
      ],
    },
  },
  {
    id: "camp-coaches",
    name: "Camp / clinic coaches",
    description: "Coach role + payment + W-9 for a camp or clinic.",
    seed: {
      title: "Camp Coach Intake",
      description: "Camp coaches — please submit your payment info and W-9.",
      instructions: "A current-year W-9 is required before any payment can be issued.",
      w9_required: true,
      role_required: true,
      role_options: ["Head Coach", "Assistant Coach", "Position Coach", "Guest Instructor"],
      fields: [
        { key: "years_coaching", label: "Years coaching experience", type: "short_text", required: false },
        { key: "background_check", label: "Do you have a current background check on file?", type: "yes_no", required: true },
      ],
    },
  },
  {
    id: "vendor-payout",
    name: "Vendor / contractor payout",
    description: "Vendor company info + payment + W-9.",
    seed: {
      title: "Vendor Payment Intake",
      description: "Vendors and contractors — please submit your payment info and W-9.",
      instructions: "A current-year W-9 is required before any invoice can be paid.",
      w9_required: true,
      role_required: false,
      role_options: [],
      fields: [
        { key: "invoice_number", label: "Invoice # (if any)", type: "short_text", required: false },
        { key: "service_description", label: "Description of services / goods provided", type: "long_text", required: true },
      ],
    },
  },
  {
    id: "blank",
    name: "Blank form",
    description: "Start with the basics — you can add fields yourself.",
    seed: {
      title: "",
      description: "",
      instructions: "",
      w9_required: true,
      role_required: false,
      role_options: [],
      fields: [],
    },
  },
];

export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function fieldKeyFromLabel(label: string): string {
  const base = slugify(label).replace(/-/g, "_").slice(0, 40) || "field";
  return `${base}_${Math.random().toString(36).slice(2, 6)}`;
}

export const CUSTOM_FIELD_TYPE_LABEL: Record<CustomFieldType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  single_choice: "Single choice",
  yes_no: "Yes / No",
};
