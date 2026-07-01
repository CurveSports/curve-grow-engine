# System Diagram

```
                     ┌───────────────────────────────────────────────┐
                     │                curvesports.com                │
                     │        (marketing site, embeds iframe)        │
                     └──────────────────────┬────────────────────────┘
                                            │  iframe
                                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       os.curvesports.com  (React SPA)                 │
│  Public: /revenue-audit, /onboard/:token, /auth                       │
│  Auth'd: /admin/* · /dashboard · /plan · /marketing · /sponsorships   │
│          /communications · /portal/seller/:id                         │
└──────────────┬────────────────────────────────────┬───────────────────┘
               │                                    │
    supabase-js│ (RLS-scoped queries + realtime)    │ .functions.invoke()
               ▼                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                          Lovable Cloud                                │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────────────────┐   │
│  │  Postgres   │◀─│ Edge Functions │─▶│  External integrations   │   │
│  │  + RLS      │  │  (60+, Deno)   │  │  Resend, Twilio,         │   │
│  │  + pgmq     │  └────────┬───────┘  │  Lovable AI Gateway,     │   │
│  │  + pg_cron  │           │          │  Google, Microsoft,      │   │
│  │  + Storage  │◀──────────┘          │  Fathom, Fireflies       │   │
│  └─────┬───────┘                      └──────────────────────────┘   │
│        │                                                              │
│        │ (composite-worker only)                                      │
│        └──────────────────────┐                                       │
└───────────────────────────────┼───────────────────────────────────────┘
                                ▼
                     ┌────────────────────────┐
                     │  services/composite-   │  (Railway; renders
                     │  worker (Node+Chromium)│   Fabric.js → PNG)
                     └────────────────────────┘
```

## Flow, in words

1. **Browser** loads the React SPA. Public routes render immediately.
2. **Authenticated routes** rely on `useAuth` → session from `supabase.auth`, profile + roles from Postgres. RLS filters every subsequent read.
3. **Direct reads/writes** hit Postgres via `supabase-js` — RLS is the enforcement plane.
4. **Edge functions** run anything that needs a secret, cross-table transaction, or external API.
5. **`pgmq` queues + `pg_cron`** decouple slow work (emails, digests, LLM calls) from user requests.
6. **Storage** buckets hold files; org-scoped buckets use folder-based RLS.
7. **Composite worker** is the only piece of custom infra outside Lovable Cloud, called synchronously from `render-design`.

## Deployment surfaces

- **os.curvesports.com** — Vite build served via Lovable Cloud hosting.
- **notify.os.curvesports.com** — Resend sending domain (DNS-verified).
- **Composite worker** — Railway service.
- **DNS** — Cloudflare.

## See also

- [`data-model.md`](./data-model.md)
- [`deployment.md`](./deployment.md)
