// Browserless.io provider (stub). Activate by setting BROWSERLESS_API_TOKEN secret.
// When the token is set, render-design/index.ts auto-routes here instead of the puppeteer stub.
import type { RenderProvider, RenderRequest, RenderResult } from "../types.ts";

export class BrowserlessProvider implements RenderProvider {
  name = "browserless";
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async render(req: RenderRequest): Promise<RenderResult> {
    const start = performance.now();
    const endpoint =
      req.format === "pdf"
        ? `https://chrome.browserless.io/pdf?token=${this.token}`
        : `https://chrome.browserless.io/screenshot?token=${this.token}`;

    const body =
      req.format === "pdf"
        ? { html: req.html, options: { width: `${req.width}px`, height: `${req.height}px`, printBackground: true } }
        : {
            html: req.html,
            viewport: { width: req.width, height: req.height, deviceScaleFactor: req.scale },
            options: { type: req.format, fullPage: false, omitBackground: false },
            waitFor: req.waitForFonts ? 1500 : 500,
          };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`Browserless ${resp.status}: ${await resp.text()}`);
    const buf = new Uint8Array(await resp.arrayBuffer());
    return {
      buffer: buf,
      contentType: req.format === "pdf" ? "application/pdf" : req.format === "jpg" ? "image/jpeg" : "image/png",
      sizeBytes: buf.byteLength,
      renderTimeMs: performance.now() - start,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const r = await fetch(`https://chrome.browserless.io/pressure?token=${this.token}`);
      return r.ok;
    } catch {
      return false;
    }
  }
}
