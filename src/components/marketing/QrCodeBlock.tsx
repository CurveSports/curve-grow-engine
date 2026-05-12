import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function QrCodeBlock({
  value,
  color = "#0F172A",
  bgColor = "#FFFFFF",
  size = 240,
  filename = "qr-code.png",
  caption,
}: {
  value: string;
  color?: string;
  bgColor?: string;
  size?: number;
  filename?: string;
  caption?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: color, light: bgColor },
    }).then(() => {
      try { setDataUrl(canvasRef.current!.toDataURL("image/png")); } catch { /* noop */ }
    });
  }, [value, color, bgColor, size]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div className="inline-flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-background">
      <canvas ref={canvasRef} className="rounded" />
      {caption && <p className="text-xs text-muted-foreground max-w-[240px] truncate">{caption}</p>}
      <Button size="sm" variant="outline" onClick={download} disabled={!dataUrl}>
        <Download className="h-3 w-3 mr-1" /> PNG
      </Button>
    </div>
  );
}
