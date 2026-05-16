import { SpaceType, VesselType } from '@/types';
import type { SpaceGeometry } from '@/types';

export type TemplateCategory = 'sailboat' | 'powerboat' | 'catamaran' | 'workboat' | 'small_craft';

export interface DefaultSpaceTemplate {
  name: string;
  type: SpaceType;
  deck: number;
  deckName: string;
  geometry: SpaceGeometry;
  description?: string;
}

export interface VesselTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  vesselType: VesselType;
  lengthRange: [number, number]; // feet
  hullPoints: Array<{ x: number; y: number }>;
  defaultSpaces: DefaultSpaceTemplate[];
  thumbnail: string; // SVG path string for the picker card (scaled to 80x30)
}

// All hulls use a 800×300 SVG viewBox, bow at top (y=0), stern at bottom (y=300).
// The centerline is x=400.

// ============================================================================
// SAILBOATS
// ============================================================================

const sailboat25: VesselTemplate = {
  id: 'sailboat-25',
  name: 'Coastal Sloop 25\'',
  category: 'sailboat',
  vesselType: VesselType.SAILBOAT_CRUISER,
  lengthRange: [24, 27],
  hullPoints: [
    { x: 400, y: 5 },
    { x: 350, y: 30 }, { x: 310, y: 80 }, { x: 295, y: 140 },
    { x: 295, y: 200 }, { x: 310, y: 255 }, { x: 350, y: 280 },
    { x: 400, y: 290 },
    { x: 450, y: 280 }, { x: 490, y: 255 }, { x: 505, y: 200 },
    { x: 505, y: 140 }, { x: 490, y: 80 }, { x: 450, y: 30 },
  ],
  defaultSpaces: [
    { name: 'Anchor Locker', type: SpaceType.ANCHOR_LOCKER, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 350, y: 10, width: 100, height: 35 } },
    { name: 'V-Berth', type: SpaceType.BERTH, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 330, y: 50, width: 140, height: 80 } },
    { name: 'Head', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 300, y: 135, width: 90, height: 55 } },
    { name: 'Salon', type: SpaceType.SALON, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 300, y: 195, width: 200, height: 60 } },
    { name: 'Galley', type: SpaceType.GALLEY, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 410, y: 135, width: 90, height: 55 } },
    { name: 'Quarter Berth', type: SpaceType.BERTH, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 415, y: 200, width: 80, height: 55 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 330, y: 258, width: 140, height: 30 } },
  ],
  thumbnail: 'M40,2 L30,5 L27,12 L27,22 L30,28 L40,30 L50,28 L53,22 L53,12 L50,5 Z',
};

const sailboat30: VesselTemplate = {
  id: 'sailboat-30',
  name: 'Sloop 30\'',
  category: 'sailboat',
  vesselType: VesselType.SAILBOAT_CRUISER,
  lengthRange: [28, 32],
  hullPoints: [
    { x: 400, y: 5 },
    { x: 345, y: 28 }, { x: 305, y: 75 }, { x: 288, y: 140 },
    { x: 286, y: 205 }, { x: 300, y: 255 }, { x: 345, y: 282 },
    { x: 400, y: 292 },
    { x: 455, y: 282 }, { x: 500, y: 255 }, { x: 514, y: 205 },
    { x: 512, y: 140 }, { x: 495, y: 75 }, { x: 455, y: 28 },
  ],
  defaultSpaces: [
    { name: 'Anchor Locker', type: SpaceType.ANCHOR_LOCKER, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 348, y: 8, width: 104, height: 38 } },
    { name: 'V-Berth', type: SpaceType.BERTH, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 320, y: 48, width: 160, height: 90 } },
    { name: 'Head', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 292, y: 142, width: 95, height: 58 } },
    { name: 'Salon', type: SpaceType.SALON, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 292, y: 205, width: 216, height: 45 } },
    { name: 'Galley', type: SpaceType.GALLEY, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 413, y: 142, width: 95, height: 58 } },
    { name: 'Aft Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 352, y: 253, width: 96, height: 30 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 320, y: 258, width: 160, height: 28 } },
  ],
  thumbnail: 'M40,2 L29,6 L25,14 L25,23 L29,28 L40,30 L51,28 L55,23 L55,14 L51,6 Z',
};

