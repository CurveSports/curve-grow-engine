# Contact Segregation + NPS Send Pipeline

Two-part build. Part 1 is the contact data model overhaul (LeagueApps-style, season-scoped teams, dedupe). Part 2 layers the NPS send pipeline on top.

---

## Part 1 — Contact Data Model

### New tables

- **`org_seasons`** — season per org (e.g. "Spring 2026 Baseball", "Fall 2025 Softball"). Fields: `name`, `sport` ('baseball' | 'softball'), `start_date`, `end_date`, `status` (auto: upcoming/active/completed via existing `compute_season_status` trigger).
- **`org_teams`** — team **scoped to a season**. Fields: `season_id`, `name` ("12U Red"), `age_group`, `division`, `head_coach_contact_id` (nullable). Same team next season = new row (so coaches can change).
- **`org_team_memberships`** — many-to-many join. Fields: `team_id`, `contact_id`, `role` ('player' | 'coach' | 'assistant_coach' | 'team_manager' | 'parent'), `jersey_number` (nullable), `position` (nullable), `is_primary_parent` (bool). Unique (`team_id`, `contact_id`, `role`).
- **`org_contact_groups`** — flexible groups not tied to a season ("Alumni", "All-Star Tryouts 2026 Interest List", "Newsletter"). Fields: `name`, `description`, `group_type` ('mailing_list' | 'event' | 'alumni' | 'custom').
- **`org_contact_group_members`** — many-to-many join (`group_id`, `contact_id`).

### Changes to `org_contacts`

- Drop reliance on the freeform `team_assignments` text array (keep column for now as legacy; new code uses memberships).
- Add `archived_at` (nullable) — instead of deleting, contacts get archived when removed from active rosters. Stays searchable for promotion to mailing lists.
- Add `parent_contact_ids uuid[]` — link players to their parents (and vice versa via reverse query).
- `email` remains nullable (already is — players without email allowed).

### Dedupe strategy

Implemented in a SQL function `find_duplicate_contact(_org_id, _email, _phone, _first_name, _last_name)` returning best match if any:

1. **Exact email match** (case-insensitive) within org → match.
2. **Exact phone match** (normalized to digits only) within org → match.
3. **Same first+last name + same team roster + no conflicting email/phone** → soft match (return as "likely duplicate", not auto-merged).

Used by:
- CSV import (`process-csv-upload` edge function): replace current naive email-only check with this function. On match: merge new fields into existing contact (don't overwrite non-empty values), append new team membership rather than duplicate the contact.
- Manual "Add Contact" UI: warn before save if a likely duplicate exists.

Add a unique partial index: `UNIQUE (org_id, lower(email)) WHERE email IS NOT NULL` to make accidental dupes impossible at the DB level. Same for phone (normalized).

### CSV import upgrades

Importer needs to know the **target season + team** at upload time. New flow:

1. User picks an existing season (or creates one) + an existing team (or creates one) + the role being imported (players / coaches / parents).
2. Map columns including new ones: `jersey_number`, `position`, `parent_first_name`, `parent_last_name`, `parent_email`, `parent_phone` (so a single LeagueApps row creates a player contact + auto-creates/links a parent contact + assigns both to the team with correct roles).
3. Dedupe per the function above. Write upload summary: created N, merged N, linked N parents, errors N.
4. Pre-built column-mapping presets for **LeagueApps**, **SportsEngine**, **Future** (saved in code; user picks a preset and the column mapping auto-fills).

### UI changes (`/marketing/contacts`)

Replace flat list with three tabs: **Seasons & Teams**, **Groups**, **All Contacts**.

- **Seasons & Teams tab**: tree view → Season → Team → roster (players, coaches, parents grouped). Bulk actions: move team to next season, archive season, message team.
- **Groups tab**: list groups, view members, add/remove contacts, send to group.
- **All Contacts tab**: keeps existing search/filter view, with new filters (season, team, role, archived).

### Segment filter expansion

Extend `count_segment_contacts` and the segment filter rules JSON to support: `season_id`, `team_id`, `team_role`, `group_id`, `archived`. So a segment like "All Spring 2026 12U Red parents" or "Alumni newsletter" works.

---

## Part 2 — NPS Send Pipeline (after Part 1)

1. **Audience picker** in survey edit dialog: dropdown of `org_contact_segments` (now segment-aware of seasons/teams/groups). Save to `org_nps_surveys.audience_segment_id`. "Test send to me" button.
2. **Send flow** ("Send Survey"):
   - Resolve segment → contact list (email + first name).
   - For each contact: insert `magic_links` row with unique token + `payload` containing `survey_id` and `contact_id`.
   - Call `email-send` (Resend, `onboarding@resend.dev`) with the survey question + 0–10 button row, each linking to `/nps/:token?score=N`.
   - Update survey `status='sent'`, `sent_at=now()`, `recipient_count=N`.
3. **`/nps/:token` route**: looks up token → resolves survey + contact → renders existing `NpsResponse` page with the score pre-filled from query param, then collects follow-up.
4. UI: show recipient count preview before send, "Sending… (N of M)" progress, and a final success toast.

---

## Order of operations

1. Migration: new tables + dedupe function + unique indexes + segment filter extension. (Approval needed.)
2. Backend: update `process-csv-upload`; new edge function `nps-send-survey`; new edge function `nps-token-resolve` (or reuse `magic-link-action`).
3. Frontend: Contacts page rebuild (tabs, season/team tree, group manager, new import wizard with platform presets). NPS edit dialog gets audience picker + send pipeline wiring.

I'll start by submitting the migration for your approval, then build the rest in order.
