# Working with Coding Agents

This project is developed heavily through the Lovable AI agent. New humans on the team should read this to understand how to hand off cleanly and avoid re-litigating decisions.

## Ground rules the agent follows

- **Never edit `src/integrations/supabase/types.ts`** — regenerated after migrations.
- **Migrations are additive, timestamp-prefixed, and never edited after merge.**
- **Any UI change stays in frontend/presentation** unless business logic is also requested.
- **RLS is mandatory on every new table.**
- **No new dependencies without checking bundle impact.**
- **Design tokens live in `index.css` + `tailwind.config.ts`** — no raw hex, no `text-white`.

## Where the agent stores institutional memory

- `@security-memory` (at project root) — accepted-risk annotations for security findings. Every "public read on `org_logos` is intentional" lives here.
- `docs/` (this folder).
- Migration files carry the story of every schema decision in chronological order.

## Common agent workflows

- **New feature:** ask clarifying questions → write migration + edge function + hook + component in parallel → confirm typecheck.
- **Bug report:** read session replay, read runtime errors, reproduce with Playwright, fix, verify.
- **Security issue:** load scan results, batch fixes in a single migration, update `@security-memory` for intentional exceptions.
- **Docs request:** produce a `/docs/*` file.

## When humans should override the agent

- **Anything touching money.** Contract/baseline/revenue-share math must be human-reviewed before shipping.
- **Anything touching auth.** `handle_new_user`, invite flow, RLS on `profiles`/`user_roles` — human review required.
- **Anything deleting rows.** Prefer soft delete or archive. The org-delete cascade is the only intentional hard delete and it took multiple iterations to get right.

## Working alongside the agent

If a human writes code and then the agent picks up the same feature:
- Leave a comment `// HUMAN: <intent>` on non-obvious decisions.
- Reference the migration timestamp for related schema changes.
- Add a paragraph to the relevant `docs/` file — that's what the agent reads first.