const sailboat36: VesselTemplate = {
  id: 'sailboat-36',
  name: 'Cruiser 36\'',
  category: 'sailboat',
  vesselType: VesselType.SAILBOAT_CRUISER,
  lengthRange: [34, 38],
  hullPoints: [
    { x: 400, y: 5 },
    { x: 340, y: 25 }, { x: 298, y: 70 }, { x: 280, y: 135 },
    { x: 278, y: 205 }, { x: 292, y: 252 }, { x: 340, y: 280 },
    { x: 400, y: 292 },
    { x: 460, y: 280 }, { x: 508, y: 252 }, { x: 522, y: 205 },
    { x: 520, y: 135 }, { x: 502, y: 70 }, { x: 460, y: 25 },
  ],
  defaultSpaces: [
    { name: 'Anchor Locker', type: SpaceType.ANCHOR_LOCKER, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 345, y: 8, width: 110, height: 35 } },
    { name: 'V-Berth', type: SpaceType.BERTH, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 315, y: 45, width: 170, height: 88 } },
    { name: 'Head (Fwd)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 283, y: 138, width: 90, height: 62 } },
    { name: 'Salon (Port)', type: SpaceType.SALON, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 283, y: 205, width: 105, height: 42 } },
    { name: 'Galley', type: SpaceType.GALLEY, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 427, y: 138, width: 90, height: 62 } },
    { name: 'Salon (Stbd)', type: SpaceType.SALON, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 412, y: 205, width: 105, height: 42 } },
    { name: 'Aft Cabin (Port)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 295, y: 252, width: 95, height: 30 } },
    { name: 'Aft Cabin (Stbd)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 410, y: 252, width: 95, height: 30 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 315, y: 255, width: 170, height: 32 } },
    { name: 'Lazarette', type: SpaceType.LAZARETTE, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 355, y: 280, width: 90, height: 12 } },
  ],
  thumbnail: 'M40,1 L28,6 L23,15 L23,24 L28,29 L40,30 L52,29 L57,24 L57,15 L52,6 Z',
};

const sailboat40: VesselTemplate = {
  id: 'sailboat-40',
  name: 'Bluewater 40\'',
  category: 'sailboat',
  vesselType: VesselType.SAILBOAT_CRUISER,
  lengthRange: [38, 43],
  hullPoints: [
    { x: 400, y: 4 },
    { x: 335, y: 22 }, { x: 290, y: 65 }, { x: 272, y: 128 },
    { x: 268, y: 200 }, { x: 280, y: 250 }, { x: 332, y: 278 },
    { x: 400, y: 292 },
    { x: 468, y: 278 }, { x: 520, y: 250 }, { x: 532, y: 200 },
    { x: 528, y: 128 }, { x: 510, y: 65 }, { x: 465, y: 22 },
  ],
  defaultSpaces: [
    { name: 'Anchor Locker', type: SpaceType.ANCHOR_LOCKER, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 342, y: 6, width: 116, height: 36 } },
    { name: 'Fwd Berth', type: SpaceType.BERTH, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 308, y: 44, width: 184, height: 84 } },
    { name: 'Head (Fwd)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 275, y: 132, width: 94, height: 65 } },
    { name: 'Navigation Station', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 431, y: 132, width: 94, height: 65 } },
    { name: 'Salon (P)', type: SpaceType.SALON, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 275, y: 202, width: 115, height: 44 } },
    { name: 'Galley', type: SpaceType.GALLEY, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 410, y: 202, width: 115, height: 44 } },
    { name: 'Aft Cabin (P)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 283, y: 250, width: 105, height: 28 } },
    { name: 'Aft Cabin (S)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 412, y: 250, width: 105, height: 28 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 320, y: 255, width: 160, height: 32 } },
  ],
  thumbnail: 'M40,1 L27,7 L21,16 L21,25 L27,29 L40,30 L53,29 L59,25 L59,16 L53,7 Z',
};

