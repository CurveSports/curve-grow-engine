# Testing

Honest state of the art: **coverage is thin.** This section describes what exists, what should exist, and where to add tests when touching a module.

## What runs today

- **Unit tests** with Vitest — a handful of files under `src/**/*.test.ts(x)`. Mostly `lib/` pure functions (formatters, revenue math).
- **No E2E harness** in-repo. Manual smoke happens in the running app.
- **Typechecking** via `tsgo` — treated as a strong test.
- **Migrations** are validated by being applied to the shared dev instance.

## Commands

```bash
bunx vitest run             # all tests
bunx vitest run path/to/f   # one file
lovable-exec test           # same, via the harness
tsgo                        # typecheck
```

The Lovable harness runs typecheck + build after every AI edit; there is no need to run these manually inside the sandbox.

## What to test when adding features

### Pure logic (`src/lib/*.ts`)
Full unit tests. Revenue math, engine scoring, phase-unlock predicates — all cheap and worth it.

### Hooks (`src/hooks/*.ts`)
Test the query key + transformation function. Mock supabase-js with `vi.mock`.

### Components
Only test if the component encodes real logic (a wizard, a validation flow). Presentation components don't need tests.

### Edge functions
Unit-test the payload validator (zod schema) and the pure math helpers. Skip integration testing against Supabase — do that in the running preview.

### RLS
No automated coverage today. When shipping a security-sensitive change:
1. Run the failing query as `anon` in the Supabase SQL editor.
2. Confirm it returns nothing.
3. Add a note in the migration.

## Manual smoke checklist (before shipping a big change)

- Sign in as `admin`, load `/admin`.
- Sign in as `org_user` (test org), load `/dashboard` and `/plan`.
- Trigger an invite from `/admin/invite` and confirm email arrives.
- Submit `/revenue-audit` end-to-end and confirm report renders.
- Check `/admin/system/wiring-status` — all green.

## Where to invest first

1. Vitest coverage of `src/lib/revenue.ts` and `src/lib/tasks.ts` (business math).
2. Zod schemas for `submit-revenue-audit`, `admin-invite-link`, `activate-action-plan`.
3. A Playwright suite covering: signup via invite, intake completion, plan approval, task complete → revenue share update.
