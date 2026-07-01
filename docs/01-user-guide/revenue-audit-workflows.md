# Revenue Audit Workflow

**Public, no auth.** Top-of-funnel lead-gen tool served at `/revenue-audit` on os.curvesports.com and embedded on curvesports.com via iframe.

## Prospect flow

1. Land on `/revenue-audit` — dark cinematic Curve marketing theme.
2. **Act 1 — Pitch:** animated Share-of-Wallet ring + 7 Engines grid explains the thesis.
3. **Act 2 — Audit:** multi-step form.
   - Baseline: player count, annual revenue, contact info (phone required).
   - Pick **top 3 growth engines** they care about (of 7).
   - Answer 2–3 diagnostic questions per selected engine only.
   - Sticky "Live Revenue Leak" panel updates in real time as they type.
4. **Submit** → `submit-revenue-audit` edge function:
   - zod-validates payload, checks honeypot field.
   - Computes leak-per-engine math server-side (benchmarks: Fundraising $150/player, Sponsorship $150/player, Training $100/mo/player, Events $450/player/yr).
   - Inserts `public_audit_leads` row with generated `report_token` (UUID).
   - Sends: (a) internal notification to `hello@curvesports.com`, `tom.judge@curvesports.com`, `matt.gerber@curvesports.com`; (b) prospect confirmation with report link.
5. Redirect to `/revenue-audit-report/:token`.
6. **Act 3 — Report:** hero shows "% Captured" and "$ Leaving the Building". Selected engines get detailed cards; unselected engines show locked teasers.
7. **Act 4 — Next Steps:** single hero CTA linking to the Curve Google Calendar scheduler.

## Anti-spam

- Honeypot field (`website_url` on the form is hidden from users).
- Server rate-limits by IP + email (soft — logs to `admin_error_log`).
- No SMS. Email confirmation only.

## Persistence across refresh

Form state serializes to `localStorage` on every step change. Refreshing does not lose progress. The report is permanent — the token URL works forever unless the lead is deleted.

## Admin view

- **`/admin/revenue-audits`** — list of every submission with basic KPIs (player count, calculated leak, city/state).
- **`/admin/revenue-audits/:id`** — full submission, all engine answers, share-report link.

Data reads from `public_audit_leads`. Public report page reads via `get_public_audit_report(_token)` RPC (SECURITY DEFINER) so no anon SELECT policy is needed on the table.

## Embedding

The iframe snippet given to the marketing site:

```html
<iframe
  src="https://os.curvesports.com/revenue-audit"
  style="width:100%;min-height:1400px;border:0;"
  allow="clipboard-write"
  loading="lazy"
></iframe>
```

## See also

- [`../03-architecture/revenue-audit-funnel.md`](../03-architecture/revenue-audit-funnel.md)
