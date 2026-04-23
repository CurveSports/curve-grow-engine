// Lightweight dominant-color extractor — no dependencies.
// Returns up to N representative colors from an image URL, sorted by visual weight.
// Filters out near-white/near-black/near-transparent pixels, then buckets remaining pixels
// into a 6×6×6 RGB cube and picks the most populated buckets.

export interface ExtractedColor {
  hex: string;
  hsl: string; // "H S% L%"
  population: number;
}

function rgbToHex(r: number, g: number, b: number) {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export async function extractColors(imageUrl: string, count = 6): Promise<ExtractedColor[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxDim = 120;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.floor(img.width * scale));
      const h = Math.max(1, Math.floor(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      let data: Uint8ClampedArray;
      try { data = ctx.getImageData(0, 0, w, h).data; }
      catch (err) { return reject(err); }

      const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 200) continue;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        // skip near-white / near-black / fully grey
        if (max > 240 && min > 230) continue;
        if (max < 25) continue;
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat < 0.12 && (max < 60 || max > 200)) continue;
        // 6x6x6 bucket
        const key = (Math.floor(r / 43) << 8) | (Math.floor(g / 43) << 4) | Math.floor(b / 43);
        const cur = buckets.get(key);
        if (cur) { cur.r += r; cur.g += g; cur.b += b; cur.n++; }
        else buckets.set(key, { r, g, b, n: 1 });
      }
      const arr = Array.from(buckets.values())
        .map(({ r, g, b, n }) => ({ r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, count * 2);

      // Deduplicate similar colors
      const result: ExtractedColor[] = [];
      for (const c of arr) {
        const tooClose = result.some((rc) => {
          const m = rc.hex.match(/#(..)(..)(..)/);
          if (!m) return false;
          const dr = parseInt(m[1], 16) - c.r, dg = parseInt(m[2], 16) - c.g, db = parseInt(m[3], 16) - c.b;
          return Math.sqrt(dr * dr + dg * dg + db * db) < 35;
        });
        if (tooClose) continue;
        const { h: hh, s: ss, l: ll } = rgbToHsl(c.r, c.g, c.b);
        result.push({
          hex: rgbToHex(c.r, c.g, c.b),
          hsl: `${hh} ${ss}% ${ll}%`,
          population: c.n,
        });
        if (result.length >= count) break;
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = imageUrl;
  });
}

// Pick best primary (darkest, saturated) and accent (most vibrant) from extracted set
export function suggestPrimaryAccent(colors: ExtractedColor[]): { primary?: ExtractedColor; accent?: ExtractedColor } {
  if (colors.length === 0) return {};
  const parsed = colors.map((c) => {
    const m = c.hsl.match(/^(\d+) (\d+)% (\d+)%$/)!;
    return { ...c, h: +m[1], s: +m[2], l: +m[3] };
  });
  // Primary: darkest with reasonable saturation
  const primary = [...parsed].sort((a, b) => {
    const aScore = a.l - (a.s > 30 ? 0 : 20);
    const bScore = b.l - (b.s > 30 ? 0 : 20);
    return aScore - bScore;
  })[0];
  // Accent: most saturated, mid-light
  const accent = [...parsed].filter((c) => c.hex !== primary.hex).sort((a, b) => {
    const aScore = a.s - Math.abs(a.l - 50);
    const bScore = b.s - Math.abs(b.l - 50);
    return bScore - aScore;
  })[0] ?? primary;
  return { primary, accent };
}
