// Shared interface for design renderers. New providers implement RenderProvider.
export interface RenderRequest {
  html: string;
  width: number;
  height: number;
  format: "png" | "jpg" | "pdf";
  scale: 1 | 2 | 3;
  waitForFonts?: boolean;
}

export interface RenderResult {
  buffer: Uint8Array;
  contentType: string;
  sizeBytes: number;
  renderTimeMs: number;
}

export interface RenderProvider {
  name: string;
  render(request: RenderRequest): Promise<RenderResult>;
  healthCheck(): Promise<boolean>;
}
