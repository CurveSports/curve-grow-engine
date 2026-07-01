# Deployment

## Environments

- **Production:** `os.curvesports.com`. This is the only environment today.
- **Preview:** each Lovable AI-driven branch spins an ephemeral preview URL.
- **Local:** `bun dev`, pointing at the same Lovable Cloud instance as prod (be careful).

There is **no staging environment yet**. Adding one requires provisioning a second Lovable Cloud project and threading env vars for it.

## Frontend deploy

Vite build produced by the Lovable harness on merge:

```bash
bun run build
```

Output in `dist/` served via Lovable Cloud hosting. No manual step.

## Edge functions

Auto-deployed on merge. Each function in `supabase/functions/<name>/` becomes an HTTPS endpoint at `https://<project-ref>.functions.supabase.co/<name>`.

## Migrations

Migrations in `supabase/migrations/` are applied in filename order automatically. **Never edit a merged migration.** Add a new one.

## DNS

- `os.curvesports.com` → Lovable Cloud hosting (CNAME).
- `notify.os.curvesports.com` → Resend sending domain (MX + TXT records).
- Managed via Cloudflare.

## Composite worker

- Repo: `services/composite-worker/`.
- Host: Railway (single service, single instance).
- Env: `PORT`, `WORKER_SECRET`.
- Deploys on push to `main` (Railway auto-deploy).
- Health: hit `/health` — used by `system-wiring-status` edge function.

## Rollback

- **Frontend:** redeploy a previous commit via the Lovable UI.
- **Edge functions:** revert the commit and let auto-deploy pick it up.
- **Migrations:** write a new migration that reverses the change. Never delete or edit a merged migration.
- **Data corruption:** Lovable Cloud takes daily backups; contact support for a point-in-time restore.

## Env vars (edge functions)

| Var | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | injected by Lovable Cloud |
| `RESEND_API_KEY` | outbound email |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | SMS |
| `LOVABLE_API_KEY` | AI Gateway |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | OAuth |
| `COMPOSITE_WORKER_URL`, `COMPOSITE_WORKER_SECRET` | design rendering |
| `FATHOM_WEBHOOK_SECRET`, `FIREFLIES_WEBHOOK_SECRET` | inbound webhook verification |

## Release checklist

Before shipping a meaningful change:

1. `tsgo` and `bunx vitest run` green.
2. `/admin/system/wiring-status` all green in preview.
3. Manual smoke of the affected flow.
4. If migration touches data → confirm rollback plan.
5. If security-sensitive → update `@security-memory` if you're accepting a scanner finding.
6. Announce in the team channel with a link to the preview.
