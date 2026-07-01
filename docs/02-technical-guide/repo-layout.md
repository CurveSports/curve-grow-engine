# Repo Layout

```
├── src/
│   ├── App.tsx                        # BrowserRouter + all routes
│   ├── main.tsx                       # bootstrap
│   ├── index.css                      # Tailwind entry + design tokens (HSL)
│   ├── components/
│   │   ├── ui/                        # shadcn primitives — DO NOT hand-edit lightly
│   │   ├── admin/                     # admin-only components (OrgDetail tabs, etc.)
│   │   ├── shared/                    # shared between admin & org (SharedFilesTab, etc.)
│   │   ├── marketing/                 # marketing hub composers, segment pickers
│   │   ├── sponsorships/              # pipeline kanban, tier cards
│   │   ├── acquisitions/              # acquisition detail tabs, workstream cards
│   │   ├── communications/            # thread list, message composer
│   │   ├── revenue-audit/             # public funnel components
│   │   ├── design/                    # Fabric.js canvas, brand-kit picker
│   │   ├── AppShell.tsx               # authenticated shell (sidebar + topbar)
│   │   ├── ProtectedRoute.tsx         # role + module gate
│   │   └── RouteResolver.tsx          # role-based landing decision
│   ├── pages/
│   │   ├── admin/                     # /admin/* pages
│   │   ├── acquisitions/              # /admin/acquisitions/* and portal
│   │   ├── marketing/                 # /marketing/*
│   │   ├── public/                    # /revenue-audit, /onboard/:token, unauth
│   │   ├── Auth.tsx, SetPassword.tsx  # auth flows
│   │   ├── Dashboard.tsx, Plan.tsx …  # org pages
│   ├── hooks/
│   │   ├── useAuth.tsx                # THE source of truth for identity
│   │   └── use*.ts                    # feature hooks (useTasks, usePipeline, …)
│   ├── lib/
│   │   ├── tasks.ts                   # ENGINES, task CRUD helpers
│   │   ├── projects.ts                # project CRUD
│   │   ├── revenue.ts                 # revenue-share math (client mirrors of SQL)
│   │   ├── formatters.ts              # $/%/date formatters
│   │   └── utils.ts                   # cn(), tailwind-merge
│   ├── integrations/supabase/
│   │   ├── client.ts                  # single supabase-js instance
│   │   └── types.ts                   # GENERATED — never hand-edit
│   └── assets/                        # imported images/logos
├── supabase/
│   ├── functions/                     # edge functions (Deno)
│   │   └── <name>/index.ts
│   └── migrations/                    # SQL migrations, timestamp-prefixed
├── services/
│   └── composite-worker/              # Node service for headless design rendering
├── public/                            # static (favicon, manifest, OG images)
├── docs/                              # you are here
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

## Rules of thumb

- **Never hand-edit `src/integrations/supabase/types.ts`.** It's regenerated after every migration.
- **`components/ui/`** is shadcn — customize by wrapping, not editing, unless you truly need to change the primitive.
- **Pages import components, not the other way around.** If a component needs page-level state, lift it via props or a hook.
- **`hooks/`** is for reusable logic. If it's only used by one component, keep it in that component's file.
- **`lib/`** is for pure functions. No React imports.
- **Edge functions and migrations are the source of truth for server behavior** — the frontend is a client of them, never a replacement.

## See also

- [`conventions.md`](./conventions.md)
