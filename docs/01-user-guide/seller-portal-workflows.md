# Seller Portal Workflows

The read-mostly surface for leadership at a Curve-Acquisitions target.

## Route

`/portal/seller/:acquisitionId` — gated by `role = 'seller_portal'` and by `acquisition_portal_users.acquisition_id` matching the URL param.

## What sellers see

- Current phase (Pre-Close → Complete) and % complete per workstream.
- Meeting recaps (from `acquisition_meetings` and their extracted action items).
- Documents shared with them (`acquisition_documents` where `visible_to_seller = true`).
- Comment threads on individual items — writes to `acquisition_meeting_action_items.seller_comment`.

## What sellers cannot see

- Curve-internal notes (`acquisition_tasks.internal_notes`).
- Financial workstream details unless explicitly shared.
- Other acquisitions.

## Onboarding a seller

1. Admin adds them to `acquisition_portal_users` (email + acquisition_id).
2. Admin sends an invite via `/admin/invite` with role `seller_portal`.
3. On signup, `handle_new_user` reads pending invitation + portal-user row → sets role and profile.

## See also

- [`acquisitions-workflows.md`](./acquisitions-workflows.md)
- [`../03-architecture/acquisitions-engine.md`](../03-architecture/acquisitions-engine.md)
