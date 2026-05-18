import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Download, Printer, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeatureGate } from './FeatureGate';
import { generateBlueprintForTemplate } from '@/lib/blueprint-generator';

interface BlueprintViewerProps {
  templateId: string;
  vesselName?: string;
}

export function BlueprintViewer({ templateId, vesselName }: BlueprintViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const svgContent = useMemo(
    () => generateBlueprintForTemplate(templateId, vesselName),
    [templateId, vesselName],
  );

  useEffect(() => {
    if (!svgContainerRef.current || !svgContent) return;
    svgContainerRef.current.replaceChildren();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.documentElement;
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    svgContainerRef.current.appendChild(svg);
  }, [svgContent]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.3, Math.min(5, z + delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg border-dashed">
        <p className="text-sm text-muted-foreground">No hull template selected</p>
      </div>
    );
  }

  const handleDownload = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vesselName ?? 'blueprint'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.display = 'none';
    document.body.appendChild(printFrame);
    const frameDoc = printFrame.contentDocument;
    if (!frameDoc) { document.body.removeChild(printFrame); return; }
    frameDoc.open();
    frameDoc.close();
    const style = frameDoc.createElement('style');
    style.textContent = '@page { size: landscape; margin: 10mm; } body { margin: 0; } svg { width: 100%; height: auto; }';
    frameDoc.head.appendChild(style);
    frameDoc.title = `Blueprint - ${(vesselName ?? '').replace(/[<>&"']/g, '')}`;
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    frameDoc.body.appendChild(frameDoc.importNode(svgDoc.documentElement, true));
    printFrame.contentWindow?.print();
    setTimeout(() => document.body.removeChild(printFrame), 1000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(5, z + 0.2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleFit} title="Fit to view">
            <Maximize className="h-3.5 w-3.5" />
          </Button>
        </div>

        <FeatureGate feature="deck-plan-download">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleDownload}>
              <Download className="h-3 w-3" /> SVG
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handlePrint}>
              <Printer className="h-3 w-3" /> Print
            </Button>
          </div>
        </FeatureGate>
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border bg-white dark:bg-slate-950 cursor-grab active:cursor-grabbing select-none"
        style={{ height: 'calc(100vh - 280px)', minHeight: '300px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={svgContainerRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        />
      </div>
    </div>
  );
}
