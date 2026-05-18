import type { VesselTemplate, TemplateCategory } from './vessel-templates';

const VB_W = 900;
const VB_H = 400;
const HULL_OFFSET_X = 80;
const HULL_OFFSET_Y = 60;
const HULL_LEN = 700;

interface SideProfileConfig {
  hasMast: boolean;
  hasCabin: boolean;
  cabinStyle: 'doghouse' | 'pilothouse' | 'flybridge' | 'helm' | 'cuddy' | 'none';
  hasRudder: boolean;
  hasKeel: boolean;
  keelStyle: 'fin' | 'full' | 'shoal' | 'none';
}

function resolveProfileConfig(category: TemplateCategory, templateId: string): SideProfileConfig {
  const isSailboat = category === 'sailboat';
  const isCatSail = templateId.includes('catamaran-sail') || templateId.includes('trimaran');
  const isPower = category === 'powerboat';
  const isFlybridge = templateId.includes('flybridge');
  const isTrawler = templateId.includes('trawler');
  const isSportfish = templateId.includes('sportfish');
  const isCuddy = templateId.includes('express') || templateId.includes('bowrider');
  const isSmall = category === 'small_craft';
  const isWork = category === 'workboat';

  return {
    hasMast: isSailboat || isCatSail,
    hasCabin: !isSmall && !templateId.includes('rib') && !templateId.includes('center-console'),
    cabinStyle: isSailboat || isCatSail
      ? 'doghouse'
      : isFlybridge
        ? 'flybridge'
        : isTrawler
          ? 'pilothouse'
          : isSportfish
            ? 'helm'
            : isCuddy
              ? 'cuddy'
              : isPower || isWork
                ? 'helm'
                : 'none',
    hasRudder: !isSmall,
    hasKeel: isSailboat || isCatSail,
    keelStyle: isSailboat
      ? (templateId.includes('25') || templateId.includes('30') ? 'fin' : 'fin')
      : isCatSail
        ? 'shoal'
        : 'none',
  };
}

function arrowMarkerDefs(): string {
  return `
    <defs>
      <marker id="sp-arrow-start" viewBox="0 0 8 8" refX="0" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M8,0 L0,4 L8,8 Z" fill="#334155" />
      </marker>
      <marker id="sp-arrow-end" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#334155" />
      </marker>
    </defs>`;
}

