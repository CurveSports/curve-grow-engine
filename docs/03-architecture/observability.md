# Observability

## What we have

- **Postgres logs** — Lovable Cloud console. Slow queries, RLS denials, trigger errors.
- **Edge function logs** — Lovable Cloud console. `console.log` stdout captured.
- **`admin_error_log` table** — every edge function that wraps its handler in the shared error logger writes here. Query it from `/admin/system/wiring-status`.
- **`/admin/system/wiring-status`** — health of critical edge functions (last-success timestamp), queue depths in `pgmq`, storage bucket sizes.
- **Resend dashboard** — deliverability, bounces, complaints.
- **Twilio console** — SMS delivery.
- **Lovable AI Gateway dashboard** — LLM usage.

## What we don't have

- No Sentry, DataDog, Honeycomb, or similar. Errors surface via console logs and the ad-hoc `admin_error_log` table.
- No product analytics (Mixpanel/Amplitude/PostHog). Product KPIs come from Postgres views (`org_marketing_summary`, `curve_portfolio_summary`).
- No uptime monitoring service — Lovable Cloud handles it. Composite worker health is polled by `system-wiring-status` on demand.
- No real-user monitoring (Web Vitals) — could be added later.

## Runtime error triage flow

1. User reports an error.
2. Read session replay + runtime errors first (there's a Lovable tool for this).
3. Reproduce via Playwright.
4. Fix, verify, ship.
5. If the error was silent (no session replay caught it), add a `console.error` and consider a `admin_error_log` insert so it surfaces next time.

## Metrics rollup

Two rollup views/tables to know:

- **`org_marketing_summary`** — per-org marketing KPIs updated by `generate-marketing-insights`.
- **`curve_portfolio_summary`** — Curve-wide book of business rollup used by `/admin` and `/admin/marketing/portfolio`.

## Alerting

Currently email-only:
- Cron failures log to `admin_error_log`; no email fires.
- Delivery failures (Resend) fire alerts in Resend, not in-app.
- Composite worker down → `/admin/system/wiring-status` will flag it but nothing pages a human.

**High-leverage improvement:** wire `admin_error_log` inserts to a Slack channel via an edge function. Not done yet.

## What to build first

1. Sentry (frontend + edge functions).
2. Slack alerts on `admin_error_log` writes.
3. Uptime pings for the composite worker.
4. Web Vitals to spot slow pages.
