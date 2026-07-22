## Problem

`org_nps_surveys.public_slug` is `NOT NULL` with no default, but `Surveys.tsx` `create()` inserts a new survey without providing one — so every org create fails with the RLS-lookalike error `null value in column "public_slug" ... violates not-null constraint`.

## Fix

Give `public_slug` a database-side default so any insert (from org UI, admin UI, or future code paths) always gets a unique, URL-safe slug — no client changes required.

### Migration

```sql
ALTER TABLE public.org_nps_surveys
  ALTER COLUMN public_slug SET DEFAULT encode(gen_random_bytes(8), 'hex');

-- Backfill any legacy NULLs (defensive; column is NOT NULL so likely none)
UPDATE public.org_nps_surveys
SET public_slug = encode(gen_random_bytes(8), 'hex')
WHERE public_slug IS NULL;
```

`encode(gen_random_bytes(8), 'hex')` yields a 16-char lowercase hex string — collision-safe for this volume, matches the existing `/s/:slug` route style, and the existing `UNIQUE` index still protects against the astronomically unlikely dupe.

## Out of scope

- No client changes to `Surveys.tsx` — the insert stays the same and the DB fills in the slug.
- No changes to preview/public routing; `/s/:slug` already reads whatever value lands in the column.

## Files touched

- `supabase/migrations/<new>.sql`
