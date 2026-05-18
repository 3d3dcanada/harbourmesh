import { type VesselTemplate, getTemplateById } from './vessel-templates';
import { SpaceType } from '@/types';

const SPACE_TYPE_COLORS: Record<string, string> = {
  [SpaceType.COCKPIT]: '#10b981',
  [SpaceType.CABIN]: '#3b82f6',
  [SpaceType.BERTH]: '#6366f1',
  [SpaceType.HEAD]: '#8b5cf6',
  [SpaceType.SALON]: '#0ea5e9',
  [SpaceType.GALLEY]: '#f59e0b',
  [SpaceType.LOCKER]: '#64748b',
  [SpaceType.ENGINE_ROOM]: '#ef4444',
  [SpaceType.LAZARETTE]: '#78716c',
  [SpaceType.ANCHOR_LOCKER]: '#06b6d4',
};

function getSpaceColor(type?: string): string {
  if (!type) return '#94a3b8';
  return SPACE_TYPE_COLORS[type] ?? '#94a3b8';
}

function arrowMarkerDefs(): string {
  return `
    <defs>
      <marker id="dim-arrow-start" viewBox="0 0 8 8" refX="0" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M8,0 L0,4 L8,8 Z" fill="#334155" />
      </marker>
      <marker id="dim-arrow-end" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#334155" />
      </marker>
    </defs>`;
}

