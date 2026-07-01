# Curve OS — Engineering & Product Documentation

Welcome. This `/docs` tree is the single source of truth for onboarding a new development team onto Curve OS (the app served at **os.curvesports.com**). It is written for senior React/TypeScript engineers who already know Postgres and row-level security but have not seen this codebase.

## How to read this in your first week

**Day 1 — Product context**
1. [`00-overview/product-overview.md`](./00-overview/product-overview.md)
2. [`00-overview/modules-map.md`](./00-overview/modules-map.md)
3. [`00-overview/glossary.md`](./00-overview/glossary.md)
4. [`01-user-guide/roles-and-access.md`](./01-user-guide/roles-and-access.md)

**Day 2 — See it from every seat**
- [`01-user-guide/admin-workflows.md`](./01-user-guide/admin-workflows.md)
- [`01-user-guide/org-user-workflows.md`](./01-user-guide/org-user-workflows.md)
- [`01-user-guide/acquisitions-workflows.md`](./01-user-guide/acquisitions-workflows.md)
- [`01-user-guide/revenue-audit-workflows.md`](./01-user-guide/revenue-audit-workflows.md)
- [`01-user-guide/marketing-hub.md`](./01-user-guide/marketing-hub.md)
- [`01-user-guide/communications.md`](./01-user-guide/communications.md)
- [`01-user-guide/seller-portal-workflows.md`](./01-user-guide/seller-portal-workflows.md)

**Day 3 — Get the app running**
- [`02-technical-guide/stack.md`](./02-technical-guide/stack.md)
- [`02-technical-guide/local-setup.md`](./02-technical-guide/local-setup.md)
- [`02-technical-guide/repo-layout.md`](./02-technical-guide/repo-layout.md)
- [`02-technical-guide/conventions.md`](./02-technical-guide/conventions.md)

**Day 4 — Understand the wiring**
- [`02-technical-guide/routing.md`](./02-technical-guide/routing.md)
- [`02-technical-guide/auth-and-onboarding.md`](./02-technical-guide/auth-and-onboarding.md)
- [`02-technical-guide/data-access-patterns.md`](./02-technical-guide/data-access-patterns.md)
- [`02-technical-guide/rls-and-grants.md`](./02-technical-guide/rls-and-grants.md)
- [`02-technical-guide/edge-functions.md`](./02-technical-guide/edge-functions.md)
- [`02-technical-guide/email-system.md`](./02-technical-guide/email-system.md)
- [`02-technical-guide/background-jobs.md`](./02-technical-guide/background-jobs.md)
- [`02-technical-guide/integrations.md`](./02-technical-guide/integrations.md)
- [`02-technical-guide/testing.md`](./02-technical-guide/testing.md)
- [`02-technical-guide/coding-agents.md`](./02-technical-guide/coding-agents.md)

**Day 5 — Zoom out to architecture**
- [`03-architecture/system-diagram.md`](./03-architecture/system-diagram.md)
- [`03-architecture/data-model.md`](./03-architecture/data-model.md)
- [`03-architecture/module-boundaries.md`](./03-architecture/module-boundaries.md)
- [`03-architecture/task-plan-engine.md`](./03-architecture/task-plan-engine.md)
- [`03-architecture/revenue-share-engine.md`](./03-architecture/revenue-share-engine.md)
- [`03-architecture/sponsorship-engine.md`](./03-architecture/sponsorship-engine.md)
- [`03-architecture/marketing-engine.md`](./03-architecture/marketing-engine.md)
- [`03-architecture/acquisitions-engine.md`](./03-architecture/acquisitions-engine.md)
- [`03-architecture/revenue-audit-funnel.md`](./03-architecture/revenue-audit-funnel.md)
- [`03-architecture/security-model.md`](./03-architecture/security-model.md)
- [`03-architecture/storage.md`](./03-architecture/storage.md)
- [`03-architecture/deployment.md`](./03-architecture/deployment.md)
- [`03-architecture/observability.md`](./03-architecture/observability.md)
- [`03-architecture/known-gotchas.md`](./03-architecture/known-gotchas.md)

**Then, when the first tickets land**
- [`04-runbooks/`](./04-runbooks/) — step-by-step for the operations you'll actually run.

## Nomenclature — read this once, then apply it everywhere

- The backend is **Lovable Cloud** in customer- and admin-facing copy. Internally you'll see Postgres, RLS, pgmq, and edge functions — those names are fine in dev docs and code, but never in the app UI.
- "Org" = a customer organization (a club, association, event).
- "Curve" = us — the operator of the platform.
- "Engine" = one of the six growth pillars scored by the assessment (see the glossary).
- "Plan" = the auto-generated list of tasks derived from an org's intake.
- "Project" = a wave of tasks the admin releases to the org.

## What is deliberately not in this repo

- No mobile app — the UI is responsive web only.
- No custom server. Everything server-side runs as a Postgres function, edge function, or the small `services/composite-worker` on Railway (used only for headless design rendering).
- No third-party analytics SDK. Product analytics that matter are computed inside Postgres and read from `derived_metrics`, `curve_portfolio_summary`, and per-engine summary tables.