const sailboat45: VesselTemplate = {
  id: 'sailboat-45',
  name: 'Offshore 45\'',
  category: 'sailboat',
  vesselType: VesselType.SAILBOAT_CRUISER,
  lengthRange: [43, 48],
  hullPoints: [
    { x: 400, y: 4 },
    { x: 330, y: 20 }, { x: 282, y: 60 }, { x: 262, y: 122 },
    { x: 258, y: 196 }, { x: 272, y: 248 }, { x: 326, y: 277 },
    { x: 400, y: 293 },
    { x: 474, y: 277 }, { x: 528, y: 248 }, { x: 542, y: 196 },
    { x: 538, y: 122 }, { x: 518, y: 60 }, { x: 470, y: 20 },
  ],
  defaultSpaces: [
    { name: 'Anchor Locker', type: SpaceType.ANCHOR_LOCKER, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 340, y: 6, width: 120, height: 36 } },
    { name: 'Fwd Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 305, y: 44, width: 190, height: 78 } },
    { name: 'Head (P)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 265, y: 126, width: 90, height: 65 } },
    { name: 'Head (S)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 445, y: 126, width: 90, height: 65 } },
    { name: 'Salon', type: SpaceType.SALON, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 265, y: 196, width: 270, height: 48 } },
    { name: 'Aft Cabin (P)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 275, y: 249, width: 110, height: 28 } },
    { name: 'Aft Cabin (S)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 415, y: 249, width: 110, height: 28 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 315, y: 254, width: 170, height: 34 } },
  ],
  thumbnail: 'M40,1 L26,7 L20,17 L20,25 L26,29 L40,30 L54,29 L60,25 L60,17 L54,7 Z',
};

const sailboat50: VesselTemplate = {
  id: 'sailboat-50',
  name: 'Ketch/Yawl 50\'',
  category: 'sailboat',
  vesselType: VesselType.SAILBOAT_CRUISER,
  lengthRange: [48, 54],
  hullPoints: [
    { x: 400, y: 3 },
    { x: 325, y: 18 }, { x: 275, y: 55 }, { x: 254, y: 116 },
    { x: 250, y: 192 }, { x: 264, y: 245 }, { x: 320, y: 276 },
    { x: 400, y: 293 },
    { x: 480, y: 276 }, { x: 536, y: 245 }, { x: 550, y: 192 },
    { x: 546, y: 116 }, { x: 525, y: 55 }, { x: 475, y: 18 },
  ],
  defaultSpaces: [
    { name: 'Anchor Locker', type: SpaceType.ANCHOR_LOCKER, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 338, y: 5, width: 124, height: 36 } },
    { name: 'Fwd Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 300, y: 43, width: 200, height: 72 } },
    { name: 'Heads (P)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 257, y: 118, width: 90, height: 70 } },
    { name: 'Nav Station', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 453, y: 118, width: 90, height: 70 } },
    { name: 'Salon', type: SpaceType.SALON, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 257, y: 193, width: 286, height: 48 } },
    { name: 'Aft Cabin (P)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 267, y: 246, width: 118, height: 28 } },
    { name: 'Aft Cabin (S)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 415, y: 246, width: 118, height: 28 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 310, y: 251, width: 180, height: 38 } },
  ],
  thumbnail: 'M40,1 L25,8 L19,18 L19,25 L25,29 L40,30 L55,29 L61,25 L61,18 L55,8 Z',
};

const sailboat60: VesselTemplate = {
  id: 'sailboat-60',
  name: 'Ocean 60\'',
  category: 'sailboat',
  vesselType: VesselType.SAILBOAT_CRUISER,
  lengthRange: [57, 63],
  hullPoints: [
    { x: 400, y: 3 },
    { x: 318, y: 16 }, { x: 265, y: 50 }, { x: 242, y: 110 },
    { x: 238, y: 186 }, { x: 252, y: 241 }, { x: 312, y: 273 },
    { x: 400, y: 293 },
    { x: 488, y: 273 }, { x: 548, y: 241 }, { x: 562, y: 186 },
    { x: 558, y: 110 }, { x: 535, y: 50 }, { x: 482, y: 16 },
  ],
  defaultSpaces: [
    { name: 'Anchor Locker', type: SpaceType.ANCHOR_LOCKER, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 335, y: 5, width: 130, height: 34 } },
    { name: 'Fwd Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 295, y: 40, width: 210, height: 70 } },
    { name: 'Head (P)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 245, y: 113, width: 90, height: 72 } },
    { name: 'Head (S)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 465, y: 113, width: 90, height: 72 } },
    { name: 'Salon', type: SpaceType.SALON, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 245, y: 190, width: 310, height: 48 } },
    { name: 'Aft Cabin (P)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 255, y: 243, width: 120, height: 28 } },
    { name: 'Aft Cabin (S)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 425, y: 243, width: 120, height: 28 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 305, y: 248, width: 190, height: 40 } },
  ],
  thumbnail: 'M40,1 L24,8 L17,19 L17,25 L24,29 L40,30 L56,29 L63,25 L63,19 L56,8 Z',
};

// ============================================================================
// POWERBOATS
// ============================================================================

function makePowerHull(beamFraction: number, sternWidth: number): Array<{ x: number; y: number }> {
  const b = beamFraction;
  return [
    { x: 400, y: 5 },
    { x: 400 - 35 * b, y: 22 }, { x: 400 - 85 * b, y: 65 }, { x: 400 - 115 * b, y: 130 },
    { x: 400 - 118 * b, y: 200 }, { x: 400 - 110 * b, y: 252 }, { x: 400 - sternWidth / 2, y: 285 },
    { x: 400, y: 292 },
    { x: 400 + sternWidth / 2, y: 285 }, { x: 400 + 110 * b, y: 252 }, { x: 400 + 118 * b, y: 200 },
    { x: 400 + 115 * b, y: 130 }, { x: 400 + 85 * b, y: 65 }, { x: 400 + 35 * b, y: 22 },
  ];
}

const centerConsole18: VesselTemplate = {
  id: 'center-console-18',
  name: 'Center Console 18\'',
  category: 'powerboat',
  vesselType: VesselType.MOTORBOAT_CENTER_CONSOLE,
  lengthRange: [16, 20],
  hullPoints: makePowerHull(0.72, 150),
  defaultSpaces: [
    { name: 'Bow Deck', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 330, y: 10, width: 140, height: 80 } },
    { name: 'Center Console', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 350, y: 130, width: 100, height: 70 } },
    { name: 'Live Well', type: SpaceType.COMPARTMENT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 295, y: 200, width: 80, height: 50 } },
    { name: 'Stern Storage', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 295, y: 255, width: 210, height: 30 } },
  ],
  thumbnail: 'M40,2 L28,8 L22,18 L22,24 L28,28 L40,30 L52,28 L58,24 L58,18 L52,8 Z',
};

const centerConsole24: VesselTemplate = {
  id: 'center-console-24',
  name: 'Center Console 24\'',
  category: 'powerboat',
  vesselType: VesselType.MOTORBOAT_CENTER_CONSOLE,
  lengthRange: [22, 26],
  hullPoints: makePowerHull(0.78, 160),
  defaultSpaces: [
    { name: 'Bow Seating', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 322, y: 10, width: 156, height: 90 } },
    { name: 'Center Console', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 345, y: 130, width: 110, height: 80 } },
    { name: 'Port Storage', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 288, y: 200, width: 90, height: 55 } },
    { name: 'Stbd Storage', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 422, y: 200, width: 90, height: 55 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 295, y: 258, width: 210, height: 28 } },
  ],
  thumbnail: 'M40,2 L27,8 L21,18 L21,25 L27,29 L40,30 L53,29 L59,25 L59,18 L53,8 Z',
};

