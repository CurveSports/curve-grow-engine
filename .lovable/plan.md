# Admin "Act on behalf of Org" — Marketing

Goal: from the Curve admin side, an admin picks an organization and gets the **exact** org-side experience (Brand Kit, Designs, Emails, Campaigns, Sequences, SMS, Social, NPS, Contacts, Short Links, A/B Tests, Send Times) scoped to that org. No duplicate pages — one codebase, two entry points.

## How it will work (UX)

1. New admin page **`/admin/orgs/:orgId/marketing`** — same layout as the org `/marketing` Hub (the cards/tools grid), but every link is prefixed with `/admin/orgs/:orgId`.
2. Each tool page is mounted **twice** in the router:
   - `/marketing/*` → org user, scoped to their own org
   - `/admin/orgs/:orgId/marketing/*` → admin, scoped to the URL `:orgId`
3. While inside an admin org-context route, AppShell shows a sticky **"Acting as: {Org Name} — Exit"** banner at the top so it is impossible to forget you're operating on someone else's data. "Exit" returns to the org's admin detail page.
4. Entry points for admins:
   - Org detail page → new "Open Marketing Tools" button
   - The admin Marketing sidebar gets a new top item **"Browse Orgs"** that lists orgs and links each to their `/admin/orgs/:orgId/marketing` hub
5. The existing **admin-only** Marketing pages (Approvals, Portfolio Analytics, Design/Email/Sequence Templates) stay where they are at `/admin/marketing/*` — those are cross-portfolio, not per-org.

## How it will work (technically)

### 1. Effective-org context
Create `useEffectiveOrg()` hook + `<EffectiveOrgProvider>`:
- If route matches `/admin/orgs/:orgId/...` → `effectiveOrgId = params.orgId`, `isImpersonating = true`, fetch and expose org name/logo
- Else → `effectiveOrgId = profile?.org_id`, `isImpersonating = false`
- Guards: only `role === "admin"` can resolve an admin org-context; org_users hitting an admin URL are bounced

### 2. Refactor org marketing pages
Replace every `const orgId = profile?.org_id` (~14 files listed in research) with `const { orgId } = useEffectiveOrg()`. No other logic changes — Supabase queries already filter by `eq("org_id", orgId)`, which works identically for admins because RLS already grants admins full access via `has_role(uid,'admin')` on these tables (verify each table's policy in a follow-up; add admin-bypass policies where missing).

### 3. Routing
In `App.tsx`, wrap the existing org marketing route subtree in a small helper and mount it twice:
- `<Route path="/marketing/*" element={<OrgMarketingRoutes />} />` (org user guard)
- `<Route path="/admin/orgs/:orgId/marketing/*" element={<AdminOrgMarketingRoutes />} />` (admin guard, wraps children in `EffectiveOrgProvider`)

`OrgMarketingRoutes` is just the existing `<Routes>` block extracted into one component so both mount points share it.

### 4. Internal links
Org-side pages currently hard-code links like `/marketing/emails/new`. Add a `useMarketingLink(path)` helper that prefixes with `/admin/orgs/:orgId` when impersonating. Find/replace `to="/marketing/...` and `navigate("/marketing/...` to use it (~30-ish occurrences).

### 5. AppShell
- When `isImpersonating`, render the **org** sidebar groups (Hub, Brand Kit, Designs, Emails, …) instead of the admin sidebar, all with rewritten links
- Sticky top banner: `Acting as {org.name} · Exit →`

### 6. Audit trail
Any insert/update done while `isImpersonating` includes `acting_admin_user_id = session.user.id` so we have a clean record. Add an `acting_admin_user_id uuid` column to a few key tables now (campaigns, sequences, sms_messages, contacts) — non-breaking, nullable.

## Files to add
- `src/hooks/useEffectiveOrg.tsx`
- `src/hooks/useMarketingLink.ts`
- `src/components/marketing/ImpersonationBanner.tsx`
- `src/pages/admin/AdminOrgMarketingHub.tsx` (thin wrapper around existing `MarketingHub` reading effective org)
- `src/pages/admin/AdminBrowseOrgs.tsx` (list orgs → link to their marketing hub)
- `src/routes/OrgMarketingRoutes.tsx` (extracted `<Routes>` shared by both mount points)

## Files to edit
- `src/App.tsx` — add admin org-context route subtree
- `src/components/AppShell.tsx` — banner, sidebar swap when impersonating, "Browse Orgs" entry
- All `src/pages/marketing/*.tsx` files that read `profile?.org_id` (~14 files) — switch to `useEffectiveOrg`
- Internal `/marketing/...` links in those pages — switch to `useMarketingLink`
- One DB migration adding `acting_admin_user_id` columns + ensuring admin-bypass RLS on all marketing tables

## Out of scope (for this PR)
- Admin-only "preview as org" read-only mode (we're going straight to full edit access since the user said admins must be able to *do* everything)
- Per-tool permission granularity for non-admin Curve staff (everyone with the `marketing` admin module gets full impersonation)

## Open question (one)
When an admin sends an email/SMS while impersonating, should the **From / reply-to** be the org's configured sender (recommended, true two-sided behavior) or should we tag it internally? I'll go with **org's sender** unless you say otherwise — the audit column tracks who actually clicked send.
