// Puppeteer + @sparticuz/chromium provider. Memory-bounded.
// Round 12 stub: returns a placeholder PNG. Activate full puppeteer rendering in a follow-up.
// Reason for stub: @sparticuz/chromium binaries cold-start slowly and OOM in edge functions on complex HTML.
// To enable real rendering later, install puppeteer-core + @sparticuz/chromium and implement the body of render().
import type { RenderProvider, RenderRequest, RenderResult } from "../types.ts";

// 1x1 transparent PNG as placeholder
const PLACEHOLDER_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export class PuppeteerProvider implements RenderProvider {
  name = "puppeteer-stub";

  async render(req: RenderRequest): Promise<RenderResult> {
    const start = performance.now();
    // TODO: Real implementation — launch chromium, set viewport, load HTML, screenshot.
    const bin = Uint8Array.from(atob(PLACEHOLDER_PNG_BASE64), (c) => c.charCodeAt(0));
    return {
      buffer: bin,
      contentType: req.format === "pdf" ? "application/pdf" : req.format === "jpg" ? "image/jpeg" : "image/png",
      sizeBytes: bin.byteLength,
      renderTimeMs: performance.now() - start,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