export function generateBlueprintSvg(template: VesselTemplate, vesselName?: string): string {
  const VB_W = 900;
  const VB_H = 500;
  const HULL_OFFSET_X = 80;
  const HULL_OFFSET_Y = 60;
  const HULL_W = 800;
  const HULL_H = 300;

  const hull = template.hullPoints;
  const hullPath = hull.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x + HULL_OFFSET_X},${p.y + HULL_OFFSET_Y}`).join(' ') + ' Z';

  const loa = template.lengthRange[1];
  const minX = Math.min(...hull.map((p) => p.x));
  const maxX = Math.max(...hull.map((p) => p.x));
  const beamPx = maxX - minX;
  const beam = Math.round(beamPx * loa / HULL_W);
  const loaFt = loa;
  const loaM = (loa * 0.3048).toFixed(1);
  const beamM = (beam * 0.3048).toFixed(1);

  const stations = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    const y = HULL_OFFSET_Y + t * HULL_H;
    return { index: i, y };
  });

  const waterlineY = HULL_OFFSET_Y + HULL_H * 0.7;

  const spaces = template.defaultSpaces.map((space) => {
    const geo = space.geometry;
    if (geo.kind !== 'rect') return '';
    const x = geo.x + HULL_OFFSET_X;
    const y = geo.y + HULL_OFFSET_Y;
    const color = getSpaceColor(space.type);
    return `
      <rect x="${x}" y="${y}" width="${geo.width}" height="${geo.height}"
        fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="0.75" rx="2" />
      <text x="${x + geo.width / 2}" y="${y + geo.height / 2 + 3}"
        text-anchor="middle" font-size="8" font-weight="500" fill="${color}" opacity="0.9">${space.name}</text>`;
  }).join('');

  const stationLines = stations.map(({ index, y }) => `
    <line x1="${HULL_OFFSET_X + minX}" y1="${y}" x2="${HULL_OFFSET_X + maxX}" y2="${y}"
      stroke="#cbd5e1" stroke-width="0.3" stroke-dasharray="2,3" />
    <text x="${HULL_OFFSET_X + minX - 8}" y="${y + 3}" text-anchor="end" font-size="6" fill="#94a3b8">${index}</text>
  `).join('');

  const title = vesselName ?? template.name;
  const today = new Date().toLocaleDateString('en-CA');
  const scaleRatio = `1:${Math.round(HULL_W / (loaFt * 12))}`;

  const dimLoaX = HULL_OFFSET_X + maxX + 30;
  const dimBeamY = HULL_OFFSET_Y + HULL_H + 30;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" width="${VB_W}" height="${VB_H}">
  <rect width="${VB_W}" height="${VB_H}" fill="#fafbfc" />
  ${arrowMarkerDefs()}

  <!-- Station Lines -->
  ${stationLines}

  <!-- Centerline -->
  <line x1="${HULL_OFFSET_X + 400}" y1="${HULL_OFFSET_Y - 10}" x2="${HULL_OFFSET_X + 400}" y2="${HULL_OFFSET_Y + HULL_H + 10}"
    stroke="#94a3b8" stroke-width="0.4" stroke-dasharray="6,3" />
  <text x="${HULL_OFFSET_X + 400}" y="${HULL_OFFSET_Y - 14}" text-anchor="middle" font-size="6" fill="#94a3b8">CL</text>

  <!-- Waterline -->
  <line x1="${HULL_OFFSET_X + minX - 5}" y1="${waterlineY}" x2="${HULL_OFFSET_X + maxX + 5}" y2="${waterlineY}"
    stroke="#0ea5e9" stroke-width="0.8" stroke-dasharray="8,4" />
  <text x="${HULL_OFFSET_X + maxX + 10}" y="${waterlineY + 3}" font-size="7" font-weight="600" fill="#0ea5e9">DWL</text>

  <!-- Hull Outline -->
  <path d="${hullPath}" fill="rgba(148,163,184,0.04)" stroke="#1e293b" stroke-width="1.8" stroke-linejoin="round" />

  <!-- Spaces -->
  ${spaces}

  <!-- LOA Dimension (right side, vertical) -->
  <line x1="${dimLoaX}" y1="${HULL_OFFSET_Y}" x2="${dimLoaX}" y2="${HULL_OFFSET_Y + HULL_H}"
    stroke="#334155" stroke-width="0.6" marker-start="url(#dim-arrow-start)" marker-end="url(#dim-arrow-end)" />
  <line x1="${dimLoaX - 4}" y1="${HULL_OFFSET_Y}" x2="${dimLoaX + 4}" y2="${HULL_OFFSET_Y}" stroke="#334155" stroke-width="0.4" />
  <line x1="${dimLoaX - 4}" y1="${HULL_OFFSET_Y + HULL_H}" x2="${dimLoaX + 4}" y2="${HULL_OFFSET_Y + HULL_H}" stroke="#334155" stroke-width="0.4" />
  <text x="${dimLoaX + 8}" y="${HULL_OFFSET_Y + HULL_H / 2}" font-size="8" font-weight="600" fill="#334155"
    transform="rotate(90, ${dimLoaX + 8}, ${HULL_OFFSET_Y + HULL_H / 2})">${loaFt}' (${loaM}m) LOA</text>

  <!-- Beam Dimension (bottom, horizontal) -->
  <line x1="${HULL_OFFSET_X + minX}" y1="${dimBeamY}" x2="${HULL_OFFSET_X + maxX}" y2="${dimBeamY}"
    stroke="#334155" stroke-width="0.6" marker-start="url(#dim-arrow-start)" marker-end="url(#dim-arrow-end)" />
  <line x1="${HULL_OFFSET_X + minX}" y1="${dimBeamY - 4}" x2="${HULL_OFFSET_X + minX}" y2="${dimBeamY + 4}" stroke="#334155" stroke-width="0.4" />
  <line x1="${HULL_OFFSET_X + maxX}" y1="${dimBeamY - 4}" x2="${HULL_OFFSET_X + maxX}" y2="${dimBeamY + 4}" stroke="#334155" stroke-width="0.4" />
  <text x="${HULL_OFFSET_X + 400}" y="${dimBeamY + 14}" text-anchor="middle" font-size="8" font-weight="600" fill="#334155">${beam}' (${beamM}m) Beam</text>

  <!-- Scale Bar -->
  <line x1="30" y1="${VB_H - 30}" x2="130" y2="${VB_H - 30}" stroke="#1e293b" stroke-width="1.5" />
  <line x1="30" y1="${VB_H - 35}" x2="30" y2="${VB_H - 25}" stroke="#1e293b" stroke-width="1" />
  <line x1="130" y1="${VB_H - 35}" x2="130" y2="${VB_H - 25}" stroke="#1e293b" stroke-width="1" />
  <line x1="80" y1="${VB_H - 33}" x2="80" y2="${VB_H - 27}" stroke="#1e293b" stroke-width="0.5" />
  <text x="80" y="${VB_H - 16}" text-anchor="middle" font-size="7" fill="#475569">${Math.round(loaFt * 100 / HULL_H / 3)}'</text>

  <!-- Title Block -->
  <rect x="${VB_W - 250}" y="${VB_H - 65}" width="240" height="55" fill="white" stroke="#334155" stroke-width="1" rx="2" />
  <line x1="${VB_W - 250}" y1="${VB_H - 43}" x2="${VB_W - 10}" y2="${VB_H - 43}" stroke="#e2e8f0" stroke-width="0.5" />
  <text x="${VB_W - 130}" y="${VB_H - 48}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a">${title}</text>
  <text x="${VB_W - 190}" y="${VB_H - 25}" font-size="7" fill="#64748b">${template.name}</text>
  <text x="${VB_W - 190}" y="${VB_H - 15}" font-size="7" fill="#64748b">${today}</text>
  <text x="${VB_W - 60}" y="${VB_H - 25}" text-anchor="end" font-size="7" fill="#64748b">Scale ${scaleRatio}</text>
  <text x="${VB_W - 60}" y="${VB_H - 15}" text-anchor="end" font-size="7" fill="#64748b">HarborMesh</text>

  <!-- Bow/Stern Labels -->
  <text x="${HULL_OFFSET_X + 400}" y="${HULL_OFFSET_Y - 4}" text-anchor="middle" font-size="7" font-weight="600" fill="#475569">BOW</text>
  <text x="${HULL_OFFSET_X + 400}" y="${HULL_OFFSET_Y + HULL_H + 14}" text-anchor="middle" font-size="7" font-weight="600" fill="#475569">STERN</text>

  <!-- Draft Marks -->
  <text x="${HULL_OFFSET_X + minX - 8}" y="${HULL_OFFSET_Y + 4}" text-anchor="end" font-size="5" fill="#64748b">0</text>
  <text x="${HULL_OFFSET_X + minX - 8}" y="${HULL_OFFSET_Y + HULL_H}" text-anchor="end" font-size="5" fill="#64748b">10</text>
</svg>`;
}

export function generateBlueprintForTemplate(templateId: string, vesselName?: string): string | null {
  const template = getTemplateById(templateId);
  if (!template) return null;
  return generateBlueprintSvg(template, vesselName);
}
