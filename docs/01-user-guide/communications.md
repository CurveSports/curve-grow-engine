# Communications (DMs)

The org↔Curve messaging surface. Not to be confused with the Marketing Hub (which is outbound to the org's own contacts).

## Data model

- `communication_threads` — one per topic, has `org_id` and `subject`.
- `communication_messages` — messages inside a thread. `sender_id`, `body`, `attachments jsonb`.

## Org side (`/communications`)

- Sees only threads for their own org.
- Compose a new thread → drops into Curve admin's queue.
- Message notification: `notify-new-message` edge function emails the assigned Curve consultant.

## Admin side (`/admin/communications`)

- Portfolio inbox across every org.
- Filters: unread, mentions me, tag.
- Reply inline. Replies email the org contacts subscribed to that thread.

## Realtime

Both sides use Supabase Realtime on `communication_messages` (org_id filter for org users; open filter for admins). New messages animate in without polling.

## See also

- Slack/Teams integration is **not** wired — DMs stay inside the app.
