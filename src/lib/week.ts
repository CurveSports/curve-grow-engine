// Returns the Monday of the week containing `d` as a YYYY-MM-DD string (UTC-safe enough for week buckets)
export function weekStartingMonday(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}
