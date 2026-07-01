# Marketing Hub

Org-facing marketing tool at `/marketing/*`. Admin mirror at `/admin/orgs/:orgId/marketing/*`.

## Sub-navigation

| Route | Table | Purpose |
|---|---|---|
| `/marketing` | — | Landing / metrics. |
| `/marketing/contacts` | `org_contacts`, `org_contact_relationships` | Master people list. Auto-populated by roster imports and public-form submissions. |
| `/marketing/segments` | `org_contact_segments` | Filters. System segments (All Contacts, All Families, All Players, All Coaches) are seeded per org by `seed_default_segments()`. Team segments auto-created via `sync_team_segments()`. |
| `/marketing/campaigns` | `campaign_sequences`, `campaign_sequence_steps` | Multi-step drips. Admin launches from a template (`campaign_sequence_templates`), org customizes. |
| `/marketing/drafts` | `org_marketing_drafts` | In-progress messages. |
| `/marketing/sends` | `org_marketing_sends` | Sent history + open/click stats (from Resend webhooks → `resend-webhook` edge function). |
| `/marketing/sms` | `org_sms_sends` | SMS via Twilio (when connected). |
| `/marketing/nps` | `org_nps_surveys`, `org_nps_responses` | Post-season promoter surveys. |
| `/marketing/insights` | `org_marketing_summary` | AI-generated weekly synopsis via `generate-marketing-insights`. |

## Compose flow

1. `/marketing/drafts/new` → `EmailComposer`.
2. Pick a segment → contact count previews live.
3. Pick a send platform (`org_send_platforms`): Curve email (default), org Gmail via OAuth, org M365 via OAuth, or SMS if this is a text draft.
4. AI-assist buttons call `draft-marketing-email` (subject + body) with the org's `org_brand_voice` injected into the prompt.
5. Save draft or Send now → writes `org_marketing_sends` → `process-email-queue` picks it up → Resend delivery → `resend-webhook` updates open/click counters.

## Brand voice

`org_brand_voice` holds tone, adjectives, do/don'ts. Set once during onboarding by admin, referenced in every AI generation prompt for that org.

## Sequences (drip campaigns)

- Templates live in `campaign_sequence_templates` (admin-only, curated). Examples: "Post-Tryout Follow-up," "Season Kickoff."
- Admin launches a template into an org → creates `campaign_sequences` + `campaign_sequence_steps` rows.
- Cron (`cron-run-sequences`) fires every 15 min, picks up steps whose `next_send_at <= now()`, sends them, advances the state.

## NPS

- Trigger types: `post_tryout`, `mid_season`, `end_of_season`, `custom`.
- `send-nps-survey` emails a 1–10 rating link.
- `process-nps-response` categorizes (promoter/passive/detractor) and generates a follow-up task if a detractor left a comment.

## Insights

`/marketing/insights` = a card summarizing the last 30 days:
- Best-performing campaign.
- Engagement trend vs prior period.
- One recommended action.

Backed by `generate-marketing-insights` (Lovable AI Gateway, model `google/gemini-2.5-flash`). Cached in `org_marketing_summary` for 24h.

## See also

- [`../03-architecture/marketing-engine.md`](../03-architecture/marketing-engine.md)
