# Revenue Audit Funnel

Standalone public product — top-of-funnel lead gen.

## Surfaces

- `/revenue-audit` — the questionnaire.
- `/revenue-audit-report/:token` — token-gated report.
- `/admin/revenue-audits` — lead inbox.
- `/admin/revenue-audits/:id` — full submission detail.

## Data

`public_audit_leads` — a single row per submission holds:
- Contact info (name, email, phone, org name, city, state).
- Player count, annual revenue, selected engines (up to 3).
- Per-engine answers as `answers jsonb`.
- Computed per-engine leak + total leak + capture %.
- `report_token uuid` — the shareable identifier.

**No anon SELECT policy.** Public read happens via `get_public_audit_report(_token)` RPC (SECURITY DEFINER) which matches only on the opaque token.

## Engine math (server-side, in `submit-revenue-audit`)

Benchmarks (per player, annually unless noted):

| Engine | Benchmark |
|---|---|
| Fundraising | $150 |
| Sponsorship | $150 |
| Apparel | Prompt asks for total parent spend; captured vs leak split |
| Training | $100/month → $1,200/yr |
| Events | $450/yr |
| Retention | % churn × avg annual player value |
| Share of Wallet | Total capture % across all engines |

Report frames the leak as "$ leaving the building" and the summary metric as "% captured" against total addressable spend per player.

## Anti-spam

- Hidden honeypot input (`website_url` — real submissions leave it blank).
- Server rate-limit by IP + email (soft; logs suspicious submissions).
- Email confirmation only — no SMS reduces abuse surface.

## Email flow

On submit:
1. Internal notification to `hello@curvesports.com`, `tom.judge@curvesports.com`, `matt.gerber@curvesports.com`.
2. Prospect confirmation with report link.

Both enqueued via the standard `q_transactional_emails` path.

## Persistence

Form state serialized to `localStorage` on every step change → refresh doesn't lose data. Report URL is permanent.

## Embedding

```html
<iframe
  src="https://os.curvesports.com/revenue-audit"
  style="width:100%;min-height:1400px;border:0;"
  loading="lazy"></iframe>
```

## Terminal CTA

Single hero button in the report linking to the Curve Google Calendar scheduler. Prior design had multiple CTAs (email/forward/schedule) — simplified to one to reduce decision friction.

## See also

- [`../01-user-guide/revenue-audit-workflows.md`](../01-user-guide/revenue-audit-workflows.md)
