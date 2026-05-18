import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Download, Printer, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateBlueprintSvg } from '@/lib/blueprint-generator';
import { generateSideProfileSvg } from '@/lib/side-profile-generator';
import { generateBowProfileSvg } from '@/lib/bow-profile-generator';
import { getTemplateById } from '@/lib/vessel-templates';
import type { VesselType } from '@/types';

type ViewTab = 'overhead' | 'port' | 'starboard' | 'bow';

interface VesselViewsProps {
  vessel: {
    name: string;
    type?: VesselType;
    lengthOverall?: number;
    beam?: number;
    draft?: number;
    deckPlan?: { templateId?: string } | null;
  };
}

const TAB_LABELS: Record<ViewTab, string> = {
  overhead: 'Overhead',
  port: 'Port',
  starboard: 'Starboard',
  bow: 'Bow',
};

function SvgViewport({ svgContent, label }: { svgContent: string; label: string }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgContainerRef.current) return;
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
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label.toLowerCase().replace(/\s+/g, '-')}.svg`;
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
    frameDoc.title = label;
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
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleDownload}>
            <Download className="h-3 w-3" /> SVG
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handlePrint}>
            <Printer className="h-3 w-3" /> Print
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border bg-white dark:bg-slate-950 cursor-grab active:cursor-grabbing select-none"
        style={{ height: 'calc(100vh - 320px)', minHeight: '300px' }}
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

export default function VesselViews({ vessel }: VesselViewsProps) {
  const [activeView, setActiveView] = useState<ViewTab>('overhead');
  const templateId = vessel.deckPlan?.templateId;
  const template = useMemo(() => templateId ? getTemplateById(templateId) : undefined, [templateId]);

  const overheadSvg = useMemo(
    () => template ? generateBlueprintSvg(template, vessel.name) : null,
    [template, vessel.name],
  );

  const portSvg = useMemo(
    () => template ? generateSideProfileSvg(template, vessel.name, false) : null,
    [template, vessel.name],
  );

  const starboardSvg = useMemo(
    () => template ? generateSideProfileSvg(template, vessel.name, true) : null,
    [template, vessel.name],
  );

  const bowSvg = useMemo(
    () => template ? generateBowProfileSvg(template, vessel.name) : null,
    [template, vessel.name],
  );

  if (!template) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg border-dashed">
        <p className="text-sm text-muted-foreground">
          No deck plan template selected. Choose one in Boat Map to see vessel views.
        </p>
      </div>
    );
  }

  const svgMap: Record<ViewTab, string | null> = {
    overhead: overheadSvg,
    port: portSvg,
    starboard: starboardSvg,
    bow: bowSvg,
  };

  const currentSvg = svgMap[activeView];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30 w-fit">
        {(Object.keys(TAB_LABELS) as ViewTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeView === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {currentSvg ? (
        <SvgViewport svgContent={currentSvg} label={`${vessel.name} - ${TAB_LABELS[activeView]}`} />
      ) : (
        <div className="flex items-center justify-center h-64 border rounded-lg border-dashed">
          <p className="text-sm text-muted-foreground">Unable to generate {TAB_LABELS[activeView]} view</p>
        </div>
      )}
    </div>
  );
}
