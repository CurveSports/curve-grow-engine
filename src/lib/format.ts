export const formatCurrency = (n: number | null | undefined, opts: { decimals?: boolean } = {}) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "$0";
  const v = Number(n);
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.decimals ? 2 : 0,
    minimumFractionDigits: 0,
  });
};

export const formatPct = (n: number | null | undefined, decimals = 0) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  return `${(Number(n) * 100).toFixed(decimals)}%`;
};

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};