const expressCruiser28: VesselTemplate = {
  id: 'express-cruiser-28',
  name: 'Express Cruiser 28\'',
  category: 'powerboat',
  vesselType: VesselType.MOTORBOAT_CRUISER,
  lengthRange: [26, 30],
  hullPoints: makePowerHull(0.8, 165),
  defaultSpaces: [
    { name: 'Bow Seating', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 318, y: 10, width: 164, height: 72 } },
    { name: 'Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 318, y: 85, width: 164, height: 110 } },
    { name: 'Head', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 318, y: 198, width: 80, height: 55 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 298, y: 258, width: 204, height: 32 } },
    { name: 'Engine Hatch', type: SpaceType.ENGINE_ROOM, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 350, y: 260, width: 100, height: 28 } },
  ],
  thumbnail: 'M40,2 L27,8 L21,17 L21,24 L27,28 L40,30 L53,28 L59,24 L59,17 L53,8 Z',
};

const expressCruiser34: VesselTemplate = {
  id: 'express-cruiser-34',
  name: 'Express Cruiser 34\'',
  category: 'powerboat',
  vesselType: VesselType.MOTORBOAT_CRUISER,
  lengthRange: [32, 36],
  hullPoints: makePowerHull(0.85, 175),
  defaultSpaces: [
    { name: 'Bow Deck', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 315, y: 8, width: 170, height: 60 } },
    { name: 'Salon', type: SpaceType.SALON, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 315, y: 72, width: 170, height: 80 } },
    { name: 'Fwd Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 315, y: 72, width: 170, height: 80 } },
    { name: 'Head', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 315, y: 156, width: 85, height: 65 } },
    { name: 'Aft Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 315, y: 225, width: 170, height: 28 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 298, y: 256, width: 204, height: 34 } },
  ],
  thumbnail: 'M40,2 L26,8 L20,17 L20,24 L26,28 L40,30 L54,28 L60,24 L60,17 L54,8 Z',
};

const flybridge40: VesselTemplate = {
  id: 'flybridge-40',
  name: 'Flybridge 40\'',
  category: 'powerboat',
  vesselType: VesselType.YACHT_FLYBRIDGE,
  lengthRange: [38, 42],
  hullPoints: makePowerHull(0.9, 185),
  defaultSpaces: [
    { name: 'Flybridge', type: SpaceType.FLYBRIDGE, deck: 1, deckName: 'Upper Deck', geometry: { kind: 'rect', x: 310, y: 40, width: 180, height: 100 } },
    { name: 'Salon', type: SpaceType.SALON, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 308, y: 48, width: 184, height: 90 } },
    { name: 'Galley', type: SpaceType.GALLEY, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 308, y: 142, width: 90, height: 55 } },
    { name: 'Head (P)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 290, y: 142, width: 90, height: 55 } },
    { name: 'Fwd Stateroom', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 308, y: 48, width: 184, height: 90 } },
    { name: 'Aft Stateroom (P)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 290, y: 202, width: 100, height: 50 } },
    { name: 'Aft Stateroom (S)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 410, y: 202, width: 100, height: 50 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 295, y: 258, width: 210, height: 34 } },
    { name: 'Engine Room', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 330, y: 255, width: 140, height: 30 } },
  ],
  thumbnail: 'M40,1 L25,7 L19,17 L19,24 L25,28 L40,30 L55,28 L61,24 L61,17 L55,7 Z',
};

const sportfish35: VesselTemplate = {
  id: 'sportfish-35',
  name: 'Sportfisher 35\'',
  category: 'powerboat',
  vesselType: VesselType.MOTORBOAT_SPORTFISH,
  lengthRange: [33, 37],
  hullPoints: makePowerHull(0.83, 170),
  defaultSpaces: [
    { name: 'Fighting Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 300, y: 225, width: 200, height: 65 } },
    { name: 'Cabin', type: SpaceType.CABIN, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 310, y: 55, width: 180, height: 90 } },
    { name: 'Berth', type: SpaceType.BERTH, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 320, y: 60, width: 160, height: 75 } },
    { name: 'Head', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 320, y: 138, width: 80, height: 60 } },
    { name: 'Live Well', type: SpaceType.COMPARTMENT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 350, y: 200, width: 100, height: 25 } },
    { name: 'Bait Station', type: SpaceType.COMPARTMENT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 295, y: 170, width: 75, height: 55 } },
  ],
  thumbnail: 'M40,2 L26,8 L20,17 L20,24 L26,28 L40,30 L54,28 L60,24 L60,17 L54,8 Z',
};

