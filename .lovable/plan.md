# Easier Event W-9 Intake

The Events area already has an admin page (`/admin/events/intake`) that creates tokenized public forms at `/events/intake/:slug` and collects W-9s. It works, but "new form" today only asks for title / slug / description / instructions — no event date, no role field, no way to add custom questions, no shortcut for common event types. This plan makes creating a new event a 30-second job.

## What the user gets

**Redesigned "New event intake" modal** with:
1. **Preset picker** at the top — one click seeds the whole form:
   - *Tournament staff W-9* — umpires, scorekeepers, field crew
   - *Camp / clinic coaches* — coach role + payment + W-9
   - *Vendor / contractor payout* — company info + payment + W-9
   - *Blank* — start empty
2. **Event date** (optional) and **event location** — shown on the public form header and in the admin list.
3. **Role / position** toggle — when on, the public form adds a required "Role at event" dropdown (options editable inline: Umpire, Scorekeeper, Coach, Vendor, Other…).
4. **Custom questions** — small builder (short text, long text, single-choice, yes/no) stored in `event_surveys.fields` (already exists). Responses land in `event_survey_responses.extra` (already exists).
5. **W-9 required?** switch — some events (e.g. volunteers) don't need one.

**List improvements:**
- Cards show event date and response count; sort by upcoming date.
- Row actions: **Copy link**, **Duplicate form** (clones settings + fields with a new slug), **Archive**.

**Public form** (`EventIntake.tsx`):
- Renders event date/location in header when set.
- Renders role dropdown when enabled; renders each custom question; skips the W-9 section when W-9 is turned off.
- Stores role + custom answers in `extra` jsonb; role also stored in a dedicated indexable column for filtering.

**Response viewer:**
- Adds Role and event-date columns; role filter alongside payment filter; CSV export includes all custom fields.

## Out of scope
- Emailing participants their link from inside the app (they still copy/paste the link out).
- Payment processing — this stays a data-collection form.
- Linking events to `organizations` or the acquisitions module.
- Reusing a person's prior W-9 across events (persistence is per-response for now).

## Technical notes

**Migration** adds to `public.event_surveys`:
- `event_date date`, `event_location text`, `w9_required boolean not null default true`, `role_required boolean not null default false`, `role_options text[] not null default '{}'`, `archived_at timestamptz`.

Adds to `public.event_survey_responses`:
- `role text` (nullable), index on `(survey_id, role)`.

Existing `fields jsonb` on `event_surveys` will hold custom-question schema:
```json
[{ "key": "shirt_size", "label": "Shirt size", "type": "single_choice", "options": ["S","M","L","XL"], "required": false }]
```
Existing `extra jsonb` on responses will hold the answers keyed by `key`.

No RLS changes needed — existing admin-manage + public-insert policies on both tables cover the new columns.

**Files to change:**
- New migration adding the columns + index above (with GRANTs already in place — additive).
- `src/pages/admin/events/AdminEventIntake.tsx` — new modal (presets, date, role, custom-fields builder, w9 toggle), list card updates, duplicate/archive actions, CSV export widened.
- `src/pages/events/EventIntake.tsx` — render new header fields, role dropdown, custom-question renderer, gate W-9 section on `w9_required`, submit `role` + `extra`.
- `src/lib/eventIntake.ts` (new) — preset definitions and field-builder types shared by both pages.

## Open questions before build
None — proceeding on the answers already given (admin-only creation, tokenized public link, event has a date but no cross-event W-9 reuse yet).
