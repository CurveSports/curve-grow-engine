## Why the Commit design looks broken

Two separate problems are compounding:

1. **Canvas rendering bug (affects all 3 templates).** The editor sets the canvas backing buffer to 1080×1080 but the visible CSS area to 540×540, while also applying `zoom = 0.5`. The browser then scales the 1080 pixel buffer down to 540 CSS pixels, so you see only the **top-left quadrant** of the design. That's why your screenshot has everything jammed into one corner with empty orange below.

2. **College Commit composition is overcrowded.** Even once the full canvas is visible, the headline (`COMM-/ITTED.` at 320pt) overlaps the athlete name, the school name, and the quote, because too many elements are stacked in the bottom 200px and the headline width exceeds the canvas.

## Step 1 — Fix the canvas cropping bug

File: `src/pages/marketing/designs/FabricEditor.tsx`

- In the canvas init effect, replace the current `setDimensions(..., { cssOnly: true })` + `setZoom(ratio)` pair with a version that resizes the **internal buffer** to 540×540 as well, then applies `setZoom(0.5)`. Net effect: 1080-coord objects render at half size into a 540×540 buffer that CSS displays 1:1.
- In `exportPng`, do the round-trip correctly: resize internal buffer to 1080×1080, `setZoom(1)`, render to dataURL, then restore to 540×540 + `setZoom(0.5)`.
- Remove the `bg-white` wrapper div around the `<canvas>` — the canvas already paints its own background, the wrapper just creates a flash before first paint.

## Step 2 — Rebuild the College Commit layout

File: `src/lib/designTemplates/fabricTemplates.ts`, `collegeCommit.build`.

Target composition (top → bottom, all coords in 1080-space):

```text
┌──────────────────────────────────────────────┐
│ [logo] ATHLETE NAME                  ['26]   │ ← top band
│        SPORT · POSITION                       │
│                                               │
│          ┌──────────────────┐                 │
│          │                  │                 │
│          │  athlete photo   │  full-height,   │
│          │  (cutout, right- │  bleeds R edge  │
│          │   biased)        │                 │
│          └──────────────────┘                 │
│                                               │
│ COMMITTED.                                    │ ← single line, big
│ ──────────                                    │
│ IS COMMITTING TO                              │
│ SCHOOL NAME              [school logo]        │
│ "optional quote"                              │
└──────────────────────────────────────────────┘
```

Concrete changes inside `build`:

- Headline becomes **single-line `COMMITTED.`** at `fontSize 200, width W-120, lineHeight 0.9`, anchored at `top: H-360`. Drop the manual hyphen/break — that was the source of the overlap.
- Move athlete name + sport line into a clean top band (y 50–160), give them `width: W - 280` so they never collide with the class chip.
- Class chip: use `v.class_of` correctly (`'${last2}` only when value exists, else hide chip entirely).
- Stack the bottom block with explicit y-positions and clear gaps:
  - eyebrow `IS COMMITTING TO` at `top: H-200`
  - school name at `top: H-160`, `fontSize 56` (down from 68 — it was wrapping)
  - quote at `top: H-50`, only rendered when non-empty
- Athlete photo: change `rebuild`'s `athlete_photo` branch so the cutout sits **right-biased** (left edge at `W*0.30`, full height) instead of left-biased — leaves room for the headline to anchor bottom-left without the photo behind the text.
- Add a soft vertical gradient under the bottom block (separate `bottom_wash` rect, `top: H*0.55`, `height: H*0.45`, dark→transparent going up) so the headline + school text stay legible regardless of photo content.
- Drop the org logo overlap with school name (move org logo to top-left at y=40, size 60×60, instead of bottom-left at H-80).

## Step 3 — Verify

- Open `/marketing/create` → Design / Flyer → pick College Commit → editor loads.
- Confirm canvas now fills the full 540×540 preview area (no empty space).
- Fill in athlete name + school + class year + drop a cutout photo → all elements visible, nothing overlapping.
- Click Download PNG → file is 1080×1080 and matches what's on screen.
- Sanity-check Game Day and Tryout templates also render full-canvas after the zoom fix.

## Out of scope (separate pass)

- A second Commit variant with a different layout (we only have one Commit skin right now).
- AI hero generation for Commit — still on the backlog from our earlier scoping.
- Visual polish of the right-rail form.

If you want, after this lands I can add 2–3 more Commit variants (split-portrait, full-bleed photo with bottom band, magazine-cover style) so you have variety like we discussed.