const bowrider22: VesselTemplate = {
  id: 'bowrider-22',
  name: 'Bowrider 22\'',
  category: 'powerboat',
  vesselType: VesselType.MOTORBOAT_BOWRIDER,
  lengthRange: [20, 24],
  hullPoints: makePowerHull(0.76, 158),
  defaultSpaces: [
    { name: 'Bow Rider Area', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 325, y: 8, width: 150, height: 105 } },
    { name: 'Helm', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 300, y: 130, width: 200, height: 80 } },
    { name: 'Aft Deck', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 300, y: 220, width: 200, height: 68 } },
    { name: 'Bow Storage', type: SpaceType.DECK_STORAGE, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 342, y: 10, width: 116, height: 60 } },
  ],
  thumbnail: 'M40,2 L28,8 L22,18 L22,25 L28,29 L40,30 L52,29 L58,25 L58,18 L52,8 Z',
};

const trawler36: VesselTemplate = {
  id: 'trawler-36',
  name: 'Trawler 36\'',
  category: 'powerboat',
  vesselType: VesselType.TRAWLER,
  lengthRange: [34, 40],
  hullPoints: [
    { x: 400, y: 5 },
    { x: 350, y: 20 }, { x: 310, y: 55 }, { x: 292, y: 110 },
    { x: 285, y: 185 }, { x: 285, y: 265 }, { x: 295, y: 285 },
    { x: 400, y: 292 },
    { x: 505, y: 285 }, { x: 515, y: 265 }, { x: 515, y: 185 },
    { x: 508, y: 110 }, { x: 490, y: 55 }, { x: 450, y: 20 },
  ],
  defaultSpaces: [
    { name: 'Pilothouse', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 310, y: 65, width: 180, height: 85 } },
    { name: 'Salon', type: SpaceType.SALON, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 292, y: 155, width: 216, height: 75 } },
    { name: 'Fwd Stateroom', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 315, y: 10, width: 170, height: 75 } },
    { name: 'Head', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 292, y: 88, width: 90, height: 65 } },
    { name: 'Aft Stateroom', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 292, y: 235, width: 216, height: 50 } },
    { name: 'Engine Room', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 315, y: 260, width: 170, height: 30 } },
  ],
  thumbnail: 'M40,2 L27,7 L21,16 L21,26 L27,29 L40,30 L53,29 L59,26 L59,16 L53,7 Z',
};

const trawler42: VesselTemplate = {
  id: 'trawler-42',
  name: 'Passagemaker 42\'',
  category: 'powerboat',
  vesselType: VesselType.TRAWLER,
  lengthRange: [40, 46],
  hullPoints: [
    { x: 400, y: 4 },
    { x: 343, y: 18 }, { x: 300, y: 52 }, { x: 282, y: 106 },
    { x: 275, y: 180 }, { x: 275, y: 262 }, { x: 287, y: 284 },
    { x: 400, y: 292 },
    { x: 513, y: 284 }, { x: 525, y: 262 }, { x: 525, y: 180 },
    { x: 518, y: 106 }, { x: 500, y: 52 }, { x: 457, y: 18 },
  ],
  defaultSpaces: [
    { name: 'Pilothouse', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 305, y: 60, width: 190, height: 90 } },
    { name: 'Salon', type: SpaceType.SALON, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 282, y: 155, width: 236, height: 75 } },
    { name: 'Fwd Stateroom', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 308, y: 8, width: 184, height: 80 } },
    { name: 'Head (P)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 282, y: 92, width: 90, height: 60 } },
    { name: 'Head (S)', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 428, y: 92, width: 90, height: 60 } },
    { name: 'Mid Stateroom (P)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 282, y: 235, width: 105, height: 50 } },
    { name: 'Mid Stateroom (S)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 413, y: 235, width: 105, height: 50 } },
    { name: 'Engine Room', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 318, y: 258, width: 164, height: 30 } },
  ],
  thumbnail: 'M40,1 L26,7 L20,16 L20,26 L26,29 L40,30 L54,29 L60,26 L60,16 L54,7 Z',
};

// ============================================================================
// MULTIHULLS
// ============================================================================

const catamaranSail38: VesselTemplate = {
  id: 'catamaran-sail-38',
  name: 'Sailing Cat 38\'',
  category: 'catamaran',
  vesselType: VesselType.CATAMARAN_SAILING,
  lengthRange: [36, 40],
  // Port hull
  hullPoints: [
    { x: 280, y: 5 },
    { x: 250, y: 22 }, { x: 232, y: 65 }, { x: 225, y: 135 },
    { x: 225, y: 210 }, { x: 235, y: 260 }, { x: 262, y: 280 },
    { x: 290, y: 288 },
    { x: 318, y: 280 }, { x: 345, y: 260 }, { x: 355, y: 210 },
    { x: 355, y: 135 }, { x: 348, y: 65 }, { x: 330, y: 22 },
  ],
  defaultSpaces: [
    { name: 'Port Cabin (Fwd)', type: SpaceType.CABIN, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 230, y: 8, width: 112, height: 75 } },
    { name: 'Port Head', type: SpaceType.HEAD, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 228, y: 86, width: 90, height: 55 } },
    { name: 'Port Cabin (Aft)', type: SpaceType.CABIN, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 228, y: 145, width: 118, height: 85 } },
    { name: 'Port Engine', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 232, y: 235, width: 110, height: 45 } },
    { name: 'Stbd Cabin (Fwd)', type: SpaceType.CABIN, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 458, y: 8, width: 112, height: 75 } },
    { name: 'Stbd Head', type: SpaceType.HEAD, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 482, y: 86, width: 90, height: 55 } },
    { name: 'Stbd Cabin (Aft)', type: SpaceType.CABIN, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 454, y: 145, width: 118, height: 85 } },
    { name: 'Stbd Engine', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 458, y: 235, width: 110, height: 45 } },
    { name: 'Salon (Bridgedeck)', type: SpaceType.SALON, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 342, y: 60, width: 116, height: 140 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 330, y: 204, width: 140, height: 78 } },
  ],
  thumbnail: 'M12,5 L8,10 L6,20 L6,26 L8,29 L12,30 L16,29 L18,26 L18,20 L16,10 Z M28,5 L24,10 L22,20 L22,26 L24,29 L28,30 L32,29 L34,26 L34,20 L32,10 Z',
};

