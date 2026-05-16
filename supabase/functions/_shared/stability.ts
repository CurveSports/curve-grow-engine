// Stability AI client for generating background images.
// Used by generate-design and regenerate-background edge functions.

const STABILITY_CORE_URL = "https://api.stability.ai/v2beta/stable-image/generate/core";
const STABILITY_SD3_URL = "https://api.stability.ai/v2beta/stable-image/generate/sd3";

export const STABILITY_NEGATIVE_PROMPT =
  "text, words, letters, numbers, watermarks, logos, labels, captions, typography, " +
  "ui elements, buttons, website layout, borders, frames, document style, pdf style, " +
  "white background, plain background, simple background, gradient only background, " +
  "blurry, low quality, distorted, amateur";

// Aspect ratios supported by Stability v2beta
export const ASPECT_RATIOS: Record<string, string> = {
  social_post_square: "1:1",
  social_post_story: "9:16",
  social_post_landscape: "16:9",
  email_header: "16:9",       // closest; we crop later
  flyer_letter: "3:4",
  flyer_half: "1:1",
  roster_card: "3:4",
  schedule_graphic: "4:5",
  announcement: "1:1",
  sponsor_recognition: "1:1",
};

export type StabilityModel = "core" | "sd3.5-large" | "ultra";

export interface StabilityCallOpts {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  model?: StabilityModel;
  seed?: number;
}

export interface StabilityResult {
  imageBytes: Uint8Array;
  seed: number;
  finishReason: string;
  costCents: number;
}

const COST_CENTS: Record<StabilityModel, number> = {
  core: 3,
  "sd3.5-large": 7,
  ultra: 8,
};

export async function callStabilityAI(opts: StabilityCallOpts): Promise<StabilityResult> {
  const apiKey = Deno.env.get("STABILITY_API_KEY");
  if (!apiKey) throw new Error("STABILITY_API_KEY not configured");

  const model = opts.model || "core";
  const url = model === "core" ? STABILITY_CORE_URL : STABILITY_SD3_URL;

  const form = new FormData();
  form.append("prompt", opts.prompt);
  form.append("negative_prompt", opts.negativePrompt || STABILITY_NEGATIVE_PROMPT);
  form.append("aspect_ratio", opts.aspectRatio || "1:1");
  form.append("output_format", "png");
  if (opts.seed !== undefined) form.append("seed", String(opts.seed));
  if (model === "sd3.5-large") form.append("model", "sd3.5-large");

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: form,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Stability AI ${resp.status}: ${errText.slice(0, 500)}`);
  }

  const seed = Number(resp.headers.get("seed") || "0");
  const finishReason = resp.headers.get("finish-reason") || "SUCCESS";
  const buf = new Uint8Array(await resp.arrayBuffer());

  return {
    imageBytes: buf,
    seed,
    finishReason,
    costCents: COST_CENTS[model],
  };
}

export async function checkStabilityHealth(): Promise<boolean> {
  const apiKey = Deno.env.get("STABILITY_API_KEY");
  if (!apiKey) return false;
  try {
    const r = await fetch("https://api.stability.ai/v1/engines/list", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    await r.text();
    return r.ok;
  } catch {
    return false;
  }
}

// Remove the background from a photo using Stability's edit endpoint.
// Returns a transparent PNG of the foreground subject. ~2 credits (~$0.02).
export async function removeBackground(imageBytes: Uint8Array): Promise<{ bytes: Uint8Array; costCents: number }> {
  const apiKey = Deno.env.get("STABILITY_API_KEY");
  if (!apiKey) throw new Error("STABILITY_API_KEY not configured");

  const form = new FormData();
  form.append("image", new Blob([imageBytes], { type: "image/png" }), "input.png");
  form.append("output_format", "png");

  const resp = await fetch("https://api.stability.ai/v2beta/stable-image/edit/remove-background", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
    body: form,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Stability remove-bg ${resp.status}: ${errText.slice(0, 500)}`);
  }

  const buf = new Uint8Array(await resp.arrayBuffer());
  return { bytes: buf, costCents: 2 };
}

export async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch image failed ${r.status} for ${url.slice(0, 100)}`);
  return new Uint8Array(await r.arrayBuffer());
}

