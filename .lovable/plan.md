## Goal

Remove the Curve Admin approval gatekeeping across the marketing module, then ship the Tier 1 Content Library / design quality improvements (minus the "approved for client use" gate, which is now obsolete).

## Part 1 — Kill the approval workflow

Anyone (org user or Curve Admin) can create, edit, and use designs / emails / campaigns directly. Curve Admin can do everything on behalf of an org.

### Frontend

- **`src/pages/marketing/DesignEditor.tsx`** — remove the "Approval" sidebar card (Submit / Approve / Reject buttons + status pill swap). Designs go straight from `generating` → `ready`. Keep a simple "Use this design" / "Send" CTA. Strip `pending_approval` / `rejected` UI branches.
- **`src/pages/marketing/Designs.tsx`** — remove `pending_approval` and `approved` filter options; status pill stays minimal (`ready` / `generating` / `failed`). Treat any non-failed/generating design as usable.
- **`src/pages/marketing/Emails.tsx`** — drop the `.eq("status", "approved")` filter. Show all non-draft designs. Reword "Design (approved only)" → "Design".
- **`src/pages/marketing/CampaignDetail.tsx`** — remove the "Approval workflow" sidebar block, `submitForApproval`, the `in_review` status, and the `approval_queue` insert. Reduce statuses to `planning / live / completed / archived`.
- **`src/pages/marketing/Campaigns.tsx`** — remove `approved` and `in_review` from filter dropdown / badges.
- **`src/pages/marketing/MarketingHub.tsx`** — remove `pendingApprovals` stat, the "X approvals waiting" CTA, the `approval_queue` query, and the "Approvals" tile from the grid.
- **`src/pages/marketing/ApprovalsQueue.tsx`** — delete file.
- **`src/App.tsx`** — remove `/marketing/approvals` and `/admin/marketing/approvals` routes + import.
- **`src/components/AppShell.tsx`** — remove "Approvals" nav entry (both org and admin sides).
- **`src/components/mobile/mobileRoutes.ts`** — remove approvals route entry.

### Backend / data

- No destructive migration. Leave existing `approval_queue`, `approval_comments`, `designs.status` columns in place so historical rows aren't lost — code just stops reading/writing them.
- `generate-design` edge function: change the final design row write to `status: 'ready'` (was likely `pending_approval`). Verify and patch.

## Part 2 — Tier 1 Content Library quality lift (no approval gate)

### Brand-kit readiness banner

- **`src/pages/marketing/Designs.tsx`** (generator panel): query `org_brand_kits` for the active org. If `logo_primary_url`, `color_primary`, or `font_heading` is missing, render a yellow `Alert` above the generate button: *"Your brand kit is incomplete — add a logo / colors / fonts so generated designs match your brand."* with a link to `/marketing/brand-kit`.

### MediaPicker upgrades

- **`src/components/marketing/MediaPicker.tsx`**:
  - Add a search `Input` (top of the picker) — filters on `title`, `caption`, `body_text`, `ai_tags` (case-insensitive `ilike` + array overlap).
  - Add a tag chip row: top 12 tags from the current org's library; clicking toggles a filter.
  - Add a collections `Select` (loads `org_brand_collections` if present; null = "All collections").
  - Add a large preview pane above/right of the grid showing the currently-selected asset (image/video) plus its title, tags, "used N times".
  - Accept `mode="video"` and `mode="any"` props in addition to `image`. Filter library results to matching `asset_type`.
  - Surface caption snippets when `mode === "snippet"` for textarea pickers.

### Designs slot expansion

- **`src/pages/marketing/Designs.tsx`** (and `DesignEditor.tsx` slot picker if shared): keep Hero / Secondary / Sponsor logo, but make the secondary slot accept video for clip-style templates by passing `mode="any"`.

### Track usage on every generation

- **`supabase/functions/generate-design/index.ts`**: after pulling slot URLs, look up matching `org_brand_assets` rows by URL, then `update used_count = used_count + 1, last_used_at = now()`. Also: when writing the design row, store the slot→asset_id mapping in a new `design_assets_used jsonb` column on `designs` (additive migration).

### Migration

- Single additive migration:
  - `alter table public.designs add column if not exists assets_used jsonb default '[]'::jsonb;`
  - No drops.

## Out of scope (per user)

- "Approved for client use" toggle on assets (obsolete — no approvals).
- Tier 2 / Tier 3 items from prior audit.

## Verification

- Build passes.
- Manual: generate a design as an org user without going through any approval queue; confirm it lands as `ready` and is immediately selectable in Emails.
- Manual: open MediaPicker, type a search term, click a tag chip, see results narrow.
- Manual: confirm `used_count` bumps on the picked asset after generation.