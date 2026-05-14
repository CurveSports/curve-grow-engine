## Goal

Treat brand assets like a real media library — images **and** videos — with inline upload from anywhere a design/email/social post is created. Saves once, reusable everywhere. Designs become asset-driven (pick the hero shot, drop a logo override, attach a video for social), not just "fill in text and hope."

## Schema changes (`org_brand_assets`)

Extend the existing table — don't fork it:

- `media_type text` — `'image' | 'video'` (derived from MIME on upload). Old `asset_type` ('photo' | 'logo' | etc.) stays for categorization.
- `mime_type text`
- `width int`, `height int`, `duration_seconds numeric` (video only)
- `file_size_bytes bigint`
- `poster_url text` — auto-generated still frame for videos
- `caption text`, `tags text[]` already exists — keep
- Index on `(org_id, media_type)` for fast filtering

Storage: reuse the existing public `brand-assets` bucket. Path convention: `{org_id}/media/{uuid}.{ext}`. Max video size: 100 MB (Lovable Cloud signed-URL upload from the client, not edge function).

## New "Media Library" page

Rename `Brand Kit → Photos` section to its own top-level **Media** page under Marketing:

- `/marketing/media` (org) and `/admin/orgs/:id/marketing/media`
- Grid of tiles, mixed images + videos. Video tiles show a play badge + duration overlay.
- Filters: All / Images / Videos / Logos. Search by filename/tag/caption.
- Drag-and-drop or click to upload. Multi-file. Progress per file.
- Tile click → side drawer with full preview, rename, tag, alt text/caption, archive, copy URL, download.
- Bulk select for archive/tag.
- Brand Kit's "Photo Library" section becomes a compact recents strip with a "Open Media Library →" link.

## Inline upload in design flow

The current `PhotoSelector` in Designs.tsx is a static grid. Replace with `<MediaPicker mode="image" />` component used in every create flow:

- Top row: **Upload new** button (multi-file) + drag-drop zone overlaid on the grid.
- New uploads stream into the media library and get auto-selected.
- Below: existing assets (most recent first, last 60). "Open library →" link for full browser.
- Each tile shows alt text on hover.
- Optional inline crop (square / 4:5 / 16:9 / 9:16) before save — uses `react-easy-crop`. Result re-uploaded as a derivative, original kept.

Same component, `mode="video"` for SMS/social composers (video as attachment), `mode="any"` for general use.

## Design generation becomes asset-aware

Right now the AI gets a single photo URL. Upgrade the contract:

- Allow picking **1–3 images** per design (hero + secondary + sponsor logo).
- Each picked image is passed to the AI with a role tag: `hero_photo_url`, `secondary_photo_url`, `sponsor_logo_url`.
- The system prompt is updated to compose with multiple images (collage, split panel, sticker overlay) — feeds into the style direction we already shipped.
- If no image is picked, the AI generates a typographic-only design instead of inventing imagery.

## Social/email use of videos

- Email composer: video block inserts a poster image + play overlay that links to a hosted page (we can ship the hosted page in a follow-up; for now, "download / share link" is enough).
- Social post: video assets become attachable to the post; downstream publishing (already on a manual handoff) just bundles the file.
- SMS: out of scope (carriers block video).

## Out of scope (for this pass)

- Server-side video transcoding / thumbnail generation (we'll use the first-frame `<video>` element on the client to grab a poster, upload it alongside).
- AI-driven video generation.
- Stock library / Unsplash integration (can add later — easy hook into `MediaPicker`).

## Build order

1. Migration: extend `org_brand_assets` columns + index.
2. Reusable `<MediaPicker>` component (used in 3+ places) with inline upload.
3. New `/marketing/media` page.
4. Wire `MediaPicker` into Designs creation flow; allow 1–3 image slots.
5. Update `generate-design` to accept multiple image roles and update prompt scaffolding.
6. Replace BrandKit "Photos" section with recents strip + link to Media.
7. Wire `MediaPicker` into Email composer and Social composer (image + video).

## Open questions before I start

1. **3 image slots OK?** Hero + secondary + sponsor logo per design, or simpler with just 1 hero + 1 sponsor logo?
2. **Cropping in upload flow** — worth shipping in v1, or save it for a follow-up?
3. **Stock photo source** later — Unsplash, Pexels, or skip and require user uploads only?
