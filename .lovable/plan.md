
# Mobile-friendly client + marketing surfaces

Goal: every org-user page and every /marketing page should feel "Apple easy" on a phone — one obvious back button, one obvious primary CTA reachable with the thumb, and content that stacks cleanly without horizontal scroll.

## Approach: build 3 small primitives, then apply them

Rather than touching ~30 pages individually with custom code, we add three reusable building blocks and then sweep each page to use them. This keeps the result consistent (which is what makes it feel Apple-like) and keeps the diff manageable.

### 1. `<MobilePageHeader>` — back button + title + optional action
Used at the top of every detail/sub page on mobile. Desktop is unchanged.

- Left: chevron back button (uses `navigate(-1)`, falls back to a `backTo` prop)
- Center: page title (truncates)
- Right: optional single icon action (e.g. share, edit)
- 44px tall, sticky under the existing top bar so it stays put while scrolling
- Hidden on `md+` so desktop still uses the existing header

### 2. `<MobileActionBar>` — sticky bottom CTA bar
For pages with a primary action (Send, Save, Approve, Add, Schedule, etc.).

- Fixed at the bottom, above the existing 4-tab nav (so `bottom: 64px` on mobile)
- Full-width primary button, optional secondary ghost button beside it
- Safe-area padding for notched devices
- Hidden on `md+`
- When present, the page's main content gets `pb-32` so nothing is covered

### 3. `<ResponsiveList>` pattern — table on desktop, card list on mobile
Most marketing list pages currently use a `<table>` that overflows on mobile. We add a small CSS pattern (not a new component to avoid a heavy refactor): each list page renders `<div className="hidden md:block">{table}</div>` plus `<div className="md:hidden space-y-2">{cards}</div>` where cards are simple stacked rows with the 1–2 most important fields and a chevron link.

## Page sweep — what gets the treatment

Client (org user):
- Dashboard, Report, Plan, Plan detail, Team, Settings, Communications, Sponsorships, Calculators
- All get `MobilePageHeader` (back + title)
- Plan detail, Settings, Sponsorship lead detail get `MobileActionBar` for their primary save/CTA

Marketing (`/marketing/*`):
- Hub, Brand Kit, Designs, Design Editor, Emails, Email Composer, Email Setup, Campaigns, Campaign Detail, Sequences (Library/Preview/Launch), SMS (list/Composer/Setup/Companion), Social Accounts, NPS Surveys, NPS Survey Detail, Approvals Queue, Contacts, Shortlinks, A/B Tests, Send Times
- All get `MobilePageHeader`
- Composers (Email, SMS, Design Editor) and Setup pages get `MobileActionBar` with the primary "Send / Save / Continue" action
- List pages with tables (Designs, Emails, Campaigns, Sequences, SMS Sends, Contacts, Shortlinks, A/B Tests, NPS, Approvals) get the responsive list pattern

## Other mobile cleanups (small, batched)

- Force all `<Dialog>` content to `max-h-[90vh] overflow-y-auto` and `w-[95vw]` on small screens (one-line className update where missing) so modals never trap content off-screen
- Buttons that are currently `size="sm"` on primary actions get bumped to default size on mobile for thumb reach
- Filter/tab rows that overflow get `overflow-x-auto` with snap so they scroll horizontally instead of wrapping awkwardly
- Replace any `text-xs` primary CTAs on mobile with `text-sm` minimum

## What stays out of scope (this pass)

- Admin (`/admin/*`) pages — separate effort
- Visual redesign / new color or typography work
- New features or business logic — this is purely presentation
- Keyboard / accessibility audit beyond the touch-target sizing already in the primitives

## Technical notes

- New files:
  - `src/components/mobile/MobilePageHeader.tsx`
  - `src/components/mobile/MobileActionBar.tsx`
- Both render `null` on `md+` (Tailwind `md:hidden`) so desktop is byte-for-byte unchanged
- `MobilePageHeader` uses `useNavigate(-1)` from react-router; pages that need a specific destination pass `backTo="/marketing"` etc.
- `MobileActionBar` uses `position: fixed; bottom: 64px` to sit above the existing mobile bottom nav (`h-16` in `AppShell`); on pages without the bottom nav (composers/full-screen flows) it sits at `bottom: 0`
- Page sweep is mechanical: import primitive, drop it in at the top/bottom of the page's JSX, wrap any tables with the `hidden md:block` / `md:hidden` pair where needed
- No DB / RLS / edge-function changes
- No design-system token changes

## Order of work

1. Build the two primitives + responsive-list pattern doc
2. Sweep client (org user) pages — ~9 files
3. Sweep marketing pages — ~22 files
4. Quick visual pass at 390x844 to confirm nothing is hidden behind the bottom CTA bar
