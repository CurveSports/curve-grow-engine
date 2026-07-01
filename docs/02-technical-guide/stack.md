# Stack

The exact versions matter — not everything is latest.

## Frontend

- **React** 18.3
- **Vite** 5
- **TypeScript** 5 (checked with `tsgo`, not `tsc --noEmit`)
- **React Router** 6 (v6 API — `Routes`/`Route`, not the data router)
- **TanStack Query** 5 — every server read; no Redux, no Zustand
- **Tailwind CSS** 3 (not v4 — do not upgrade without a plan)
- **shadcn/ui** components in `src/components/ui/` (already vendored — do not npm-install shadcn)
- **framer-motion** — animation on landing pages, revenue audit, dashboards
- **lucide-react** — the only icon set
- **@dnd-kit/{core,sortable,utilities}** — drag/drop for project phases and pipeline kanban
- **fabric.js** — canvas for the design/flyer generator
- **zod** — form + edge-function validation
- **react-hook-form** — every form in the app

## Backend (Lovable Cloud)

- **Postgres** with RLS on every table.
- Extensions used: `pgcrypto`, `pgjwt`, `pgmq`, `pg_cron`, `pg_net`, `vector` (for future embeddings, not yet in prod queries).
- **Supabase Auth** for identity.
- **Supabase Storage** for files (buckets in [`../03-architecture/storage.md`](../03-architecture/storage.md)).
- **Supabase Realtime** for `communication_messages` and a few live counters.
- **Supabase Edge Functions** (Deno) — 60+ functions. See [`edge-functions.md`](./edge-functions.md).

## External services

- **Resend** — outbound email on `notify.os.curvesports.com`, from `noreply@os.curvesports.com` ("Curve OS"). All sends go through the shared queue.
- **Twilio** — SMS. Only used from `send-sms` edge function.
- **Lovable AI Gateway** — LLM access. Default model `google/gemini-2.5-flash`; `openai/gpt-5` for higher-quality drafts. Authenticated via `LOVABLE_API_KEY`.
- **Google Calendar** — only as a static booking link (not an integration).
- **Fathom / Fireflies** — webhooks into `fathom-webhook` for meeting transcripts.
- **Gmail / M365** — per-org OAuth for `org_send_platforms`. Tokens stored encrypted in `org_email_connections`.

## Standalone service

**`services/composite-worker/`** — small Node service on Railway. Runs headless Chromium to render Fabric.js compositions to PNGs (used by the design/flyer feature). The edge function `render-design` calls it via HTTPS with a shared secret.

## What's deliberately NOT here

- No Next.js. This is a Vite SPA.
- No Prisma or ORM. Raw supabase-js calls with generated `Database` types.
- No i18n framework — English only.
- No CSS-in-JS beyond Tailwind + shadcn tokens.
- No Storybook. Component review happens in the running app.

## See also

- [`local-setup.md`](./local-setup.md)
- [`conventions.md`](./conventions.md)
