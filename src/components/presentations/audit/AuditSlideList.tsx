function asItems(v: any): Array<{ title?: string; text: string }> {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map((x) => {
      if (typeof x === "string") return { text: x };
      return {
        title: x?.title ?? x?.heading ?? undefined,
        text: x?.text ?? x?.description ?? x?.detail ?? (typeof x === "object" ? JSON.stringify(x) : String(x)),
      };
    });
  }
  return [];
}

export function AuditSlideList({
  title, items, accent, emptyText,
}: { title: string; items: any; accent: string; emptyText: string }) {
  const list = asItems(items);
  return (
    <div className="space-y-6 text-foreground">
      <div className="flex items-center gap-3">
        <div className="h-2 w-12 rounded-full" style={{ background: accent }} />
        <h2 className="font-display text-3xl font-bold tracking-tight">{title}</h2>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((item, i) => (
            <li key={i} className="rounded-xl border border-border bg-card p-4">
              {item.title && <p className="font-semibold text-foreground mb-1">{item.title}</p>}
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{item.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
