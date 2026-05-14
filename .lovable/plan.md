# Round 15 — Hybrid Image Generation Engine

This is a big architectural shift. Before I write code, I want to flag a few decisions that materially affect scope, cost, and reliability — because getting them wrong wastes a lot of work.

## Open questions I need answered first

1. **Sharp in Supabase Edge Functions.** Sharp is a native Node binary. It does **not** run in Deno edge runtime out of the box. The `npm:sharp` import in your spec will fail at deploy. Realistic options:
   - **A. Use `@jsquash/png` + `resvg-wasm` + `canvaskit-wasm`** — pure WASM, works in Deno, but text rendering is fiddlier than sharp.
   - **B. Use Photon (`@silvia-odwyer/photon`)** — Rust→WASM image lib, fast, no SVG/text rendering (would need a separate SVG rasterizer).
   - **C. Run compositing on a tiny Fly.io / Railway service** with real sharp. Adds ~$5/mo but is rock solid and matches your spec exactly.
   - **D. Composite on Stability's side** — they don't really do this; not viable.
   
   My recommendation: **C (Fly.io worker)**. It's the only path that delivers the spec as written without weeks of WASM workarounds. Edge function calls the worker over HTTPS, worker returns the composited PNG.
   
   **Which option do you want?**

2. **Replace vs. coexist.** The spec says "replaces the existing HTML/CSS system" but also says "existing designs preserved as-is, fall back to HTML/CSS if no key." Confirm: new generations always use Stability when key is present, old designs untouched, no migration of existing designs. ✅ Assumed yes.

3. **25 templates.** Authoring 25 production-quality `composition_config` JSON blobs is the bulk of the visible quality. I will ship 1 polished example (Tryout Square) end-to-end, plus stub configs for the other 24 that work but need tuning. You then approve the example and I batch-author the rest in a follow-up. **OK?**

4. **Stability key.** I'll request `STABILITY_API_KEY` via the secrets tool when we're ready to wire. Until then, system stays on the existing HTML/CSS path (already working).

5. **Refine-via-Claude parser.** Adds another LLM hop on every refinement. Cheap but slower. Confirm you want this vs. just exposing structured controls (sliders / dropdowns) for layout tweaks. I'd lean structured controls + keep one freeform "describe a change" box that uses Claude. ✅ Assumed.

## Plan (assuming Option C for sharp + answers above)

### Phase 1 — Schema + integration registry (this round)
- Migration: extend `designs` (`generation_engine`, `stability_prompt`, `stability_image_url`, `stability_seed`, `composition_spec`, `generation_time_ms`) and `design_templates` (`stability_prompt_template`, `composition_config`, `generation_engine`, `stability_model`, `mood`).
- Insert `stability_ai` row into `system_integrations`.
- Wiring-status page already reads from that table — no UI work needed.

### Phase 2 — Provider + prompt builder (edge function only, no compositing yet)
- New file `supabase/functions/_shared/stability.ts`: `callStabilityAI({ prompt, negativePrompt, aspectRatio, model, seed })`.
- New file `supabase/functions/_shared/buildStabilityPrompt.ts`: assembles prompt from template + brand kit + inputs.
- Update `generate-design` to branch: if `STABILITY_API_KEY` present AND template has `generation_engine='stability_sharp'`, call Stability, store raw background as `stability_image_url`, **skip compositing for now**, set `preview_url = stability_image_url`. This proves the pipeline end-to-end before we add the worker.

### Phase 3 — Composition worker (Fly.io)
- New `services/composite-worker/` directory in repo (Node + Express + sharp).
- One endpoint: `POST /composite` → takes `{ background_url, composition_spec, brand_kit, user_inputs }` → returns PNG bytes.
- Implements the full sharp logic from §15.6 (overlays, logo, text-via-SVG, CTA, accent bar).
- Dockerfile + `fly.toml`. You deploy with `fly deploy` (I'll prep everything, you run one command). Add `COMPOSITE_WORKER_URL` and `COMPOSITE_WORKER_TOKEN` secrets.

### Phase 4 — Wire compositing into `generate-design`
- After Stability returns background, POST to worker, store final PNG to `design-renders` bucket, set `preview_url`.
- Add `composite-image` and `regenerate-background` edge functions per spec.
- Update `render-design` to add `StabilitySharpProvider` for export scaling (this part works in pure Deno via re-fetch + simple resize call to worker).

### Phase 5 — One polished template
- Update Tryout Announcement (social square) `design_templates` row with full `stability_prompt_template` + `composition_config`.
- QA: generate 3 designs, verify they look like the spec target.

### Phase 6 — Editor UI updates
- `DesignEditor.tsx`: replace iframe with `<img>` + two-phase progress.
- Add "Try different background" button → calls `regenerate-background`.
- Add "Premium quality" toggle.
- Replace freeform refinement textarea with structured controls (overlay opacity slider, text-size dropdown per layer, layout preset dropdown) + keep one freeform box that uses Claude to parse intent into a `composition_spec` patch.

### Phase 7 — Remaining 24 templates (separate round)
Batch-authored after you approve the Tryout example.

## What I'll build right now if you approve

Just **Phase 1** (DB migration + integration registry row) — this is reversible, unblocks everything else, and surfaces the Stability AI row on the wiring-status page so you can add the API key whenever you're ready. Then we'll talk through Q1–Q5 above and proceed.

## Tech notes / risks
- Sharp in Deno edge: **will not work** as written in spec. Worker is the safe path.
- Stability Core latency: 3–6s typical, 10s p95. UI must show progress.
- Negative prompt is essential — without it backgrounds get fake watermark text.
- Existing `render-design` puppeteer stub stays; it just becomes the fallback path.
- Cost: ~$0.03/image Core, ~$5/mo worker, negligible at projected volume.

**Reply with answers to Q1, Q3, Q5 (and confirm Q2/Q4) and I'll start with Phase 1.**
