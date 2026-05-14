# Curve Composite Worker

Node + Express + sharp service that composites brand elements (logo, text, CTA, overlays)
on top of a Stability AI–generated background image.

Called from the `generate-design` Supabase Edge Function once a Stability background is ready.

## Endpoints

- `GET  /health` — liveness probe
- `POST /composite` — body: `{ background_url, composition_spec, brand_kit, output_format? }`
  → returns a PNG (or JPEG) buffer.

Auth: `Authorization: Bearer ${WORKER_AUTH_TOKEN}` (shared secret with the edge function).

## Deploy (Fly.io)

```bash
cd services/composite-worker
fly launch --no-deploy            # first time only — accept generated app name or use curve-composite-worker
fly secrets set WORKER_AUTH_TOKEN=$(openssl rand -hex 32)
fly deploy
```

Then, in Lovable Cloud, add two secrets:
- `COMPOSITE_WORKER_URL` — e.g. `https://curve-composite-worker.fly.dev`
- `COMPOSITE_WORKER_TOKEN` — same value used in `fly secrets set` above

## Composition spec (v1)

```json
{
  "canvas": { "width": 1080, "height": 1080 },
  "layers": [
    { "type": "image", "url": "https://.../logo.png", "x": 60, "y": 60, "width": 180 },
    { "type": "rect", "x": 0, "y": 720, "width": 1080, "height": 360, "fill": "#000000", "opacity": 0.55 },
    { "type": "text", "text": "FALL TRYOUTS", "x": 60, "y": 800, "font": "Inter", "weight": 800, "size": 88, "color": "#FFFFFF" },
    { "type": "text", "text": "Sept 14 · Memorial Park", "x": 60, "y": 900, "font": "Inter", "weight": 500, "size": 36, "color": "#FFFFFF" },
    { "type": "rect", "x": 60, "y": 960, "width": 320, "height": 80, "fill": "#FF6B35", "radius": 12 },
    { "type": "text", "text": "REGISTER →", "x": 100, "y": 1015, "font": "Inter", "weight": 700, "size": 28, "color": "#FFFFFF" }
  ]
}
```
