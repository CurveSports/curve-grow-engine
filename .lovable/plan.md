
# Revenue Audit — Public Lead-Gen Tool

A standalone, unauthenticated questionnaire at `/revenue-audit` that produces a personalized revenue-opportunity report. Designed to feel like a real (pared-down) Curve audit, drive sales conversations, and be embeddable on www.curvesports.com.

## User flow

1. Visitor lands on `/revenue-audit` (no sidebar, no nav, pure Curve-branded marketing page).
2. Fills out short questionnaire (single column on mobile, multi-section on desktop).
3. On submit → spinner → redirect to `/revenue-audit/report/:leadId`.
4. Report page is **shareable, refresh-safe, and unique per lead** — anyone with the link sees that lead's report, but the URL contains a long unguessable token so it can't be enumerated.
5. Submission triggers:
   - Internal alert email to `hello@curvesports.com`, `tom.judge@curvesports.com`, `matt.gerber@curvesports.com` (so the team reaches out).
   - Confirmation email to the lead with their report link.
6. Admins can view all submitted leads + reports inside Curve OS at `/admin/revenue-audits`.

## Embedding on www.curvesports.com

Two options, both supported by the same build:
- **Link/button**: marketing site links to `https://os.curvesports.com/revenue-audit` (opens in same tab or new tab).
- **Iframe embed**: the route is iframe-friendly (no auth, no top-nav, responsive). Marketing site drops `<iframe src="https://os.curvesports.com/revenue-audit" />` into any page. We'll set the right headers (no `X-Frame-Options: DENY`) so it loads cleanly.

You don't need to host the form anywhere else — one canonical version on os.curvesports.com, surfaced wherever you want via link or iframe.

## Sales flow (how leads convert)

```
Visitor submits form
        │
        ├─► Saves to DB (public_audit_leads)
        ├─► Edge function computes report values
        ├─► Internal alert email → hello@, tom@, matt@
        │       (subject: "New Revenue Audit — {Org Name} — ${opportunity}")
        │       includes lead contact info + headline numbers + link to admin view
        ├─► Confirmation email → lead
        │       (subject: "Your Curve Revenue Audit is ready")
        │       includes link to their /revenue-audit/report/:token
        └─► Redirect to report page

Curve team gets the email → reaches out within X hours → uses admin view to see full report context during the call.
```

## Pages & routes

| Route | Auth | Purpose |
|---|---|---|
| `/revenue-audit` | Public | Standalone Curve-branded questionnaire |
| `/revenue-audit/report/:token` | Public (token-gated) | Shareable, refresh-safe report |
| `/admin/revenue-audits` | Admin | List of all submissions |
| `/admin/revenue-audits/:id` | Admin | Full lead detail + report view |

Both `/revenue-audit*` routes live **outside** `ProtectedRoute` in `App.tsx`. No `AppShell`, no `BrandingProvider`. Pure Curve brand (white bg, Curve + green "Sports" wordmark, your existing design tokens from `index.css`).

## Database

New table `public_audit_leads`:

- Identity: `id`, `report_token` (long random, used in public URL), `created_at`
- Contact: `org_name`, `contact_name`, `email`, `phone`, `role`, `city_state`
- Inputs: full questionnaire payload as `jsonb` (so we can evolve the form without migrations)
- Computed report: `report_payload jsonb` (all numbers shown on the report, computed server-side)
- Operational: `internal_alert_sent_at`, `confirmation_sent_at`, `status` (new / contacted / closed), `admin_notes`
- Anti-spam: `ip_address`, `user_agent`, `honeypot_tripped boolean`

RLS:
- `anon`: no SELECT, no UPDATE, no DELETE. INSERT only via the edge function (we'll do the insert server-side, so `anon` doesn't need direct table grants at all).
- `authenticated` + admin role: full SELECT/UPDATE for the admin views.
- `service_role`: full access (used by edge function).
- Public report page reads through a security-definer RPC `get_public_audit_report(token text)` that returns only the safe report fields when the token matches — no admin notes, no IP, no honeypot data.

