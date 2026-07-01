# Background Jobs

Two mechanisms: **`pg_cron`** for scheduled Postgres/edge-function invocations, and **`pgmq`** for durable queues drained by cron.

## pg_cron jobs (see migrations `*_cron_*.sql`)

| Job | Schedule | What it does |
|---|---|---|
| `process-email-queue` | `* * * * *` (every min) | Drains `q_auth_emails` + `q_transactional_emails` via Resend. |
| `cron-run-sequences` | `*/15 * * * *` | Advances `campaign_sequences` — sends due steps. |
| `daily-task-digest` | `0 12 * * *` UTC | Per-org open-tasks digest email. |
| `send-weekly-rollup` | `0 13 * * MON` | Weekly focus + portfolio digest. |
| `run-acquisition-phase-check` | daily | Calls `update_acquisition_phases()`. |
| `refresh-derived-metrics` | daily | Backup recompute for orgs whose triggers may have missed. |
| `revenue-share-recompute-nightly` | daily | Backup for `recalculate_revenue_share`. |
| `nps-followup` | daily | Sends detractor follow-up emails. |

All jobs invoke edge functions via `pg_net.http_post` with a shared authorization header.

## pgmq queues

- `q_auth_emails`
- `q_transactional_emails`
- (Future) `q_ai_generation` — not in prod yet.

Standard read/delete pattern with visibility timeouts. Failures leave messages in queue; after N failed reads they're moved to a `dlq_*` table for manual triage.

## DB triggers (event-driven, no cron)

Some heavy work runs on triggers rather than schedule:

- `sync_sponsorship_to_revenue` — sponsorship deal marked won → row in `org_revenue_entries`.
- `recalculate_revenue_share` — after insert/update on `org_revenue_entries` or `org_engagement_contracts`.
- `handle_new_user` — on `auth.users` insert, creates profile+role.
- `task_completion_gate` — blocks completion if earlier phase incomplete.
- `sync_team_segments` — creates a segment when a team is created.
- `set_updated_at` — generic `updated_at = now()` on many tables.

## Composite worker (Railway)

`services/composite-worker/` — separate Node service. Only used for headless PNG rendering of design compositions. Called synchronously from `render-design` edge function via HTTPS + shared secret. Not on a schedule; on-demand only.

## Observability

- Each cron invocation logs to Postgres logs.
- Long-running edge functions write to `admin_error_log` on failure.
- Queue depths are visible in `/admin/system/wiring-status`.

## Adding a new job

1. Write the edge function.
2. Write a migration adding a `cron.schedule(...)` call.
3. Add a health check in `system-wiring-status` if it's critical.
