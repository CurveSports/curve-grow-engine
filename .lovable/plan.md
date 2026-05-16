# Premium Design Templates — Build Plan

Replace the current Fabric.js clip-art output with a real template system: **5 hand-built variants per type × 4 types = 20 skins**, with AI-generated hero imagery on the two photo-driven types.

## Scope (4 template types)

1. **College Commit** — hero player cutout + school colors + seal/wordmark
2. **GameDay** — hero player/team cutout + opponent + date/time
3. **Lineup Card** — typographic, position grid, team mark (no AI hero)
4. **Tryout Announcement** — date/location/age groups, typographic flyer (no AI hero)

## Architecture

```text
Template Registry (TS)
  ├── 20 SkinDefinition objects
  │     ├── id, type, name, thumbnail
  │     ├── canvas size + safe zones
  │     ├── layered render fn (background → hero → overlays → text → marks)
  │     └── field schema (player name, position, date, etc.)
  │
  ├── Brand Kit injector
  │     ├── reads org colors/logos/fonts
  │     └── themes every skin at render time
  │
  └── AI Hero pipeline (Commit + GameDay only)
        ├── prompt builder (style modifier + seed + brand colors)
        ├── Lovable AI image gen (Gemini image preview)
        ├── @imgly/background-removal in browser
        └── cached to Supabase storage per design
```

## What gets built

### 1. Template registry (`src/lib/designTemplates/skins/`)
- `commit/` — 5 files: `seal.ts`, `wordmark.ts`, `stadiumDuotone.ts`, `topoMap.ts`, `editorial.ts`
- `gameday/` — 5 files: `modernSplit.ts`, `retroBadge.ts`, `brutalistType.ts`, `cinematic.ts`, `scoreboardGrid.ts`
- `lineup/` — 5 files: `cleanGrid.ts`, `brokenGrid.ts`, `editorial.ts`, `chalkboard.ts`, `numbersDominant.ts`
- `tryout/` — 5 files: `bold.ts`, `vintage.ts`, `minimal.ts`, `industrial.ts`, `posterArt.ts`

Each exports a `SkinDefinition`:
```ts
{ id, type, name, thumbnailUrl, canvas:{w,h}, fields:FieldSchema[], render:(ctx, data, brandKit) => void }
```

### 2. Athletic typography
- Install: `@fontsource/bebas-neue`, `@fontsource/oswald`, `@fontsource/anton`, `@fontsource/archivo-black`, `@fontsource/jetbrains-mono` (Druk/Industry alternatives — true Druk requires paid license)
- Import in `src/main.tsx`
- Wire into Fabric.js font registry

### 3. AI hero pipeline
- New edge function `generate-design-hero`: takes `{ skinId, prompt, brandColors, seed, photoUrl? }`, calls Lovable AI image gen with style-modifier randomization, returns image URL
- New util `removeBackground.ts` using `@imgly/background-removal` for in-browser cutouts
- Cache results in `design-assets` storage bucket keyed by design id

### 4. Editor UX (`src/pages/marketing/designs/FabricEditor.tsx`)
- Replace current template picker with **5-thumbnail variant carousel** per type
- Add "Regenerate hero" button (Commit/GameDay only) — re-rolls AI image with new seed
- Add style modifier dropdown ("Gritty / Clean / Retro / Cinematic / Editorial") feeding the AI prompt
- Brand kit auto-applies — user can override colors per-design

### 5. Schema updates
- `designs` table: add `skin_id` (text), `hero_image_url` (text), `hero_seed` (text), `style_modifier` (text), `field_values` (jsonb)
- New `design-assets` storage bucket (public read, authed write)
- Drop / migrate the old `composition_config` workflow that broke earlier

### 6. Data wiring
- `useBranding` already returns colors/logos — pass into render fn
- For sport-specific data (baseball positions: P, C, 1B…), seed lineup skins with baseball defaults

## What this gets you

- **Variety**: 20 distinct skins × random AI seed × brand-kit theming = effectively unlimited unique outputs. No two orgs' GameDay posts will look the same.
- **Quality ceiling**: Commit/GameDay ~80% of Alabama/Sac State reference quality (limited by AI image gen consistency). Lineup/Tryout ~95% (deterministic).
- **No external editor**: stays inside Fabric.js, so existing export/share/download paths keep working.

## What this is NOT

- Not pixel-perfect Canva. AI hero shots will occasionally need a re-roll.
- Not real Druk/Industry fonts (licensing). Bebas/Anton/Archivo Black are the closest free analogues.
- Not a real-time collaborative editor.

## Build order (suggested phasing)

1. Migration + storage bucket + font install (foundation)
2. Edge function `generate-design-hero` + background-removal util
3. Build 1 skin per type end-to-end (proves the pattern)
4. Build remaining 16 skins
5. Wire variant carousel + style modifier + regenerate UX
6. QA pass: render every skin with 3 brand kits to verify theming

## Risks / things to flag

- **Cost**: AI hero on Commit + GameDay = ~$0.02–0.05/render. At scale (1000+/mo) this is meaningful — we should cache aggressively and not re-roll on every edit.
- **Background removal**: `@imgly/background-removal` is ~5MB WASM. Loads lazy on first use; fine for desktop, slow on mobile.
- **20 skins is real design work**. Even with the same renderer abstraction, each skin needs distinct composition decisions. Realistic cycle: ~1–2 hours per skin = 20–40 build hours.

Ready to start with phase 1 (foundation) when you approve.