const catamaranSail44: VesselTemplate = {
  id: 'catamaran-sail-44',
  name: 'Sailing Cat 44\'',
  category: 'catamaran',
  vesselType: VesselType.CATAMARAN_SAILING,
  lengthRange: [42, 46],
  hullPoints: [
    { x: 268, y: 4 },
    { x: 238, y: 20 }, { x: 218, y: 60 }, { x: 210, y: 130 },
    { x: 208, y: 205 }, { x: 218, y: 258 }, { x: 248, y: 278 },
    { x: 278, y: 288 },
    { x: 308, y: 278 }, { x: 338, y: 258 }, { x: 348, y: 205 },
    { x: 346, y: 130 }, { x: 338, y: 60 }, { x: 318, y: 20 },
  ],
  defaultSpaces: [
    { name: 'Port Fwd Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 213, y: 6, width: 120, height: 80 } },
    { name: 'Port Head', type: SpaceType.HEAD, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 212, y: 89, width: 92, height: 60 } },
    { name: 'Port Aft Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 212, y: 153, width: 128, height: 100 } },
    { name: 'Port Engine', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 216, y: 258, width: 118, height: 28 } },
    { name: 'Stbd Fwd Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 467, y: 6, width: 120, height: 80 } },
    { name: 'Stbd Head', type: SpaceType.HEAD, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 496, y: 89, width: 92, height: 60 } },
    { name: 'Stbd Aft Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 460, y: 153, width: 128, height: 100 } },
    { name: 'Stbd Engine', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 466, y: 258, width: 118, height: 28 } },
    { name: 'Salon', type: SpaceType.SALON, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 340, y: 55, width: 120, height: 150 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 328, y: 208, width: 144, height: 75 } },
  ],
  thumbnail: 'M10,4 L6,9 L4,19 L4,25 L6,29 L10,30 L14,29 L16,25 L16,19 L14,9 Z M30,4 L26,9 L24,19 L24,25 L26,29 L30,30 L34,29 L36,25 L36,19 L34,9 Z',
};

const catamaranPower34: VesselTemplate = {
  id: 'catamaran-power-34',
  name: 'Power Cat 34\'',
  category: 'catamaran',
  vesselType: VesselType.CATAMARAN_POWER,
  lengthRange: [32, 36],
  hullPoints: [
    { x: 278, y: 5 },
    { x: 250, y: 22 }, { x: 232, y: 65 }, { x: 224, y: 140 },
    { x: 222, y: 215 }, { x: 232, y: 262 }, { x: 260, y: 283 },
    { x: 288, y: 290 },
    { x: 316, y: 283 }, { x: 344, y: 262 }, { x: 354, y: 215 },
    { x: 352, y: 140 }, { x: 344, y: 65 }, { x: 326, y: 22 },
  ],
  defaultSpaces: [
    { name: 'Port Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 226, y: 8, width: 120, height: 160 } },
    { name: 'Port Engine', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Port Hull', geometry: { kind: 'rect', x: 228, y: 230, width: 118, height: 55 } },
    { name: 'Stbd Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 454, y: 8, width: 120, height: 160 } },
    { name: 'Stbd Engine', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Starboard Hull', geometry: { kind: 'rect', x: 454, y: 230, width: 118, height: 55 } },
    { name: 'Pilothouse', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 345, y: 45, width: 110, height: 100 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 335, y: 180, width: 130, height: 108 } },
  ],
  thumbnail: 'M11,3 L7,8 L5,18 L5,24 L7,28 L11,30 L15,28 L17,24 L17,18 L15,8 Z M29,3 L25,8 L23,18 L23,24 L25,28 L29,30 L33,28 L35,24 L35,18 L33,8 Z',
};

const trimaran38: VesselTemplate = {
  id: 'trimaran-38',
  name: 'Cruising Trimaran 38\'',
  category: 'catamaran',
  vesselType: VesselType.TRIMARAN,
  lengthRange: [36, 40],
  hullPoints: [
    { x: 400, y: 5 },
    { x: 368, y: 22 }, { x: 348, y: 65 }, { x: 338, y: 140 },
    { x: 336, y: 212 }, { x: 346, y: 258 }, { x: 372, y: 278 },
    { x: 400, y: 288 },
    { x: 428, y: 278 }, { x: 454, y: 258 }, { x: 464, y: 212 },
    { x: 462, y: 140 }, { x: 452, y: 65 }, { x: 432, y: 22 },
  ],
  defaultSpaces: [
    { name: 'Main Cabin (Fwd)', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 345, y: 8, width: 110, height: 80 } },
    { name: 'Head', type: SpaceType.HEAD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 342, y: 92, width: 90, height: 60 } },
    { name: 'Salon', type: SpaceType.SALON, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 340, y: 155, width: 120, height: 80 } },
    { name: 'Aft Cabin', type: SpaceType.CABIN, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 348, y: 240, width: 104, height: 44 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 338, y: 215, width: 124, height: 68 } },
  ],
  thumbnail: 'M40,2 L34,6 L32,15 L32,22 L34,27 L40,30 L46,27 L48,22 L48,15 L46,6 Z',
};

