import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft, ChevronRight, Maximize2, FileDown, X, LayoutGrid, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type SlideDef = {
  /** Unique numeric id (1-based for the deck). */
  id: number;
  /** Short name shown on hover and as current title. */
  name: string;
  /** Render function — receives whether the slide is being rendered for PDF (so it can drop interactive bits). */
  render: (ctx: { forPdf?: boolean; fullscreen?: boolean }) => ReactNode;
  /** Body text used for the Document PDF version. Falls back to a snapshot of the visual. */
  pdfText?: () => Array<{ heading?: string; body?: string; bullets?: string[] }>;
};

type Props = {
  presentationLabel: string;        // "Internal Brief" | "Kickoff" etc — shown on PDF cover
  orgName: string;
  slides: SlideDef[];
  /** Optional admin-only edit toggle. */
  editMode?: boolean;
  onToggleEdit?: (next: boolean) => void;
  /** Optional extra controls rendered in the right side of the bar (e.g. Show Scores). */
  extraControls?: ReactNode;
  /** Visual theme for the slide canvas. */
  theme?: "dark" | "light";
};

export function PresentationShell({
  presentationLabel, orgName, slides, editMode, onToggleEdit, extraControls, theme = "dark",
}: Props) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false);
  const [exporting, setExporting] = useState<null | "presentation" | "document">(null);

  const slideRef = useRef<HTMLDivElement | null>(null);
  const offscreenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (active >= slides.length) setActive(0); }, [slides.length, active]);

  const go = useCallback((delta: number) => {
    setActive((i) => Math.max(0, Math.min(slides.length - 1, i + delta)));
  }, [slides.length]);

  // Keyboard nav (only when fullscreen)
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
      else if (e.key === "Escape") { exitFullscreen(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, go]);

  const enterFullscreen = async () => {
    setFullscreen(true);
    try { await document.documentElement.requestFullscreen?.(); } catch {}
  };
  const exitFullscreen = async () => {
    setFullscreen(false);
    setShowThumbs(false);
    try { if (document.fullscreenElement) await document.exitFullscreen?.(); } catch {}
  };
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---------- PDF EXPORT ----------
  const exportPresentationPdf = async () => {
    if (!offscreenRef.current) return;
    setExporting("presentation");
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"), import("jspdf"),
      ]);
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [1280, 720] });
      const wrap = offscreenRef.current;
      // Reveal one slide at a time and screenshot
      const childNodes = Array.from(wrap.children) as HTMLElement[];
      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        node.style.display = "block";
        // tiny tick for layout
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const canvas = await html2canvas(node, {
          backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
          scale: 2, useCORS: true, logging: false,
        });
        node.style.display = "none";
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage([1280, 720], "landscape");
        pdf.addImage(imgData, "JPEG", 0, 0, 1280, 720, undefined, "FAST");
      }
      pdf.save(`${orgName.replace(/[^a-z0-9]+/gi, "-")}-${presentationLabel.replace(/[^a-z0-9]+/gi, "-")}-Presentation.pdf`);
      toast.success("Presentation PDF downloaded");
    } catch (e: any) {
      toast.error("Could not export presentation: " + (e?.message ?? "unknown error"));
    } finally {
      setExporting(null);
    }
  };

  const exportDocumentPdf = async () => {
    setExporting("document");
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
      const margin = 56;
      const width = pdf.internal.pageSize.getWidth() - margin * 2;
      let y = margin;

      const ensure = (h: number) => {
        if (y + h > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          y = margin;
        }
      };
      const writeWrapped = (text: string, size: number, opts: { bold?: boolean; gap?: number } = {}) => {
        pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(text, width) as string[];
        for (const line of lines) {
          ensure(size + 4);
          pdf.text(line, margin, y);
          y += size + 4;
        }
        y += opts.gap ?? 6;
      };

      // Cover header
      pdf.setFillColor(16, 185, 129); // accent green
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 6, "F");
      pdf.setTextColor(15, 23, 42);
      writeWrapped("Curve OS", 10, { bold: true });
      writeWrapped(`${presentationLabel} — ${orgName}`, 22, { bold: true, gap: 14 });
      writeWrapped(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), 10, { gap: 18 });

      slides.forEach((s, idx) => {
        ensure(40);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, y, margin + width, y); y += 16;
        writeWrapped(`Slide ${idx + 1} — ${s.name}`, 16, { bold: true, gap: 8 });
        const sections = s.pdfText?.() ?? [{ body: "(See visual presentation for details.)" }];
        sections.forEach((sec) => {
          if (sec.heading) writeWrapped(sec.heading, 12, { bold: true, gap: 4 });
          if (sec.body) writeWrapped(sec.body, 10, { gap: 6 });
          (sec.bullets ?? []).forEach((b) => writeWrapped(`• ${b}`, 10, { gap: 2 }));
        });
        y += 6;
      });

      pdf.save(`${orgName.replace(/[^a-z0-9]+/gi, "-")}-${presentationLabel.replace(/[^a-z0-9]+/gi, "-")}-Document.pdf`);
      toast.success("Document PDF downloaded");
    } catch (e: any) {
      toast.error("Could not export document: " + (e?.message ?? "unknown error"));
    } finally {
      setExporting(null);
    }
  };

  const current = slides[active];

  // ─────────── FULLSCREEN MODE ───────────
  if (fullscreen) {
    return (
      <div className={cn(
        "fixed inset-0 z-[200] flex flex-col",
        theme === "dark" ? "bg-[#0f172a] text-white" : "bg-white text-foreground",
      )}>
        <button
          onClick={exitFullscreen}
          className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm"
        >
          <X className="h-4 w-4" /> Exit
        </button>

        <div className="flex-1 flex items-center justify-center overflow-auto p-8">
          <div className="w-full max-w-[1400px]">
            {current?.render({ fullscreen: true })}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-4 inset-x-0 flex items-center justify-between px-6 z-10">
          <button
            onClick={() => setShowThumbs((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm"
          >
            <LayoutGrid className="h-4 w-4" /> Thumbnails
          </button>

          <div className="flex items-center gap-3">
            <button onClick={() => go(-1)} disabled={active === 0}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm tabular-nums opacity-80">{active + 1} / {slides.length}</span>
            <button onClick={() => go(1)} disabled={active === slides.length - 1}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="w-[120px]" />
        </div>

        {showThumbs && (
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-black/70 backdrop-blur-sm overflow-y-auto p-3 z-20">
            <p className="text-xs uppercase tracking-wider text-white/60 mb-2 px-1">Slides</p>
            <ul className="space-y-1.5">
              {slides.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => { setActive(i); setShowThumbs(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm",
                      i === active ? "bg-accent text-accent-foreground" : "text-white/80 hover:bg-white/10",
                    )}
                  >
                    <span className="opacity-60 mr-2">{i + 1}.</span>{s.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ─────────── INLINE EDITOR MODE ───────────
  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button size="sm" variant="outline" onClick={() => go(-1)} disabled={active === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <span className="text-sm font-medium tabular-nums whitespace-nowrap">
            Slide {active + 1} of {slides.length}
          </span>
          <Button size="sm" variant="outline" onClick={() => go(1)} disabled={active === slides.length - 1}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <div className="text-sm text-muted-foreground truncate hidden md:block">
            · <span className="text-foreground font-medium">{current?.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {extraControls}
          {onToggleEdit && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-border">
              <Label htmlFor="edit-mode" className="text-xs cursor-pointer">Edit Mode</Label>
              <Switch id="edit-mode" checked={!!editMode} onCheckedChange={onToggleEdit} />
            </div>
          )}
          <Button size="sm" variant="outline" onClick={enterFullscreen}>
            <Maximize2 className="h-4 w-4 mr-1.5" /> Present
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={!!exporting}>
                {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileDown className="h-4 w-4 mr-1.5" />}
                Export PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPresentationPdf}>Presentation PDF (visual)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportDocumentPdf}>Document PDF (text-friendly)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Thumbnail pills */}
      <div className="flex flex-wrap gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            title={s.name}
            onClick={() => setActive(i)}
            className={cn(
              "h-8 min-w-[34px] px-2.5 rounded-full text-xs font-semibold border transition-colors tabular-nums",
              i === active
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-accent/40",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Slide canvas */}
      <div
        ref={slideRef}
        className={cn(
          "rounded-2xl border overflow-hidden",
          theme === "dark" ? "bg-[#0f172a] text-white border-[#1e293b]" : "bg-white text-foreground border-border",
        )}
      >
        <div className="p-6 md:p-10">
          {current?.render({})}
        </div>
      </div>

      {/* Offscreen render area for PDF export */}
      <div
        ref={offscreenRef}
        aria-hidden
        style={{ position: "fixed", left: -99999, top: 0, width: 1280, height: 720, pointerEvents: "none" }}
      >
        {slides.map((s) => (
          <div
            key={s.id}
            style={{
              display: "none",
              width: 1280, height: 720, padding: 48, boxSizing: "border-box",
              background: theme === "dark" ? "#0f172a" : "#ffffff",
              color: theme === "dark" ? "#ffffff" : "#0f172a",
              overflow: "hidden",
            }}
          >
            {s.render({ forPdf: true })}
          </div>
        ))}
      </div>
    </div>
  );
}
