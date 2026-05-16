# Phase 3 — Slot-based migration + auto thumbnails

## Goal
Every template renders through the same slot-based pipeline (Stability background + composite worker overlay), and every template has an auto-generated thumbnail the org picker can show.

## What ships

### 1. Default slot layouts per format
New shared file `supabase/functions/_shared/slotPresets.ts` exporting one solid default `composition_config` per `design_type`:
- `social_post_square` (1080×1080) — the existing Tryout layout, generalized
- `social_post_story` (1080×1920) — stacked vertical
- `social_post_landscape` (1200×630) — split-horizontal
- `email_header` (1200×400) — logo + headline strip
- `flyer_letter` (1275×1650) — top hero, middle details, bottom CTA
- `schedule_graphic` (1080×1080) — header + body slot

Each preset uses `{{token}}` placeholders that resolve via existing `interpolateSpec`: `{{org_name}}`, `{{logo_url}}`, `{{color_primary/accent/dark}}`, plus per-template input fields (`{{headline}}`, `{{event_date}}`, etc.).

### 2. Template migration
One SQL migration:
- For every template where `composition_config IS NULL`, set `generation_engine = 'stability_sharp'` and `composition_config = <preset for its design_type>`.
- Leave `base_prompt` (now used as Stability prompt seed) and `input_fields` as-is.

After this, all 24 templates run the same engine.

### 3. Auto-thumbnail edge function
New `supabase/functions/generate-template-thumbnail/index.ts`:
- Inputs: `template_id`
- Builds placeholder context: generic org name "Sample Sports Club", brand kit (primary `#1E3A5F`, accent `#22C55E`, dark `#0F172A`, a stock logo URL from `brand-assets` bucket), and dummy values for every `input_field` based on its type (sample headline, today's date, etc.).
- Runs the same Stability + composite-worker flow `generate-design` uses.
- Uploads result to `design-renders/_thumbnails/<template_id>.png`, public-signed for 1 year.
- Updates `design_templates.thumbnail_url`.

### 4. Editor UI
In `AdminDesignTemplates.tsx`:
- New "Regenerate Thumbnail" button on each template row + in the editor dialog.
- After successful save of a template, auto-invoke the thumbnail function in the background and toast when done.
- Show current `thumbnail_url` as a preview inside the editor (instead of the now-removed upload field).

### 5. Org picker
Already reads `thumbnail_url` — once Phase 3 backfill runs, every card has a real preview image. No code change needed there.

## What is intentionally out of scope
- Custom per-template hand-tuned layouts beyond the format defaults — admins can edit `composition_config` JSON later (raw editor stays; visual slot editor is Phase 4).
- Removing the `html_css` legacy path from `generate-design` — keeping it as fallback until thumbnails confirm the slot path is stable.
- Cron / batch backfill of thumbnails — first save / explicit "Regenerate" button triggers it; we'll also run it once for all templates after the migration.

## Risks
- Composite worker must be deployed at `COMPOSITE_WORKER_URL`. If the env var is missing, thumbnails fall back to the Stability background only (still useful for picker).
- Stability calls cost ~$0.04 each → 24 templates ≈ $1 for the initial backfill. Acceptable.

Confirm and I'll execute (migration + slot presets + thumbnail function + editor button), then trigger a one-time backfill.