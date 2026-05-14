import { supabase } from "@/integrations/supabase/client";

export type MediaItem = {
  id: string;
  org_id: string;
  asset_type: string;
  media_type: "image" | "video" | "text" | "document";
  mime_type: string | null;
  url: string;
  poster_url: string | null;
  thumbnail_url: string | null;
  filename: string | null;
  caption: string | null;
  alt_text: string | null;
  title: string | null;
  body_text: string | null;
  tags: string[] | null;
  ai_tags: string[] | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  uploaded_at: string;
  archived: boolean;
};

const IMAGE_MAX = 12 * 1024 * 1024; // 12 MB
const VIDEO_MAX = 100 * 1024 * 1024; // 100 MB

function detectMediaType(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

async function probeImage(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}

async function probeVideo(file: File): Promise<{ width: number; height: number; duration: number; posterBlob: Blob | null }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const finalize = (width: number, height: number, duration: number, posterBlob: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve({ width, height, duration, posterBlob });
    };

    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      const d = isFinite(video.duration) ? video.duration : 0;
      // Seek to 0.1s to grab a poster frame
      video.currentTime = Math.min(0.1, d);
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return finalize(w, h, d, null);
          ctx.drawImage(video, 0, 0, w, h);
          canvas.toBlob((blob) => finalize(w, h, d, blob), "image/jpeg", 0.8);
        } catch {
          finalize(w, h, d, null);
        }
      };
    };
    video.onerror = () => finalize(0, 0, 0, null);
  });
}

export async function uploadMediaFile(
  file: File,
  orgId: string,
  opts: { asset_type?: string } = {}
): Promise<MediaItem | null> {
  const mediaType = detectMediaType(file);
  if (!mediaType) throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  if (mediaType === "image" && file.size > IMAGE_MAX) throw new Error(`Image must be under 12 MB`);
  if (mediaType === "video" && file.size > VIDEO_MAX) throw new Error(`Video must be under 100 MB`);

  const ext = file.name.split(".").pop()?.toLowerCase() || (mediaType === "video" ? "mp4" : "jpg");
  const id = crypto.randomUUID();
  const path = `${orgId}/media/${id}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("brand-assets")
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("brand-assets").getPublicUrl(path);
  const url = pub.publicUrl;

  let width = 0;
  let height = 0;
  let duration: number | null = null;
  let posterUrl: string | null = null;

  if (mediaType === "image") {
    const dims = await probeImage(file);
    width = dims.width;
    height = dims.height;
  } else {
    const probed = await probeVideo(file);
    width = probed.width;
    height = probed.height;
    duration = probed.duration;
    if (probed.posterBlob) {
      const posterPath = `${orgId}/media/${id}_poster.jpg`;
      const { error: posterErr } = await supabase.storage
        .from("brand-assets")
        .upload(posterPath, probed.posterBlob, { contentType: "image/jpeg", upsert: false });
      if (!posterErr) {
        posterUrl = supabase.storage.from("brand-assets").getPublicUrl(posterPath).data.publicUrl;
      }
    }
  }

  const { data, error } = await supabase
    .from("org_brand_assets")
    .insert({
      org_id: orgId,
      asset_type: opts.asset_type || (mediaType === "video" ? "video" : "photo"),
      media_type: mediaType,
      mime_type: file.type || null,
      url,
      poster_url: posterUrl,
      filename: file.name,
      width: width || null,
      height: height || null,
      duration_seconds: duration,
      file_size_bytes: file.size,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MediaItem;
}

export function formatDuration(seconds: number | null): string {
  if (!seconds || !isFinite(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
