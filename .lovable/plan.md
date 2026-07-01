
# Docs Package for New Development Team

Create a `/docs` folder in the repo with a structured set of Markdown files that a senior React/TS + Supabase engineer can read straight through to get exhaustive coverage of the product, code, and system. No in-app changes — pure documentation.

## Folder structure

```text
docs/
  README.md                          # Entry point + reading order + glossary
  00-overview/
    product-overview.md              # What Curve OS is, who uses it, business model
    modules-map.md                   # Allegiance vs Acquisitions vs Revenue Audit, module_access gating
    glossary.md                      # Org, Engine, Plan, Project, Phase, Tier, Baseline, Recovery, etc.
  01-user-guide/
    roles-and-access.md              # admin, org_user, seller_portal — what each sees
    admin-workflows.md               # Org list, assignments, intake review, plan review/approve, projects, invites, tier approvals, revenue share, portfolio
    org-user-workflows.md            # Onboarding gates (set password → welcome → customize → intake → dashboard), tasks, marketing, sponsorship, calculators, communications, files, team
    acquisitions-workflows.md        # Project lifecycle, staff onboarding + compliance, documents, meetings, sentiment, portal, rollups
    seller-portal-workflows.md       # What seller_portal role sees
    revenue-audit-workflows.md       # Public /revenue-audit funnel + report + Book-a-Call CTA + iframe embed on curvesports.com
    marketing-hub.md                 # Contacts/segments, campaigns, emails (composer, A/B, NPS), SMS, designs (Fabric), shortlinks, social (Ayrshare), sequences, send-times, brand kit
    communications.md                # Seasons, tracks, calendar, standards, handoffs
  02-technical-guide/
    stack.md                         # React 18, Vite 5, TS 5, Tailwind v3, shadcn, react-router, react-query patterns actually used
    local-setup.md                   # Clone, env vars, bun/npm, dev server, supabase types, running edge functions locally
    repo-layout.md                   # src/pages, components, hooks, lib, integrations, emails, test — annotated tree
    conventions.md                   # Design tokens (index.css semantic tokens, no hardcoded colors), AppShell, curve-* utility classes, formatting helpers, toast usage
    routing.md                       # App.tsx routes, ProtectedRoute, RouteResolver gating logic, mobile routes
    auth-and-onboarding.md           # useAuth, useOnboarding, invite/claim flow, set-password → welcome → customize → intake gates, seller portal routing
    data-access-patterns.md          # supabase client usage, RPC vs table queries, pagination, optimistic updates
    rls-and-grants.md                # user_roles + has_role pattern, current_org_id(), GRANT rules for public schema, examples from this codebase
    edge-functions.md                # Inventory of supabase/functions, invocation patterns, secrets, CORS, service-role usage
    email-system.md                  # pgmq queues (auth + transactional), email_queue_dispatch/wake cron, Resend, MJML templates in src/emails, unsubscribe tokens, suppressed_emails, notify.os.curvesports.com domain
    background-jobs.md               # Composite worker service (services/composite-worker), Railway deploy, token auth, what it renders
    integrations.md                  # Google OAuth (user_email_connections), Ayrshare social, Firecrawl, Stability, Lovable AI Gateway, Resend
    testing.md                       # vitest setup, example.test.ts pattern, adding tests
    coding-agents.md                 # Notes on Lovable-generated code, .lovable/plan.md purpose, when to hand-edit vs prompt
  03-architecture/
    system-diagram.md                # ASCII diagram: browser → Vite SPA → Supabase (Postgres/Auth/Storage/Edge) → Resend / Ayrshare / composite-worker / Lovable AI
    data-model.md                    # Domain-grouped ERD-style tables: Orgs & Users, Intake & Derived Metrics, Tasks & Projects & Templates, Sponsorship, Revenue Share, Marketing (contacts/campaigns/emails/sms/designs), Communications, Acquisitions, Revenue Audit (public leads), NPS, Files
    module-boundaries.md             # How Allegiance / Acquisitions / Marketing / Revenue Share stay isolated via module_access
    task-plan-engine.md              # derived_metrics → task_templates → org_tasks (draft) → admin approval → org_projects (waves) → phase-gated completion; scoring recomputation triggers
    revenue-share-engine.md          # Baselines, contracts, installments, revenue entries, recalculate_revenue_share, portfolio rollups
    sponsorship-engine.md            # Leads → stage history → auto-sync to org_revenue_entries → summary rollups → tier approvals
    marketing-engine.md              # Segments (system + team-derived), send platforms, queue, A/B tests, NPS surveys, shortlink click tracking, designs pipeline (Fabric → composite worker → renders bucket)
    acquisitions-engine.md           # Projects → tasks (workstream %) → staff → compliance items → portal users → weekly rollups; phase auto-advance function
    revenue-audit-funnel.md          # /revenue-audit → submit-revenue-audit edge fn → public_audit_leads → /revenue-audit-report/:token → get_public_audit_report RPC → Book-a-Call
    security-model.md                # RLS strategy, security-definer functions (has_role, current_org_id, is_org_primary, has_module_access), why roles live in user_roles, admin_delete_organization_cascade caveats
    storage.md                       # Buckets (org-logos, brand-assets public; acquisition-documents, design-renders, event-w9s private) and access patterns
    deployment.md                    # Lovable-hosted SPA (os.curvesports.com custom domain), Supabase-managed backend, Railway composite worker, published URL vs preview, iframe embedding
    observability.md                 # edge_function_logs, notification_log, invite_send_log, email_send_log, task_activity_log, portfolio summaries
    known-gotchas.md                 # Never edit supabase/client.ts or types.ts; don't touch auth/storage schemas; GRANTs required on new tables; email domain requirement; module_access must be set for org visibility
  04-runbooks/
    onboarding-a-new-org.md          # Admin creates org → invite primary → org sets password/customize/intake → derived metrics + auto tasks → admin approves plan → releases projects
    approving-a-plan.md              # Draft triage, baseline modal, contract setup, first-time vs subsequent
    running-a-revenue-audit-campaign.md
    diagnosing-email-delivery.md
    diagnosing-rls-permission-errors.md
    rotating-secrets.md
```

## Content approach per file

- Reference depth. Every module gets: purpose, entry-point files, key hooks/components, tables touched, edge functions invoked, RLS/GRANT notes, gotchas.
- Include real file paths with line-anchored references (e.g. `src/pages/RouteResolver.tsx` gating order) and real function names from the DB (`has_role`, `recalculate_revenue_share`, `task_phase_is_unlocked`, etc.).
- Data-model doc groups tables by domain with FK arrows in ASCII, plus a "how a row moves through the system" narrative for the heavy engines (tasks/plan, revenue share, sponsorship, marketing, acquisitions, revenue audit).
- Never mention "Supabase" externally — use "Lovable Cloud / backend" per project convention. Internal technical docs may name Postgres, RLS, pgmq, Resend, Ayrshare, Railway.
- No hardcoded secrets or project IDs in the docs.
- Every doc opens with a one-paragraph "What this covers / Who should read it" header and ends with a "See also" list of sibling docs.

## Process during build

1. Read the full source tree (routes, hooks, edge functions inventory, email templates, composite worker) to make each doc concrete rather than generic.
2. Query the DB for the current table column lists needed for `03-architecture/data-model.md` (read-only).
3. Write all docs in parallel batches by folder.
4. Cross-link aggressively from `docs/README.md` with a suggested 1-week reading order for a new engineer.

## Out of scope

- No code changes to the app itself.
- No new in-app /docs route.
- No auto-generated API reference from the DB — hand-curated summaries only.
