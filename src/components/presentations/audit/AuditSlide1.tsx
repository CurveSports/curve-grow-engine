import { CurveBadge } from "../shared";

export function AuditSlide1({ org, audit }: { org: any; audit: any }) {
  const name = org?.name ?? "Your Organization";
  const when = audit?.completed_at ?? audit?.created_at;
  const type = (audit?.audit_type ?? "combined") as string;
  return (
    <div className="space-y-8 text-foreground">
      <div className="flex items-center justify-between">
        <CurveBadge light />
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {type === "combined" ? "Website + Social Audit" : type === "website" ? "Website Audit" : "Social Audit"}
        </span>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1">Digital Presence Audit</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{name}</h1>
        {when && (
          <p className="text-sm text-muted-foreground mt-2">
            {new Date(when).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ScoreStat label="Overall" value={audit?.overall_score} accent="#10b981" />
        <ScoreStat label="Website" value={audit?.website_score} accent="#3b82f6" />
        <ScoreStat label="Social" value={audit?.social_score} accent="#8b5cf6" />
      </div>

      {audit?.ai_summary && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Summary</p>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{audit.ai_summary}</p>
        </div>
      )}
    </div>
  );
}

function ScoreStat({ label, value, accent }: { label: string; value: number | null | undefined; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      {value != null ? (
        <p className="font-display text-5xl font-bold mt-3 tabular-nums" style={{ color: accent }}>
          {value}<span className="text-xl text-muted-foreground">/100</span>
        </p>
      ) : (
        <p className="font-display text-4xl font-bold mt-3 text-muted-foreground">—</p>
      )}
    </div>
  );
}
