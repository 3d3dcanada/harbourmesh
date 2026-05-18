import * as THREE from 'three';

export type HullProfile = 'sailboat' | 'powerboat' | 'catamaran' | 'trawler';

interface HullParams {
  length: number;
  beam: number;
  draft: number;
  profile: HullProfile;
}

const STATIONS = 24;
const CHINE_POINTS = 10;

function bowTaper(t: number, profile: HullProfile): number {
  if (profile === 'powerboat') return Math.pow(t, 0.55);
  if (profile === 'trawler') return Math.pow(t, 0.45);
  return Math.pow(t, 1.1);
}

function sternTaper(t: number, profile: HullProfile): number {
  if (profile === 'powerboat') return Math.max(Math.pow(t, 0.25), 0.65);
  if (profile === 'trawler') return Math.max(Math.pow(t, 0.3), 0.55);
  return Math.pow(t, 0.7);
}

function beamAtStation(stationT: number, beam: number, profile: HullProfile): number {
  const bowFrac = profile === 'sailboat' ? 0.22 : 0.18;
  const sternFrac = profile === 'powerboat' ? 0.12 : 0.18;

  if (stationT < bowFrac) {
    return beam * bowTaper(stationT / bowFrac, profile);
  }
  if (stationT > 1 - sternFrac) {
    const sternT = (1 - stationT) / sternFrac;
    return beam * sternTaper(sternT, profile);
  }
  return beam;
}

function draftAtStation(stationT: number, draft: number, profile: HullProfile): number {
  const bowFrac = profile === 'sailboat' ? 0.22 : 0.18;
  const sternFrac = profile === 'powerboat' ? 0.12 : 0.18;

  let scale = 1;
  if (stationT < bowFrac) {
    scale = 0.3 + 0.7 * (stationT / bowFrac);
  } else if (stationT > 1 - sternFrac) {
    const sternT = (1 - stationT) / sternFrac;
    scale = 0.4 + 0.6 * sternT;
  }

  if (profile === 'sailboat' && stationT > 0.3 && stationT < 0.55) {
    const keelT = (stationT - 0.3) / 0.25;
    scale += 0.6 * Math.sin(keelT * Math.PI);
  }

  return draft * scale;
}

function hullCrossSection(
  t: number,
  halfBeam: number,
  sectionDraft: number,
  freeboard: number,
  profile: HullProfile,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  const deadriseAngle = profile === 'sailboat' ? 25 : profile === 'trawler' ? 18 : 14;
  const bilgeRadius = halfBeam * (profile === 'sailboat' ? 0.35 : 0.25);
  const flare = profile === 'powerboat' ? 0.08 : profile === 'trawler' ? 0.05 : 0.03;

  for (let i = 0; i <= CHINE_POINTS; i++) {
    const frac = i / CHINE_POINTS;
    const x = frac * halfBeam;

    let y: number;
    if (frac < 0.3) {
      const deadriseY = Math.tan(deadriseAngle * Math.PI / 180) * x;
      y = -sectionDraft + deadriseY;
    } else if (frac < 0.6) {
      const bilgeT = (frac - 0.3) / 0.3;
      const bilgeAngle = bilgeT * Math.PI / 2;
      const bx = 0.3 * halfBeam + bilgeRadius * Math.sin(bilgeAngle);
      const by = -sectionDraft + Math.tan(deadriseAngle * Math.PI / 180) * 0.3 * halfBeam;
      const bilgeRise = bilgeRadius * (1 - Math.cos(bilgeAngle));
      y = by + bilgeRise;
      points.push({ x: bx, y });
      continue;
    } else {
      const topT = (frac - 0.6) / 0.4;
      const baseY = -sectionDraft * 0.15;
      y = baseY + topT * (freeboard - baseY);
      const flareX = x + flare * halfBeam * topT;
      points.push({ x: flareX, y });
      continue;
    }
    points.push({ x, y });
  }

  return points;
}