// ============================================================================
// WORKBOATS
// ============================================================================

const rib26: VesselTemplate = {
  id: 'rib-26',
  name: 'RIB 26\'',
  category: 'powerboat',
  vesselType: VesselType.MOTORBOAT_CENTER_CONSOLE,
  lengthRange: [24, 28],
  hullPoints: makePowerHull(0.74, 155),
  defaultSpaces: [
    { name: 'Forward Deck', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 328, y: 8, width: 144, height: 80 } },
    { name: 'Console', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 348, y: 128, width: 104, height: 72 } },
    { name: 'Aft Deck', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 298, y: 218, width: 204, height: 72 } },
  ],
  thumbnail: 'M40,3 L28,9 L23,18 L23,24 L28,28 L40,30 L52,28 L57,24 L57,18 L52,9 Z',
};

const lobsterBoat38: VesselTemplate = {
  id: 'lobster-38',
  name: 'Lobster Boat 38\'',
  category: 'workboat',
  vesselType: VesselType.COMMERCIAL_FISHING,
  lengthRange: [36, 40],
  hullPoints: [
    { x: 400, y: 5 },
    { x: 352, y: 18 }, { x: 312, y: 52 }, { x: 292, y: 105 },
    { x: 284, y: 178 }, { x: 282, y: 258 }, { x: 293, y: 282 },
    { x: 400, y: 290 },
    { x: 507, y: 282 }, { x: 518, y: 258 }, { x: 516, y: 178 },
    { x: 508, y: 105 }, { x: 488, y: 52 }, { x: 448, y: 18 },
  ],
  defaultSpaces: [
    { name: 'Pilothouse', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 318, y: 50, width: 164, height: 88 } },
    { name: 'Bait Storage', type: SpaceType.HOLD, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 295, y: 148, width: 210, height: 75 } },
    { name: 'Fish Hold', type: SpaceType.HOLD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 295, y: 228, width: 210, height: 52 } },
    { name: 'Berth / Head', type: SpaceType.BERTH, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 322, y: 8, width: 156, height: 55 } },
    { name: 'Engine Room', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 325, y: 258, width: 150, height: 28 } },
  ],
  thumbnail: 'M40,2 L27,7 L21,15 L21,25 L27,28 L40,30 L53,28 L59,25 L59,15 L53,7 Z',
};

const commercialFishing45: VesselTemplate = {
  id: 'commercial-fishing-45',
  name: 'Commercial Fishing 45\'',
  category: 'workboat',
  vesselType: VesselType.COMMERCIAL_FISHING,
  lengthRange: [42, 48],
  hullPoints: [
    { x: 400, y: 4 },
    { x: 345, y: 16 }, { x: 300, y: 48 }, { x: 278, y: 100 },
    { x: 270, y: 172 }, { x: 268, y: 255 }, { x: 280, y: 282 },
    { x: 400, y: 292 },
    { x: 520, y: 282 }, { x: 532, y: 255 }, { x: 530, y: 172 },
    { x: 522, y: 100 }, { x: 500, y: 48 }, { x: 455, y: 16 },
  ],
  defaultSpaces: [
    { name: 'Pilothouse', type: SpaceType.COCKPIT, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 315, y: 55, width: 170, height: 95 } },
    { name: 'Crew Berths', type: SpaceType.BERTH, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 290, y: 8, width: 220, height: 80 } },
    { name: 'Processing Area', type: SpaceType.HOLD, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 278, y: 158, width: 244, height: 90 } },
    { name: 'Fish Hold', type: SpaceType.HOLD, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 280, y: 252, width: 240, height: 38 } },
    { name: 'Engine Room', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 320, y: 265, width: 160, height: 24 } },
    { name: 'Fuel Tanks', type: SpaceType.FUEL_TANK, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 285, y: 155, width: 90, height: 50 } },
  ],
  thumbnail: 'M40,1 L26,6 L20,14 L20,25 L26,28 L40,30 L54,28 L60,25 L60,14 L54,6 Z',
};

