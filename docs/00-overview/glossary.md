# Glossary

Terms that recur across the codebase and the product. Learn them once — table names, function names, and UI copy all lean on them.

| Term | Meaning |
|---|---|
| **Org / Organization** | A customer entity (`organizations` table). Each has one primary user and any number of peers. |
| **Primary user** | The org's main contact. `organizations.primary_user_id`. Only they see the `Customize` gate before intake. |
| **Curve** | The operator. Users with `user_roles.role = 'admin'` are Curve consultants. |
| **Module** | One of the product lines available to an org: `allegiance`, `acquisitions`. Stored in `profiles.module_access`. |
| **Engine** | One of six growth pillars scored during intake: `Fundraising`, `Sponsorship`, `Marketing`, `Operations`, `Platform`, `Community`. See `ENGINES` in `src/lib/tasks.ts`. |
| **Score** | Integer 1–10 per engine, stored in `derived_metrics.<engine>_score`. Computed by `calc-metrics` edge function. |
| **Priority engine** | The single engine surfaced to the org as "focus here first." `derived_metrics.priority_engine`. |
| **Fastest-path engines** | Engines flagged as quick wins for immediate impact. `derived_metrics.fastest_path_engines text[]`. |
| **Intake** | The long-form assessment questionnaire (`organization_intake` — 100+ columns). Feeds `calc-metrics`. |
| **Derived metrics** | Everything the app computes from intake + activity: engine scores, priority engine, calculated total revenue, platform/marketing task ratios. |
| **Plan** | The set of `org_tasks` rows for an org. Auto-generated from `task_templates` matched to the org's engine scores. |
| **Task template** | Reusable task blueprint in `task_templates`, keyed by engine and score-band. |
| **Draft task** | `org_tasks.plan_status = 'draft'`. Not visible to the org — admin must approve. |
| **Approved plan** | `organizations.plan_activated_at` is set. Draft tasks flip to `active`, Projects tab unlocks. |
| **Project** | A wave of tasks the admin releases together (`org_projects`). Org only sees tasks whose `project_id` belongs to an `active` project. |
| **Phase** | A gate within a project. `org_tasks.phase` integer; earlier-phase tasks must complete before later phases unlock (`task_phase_is_unlocked`). |
| **Baseline** | The revenue number the engagement started at. `org_engagement_baselines.baseline_revenue`. Set in the `BaselineModal` during first plan approval. |
| **Contract value** | Amount the org agreed to pay Curve for the engagement (`org_engagement_contracts.contract_value`). |
| **Recovery threshold** | The amount of new revenue that must accumulate before Curve starts earning a share. Equals contract value. |
| **Curve share** | 25% of new revenue generated *above* the recovery threshold. |
| **New revenue** | Any row in `org_revenue_entries` — includes sponsorship deals auto-synced from `sponsorship_leads` via `sync_sponsorship_to_revenue` trigger. |
| **Tier / Sponsorship tier** | A packaged sponsorship offer (`org_sponsorship_tiers`). Admin-approved. |
| **Warm lead** | Sponsorship lead the org marked as high-signal (`sponsorship_leads.is_warm`). Prioritized in views. |
| **Segment** | Contact filter (`org_contact_segments`). System segments (All Contacts, All Families…) are seeded per-org; team segments are auto-created for each team. |
| **Send platform** | Where a marketing send goes out (`org_send_platforms`) — Curve email, org's own connected Gmail/M365, SMS, social. |
| **Sequence** | A pre-built multi-step campaign template (`campaign_sequence_templates`) that admins can launch into an org. |
| **NPS survey** | Post-season promoter/passive/detractor survey (`org_nps_surveys` + `org_nps_responses`). Auto-categorized by trigger. |
| **Portal (acquisitions)** | Access surface for a target's leadership (`acquisition_portal_users` + `seller_portal` role). |
| **Workstream** | A functional area of an acquisition project — `integration`, `financial`, `legal`, `hr_culture`, `marketing`, `testing`, `it`, `data_assets`, `compliance`. Percent-complete per workstream rolls up on the project row. |
| **Compliance item** | A single requirement (background check, concussion training…) assigned to acquisition staff. |
| **Rollup** | Weekly digest snapshot (`acquisition_weekly_rollups`, `org_marketing_summary`, `curve_portfolio_summary`). |
| **pgmq** | Postgres Message Queue extension. Used for `q_auth_emails` and `q_transactional_emails`. |
| **Composite worker** | The Node service in `services/composite-worker/` that renders design compositions headlessly. |

## See also

- [`../03-architecture/data-model.md`](../03-architecture/data-model.md)
- [`../03-architecture/task-plan-engine.md`](../03-architecture/task-plan-engine.md)
