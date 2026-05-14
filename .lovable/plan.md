## Goal
Ship the full premium-UX overhaul + close every functional hole identified in the audit. Sequenced so each phase is shippable on its own.

## Phase 1 — Navigation & Hub (UX foundation)
- Collapse marketing sidebar from 14 items → 5 verbs: **Hub, Create, Audience, Campaigns, Insights**.
- Move Brand Kit, Email Setup, SMS Setup, Social Accounts, Shortlinks, Send Times under contextual "Settings" drawers inside their parent pages (no top-level entries).
- Rebuild `MarketingHub.tsx` as a true command center:
  - **What's next** card (next scheduled send, pending approvals, detractors awaiting follow-up)
  - **Quick create** card (one-tap launch of sequence templates with anchor-date picker)
  - **Today's wins** strip (last-24h opens / clicks / RSVPs / new contacts)
  - **Trust badges** row (email verified, SMS active, social connected)
- Add **Game Day mode**: auto-detected when an event is within 48h, surfaces a pre-filled campaign card on Hub.

## Phase 2 — Composer & Approvals polish
- Unify Email/SMS/Social composers into one `/marketing/create` route with a channel toggle (keeps existing edge functions; UI shell only).
- Convert Approvals from list → swipeable card stack (mobile + desktop), keyboard shortcuts (← reject, → approve, ↑ comment).
- Empty states across every page become "launch a template" CTAs instead of generic copy.

## Phase 3 — Buffer / Social integration (real)
- Add Buffer connector via `standard_connectors--connect` (OAuth).
- New edge functions: `buffer-schedule-post`, `buffer-sync-metrics` (cron every 30 min).
- Wire `SocialAccounts.tsx` to show connected channels + post status.

## Phase 4 — A/B winner cron + Send-time engine
- New edge function `ab-test-winner` on cron — picks winner after stat-sig threshold, sends remainder to winning variant.
- New edge function `compute-best-send-hour` — per-contact `best_send_hour` column on `org_contacts` from open/click history; deferred-send queue table `org_email_send_queue`.
- Update `send-marketing-email` to honor `send_at_optimal_time` flag.

## Phase 5 — NPS detractor workflow + promoter spotlight
- Detractor card UI on NPS detail: "Mark resolved", note thread, assign-to.
- Promoter testimonial capture: auto-DM promoter with one-click "share your story" magic link → testimonial bank.

## Phase 6 — React Email migration
- Replace MJML templates with React Email components (`@react-email/components`) for type safety + better preview.
- Keep MJML rendering as fallback for one release.

## Phase 7 — Daily digest + cost monitoring
- New edge function `marketing-daily-digest` (cron 7am org TZ) — emails org admin: approvals waiting, recent perf, dormant alerts.
- Internal portfolio digest for Curve team.
- New table `org_cost_log` (ai_tokens, email_sends, sms_sends, $ estimate) + `SystemIntegrations.tsx` cost panel.

## Phase 8 — Per-org short domain + QR logo center
- Add `org_short_domain` column; `shortlink-redirect` honors custom host.
- Embed org logo into QR center via `QrCodeBlock.tsx` (canvas overlay).

## Visual polish (woven through every phase)
- Brand-tinted gradients pulled from `org_brand_kits.primary_color`.
- Real photo thumbnails on cards (pull from brand kit photo library).
- Signature page-load animation on Hub (framer-motion stagger).
- Mobile parking-lot bar with Create / Approve / Send always visible on `/marketing/*`.

## Order of execution
Phase 1 → 2 → 5 → 4 → 3 → 6 → 7 → 8. Phases 1, 2, 5 are pure UX wins with no external dependencies; 3 needs Buffer OAuth setup; 6–8 are heavier infra.

## Rough scope
~30–40 file edits, ~8 new edge functions, ~5 migrations, 1 new connector. Realistically 4–6 separate work sessions to land cleanly with verification between phases.
