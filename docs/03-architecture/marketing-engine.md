# Marketing Engine

How contacts, campaigns, and sends work under the hood.

## Contact ingestion

- **Manual** — `/marketing/contacts` add form.
- **CSV import** — `/marketing/contacts/import` → `import-contacts` edge function.
- **Public forms** — tryout registration, team signup — write directly to `org_contacts` via anon-permitted RPC.
- **Roster sync** — for orgs connected to SportsEngine/TeamSnap-style rosters (not fully implemented; only manual CSV for now).

## Segments

- `org_contact_segments` has a `filter_json` column encoding predicates (role='parent', team_id IN (…), tags @> ['warm']).
- Segment members are computed live via `resolve_segment_members(_segment_id)` — no materialization.
- **System segments** seeded per-org by `seed_default_segments()`: All Contacts, All Families, All Players, All Coaches.
- **Team segments** auto-created by `sync_team_segments()` on `org_teams` insert.

## Campaigns / sequences

- `campaign_sequence_templates` — admin-curated (Post-Tryout Follow-up, Season Kickoff, etc.).
- `campaign_sequences` — an instance launched into an org.
- `campaign_sequence_steps` — the individual scheduled sends.
- `cron-run-sequences` (every 15 min):
  - Selects steps where `next_send_at <= now()` and sequence is active.
  - Resolves current segment members (in case the segment changed).
  - Enqueues one email per recipient.
  - Advances `next_send_at` for the step (or marks sequence complete).

## Composing a single email

`EmailComposer` at `/marketing/drafts/new`:
1. Rich text editor (Tiptap) with brand kit injected (colors + logo).
2. Segment picker → contact-count preview.
3. Send platform picker (Curve email default; Gmail/M365 if connected).
4. AI-assist: `draft-marketing-email` returns subject+body seeded with `org_brand_voice`.
5. Save draft (`org_marketing_drafts`) or send now.
6. Send now → row in `org_marketing_sends` + enqueue → cron picks it up → Resend.

## Send platforms

`org_send_platforms` — one row per configured platform per org.

- `curve_email` — default, uses Resend from `noreply@os.curvesports.com`.
- `gmail` — sends via the connected Google account (per-org OAuth tokens in `org_email_connections`).
- `microsoft` — same for M365.
- `sms` — Twilio.
- `instagram_dm`, `facebook_dm` — placeholders; not implemented.

## Delivery tracking

`resend-webhook` catches delivered/opened/clicked events and updates `org_marketing_sends` counters. Rolled up nightly into `org_marketing_summary` (also updated by `generate-marketing-insights`).

## NPS

- `org_nps_surveys` — the survey definition (trigger type, send window, message).
- `send-nps-survey` — enqueues one email per recipient in the target segment.
- `org_nps_responses` — 1–10 rating + free-text.
- `process-nps-response` — categorizes into promoter/passive/detractor, and creates an admin follow-up task if a detractor left a substantive comment.

## Insights

`/marketing/insights` calls `generate-marketing-insights`:
- Reads last 30 days of sends, opens, clicks, unsubs.
- Prompts Gemini for a plain-English summary + one recommended action.
- Cached 24h in `org_marketing_summary`.

## See also

- [`../01-user-guide/marketing-hub.md`](../01-user-guide/marketing-hub.md)
