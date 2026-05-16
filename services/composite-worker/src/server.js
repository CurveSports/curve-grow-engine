import express from 'express';
import sharp from 'sharp';

const app = express();
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 8080;
const AUTH_TOKEN = process.env.WORKER_AUTH_TOKEN || '';

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function specToSvg(canvas, layers) {
  const { width, height } = canvas;
  const parts = [];
  for (const l of layers) {
    if (l.type === 'rect') {
      const opacity = l.opacity ?? 1;
      const radius = l.radius ?? 0;
      parts.push(
        `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" rx="${radius}" ry="${radius}" fill="${l.fill || '#000'}" fill-opacity="${opacity}"/>`
      );
    } else if (l.type === 'text') {
      const font = l.font || 'Inter, Arial, sans-serif';
      const weight = l.weight || 600;
      const size = l.size || 32;
      const color = l.color || '#fff';
      const anchor = l.align === 'center' ? 'middle' : l.align === 'right' ? 'end' : 'start';
      parts.push(
        `<text x="${l.x}" y="${l.y}" font-family="${font}" font-weight="${weight}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${escapeXml(l.text || '')}</text>`
      );
    }
    // 'image' layers are handled outside SVG via sharp.composite
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.post('/composite', async (req, res) => {
  try {
    if (AUTH_TOKEN) {
      const auth = req.headers.authorization || '';
      if (auth !== `Bearer ${AUTH_TOKEN}`) {
        return res.status(401).json({ error: 'unauthorized' });
      }
    }

    const { background_url, background_color, composition_spec, output_format = 'png' } = req.body || {};
    if ((!background_url && !background_color) || !composition_spec?.canvas) {
      return res.status(400).json({ error: 'background_url or background_color and composition_spec.canvas required' });
    }

    const { canvas, layers = [] } = composition_spec;

    let pipeline;
    if (background_url) {
      const bgBuf = await fetchBuffer(background_url);
      pipeline = sharp(bgBuf).resize(canvas.width, canvas.height, { fit: 'cover' });
    } else {
      // Solid-color canvas (user_photo mode — no AI background)
      pipeline = sharp({
        create: {
          width: canvas.width,
          height: canvas.height,
          channels: 4,
          background: background_color,
        },
      });
    }

    const composites = [];

    // 1. Image layers (logo, etc.)
    for (const l of layers.filter((x) => x.type === 'image')) {
      try {
        const imgBuf = await fetchBuffer(l.url);
        let img = sharp(imgBuf);
        if (l.width || l.height) {
          img = img.resize(l.width || null, l.height || null, { fit: 'inside' });
        }
        composites.push({ input: await img.png().toBuffer(), top: l.y | 0, left: l.x | 0 });
      } catch (e) {
        console.warn('image layer failed:', l.url, e.message);
      }
    }

    // 2. SVG overlay for rects + text
    const svg = specToSvg(canvas, layers.filter((x) => x.type !== 'image'));
    composites.push({ input: Buffer.from(svg), top: 0, left: 0 });

    pipeline = pipeline.composite(composites);

    const out =
      output_format === 'jpeg' || output_format === 'jpg'
        ? await pipeline.jpeg({ quality: 92 }).toBuffer()
        : await pipeline.png().toBuffer();

    res.set('Content-Type', output_format === 'jpeg' || output_format === 'jpg' ? 'image/jpeg' : 'image/png');
    res.send(out);
  } catch (err) {
    console.error('composite error:', err);
    res.status(500).json({ error: err.message || 'internal' });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`composite-worker listening on 0.0.0.0:${PORT}`));
