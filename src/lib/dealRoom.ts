export const DOC_TYPES = [
  "contract","agreement","financial","handbook","policy","marketing",
  "presentation","checklist","report","correspondence","compliance","template","other",
] as const;

export const DOC_WORKSTREAMS = [
  "integration","financial","legal","hr_culture","marketing","testing",
  "it","data_assets","compliance","value_creation","general",
] as const;

export const BUDGET_CATEGORIES = [
  { key: "legal_fees", label: "Legal Fees", color: "bg-purple-100 text-purple-800" },
  { key: "accounting_fees", label: "Accounting Fees", color: "bg-teal-100 text-teal-800" },
  { key: "marketing_spend", label: "Marketing Spend", color: "bg-orange-100 text-orange-800" },
  { key: "equipment", label: "Equipment", color: "bg-blue-100 text-blue-800" },
  { key: "facility", label: "Facility", color: "bg-slate-100 text-slate-800" },
  { key: "travel", label: "Travel", color: "bg-amber-100 text-amber-800" },
  { key: "software", label: "Software", color: "bg-indigo-100 text-indigo-800" },
  { key: "staffing", label: "Staffing", color: "bg-pink-100 text-pink-800" },
  { key: "consulting", label: "Consulting", color: "bg-cyan-100 text-cyan-800" },
  { key: "compliance", label: "Compliance", color: "bg-rose-100 text-rose-800" },
  { key: "other", label: "Other", color: "bg-gray-100 text-gray-800" },
] as const;

export function budgetCategoryMeta(key: string) {
  return BUDGET_CATEGORIES.find((c) => c.key === key) ?? { key, label: key, color: "bg-gray-100 text-gray-800" };
}

export const COMM_TYPES = ["seller","staff","sikich","legal","vendor","internal","other"] as const;
export const COMM_METHODS = [
  { key: "call", label: "Call", icon: "📞" },
  { key: "email", label: "Email", icon: "📧" },
  { key: "meeting", label: "Meeting", icon: "👥" },
  { key: "text", label: "Text", icon: "💬" },
  { key: "in_person", label: "In Person", icon: "🤝" },
  { key: "other", label: "Other", icon: "•" },
] as const;
export function commMethodMeta(key: string) {
  return COMM_METHODS.find((m) => m.key === key) ?? { key, label: key, icon: "•" };
}

export const SENTIMENT_FACES: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: "😟", label: "Very Concerned", color: "text-rose-600" },
  2: { emoji: "😕", label: "Somewhat Concerned", color: "text-amber-600" },
  3: { emoji: "😐", label: "Neutral", color: "text-muted-foreground" },
  4: { emoji: "🙂", label: "Positive", color: "text-emerald-600" },
  5: { emoji: "😊", label: "Very Positive", color: "text-emerald-700" },
};

export const SENTIMENT_MILESTONES = [
  { key: "day_7", label: "Day 7" },
  { key: "day_30", label: "Day 30" },
  { key: "day_60", label: "Day 60" },
  { key: "day_90", label: "Day 90" },
] as const;

export function fileIconColor(fileType?: string | null): { color: string; label: string } {
  const t = (fileType ?? "").toLowerCase();
  if (t.includes("pdf")) return { color: "text-rose-600", label: "PDF" };
  if (t.includes("word") || t.includes("docx") || t.includes("document")) return { color: "text-blue-600", label: "DOC" };
  if (t.includes("sheet") || t.includes("excel") || t.includes("xlsx") || t.includes("csv")) return { color: "text-emerald-600", label: "XLS" };
  if (t.includes("presentation") || t.includes("pptx") || t.includes("powerpoint")) return { color: "text-orange-600", label: "PPT" };
  if (t.startsWith("image/")) return { color: "text-purple-600", label: "IMG" };
  if (t.startsWith("video/")) return { color: "text-pink-600", label: "VID" };
  return { color: "text-muted-foreground", label: "FILE" };
}

export function formatBytes(n?: number | null): string {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatCurrency(n?: number | string | null): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function weekRange(d: Date = new Date()): { start: string; end: string; weekNum: number } {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  const start = date.toISOString().slice(0, 10);
  const end = new Date(date.getTime() + 6 * 86400000).toISOString().slice(0, 10);
  // ISO week number
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { start, end, weekNum };
}
