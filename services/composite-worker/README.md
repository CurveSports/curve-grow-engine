# Curve Composite Worker

Node + Express + sharp service that composites brand elements (logo, text, CTA, overlays)
on top of a Stability AI–generated background image.

Called from the `generate-design` Supabase Edge Function once a Stability background is ready.

## Endpoints

- `GET  /health` — liveness probe
- `POST /composite` — body: `{ background_url, composition_spec, brand_kit, output_format? }`
  → returns a PNG (or JPEG) buffer.

Auth: `Authorization: Bearer ${WORKER_AUTH_TOKEN}` (shared secret with the edge function).

## Deploy (Railway)

Railway auto-detects the `Dockerfile` and `railway.json` in this folder.

1. Push this repo to GitHub (if not already).
2. In Railway: **New Project → Deploy from GitHub repo** → select the repo.
3. In the service **Settings**, set **Root Directory** to `services/composite-worker`
   (Railway will then build from this folder's Dockerfile automatically).
4. In **Variables**, add:
   - `WORKER_AUTH_TOKEN` = `<output of: openssl rand -hex 32>`
5. Under **Settings → Networking**, click **Generate Domain** to get a public URL
   (e.g. `https://curve-composite-worker.up.railway.app`).

Then, in Lovable Cloud, add two secrets:
- `COMPOSITE_WORKER_URL` — the Railway public URL from step 5
- `COMPOSITE_WORKER_TOKEN` — same value used for `WORKER_AUTH_TOKEN` above

Subsequent pushes to the connected branch auto-deploy.

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