export function generateSideProfileSvg(
  template: VesselTemplate,
  vesselName?: string,
  mirror = false,
): string {
  const loa = template.lengthRange[1];
  const loaM = (loa * 0.3048).toFixed(1);

  const cfg = resolveProfileConfig(template.category, template.id);

  const deckY = HULL_OFFSET_Y + 80;
  const waterlineY = deckY + 50;
  const keelBottomY = waterlineY + (cfg.hasKeel ? 70 : 20);
  const bowX = HULL_OFFSET_X + 40;
  const sternX = HULL_OFFSET_X + HULL_LEN;

  const sheerRise = 25;
  const bowRake = 60;
  const sternTuck = 20;

  const sheerPath = `M${bowX - bowRake},${deckY - sheerRise}
    C${bowX + 80},${deckY - sheerRise * 0.6} ${bowX + 200},${deckY - 5} ${HULL_OFFSET_X + HULL_LEN * 0.4},${deckY}
    C${HULL_OFFSET_X + HULL_LEN * 0.7},${deckY + 2} ${sternX - 60},${deckY + 3} ${sternX + sternTuck},${deckY - 3}`;

  const hullBottomPath = `M${bowX - bowRake},${deckY - sheerRise}
    C${bowX - bowRake + 10},${deckY + 10} ${bowX},${waterlineY - 10} ${bowX + 40},${waterlineY + 5}
    C${bowX + 120},${waterlineY + 15} ${HULL_OFFSET_X + HULL_LEN * 0.5},${waterlineY + 18} ${sternX - 40},${waterlineY + 10}
    C${sternX - 10},${waterlineY + 5} ${sternX + sternTuck},${deckY + 15} ${sternX + sternTuck},${deckY - 3}`;

  let keelPath = '';
  if (cfg.hasKeel && cfg.keelStyle === 'fin') {
    const keelStart = HULL_OFFSET_X + HULL_LEN * 0.42;
    const keelEnd = keelStart + 50;
    keelPath = `<path d="M${keelStart},${waterlineY + 12} L${keelStart + 5},${keelBottomY} L${keelEnd - 5},${keelBottomY} L${keelEnd},${waterlineY + 14}"
      fill="rgba(30,41,59,0.15)" stroke="#1e293b" stroke-width="1.2" stroke-linejoin="round" />`;
  } else if (cfg.hasKeel && cfg.keelStyle === 'shoal') {
    const keelStart = HULL_OFFSET_X + HULL_LEN * 0.35;
    const keelEnd = HULL_OFFSET_X + HULL_LEN * 0.65;
    keelPath = `<path d="M${keelStart},${waterlineY + 10} C${keelStart + 40},${keelBottomY - 10} ${keelEnd - 40},${keelBottomY - 10} ${keelEnd},${waterlineY + 10}"
      fill="rgba(30,41,59,0.1)" stroke="#1e293b" stroke-width="1" />`;
  }

  let rudderPath = '';
  if (cfg.hasRudder) {
    const rx = sternX - 10;
    rudderPath = `<path d="M${rx},${waterlineY + 5} L${rx - 3},${waterlineY + 40} L${rx + 8},${waterlineY + 38} L${rx + 5},${waterlineY + 5}"
      fill="rgba(30,41,59,0.12)" stroke="#1e293b" stroke-width="0.8" />`;
  }

  let cabinPath = '';
  const cabinStartX = HULL_OFFSET_X + HULL_LEN * 0.2;
  const cabinH = 22;
  if (cfg.hasCabin) {
    switch (cfg.cabinStyle) {
      case 'doghouse': {
        const cEnd = HULL_OFFSET_X + HULL_LEN * 0.58;
        cabinPath = `<path d="M${cabinStartX},${deckY} L${cabinStartX + 10},${deckY - cabinH} L${cEnd - 10},${deckY - cabinH} L${cEnd},${deckY}"
          fill="rgba(226,232,240,0.5)" stroke="#475569" stroke-width="0.8" />
          <line x1="${cabinStartX + 30}" y1="${deckY - cabinH}" x2="${cabinStartX + 30}" y2="${deckY - cabinH + 12}"
            stroke="#94a3b8" stroke-width="0.6" />
          <line x1="${cabinStartX + 50}" y1="${deckY - cabinH}" x2="${cabinStartX + 50}" y2="${deckY - cabinH + 12}"
            stroke="#94a3b8" stroke-width="0.6" />
          <line x1="${cEnd - 50}" y1="${deckY - cabinH}" x2="${cEnd - 50}" y2="${deckY - cabinH + 12}"
            stroke="#94a3b8" stroke-width="0.6" />`;
        break;
      }
      case 'pilothouse': {
        const cEnd = HULL_OFFSET_X + HULL_LEN * 0.55;
        const phH = 35;
        cabinPath = `<path d="M${cabinStartX},${deckY} L${cabinStartX},${deckY - phH} L${cEnd},${deckY - phH} L${cEnd},${deckY}"
          fill="rgba(226,232,240,0.5)" stroke="#475569" stroke-width="0.8" />
          <rect x="${cabinStartX + 15}" y="${deckY - phH + 5}" width="25" height="15" rx="2"
            fill="rgba(147,197,253,0.3)" stroke="#64748b" stroke-width="0.5" />
          <rect x="${cabinStartX + 50}" y="${deckY - phH + 5}" width="25" height="15" rx="2"
            fill="rgba(147,197,253,0.3)" stroke="#64748b" stroke-width="0.5" />`;
        break;
      }
      case 'flybridge': {
        const cEnd = HULL_OFFSET_X + HULL_LEN * 0.6;
        const fbH = 30;
        const fb2H = 18;
        cabinPath = `<path d="M${cabinStartX},${deckY} L${cabinStartX},${deckY - fbH} L${cEnd},${deckY - fbH} L${cEnd},${deckY}"
          fill="rgba(226,232,240,0.5)" stroke="#475569" stroke-width="0.8" />
          <path d="M${cabinStartX + 20},${deckY - fbH} L${cabinStartX + 20},${deckY - fbH - fb2H} L${cEnd - 40},${deckY - fbH - fb2H} L${cEnd - 40},${deckY - fbH}"
            fill="rgba(226,232,240,0.4)" stroke="#475569" stroke-width="0.6" />`;
        break;
      }
      case 'helm': {
        const cEnd = HULL_OFFSET_X + HULL_LEN * 0.45;
        cabinPath = `<path d="M${cabinStartX + 40},${deckY} L${cabinStartX + 50},${deckY - cabinH} L${cEnd},${deckY - cabinH} L${cEnd},${deckY}"
          fill="rgba(226,232,240,0.4)" stroke="#475569" stroke-width="0.7" />`;
        break;
      }
      case 'cuddy': {
        const cEnd = HULL_OFFSET_X + HULL_LEN * 0.4;
        cabinPath = `<path d="M${cabinStartX},${deckY} C${cabinStartX + 20},${deckY - cabinH * 0.8} ${cEnd - 30},${deckY - cabinH} ${cEnd},${deckY}"
          fill="rgba(226,232,240,0.35)" stroke="#475569" stroke-width="0.7" />`;
        break;
      }
    }
  }

  let mastPath = '';
  if (cfg.hasMast) {
    const mastX = HULL_OFFSET_X + HULL_LEN * 0.35;
    const mastTop = HULL_OFFSET_Y - 10;
    const mastH = deckY - mastTop;
    const boomEnd = mastX + HULL_LEN * 0.38;
    const boomY = deckY - cabinH + 5;
    const spreadersY = mastTop + mastH * 0.35;

    mastPath = `
      <line x1="${mastX}" y1="${mastTop}" x2="${mastX}" y2="${deckY}" stroke="#64748b" stroke-width="2" />
      <line x1="${mastX}" y1="${boomY}" x2="${boomEnd}" y2="${boomY + 4}" stroke="#64748b" stroke-width="1.2" />
      <line x1="${mastX}" y1="${spreadersY}" x2="${mastX - 30}" y2="${spreadersY + 2}" stroke="#94a3b8" stroke-width="0.6" />
      <line x1="${mastX}" y1="${spreadersY}" x2="${mastX + 30}" y2="${spreadersY + 2}" stroke="#94a3b8" stroke-width="0.6" />
      <line x1="${mastX}" y1="${mastTop}" x2="${bowX - bowRake + 5}" y2="${deckY - sheerRise + 5}" stroke="#cbd5e1" stroke-width="0.4" />
      <line x1="${mastX}" y1="${mastTop}" x2="${sternX + sternTuck - 5}" y2="${deckY}" stroke="#cbd5e1" stroke-width="0.4" />
      <circle cx="${mastX}" cy="${mastTop}" r="2" fill="#475569" />`;
  }

  const title = vesselName ?? template.name;
  const today = new Date().toLocaleDateString('en-CA');
  const viewLabel = mirror ? 'STARBOARD' : 'PORT';

  const dimY = keelBottomY + 30;

  const innerSvg = `
  <rect width="${VB_W}" height="${VB_H}" fill="#fafbfc" />
  ${arrowMarkerDefs()}

  <!-- Waterline -->
  <line x1="${bowX - bowRake - 20}" y1="${waterlineY}" x2="${sternX + sternTuck + 30}" y2="${waterlineY}"
    stroke="#0ea5e9" stroke-width="0.8" stroke-dasharray="8,4" />
  <text x="${sternX + sternTuck + 35}" y="${waterlineY + 3}" font-size="7" font-weight="600" fill="#0ea5e9">DWL</text>

  <!-- Water fill below waterline -->
  <rect x="${bowX - bowRake - 20}" y="${waterlineY}" width="${sternX + sternTuck - bowX + bowRake + 50}" height="${VB_H - waterlineY}"
    fill="rgba(14,165,233,0.04)" />

  <!-- Hull -->
  <path d="${sheerPath}" fill="none" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" />
  <path d="${hullBottomPath}" fill="rgba(148,163,184,0.06)" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round" />

  <!-- Keel -->
  ${keelPath}

  <!-- Rudder -->
  ${rudderPath}

  <!-- Cabin/Superstructure -->
  ${cabinPath}

  <!-- Mast & Rigging -->
  ${mastPath}

  <!-- LOA Dimension -->
  <line x1="${bowX - bowRake}" y1="${dimY}" x2="${sternX + sternTuck}" y2="${dimY}"
    stroke="#334155" stroke-width="0.6" marker-start="url(#sp-arrow-start)" marker-end="url(#sp-arrow-end)" />
  <line x1="${bowX - bowRake}" y1="${dimY - 4}" x2="${bowX - bowRake}" y2="${dimY + 4}" stroke="#334155" stroke-width="0.4" />
  <line x1="${sternX + sternTuck}" y1="${dimY - 4}" x2="${sternX + sternTuck}" y2="${dimY + 4}" stroke="#334155" stroke-width="0.4" />
  <text x="${(bowX - bowRake + sternX + sternTuck) / 2}" y="${dimY + 14}" text-anchor="middle" font-size="8" font-weight="600" fill="#334155">${loa}' (${loaM}m) LOA</text>

  <!-- View Label -->
  <text x="${HULL_OFFSET_X + HULL_LEN / 2}" y="${HULL_OFFSET_Y - 30}" text-anchor="middle" font-size="9" font-weight="700" fill="#475569" letter-spacing="2">${viewLabel} SIDE</text>

  <!-- Bow/Stern Labels -->
  <text x="${bowX - bowRake - 5}" y="${deckY - sheerRise - 10}" text-anchor="end" font-size="7" font-weight="600" fill="#475569">BOW</text>
  <text x="${sternX + sternTuck + 10}" y="${deckY}" font-size="7" font-weight="600" fill="#475569">STERN</text>

  <!-- Title Block -->
  <rect x="${VB_W - 250}" y="${VB_H - 55}" width="240" height="45" fill="white" stroke="#334155" stroke-width="1" rx="2" />
  <line x1="${VB_W - 250}" y1="${VB_H - 33}" x2="${VB_W - 10}" y2="${VB_H - 33}" stroke="#e2e8f0" stroke-width="0.5" />
  <text x="${VB_W - 130}" y="${VB_H - 38}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a">${title}</text>
  <text x="${VB_W - 190}" y="${VB_H - 18}" font-size="7" fill="#64748b">${viewLabel} Profile</text>
  <text x="${VB_W - 190}" y="${VB_H - 8}" font-size="7" fill="#64748b">${today}</text>
  <text x="${VB_W - 60}" y="${VB_H - 18}" text-anchor="end" font-size="7" fill="#64748b">${template.name}</text>
  <text x="${VB_W - 60}" y="${VB_H - 8}" text-anchor="end" font-size="7" fill="#64748b">HarborMesh</text>`;

  if (mirror) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" width="${VB_W}" height="${VB_H}">
  <g transform="translate(${VB_W}, 0) scale(-1, 1)">
    <rect width="${VB_W}" height="${VB_H}" fill="#fafbfc" />
    ${arrowMarkerDefs()}
    <line x1="${bowX - bowRake - 20}" y1="${waterlineY}" x2="${sternX + sternTuck + 30}" y2="${waterlineY}"
      stroke="#0ea5e9" stroke-width="0.8" stroke-dasharray="8,4" />
    <rect x="${bowX - bowRake - 20}" y="${waterlineY}" width="${sternX + sternTuck - bowX + bowRake + 50}" height="${VB_H - waterlineY}"
      fill="rgba(14,165,233,0.04)" />
    <path d="${sheerPath}" fill="none" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" />
    <path d="${hullBottomPath}" fill="rgba(148,163,184,0.06)" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round" />
    ${keelPath}
    ${rudderPath}
    ${cabinPath}
    ${mastPath}
  </g>
  <!-- Non-mirrored text overlay -->
  <text x="${HULL_OFFSET_X + HULL_LEN / 2}" y="${HULL_OFFSET_Y - 30}" text-anchor="middle" font-size="9" font-weight="700" fill="#475569" letter-spacing="2">STARBOARD SIDE</text>
  <line x1="${bowX - bowRake}" y1="${dimY}" x2="${sternX + sternTuck}" y2="${dimY}"
    stroke="#334155" stroke-width="0.6" marker-start="url(#sp-arrow-start)" marker-end="url(#sp-arrow-end)" />
  <text x="${(bowX - bowRake + sternX + sternTuck) / 2}" y="${dimY + 14}" text-anchor="middle" font-size="8" font-weight="600" fill="#334155">${loa}' (${loaM}m) LOA</text>
  <text x="${sternX + sternTuck + 10}" y="${deckY - sheerRise - 10}" font-size="7" font-weight="600" fill="#475569">BOW</text>
  <text x="${bowX - bowRake - 5}" y="${deckY}" text-anchor="end" font-size="7" font-weight="600" fill="#475569">STERN</text>
  <line x1="${bowX - bowRake}" y1="${waterlineY}" x2="${sternX + sternTuck + 30}" y2="${waterlineY}"
    stroke="#0ea5e9" stroke-width="0" />
  <text x="${bowX - bowRake - 15}" y="${waterlineY + 3}" font-size="7" font-weight="600" fill="#0ea5e9">DWL</text>
  <rect x="${VB_W - 250}" y="${VB_H - 55}" width="240" height="45" fill="white" stroke="#334155" stroke-width="1" rx="2" />
  <line x1="${VB_W - 250}" y1="${VB_H - 33}" x2="${VB_W - 10}" y2="${VB_H - 33}" stroke="#e2e8f0" stroke-width="0.5" />
  <text x="${VB_W - 130}" y="${VB_H - 38}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a">${title}</text>
  <text x="${VB_W - 190}" y="${VB_H - 18}" font-size="7" fill="#64748b">STARBOARD Profile</text>
  <text x="${VB_W - 190}" y="${VB_H - 8}" font-size="7" fill="#64748b">${today}</text>
  <text x="${VB_W - 60}" y="${VB_H - 18}" text-anchor="end" font-size="7" fill="#64748b">${template.name}</text>
  <text x="${VB_W - 60}" y="${VB_H - 8}" text-anchor="end" font-size="7" fill="#64748b">HarborMesh</text>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" width="${VB_W}" height="${VB_H}">
  ${innerSvg}
</svg>`;
}
