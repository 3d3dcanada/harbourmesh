import type { VesselTemplate, TemplateCategory } from './vessel-templates';

const VB_W = 600;
const VB_H = 500;
const CX = VB_W / 2;
const DECK_Y = 140;
const WATERLINE_Y = 250;

function arrowMarkerDefs(): string {
  return `
    <defs>
      <marker id="bow-arrow-start" viewBox="0 0 8 8" refX="0" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M8,0 L0,4 L8,8 Z" fill="#334155" />
      </marker>
      <marker id="bow-arrow-end" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#334155" />
      </marker>
    </defs>`;
}

function resolveHullShape(category: TemplateCategory, templateId: string): 'round' | 'vee' | 'flat' | 'chine' {
  if (category === 'sailboat') return 'round';
  if (category === 'catamaran') return 'round';
  if (templateId.includes('trawler')) return 'round';
  if (category === 'small_craft') return 'flat';
  if (templateId.includes('sportfish') || templateId.includes('center-console')) return 'vee';
  return 'chine';
}

export function generateBowProfileSvg(
  template: VesselTemplate,
  vesselName?: string,
): string {
  const hull = template.hullPoints;
  const loa = template.lengthRange[1];

  const minHullX = Math.min(...hull.map((p) => p.x));
  const maxHullX = Math.max(...hull.map((p) => p.x));
  const beamPx = maxHullX - minHullX;
  const beamFt = Math.round(beamPx * loa / 800);
  const beamM = (beamFt * 0.3048).toFixed(1);

  const halfBeam = 180;
  const hullShape = resolveHullShape(template.category, template.id);
  const isSailboat = template.category === 'sailboat';
  const hasCabin = !['small_craft'].includes(template.category) && !template.id.includes('rib') && !template.id.includes('center-console');

  const keelDepth = isSailboat ? 80 : 20;
  const keelBottomY = WATERLINE_Y + keelDepth;
  let hullOutline = '';
  switch (hullShape) {
    case 'round':
      hullOutline = `M${CX - halfBeam},${DECK_Y}
        L${CX - halfBeam - 5},${DECK_Y + 3}
        C${CX - halfBeam},${WATERLINE_Y - 10} ${CX - halfBeam * 0.5},${WATERLINE_Y + 15} ${CX},${WATERLINE_Y + 25}
        C${CX + halfBeam * 0.5},${WATERLINE_Y + 15} ${CX + halfBeam},${WATERLINE_Y - 10} ${CX + halfBeam + 5},${DECK_Y + 3}
        L${CX + halfBeam},${DECK_Y}`;
      break;
    case 'vee':
      hullOutline = `M${CX - halfBeam},${DECK_Y}
        L${CX - halfBeam - 5},${DECK_Y + 3}
        L${CX - halfBeam * 0.15},${WATERLINE_Y + 20}
        L${CX},${WATERLINE_Y + 35}
        L${CX + halfBeam * 0.15},${WATERLINE_Y + 20}
        L${CX + halfBeam + 5},${DECK_Y + 3}
        L${CX + halfBeam},${DECK_Y}`;
      break;
    case 'flat':
      hullOutline = `M${CX - halfBeam},${DECK_Y}
        L${CX - halfBeam},${WATERLINE_Y + 5}
        L${CX + halfBeam},${WATERLINE_Y + 5}
        L${CX + halfBeam},${DECK_Y}`;
      break;
    case 'chine':
      hullOutline = `M${CX - halfBeam},${DECK_Y}
        L${CX - halfBeam - 3},${DECK_Y + 2}
        L${CX - halfBeam * 0.6},${WATERLINE_Y + 5}
        L${CX - halfBeam * 0.15},${WATERLINE_Y + 18}
        L${CX + halfBeam * 0.15},${WATERLINE_Y + 18}
        L${CX + halfBeam * 0.6},${WATERLINE_Y + 5}
        L${CX + halfBeam + 3},${DECK_Y + 2}
        L${CX + halfBeam},${DECK_Y}`;
      break;
  }

  let keelSection = '';
  if (isSailboat) {
    keelSection = `<path d="M${CX - 12},${WATERLINE_Y + 20} L${CX - 8},${keelBottomY} L${CX + 8},${keelBottomY} L${CX + 12},${WATERLINE_Y + 20}"
      fill="rgba(30,41,59,0.15)" stroke="#1e293b" stroke-width="1.2" stroke-linejoin="round" />`;
  }

  let cabinSection = '';
  if (hasCabin) {
    const cabinW = halfBeam * 0.7;
    const cabinH = 25;
    cabinSection = `<path d="M${CX - cabinW},${DECK_Y} L${CX - cabinW + 8},${DECK_Y - cabinH}
      C${CX - cabinW * 0.3},${DECK_Y - cabinH - 3} ${CX + cabinW * 0.3},${DECK_Y - cabinH - 3} ${CX + cabinW - 8},${DECK_Y - cabinH}
      L${CX + cabinW},${DECK_Y}"
      fill="rgba(226,232,240,0.5)" stroke="#475569" stroke-width="0.8" />`;
  }

  const title = vesselName ?? template.name;
  const today = new Date().toLocaleDateString('en-CA');

  const dimBeamY = DECK_Y - 30;
  const dimFreeboardX = CX + halfBeam + 40;
  const dimDraftX = CX - halfBeam - 40;

  const draftFt = isSailboat ? Math.round(loa * 0.15) : Math.round(loa * 0.06);
  const draftM = (draftFt * 0.3048).toFixed(1);
  const freeboardFt = Math.round(loa * 0.08);
  const freeboardM = (freeboardFt * 0.3048).toFixed(1);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" width="${VB_W}" height="${VB_H}">
  <rect width="${VB_W}" height="${VB_H}" fill="#fafbfc" />
  ${arrowMarkerDefs()}

  <!-- View Label -->
  <text x="${CX}" y="35" text-anchor="middle" font-size="9" font-weight="700" fill="#475569" letter-spacing="2">BOW VIEW</text>

  <!-- Waterline -->
  <line x1="40" y1="${WATERLINE_Y}" x2="${VB_W - 40}" y2="${WATERLINE_Y}"
    stroke="#0ea5e9" stroke-width="0.8" stroke-dasharray="8,4" />
  <text x="${VB_W - 35}" y="${WATERLINE_Y + 3}" font-size="7" font-weight="600" fill="#0ea5e9">DWL</text>

  <!-- Water fill -->
  <rect x="40" y="${WATERLINE_Y}" width="${VB_W - 80}" height="${VB_H - WATERLINE_Y - 60}"
    fill="rgba(14,165,233,0.04)" />

  <!-- Centerline -->
  <line x1="${CX}" y1="${DECK_Y - 50}" x2="${CX}" y2="${keelBottomY + 10}"
    stroke="#94a3b8" stroke-width="0.4" stroke-dasharray="4,3" />

  <!-- Hull cross-section -->
  <path d="${hullOutline}" fill="rgba(148,163,184,0.06)" stroke="#1e293b" stroke-width="1.8" stroke-linejoin="round" />

  <!-- Keel section -->
  ${keelSection}

  <!-- Cabin cross-section -->
  ${cabinSection}

  <!-- Beam Dimension (top) -->
  <line x1="${CX - halfBeam}" y1="${dimBeamY}" x2="${CX + halfBeam}" y2="${dimBeamY}"
    stroke="#334155" stroke-width="0.6" marker-start="url(#bow-arrow-start)" marker-end="url(#bow-arrow-end)" />
  <line x1="${CX - halfBeam}" y1="${dimBeamY - 4}" x2="${CX - halfBeam}" y2="${dimBeamY + 4}" stroke="#334155" stroke-width="0.4" />
  <line x1="${CX + halfBeam}" y1="${dimBeamY - 4}" x2="${CX + halfBeam}" y2="${dimBeamY + 4}" stroke="#334155" stroke-width="0.4" />
  <text x="${CX}" y="${dimBeamY - 6}" text-anchor="middle" font-size="8" font-weight="600" fill="#334155">${beamFt}' (${beamM}m) Beam</text>

  <!-- Freeboard Dimension (right side) -->
  <line x1="${dimFreeboardX}" y1="${DECK_Y}" x2="${dimFreeboardX}" y2="${WATERLINE_Y}"
    stroke="#334155" stroke-width="0.5" marker-start="url(#bow-arrow-start)" marker-end="url(#bow-arrow-end)" />
  <text x="${dimFreeboardX + 6}" y="${(DECK_Y + WATERLINE_Y) / 2 + 3}" font-size="7" fill="#334155">${freeboardFt}' (${freeboardM}m)</text>
  <text x="${dimFreeboardX + 6}" y="${(DECK_Y + WATERLINE_Y) / 2 + 13}" font-size="6" fill="#64748b">Freeboard</text>

  <!-- Draft Dimension (left side) -->
  <line x1="${dimDraftX}" y1="${WATERLINE_Y}" x2="${dimDraftX}" y2="${keelBottomY}"
    stroke="#334155" stroke-width="0.5" marker-start="url(#bow-arrow-start)" marker-end="url(#bow-arrow-end)" />
  <text x="${dimDraftX - 6}" y="${(WATERLINE_Y + keelBottomY) / 2 + 3}" text-anchor="end" font-size="7" fill="#334155">${draftFt}' (${draftM}m)</text>
  <text x="${dimDraftX - 6}" y="${(WATERLINE_Y + keelBottomY) / 2 + 13}" text-anchor="end" font-size="6" fill="#64748b">Draft</text>

  <!-- Port / Starboard Labels -->
  <text x="${CX - halfBeam - 10}" y="${DECK_Y + 15}" text-anchor="end" font-size="7" fill="#94a3b8">PORT</text>
  <text x="${CX + halfBeam + 10}" y="${DECK_Y + 15}" font-size="7" fill="#94a3b8">STBD</text>

  <!-- Title Block -->
  <rect x="${VB_W - 220}" y="${VB_H - 55}" width="210" height="45" fill="white" stroke="#334155" stroke-width="1" rx="2" />
  <line x1="${VB_W - 220}" y1="${VB_H - 33}" x2="${VB_W - 10}" y2="${VB_H - 33}" stroke="#e2e8f0" stroke-width="0.5" />
  <text x="${VB_W - 115}" y="${VB_H - 38}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a">${title}</text>
  <text x="${VB_W - 170}" y="${VB_H - 18}" font-size="7" fill="#64748b">Bow Section</text>
  <text x="${VB_W - 170}" y="${VB_H - 8}" font-size="7" fill="#64748b">${today}</text>
  <text x="${VB_W - 50}" y="${VB_H - 18}" text-anchor="end" font-size="7" fill="#64748b">${template.name}</text>
  <text x="${VB_W - 50}" y="${VB_H - 8}" text-anchor="end" font-size="7" fill="#64748b">HarborMesh</text>
</svg>`;
}