## Edge function: `submit-revenue-audit`

Single function does everything (so anon never touches the DB directly and no calc logic is client-manipulable):

1. CORS + OPTIONS handling (so iframe/cross-origin works from www.curvesports.com).
2. Zod validation of payload.
3. **Honeypot check** — hidden field on form, if filled → silently 200 but don't insert/send.
4. **Rate limit** — max 3 submissions per IP per hour (simple count query against the table).
5. Compute all report numbers server-side (formulas from spec — wallet share, retention recovery, sponsorship opportunity, pricing sensitivity, total opportunity).
6. Generate cryptographically random `report_token`.
7. Insert row with inputs + computed `report_payload`.
8. Enqueue two emails via the saved Lovable Cloud email rule on `notify.os.curvesports.com`:
   - `revenue-audit-internal-alert` template → 3 internal recipients
   - `revenue-audit-confirmation` template → lead
9. Return `{ leadId, reportToken }` so the client can redirect to `/revenue-audit/report/:token`.

Public read of the report happens via a second tiny function or RPC `get_public_audit_report(token)` — no auth required, returns only the sanitized report payload.

## Email templates

Two new React Email templates in `supabase/functions/_shared/transactional-email-templates/`:

- **`revenue-audit-internal-alert.tsx`** — to Curve team. Lead contact info, top 3 opportunity numbers, "View full report in admin" link, "Reply to lead" mailto.
- **`revenue-audit-confirmation.tsx`** — to lead. Friendly Curve-branded thank you, "Your report is ready" CTA → link to `/revenue-audit/report/:token`, short note that a team member will reach out.

Both registered in `registry.ts`. Both go through existing Lovable Cloud queue on the verified `notify.os.curvesports.com` domain (per saved rule — not Resend).

## Calculations (server-side, per spec)

All formulas implemented in the edge function exactly as written. Dollar values formatted with commas + no decimals on the report page. Blank/toggled-off fields → 0. Identical math whether viewed on submit or on later refresh (read from stored `report_payload`).

## Anti-spam

- Honeypot hidden field
- Per-IP rate limit (3/hour)
- Basic input length + type validation via Zod
- No CAPTCHA in v1 (can add hCaptcha later if abuse appears)

## Admin views

- `/admin/revenue-audits` — table of submissions: org, contact, total opportunity, status, submitted date, "View report" + "Mark contacted" actions.
- `/admin/revenue-audits/:id` — full lead detail panel reusing the same report renderer as the public page, plus admin-only fields (notes, status, IP, contact history).
- Linked from the admin sidebar under the existing Marketing or Sales section.

## File changes

**New:**
- `supabase/migrations/<ts>_public_audit_leads.sql` — table, RLS, GRANTs, `get_public_audit_report` RPC
- `supabase/functions/submit-revenue-audit/index.ts`
- `supabase/functions/_shared/transactional-email-templates/revenue-audit-internal-alert.tsx`
- `supabase/functions/_shared/transactional-email-templates/revenue-audit-confirmation.tsx`
- `src/pages/public/RevenueAudit.tsx` — questionnaire
- `src/pages/public/RevenueAuditReport.tsx` — public report (reads via token)
- `src/pages/admin/AdminRevenueAudits.tsx` — list
- `src/pages/admin/AdminRevenueAuditDetail.tsx` — detail
- `src/lib/revenueAudit.ts` — shared TS types + report renderer component

**Edited:**
- `src/App.tsx` — register 4 routes, the two `/revenue-audit*` outside `ProtectedRoute`
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — register new templates
- Admin sidebar nav — add "Revenue Audits" link

## Open items (not blocking, just confirm later)

- **Allegiance CTA URL** on the report — using a placeholder `https://curvesports.com/contact` for now; tell me the real URL when ready.
- **iframe embed code snippet** — I'll include a small "embed instructions" note in the admin view so you can copy/paste into your marketing site.
