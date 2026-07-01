# Routing

Single `BrowserRouter` in `src/App.tsx`. React Router v6 API.

## Route classes

### Public (no auth)

- `/` — marketing landing
- `/auth`, `/set-password`, `/reset-password`, `/set-password/invite/:token`
- `/revenue-audit`, `/revenue-audit-report/:token`
- `/onboard/:token`

### Authenticated — role decides landing

`RouteResolver` runs when a signed-in user hits `/` and picks:
- `admin` + module `allegiance` → `/admin`
- `admin` + module `acquisitions` only → `/admin/acquisitions`
- `org_user` → `/dashboard`
- `seller_portal` → their portal

### Admin (`role="admin"`, module-gated)

- `/admin` (allegiance) — dashboard
- `/admin/tasks`, `/admin/my-tasks`, `/admin/weekly-focus`, `/admin/roadmap`, `/admin/task-tracker`, `/admin/tasks-this-week`
- `/admin/orgs/:orgId/marketing/*` (`marketing` module) — full mirror of the org's marketing hub
- `/admin/marketing/portfolio`, `/admin/marketing/sequence-templates`, `/admin/marketing/schools`, `/admin/marketing/nps`, `/admin/marketing/audits`
- `/admin/communications`
- `/admin/health`, `/admin/presentations`, `/admin/pipeline`
- `/admin/revenue-share`, `/admin/revenue-share/:orgId`
- `/admin/templates`
- `/admin/users`, `/admin/users/lookup`, `/admin/invite`
- `/admin/revenue-audits`, `/admin/revenue-audits/:id`
- `/admin/system/wiring-status`
- `/admin/acquisitions` (acquisitions) — dashboard, `/settings`, `/compliance`, `/meetings`, `/:id`, `/:id/transcript/:transcriptId`
- `/admin/org/:orgId` — org detail (tabs: Overview, Plan, Projects, Intake, Files, Branding, …)
- `/admin/org/:orgId/projects/:projectId` — project detail with drag/drop
- `/admin/org/:orgId/engine/:engine` — engine focus page
- `/admin/org/:orgId/branding`

### Org (`role="org_user"`)

- `/intake` — onboarding questionnaire
- `/dashboard`, `/plan`
- `/marketing/*` — hub
- `/sponsorships`, `/communications`, `/calculators`, `/files`, `/team`, `/settings`

### Seller portal (`role="seller_portal"`)

- `/portal/seller/:acquisitionId`

## Guards

`ProtectedRoute` wraps every non-public route. Two axes:

```tsx
<ProtectedRoute role="admin" module="allegiance">
  <AdminDashboard />
</ProtectedRoute>
```

- If `loading`, shows spinner.
- If unauthenticated, redirects to `/auth`.
- If wrong role, redirects to that role's landing.
- If missing module, redirects to a module they *do* have.

## Layout

`AppShell` wraps every authenticated screen — the left sidebar + topbar. Public pages render bare. The revenue-audit funnel uses its own dark-themed shell.

## See also

- [`auth-and-onboarding.md`](./auth-and-onboarding.md)
- [`../00-overview/modules-map.md`](../00-overview/modules-map.md)
