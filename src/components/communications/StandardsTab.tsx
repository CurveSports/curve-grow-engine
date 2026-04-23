// Round 10 — Communication Standards (read-only for org users; admin edit comes in Phase B)
import { Star } from "lucide-react";

const NON_NEGOTIABLES = [
  {
    title: "Weekly Team Update",
    body: "Every Thursday during the active season. No exceptions.",
    draftType: "Weekly team update",
  },
  {
    title: "Parent Response",
    body: "Acknowledge every parent message within 24 hours.",
  },
  {
    title: "Development Report",
    body: "Every player receives a written report within 2 weeks of the season ending. (Use Handled for player development reports.)",
  },
];

type Row = {
  what: string;
  when: string;
  freq: string;
  template?: string;
  required?: boolean;
};

const HEAD_COACH_ROWS: Row[] = [
  { what: "Season welcome", when: "2 weeks before first practice", freq: "Once per season", template: "Season kickoff letter" },
  { what: "Weekly team update", when: "Every Thursday in-season", freq: "Weekly — REQUIRED", template: "Weekly team update", required: true },
  { what: "Schedule change", when: "As soon as confirmed", freq: "As needed", template: "Schedule change or cancellation" },
  { what: "Cancellation", when: "As soon as decided", freq: "As needed", template: "Schedule change or cancellation" },
  { what: "Re-enrollment outreach", when: "2-3 weeks after season", freq: "Once per season", template: "Re-enrollment outreach" },
  { what: "Parent response", when: "Within 24 hrs", freq: "As needed — REQUIRED", required: true },
  { what: "Weekly check-in to director", when: "Every Friday", freq: "Weekly — REQUIRED", template: "Weekly expectation reminder", required: true },
  { what: "Urgent escalation", when: "Immediately", freq: "As needed", template: "Accountability follow-up" },
];

const DIRECTOR_ROWS: Row[] = [
  { what: "Tryout announcement", when: "8 weeks before tryouts", freq: "Once per season", template: "Tryout announcement" },
  { what: "Tryout results — accepted", when: "Within 48 hrs", freq: "Per player", template: "Tryout result — accepted" },
  { what: "Tryout results — not selected", when: "Within 48 hrs", freq: "Per player", template: "Tryout result — not selected" },
  { what: "New coach onboarding", when: "Day coach confirmed", freq: "Per new hire", template: "New coach onboarding" },
  { what: "Season kickoff staff message", when: "1 week before", freq: "Once per season", template: "Season expectations letter" },
  { what: "Initial sponsor outreach", when: "6 weeks before season", freq: "Per prospect", template: "Initial outreach" },
  { what: "Sponsor follow-up", when: "1 week after initial", freq: "Once per prospect", template: "Follow-up" },
  { what: "Sponsor meeting confirmation", when: "When booked", freq: "Per meeting", template: "Follow-up" },
  { what: "Post-meeting follow-up", when: "Within 24 hrs", freq: "Per meeting", template: "Follow-up" },
  { what: "Sponsor deal closed", when: "Within 24 hrs of signing", freq: "Per deal", template: "Thank you and renewal" },
  { what: "End-of-season debrief", when: "Final week of season", freq: "Once per season", template: "End of season debrief request" },
];

const EXCELLENCE = [
  "Every team has a weekly update sent by Thursday",
  "No parent message sits unanswered for more than 24 hours",
  "Every tryout candidate — accepted and not selected — receives a written result within 48 hours",
  "Sponsor outreach is active from 6 weeks before the season opens",
  "Every new coach receives an onboarding message the day they are confirmed",
];

export default function StandardsTab({ onDraftTemplate }: { onDraftTemplate: (templateLabel: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Communication Standards</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The operating standard for communication across your organization. These don't change from season to season.
        </p>
      </div>

      {/* Three Non-Negotiables */}
      <div className="rounded-lg border-2 border-health/40 bg-health-soft/40 p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-health mb-3 inline-flex items-center gap-2">
          <Star className="h-4 w-4" /> The Three Non-Negotiables
        </h3>
        <div className="space-y-3">
          {NON_NEGOTIABLES.map((n, idx) => (
            <div key={n.title} className="rounded-md border border-border bg-card p-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{idx + 1}. {n.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
              </div>
              {n.draftType && (
                <button
                  onClick={() => onDraftTemplate(n.draftType!)}
                  className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Draft →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Head Coach Responsibilities */}
      <ResponsibilityTable title="Head Coach Responsibilities" rows={HEAD_COACH_ROWS} onDraftTemplate={onDraftTemplate} />

      {/* Director Responsibilities */}
      <ResponsibilityTable title="Travel Team Director Responsibilities" rows={DIRECTOR_ROWS} onDraftTemplate={onDraftTemplate} />

      {/* What excellence looks like */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground mb-3">What Excellence Looks Like</h3>
        <ul className="space-y-2">
          {EXCELLENCE.map((line) => (
            <li key={line} className="text-sm flex items-start gap-2">
              <span className="text-health mt-0.5">✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ResponsibilityTable({ title, rows, onDraftTemplate }: {
  title: string; rows: Row[]; onDraftTemplate: (label: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/40">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-semibold">What</th>
              <th className="text-left p-3 font-semibold">When</th>
              <th className="text-left p-3 font-semibold">How Often</th>
              <th className="text-left p-3 font-semibold">Template</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.required ? "bg-warning-soft/20" : ""}>
                <td className="p-3 font-medium">{r.what}</td>
                <td className="p-3 text-muted-foreground">{r.when}</td>
                <td className={"p-3 " + (r.required ? "text-warning font-semibold" : "text-muted-foreground")}>{r.freq}</td>
                <td className="p-3">
                  {r.template ? (
                    <button
                      onClick={() => onDraftTemplate(r.template!)}
                      className="rounded-md px-2 py-1 text-[11px] font-semibold border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      Draft →
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">AI assist</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