const tug32: VesselTemplate = {
  id: 'tug-32',
  name: 'Tug 32\'',
  category: 'workboat',
  vesselType: VesselType.COMMERCIAL_TOW,
  lengthRange: [30, 34],
  hullPoints: [
    { x: 400, y: 6 },
    { x: 355, y: 18 }, { x: 318, y: 48 }, { x: 298, y: 100 },
    { x: 290, y: 172 }, { x: 290, y: 260 }, { x: 302, y: 283 },
    { x: 400, y: 290 },
    { x: 498, y: 283 }, { x: 510, y: 260 }, { x: 510, y: 172 },
    { x: 502, y: 100 }, { x: 482, y: 48 }, { x: 445, y: 18 },
  ],
  defaultSpaces: [
    { name: 'Pilothouse', type: SpaceType.COCKPIT, deck: 1, deckName: 'Upper Deck', geometry: { kind: 'rect', x: 322, y: 58, width: 156, height: 88 } },
    { name: 'Deck House', type: SpaceType.CABIN, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 322, y: 58, width: 156, height: 88 } },
    { name: 'Fore Deck', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 305, y: 8, width: 190, height: 50 } },
    { name: 'Aft Towing Deck', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Main Deck', geometry: { kind: 'rect', x: 292, y: 200, width: 216, height: 80 } },
    { name: 'Engine Room', type: SpaceType.ENGINE_ROOM, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 305, y: 160, width: 190, height: 120 } },
    { name: 'Crew Berths', type: SpaceType.BERTH, deck: -1, deckName: 'Below Deck', geometry: { kind: 'rect', x: 318, y: 8, width: 164, height: 65 } },
  ],
  thumbnail: 'M40,2 L28,7 L22,15 L22,26 L28,29 L40,30 L52,29 L58,26 L58,15 L52,7 Z',
};

// ============================================================================
// SMALL CRAFT
// ============================================================================

const kayak: VesselTemplate = {
  id: 'kayak',
  name: 'Sea Kayak',
  category: 'small_craft',
  vesselType: VesselType.KAYAK,
  lengthRange: [14, 18],
  hullPoints: [
    { x: 400, y: 5 },
    { x: 380, y: 12 }, { x: 362, y: 28 }, { x: 355, y: 80 },
    { x: 353, y: 155 }, { x: 355, y: 220 }, { x: 362, y: 265 },
    { x: 380, y: 285 }, { x: 400, y: 292 },
    { x: 420, y: 285 }, { x: 438, y: 265 }, { x: 445, y: 220 },
    { x: 447, y: 155 }, { x: 445, y: 80 }, { x: 438, y: 28 }, { x: 420, y: 12 },
  ],
  defaultSpaces: [
    { name: 'Bow Hatch', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Deck', geometry: { kind: 'rect', x: 360, y: 12, width: 80, height: 68 } },
    { name: 'Cockpit', type: SpaceType.COCKPIT, deck: 0, deckName: 'Deck', geometry: { kind: 'rect', x: 356, y: 130, width: 88, height: 85 } },
    { name: 'Stern Hatch', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Deck', geometry: { kind: 'rect', x: 360, y: 228, width: 80, height: 58 } },
  ],
  thumbnail: 'M40,2 L37,5 L36,15 L36,23 L37,27 L40,30 L43,27 L44,23 L44,15 L43,5 Z',
};

const canoe: VesselTemplate = {
  id: 'canoe',
  name: 'Canoe',
  category: 'small_craft',
  vesselType: VesselType.CANOE,
  lengthRange: [14, 18],
  hullPoints: [
    { x: 400, y: 5 },
    { x: 375, y: 14 }, { x: 355, y: 35 }, { x: 345, y: 90 },
    { x: 342, y: 160 }, { x: 345, y: 225 }, { x: 356, y: 268 },
    { x: 376, y: 285 }, { x: 400, y: 292 },
    { x: 424, y: 285 }, { x: 444, y: 268 }, { x: 455, y: 225 },
    { x: 458, y: 160 }, { x: 455, y: 90 }, { x: 445, y: 35 }, { x: 425, y: 14 },
  ],
  defaultSpaces: [
    { name: 'Bow Storage', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Deck', geometry: { kind: 'rect', x: 355, y: 10, width: 90, height: 70 } },
    { name: 'Paddler Area', type: SpaceType.COCKPIT, deck: 0, deckName: 'Deck', geometry: { kind: 'rect', x: 348, y: 100, width: 104, height: 100 } },
    { name: 'Stern Storage', type: SpaceType.DECK_STORAGE, deck: 0, deckName: 'Deck', geometry: { kind: 'rect', x: 356, y: 220, width: 88, height: 65 } },
  ],
  thumbnail: 'M40,3 L36,8 L34,16 L34,23 L36,27 L40,30 L44,27 L46,23 L46,16 L44,8 Z',
};

// ============================================================================
// EXPORTS
// ============================================================================

export const VESSEL_TEMPLATES: VesselTemplate[] = [
  // Sailboats
  sailboat25, sailboat30, sailboat36, sailboat40, sailboat45, sailboat50, sailboat60,
  // Powerboats
  centerConsole18, centerConsole24, expressCruiser28, expressCruiser34,
  flybridge40, sportfish35, bowrider22, trawler36, trawler42,
  // Multihulls
  catamaranSail38, catamaranSail44, catamaranPower34, trimaran38,
  // Workboats
  rib26, lobsterBoat38, commercialFishing45, tug32,
  // Small craft
  kayak, canoe,
];

export function getTemplatesByCategory(category: TemplateCategory): VesselTemplate[] {
  return VESSEL_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): VesselTemplate | undefined {
  return VESSEL_TEMPLATES.find((t) => t.id === id);
}
