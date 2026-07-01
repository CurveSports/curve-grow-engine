# Integrations

Third-party services the app talks to.

## Resend (email)

- Domain: `notify.os.curvesports.com`.
- API key: `RESEND_API_KEY` env on edge functions.
- Only `process-email-queue` calls it directly.
- Webhook: `resend-webhook` edge function catches delivery events → updates `org_marketing_sends`.

## Twilio (SMS)

- Account SID / auth token as env vars on edge functions.
- `send-sms` sends; `twilio-status-webhook` updates status.
- Only used when an org has SMS enabled in `org_send_platforms`.

## Lovable AI Gateway (LLM + image generation)

- One env var: `LOVABLE_API_KEY`.
- Default text model: `google/gemini-2.5-flash`.
- Premium text: `openai/gpt-5` for drafts users will actually send.
- Image gen: called from `generate-design-background` for the flyer tool.
- No token accounting today — usage is monitored via the gateway dashboard.

## Google Workspace (per-org)

- **Gmail send** for `org_send_platforms` type `gmail`. OAuth flow: `google-oauth-callback` → stores encrypted tokens in `org_email_connections`.
- **Calendar** — Curve's team calendar is used *only* as a static booking link (Revenue Audit CTA). Not an integration in code.

## Microsoft 365 (per-org)

- OAuth via `microsoft-oauth-callback`. Same table (`org_email_connections`, type `microsoft`).
- Used by `send-marketing-send` when the org's chosen platform is M365.

## Fathom / Fireflies (meeting transcripts)

- Inbound webhooks on `fathom-webhook` and `fireflies-webhook`.
- Store raw transcript in `acquisition_meeting_transcripts`.
- `process-meeting-transcript` runs LLM extraction on demand from admin UI.

## Composite Worker (self-hosted)

- Small Node service on Railway.
- Env: `COMPOSITE_WORKER_URL`, `COMPOSITE_WORKER_SECRET` on the `render-design` edge function.
- Renders Fabric.js JSON scenes → PNG via headless Chromium (Puppeteer).

## No SDKs on the frontend

The React app never imports Resend/Twilio/Google/Microsoft SDKs. All external calls happen server-side (edge functions).

## See also

- [`edge-functions.md`](./edge-functions.md)
- [`../03-architecture/deployment.md`](../03-architecture/deployment.md)