export function buildHullGeometry(params: HullParams): THREE.BufferGeometry {
  const { length, beam, draft, profile } = params;
  const halfLen = length / 2;
  const freeboard = draft * 0.4;

  const positions: number[] = [];
  const indices: number[] = [];

  const stationProfiles: Array<Array<{ x: number; y: number }>> = [];

  for (let i = 0; i <= STATIONS; i++) {
    const stationT = i / STATIONS;
    const z = halfLen - stationT * length;
    const bAtS = beamAtStation(stationT, beam, profile);
    const dAtS = draftAtStation(stationT, draft, profile);
    const halfBeam = bAtS / 2;

    const rightSide = hullCrossSection(stationT, halfBeam, dAtS, freeboard, profile);
    const leftSide = rightSide.map((p) => ({ x: -p.x, y: p.y })).reverse();
    const fullSection = [...leftSide, ...rightSide];

    stationProfiles.push(fullSection);

    for (const p of fullSection) {
      positions.push(p.x, p.y, z);
    }
  }

  const ptsPerStation = stationProfiles[0].length;

  for (let i = 0; i < STATIONS; i++) {
    for (let j = 0; j < ptsPerStation - 1; j++) {
      const a = i * ptsPerStation + j;
      const b = a + 1;
      const c = (i + 1) * ptsPerStation + j;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildDeckGeometry(params: HullParams): THREE.BufferGeometry {
  const { length, beam, profile } = params;
  const halfLen = length / 2;
  const freeboard = params.draft * 0.4;
  const camber = 0.015 * beam;

  const positions: number[] = [];
  const indices: number[] = [];
  const deckSegments = 8;

  for (let i = 0; i <= STATIONS; i++) {
    const stationT = i / STATIONS;
    const z = halfLen - stationT * length;
    const bAtS = beamAtStation(stationT, beam, profile) * 0.92;
    const halfBeam = bAtS / 2;

    for (let j = 0; j <= deckSegments; j++) {
      const t = j / deckSegments;
      const x = -halfBeam + t * halfBeam * 2;
      const camberY = freeboard + camber * (1 - Math.pow(2 * t - 1, 2));
      positions.push(x, camberY, z);
    }
  }

  for (let i = 0; i < STATIONS; i++) {
    for (let j = 0; j < deckSegments; j++) {
      const a = i * (deckSegments + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (deckSegments + 1) + j;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildCabinGeometry(params: HullParams): THREE.BufferGeometry | null {
  const { length, beam, draft, profile } = params;
  const freeboard = draft * 0.4;

  if (profile === 'sailboat') {
    const cabinLen = length * 0.38;
    const cabinW = beam * 0.45;
    const cabinH = beam * 0.18;
    const cabinZ = -length * 0.05;
    const hw = cabinW / 2;

    const shape = new THREE.Shape();
    const r = Math.min(hw * 0.25, cabinH * 0.4);
    shape.moveTo(-hw + r, 0);
    shape.lineTo(hw - r, 0);
    shape.quadraticCurveTo(hw, 0, hw, r);
    shape.lineTo(hw, cabinH - r);
    shape.quadraticCurveTo(hw, cabinH, hw - r, cabinH);
    shape.lineTo(-hw + r, cabinH);
    shape.quadraticCurveTo(-hw, cabinH, -hw, cabinH - r);
    shape.lineTo(-hw, r);
    shape.quadraticCurveTo(-hw, 0, -hw + r, 0);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: cabinLen,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, freeboard, cabinZ);
    return geo;
  }

  if (profile === 'powerboat') {
    const cabinLen = length * 0.28;
    const cabinW = beam * 0.52;
    const cabinH = beam * 0.22;
    const cabinZ = -length * 0.02;
    const hw = cabinW / 2;

    const shape = new THREE.Shape();
    shape.moveTo(-hw, 0);
    shape.lineTo(hw, 0);
    shape.lineTo(hw, cabinH * 0.65);
    shape.lineTo(hw * 0.85, cabinH);
    shape.lineTo(-hw * 0.85, cabinH);
    shape.lineTo(-hw, cabinH * 0.65);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: cabinLen,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, freeboard, cabinZ);
    return geo;
  }

  if (profile === 'trawler') {
    const cabinLen = length * 0.42;
    const cabinW = beam * 0.55;
    const cabinH = beam * 0.25;
    const cabinZ = -length * 0.08;
    const hw = cabinW / 2;

    const shape = new THREE.Shape();
    shape.moveTo(-hw, 0);
    shape.lineTo(hw, 0);
    shape.lineTo(hw, cabinH * 0.6);
    shape.lineTo(hw * 0.85, cabinH);
    shape.lineTo(-hw * 0.85, cabinH);
    shape.lineTo(-hw, cabinH * 0.6);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: cabinLen,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, freeboard, cabinZ);
    return geo;
  }

  return null;
}

export function buildRailingGeometry(params: HullParams): THREE.BufferGeometry {
  const { length, beam, draft, profile } = params;
  const halfLen = length / 2;
  const freeboard = draft * 0.4;
  const railH = freeboard + 0.025;

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= STATIONS; i++) {
    const stationT = i / STATIONS;
    const z = halfLen - stationT * length;
    const bAtS = beamAtStation(stationT, beam, profile) * 0.93;
    points.push(new THREE.Vector3(bAtS / 2, railH, z));
  }

  for (let i = STATIONS; i >= 0; i--) {
    const stationT = i / STATIONS;
    const z = halfLen - stationT * length;
    const bAtS = beamAtStation(stationT, beam, profile) * 0.93;
    points.push(new THREE.Vector3(-bAtS / 2, railH, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, true);
  return new THREE.TubeGeometry(curve, 80, 0.003, 4, true);
}

export function buildWaterlineGeometry(params: HullParams): THREE.BufferGeometry {
  const { length, beam, profile } = params;
  const halfLen = length / 2;

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= STATIONS; i++) {
    const stationT = i / STATIONS;
    const z = halfLen - stationT * length;
    const bAtS = beamAtStation(stationT, beam, profile) * 0.97;
    points.push(new THREE.Vector3(bAtS / 2, 0, z));
  }

  for (let i = STATIONS; i >= 0; i--) {
    const stationT = i / STATIONS;
    const z = halfLen - stationT * length;
    const bAtS = beamAtStation(stationT, beam, profile) * 0.97;
    points.push(new THREE.Vector3(-bAtS / 2, 0, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, true);
  return new THREE.TubeGeometry(curve, 80, 0.004, 4, true);
}

export function buildMastGeometry(params: HullParams): THREE.BufferGeometry | null {
  if (params.profile !== 'sailboat') return null;
  const mastHeight = params.length * 0.9;
  const mastRadius = params.beam * 0.012;
  const mastZ = params.length * 0.08;
  const freeboard = params.draft * 0.4;

  const geo = new THREE.CylinderGeometry(mastRadius, mastRadius * 1.1, mastHeight, 8);
  geo.translate(0, freeboard + mastHeight / 2, mastZ);
  return geo;
}

export function resolveHullProfile(vesselType?: string): HullProfile {
  if (!vesselType) return 'powerboat';
  if (vesselType.startsWith('sailboat') || vesselType === 'trimaran') return 'sailboat';
  if (vesselType.startsWith('catamaran')) return 'catamaran';
  if (vesselType === 'trawler' || vesselType.includes('expedition')) return 'trawler';
  return 'powerboat';
}
