# Coding Conventions

## TypeScript

- **Strict mode is on.** Fix types; don't `any` unless annotated with a `// TODO(name): …` and a reason.
- Import `Database` type from `@/integrations/supabase/types`. Prefer `Database['public']['Tables']['org_tasks']['Row']` over hand-rolled interfaces.
- No default exports for components except pages (React Router needs the default for lazy loading in a few places — check existing convention).

## Styling

- **Tailwind only.** No inline `style` prop unless the value is dynamic (e.g. progress bar width, brand color from DB).
- **Use semantic tokens from `index.css` / `tailwind.config.ts`.** Never `text-white`, `bg-black`, or raw hex in JSX — use `text-foreground`, `bg-background`, `text-volt`, etc.
- HSL only in tokens. Never store hex in the design-tokens layer.
- Dark mode is via the `dark` class on `<html>` — theme toggle lives in `useTheme`. Public revenue-audit pages force dark regardless of user preference.

## Data fetching

- **Every server read goes through TanStack Query** with a stable query key (`['org', orgId, 'tasks']`).
- Mutations use `useMutation` and call `queryClient.invalidateQueries` on success.
- Never call `supabase.from(...)` inside a component effect — wrap it in a hook.
- For realtime, use `supabase.channel(...)` inside a `useEffect` and clean up in the return.

## Forms

- `react-hook-form` + `zod` resolver, always.
- Errors render via shadcn `<FormMessage>`.

## Errors & toasts

- Use `useToast` (shadcn) for user-visible messages. Success = default; failure = `variant: 'destructive'`.
- For unexpected errors, also `console.error(err)` with a stable prefix so it can be searched in the browser console.

## Naming

- Components: `PascalCase`.
- Hooks: `useCamelCase`.
- Files: match the export name.
- DB tables: `snake_case`, `org_*` for org-scoped, `acquisition_*` for acquisitions, `curve_*` for platform-wide, `public_*` for anon-facing.
- Edge functions: `kebab-case` matching their function name (`send-invite-email`, not `sendInviteEmail`).

## Comments

- Comment **why**, not what. If you must comment "what," rewrite the code.
- Anything security-sensitive gets a `// SECURITY:` comment referencing the RLS policy or edge-function guard.

## Migrations

- One migration = one purpose. Never mix a schema change with a data backfill in the same file if the backfill could take >5s at scale.
- Filename format: `YYYYMMDDHHMMSS_slug.sql`.
- Every new table gets RLS enabled + at least one policy in the same migration.

## Edge functions

- Read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env; never hardcode.
- Validate every request body with zod.
- Log with `console.log('[<function-name>] …')` — Lovable Cloud captures these.
- Always return CORS headers; use the shared `_shared/cors.ts` when present.

## Git / commits

- Commits are managed by the Lovable harness — do not run `git commit` manually.
- Migrations must be added, never edited, once merged. If you need to change a merged migration, write a new one.

## See also

- [`data-access-patterns.md`](./data-access-patterns.md)
- [`../03-architecture/security-model.md`](../03-architecture/security-model.md)
