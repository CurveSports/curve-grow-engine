# Email System

Everything outbound (auth invites, marketing sends, transactional notifications, NPS surveys) flows through the same pipeline.

## The pipeline

```
enqueue → pgmq queue → process-email-queue (cron 1/min) → Resend → recipient
                                                    ↘ resend-webhook → org_marketing_sends
```

### Queues

- `q_auth_emails` — invites, password resets, magic links.
- `q_transactional_emails` — everything else (NPS survey, weekly focus, notifications, marketing sends).

Both are `pgmq` queues. Enqueue with `pgmq.send(queue_name, payload jsonb)`; consume with `pgmq.read` / `pgmq.delete`.

### `process-email-queue` (cron)

Runs every minute via `pg_cron`:

1. Drains up to N messages from each queue.
2. For each: validates payload (must include `to`, `subject`, `html`, optional `attachments`, `unsubscribe_token`).
3. Calls Resend `POST /emails`.
4. On success: `pgmq.delete`, updates any linked send/notification row.
5. On error: leaves in queue with a visibility timeout, logs to `admin_error_log`. After N retries, moves to a dead-letter table.

### Sender identity

- **From:** `Curve OS <noreply@os.curvesports.com>`
- **Domain:** `notify.os.curvesports.com` (verified in Resend)
- **Reply-to:** typically `hello@curvesports.com` for prospect emails, the assigned consultant for org DMs.

### Unsubscribe tokens

Resend requires every transactional email carry an unsubscribe token. Each recipient gets one row in `email_unsubscribe_tokens`, reused across sends. When a recipient hits the unsubscribe URL, `email_unsubscribes` gets a row keyed by their token + category → the queue processor honors it before sending.

### Marketing sends

Marketing hub composes go into `org_marketing_sends` first, then enqueue. `resend-webhook` writes delivery/open/click events back to the same row (`delivered_at`, `opened_at`, `clicked_at`, counter columns).

## Auth emails specifically

Supabase's default auth email templates are **disabled**. Instead:

1. Admin action triggers `admin-invite-link` (or password reset triggers `supabase.auth.resetPasswordForEmail`).
2. That function generates the link (`supabase.auth.admin.generateLink`) and enqueues a Curve-branded email with the link embedded.
3. Recipient sees a Curve OS email — not a generic Supabase one.

This is why every auth email needs an `unsubscribe_token` even though it's arguably essential — Resend policy requires it.

## Failure surfacing

`ResendInviteButton` and `AdminInvite` render red banners with the actual error message from the edge function (missing `RESEND_API_KEY`, malformed headers, unverified sender, etc.). Look at `admin_error_log` for anything the UI didn't surface.

## Adding a new email

1. Create a template component (or plain HTML string) in the edge function.
2. Compute or fetch the recipient's unsubscribe token.
3. `pgmq.send('q_transactional_emails', { to, subject, html, unsubscribe_token, ... })`.
4. Wait for the next cron tick.

Do not call Resend directly from anywhere except `process-email-queue`. Centralizing means rate-limit handling, retry, and deliverability tracking live in one place.

## See also

- [`background-jobs.md`](./background-jobs.md) for cron wiring.
- [`edge-functions.md`](./edge-functions.md).
