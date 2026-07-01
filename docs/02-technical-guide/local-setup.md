# Local Setup

## Prereqs

- Node 20 or Bun 1.1+
- Access to the Lovable Cloud project (Supabase project ID + anon key). Ask a lead — these live in `src/integrations/supabase/client.ts` and `.env` respectively.
- (Optional) Supabase CLI for local edge-function development.

## First run

```bash
bun install
bun dev          # Vite on http://localhost:5173
```

The app uses the **remote** Lovable Cloud instance by default. There is no local Postgres unless you spin one up separately. This means:

- Your local UI writes to the real database.
- **Do not seed/delete/experiment against prod tables** without checking with a lead first. Use the shared dev org (`test-dev-org` in `organizations`).

## Environment variables

Copied from `.env.example`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Nothing else is needed for the frontend. Edge-function secrets (Resend, Twilio, Lovable AI key, composite-worker URL) live server-side.

## Typecheck / lint

```bash
tsgo                # fast typecheck (do NOT use `tsc --noEmit`)
bun run lint        # eslint
```

Both run automatically in the Lovable harness after edits — don't run them manually inside the sandbox.

## Tests

```bash
bunx vitest run
# or
lovable-exec test
```

Tests live next to source (`*.test.ts(x)`). Coverage is thin today; see [`testing.md`](./testing.md).

## Working on edge functions

Edge functions live in `supabase/functions/<name>/index.ts` and deploy automatically when merged. To smoke-test locally:

```bash
supabase functions serve <name>
curl -X POST http://localhost:54321/functions/v1/<name> \
  -H "Authorization: Bearer $(cat .env | grep ANON | cut -d= -f2)" \
  -d '{...}'
```

## Working on the composite worker

```bash
cd services/composite-worker
bun install
bun dev
```

It listens on `:8787`. Edge function `render-design` needs `COMPOSITE_WORKER_URL` pointed at it (only relevant when developing the design feature).

## See also

- [`repo-layout.md`](./repo-layout.md)
- [`conventions.md`](./conventions.md)
