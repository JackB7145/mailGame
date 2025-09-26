// src/game/world/layout.ts

export type Item =
  | { t: "house"; x: number; y: number; w: number; h: number; doorPos?: "left"|"center"|"right" }
  | { t: "tree"; x: number; y: number; scale?: number; tint?: number }
  | { t: "bush"; x: number; y: number; scale?: number; tint?: number }
  | { t: "rocks"; x: number; y: number; count?: number; baseScale?: number; tint?: number }
  | { t: "lamp"; x: number; y: number; scale?: number }
  | { t: "sign"; x: number; y: number; text?: string }
  | { t: "bench"; x: number; y: number }
  | { t: "mailbox"; x: number; y: number }
  | { t: "wardrobe"; x: number; y: number };

//
// Design notes
// - Plaza at (1000,1080) with bench + sign
// - Main street runs 1000,1080 → 1400,1080 → 2050,950 (mailbox at the far node)
// - Side street runs 1000,1080 → 1000,1400 → 1400,1400; wardrobe near that corner
// - Houses sit OFF the paths with clear yards and lamps by path corners
// - Trees form groves; bushes hug edges; rocks away from walkable routes
//

export const LAYOUT: Item[] = [
  // ---------- HOUSES (spaced away from paths) ----------
  { t: "house", x:  860, y:  940, w: 220, h: 170, doorPos: "center" }, // NW of plaza
  { t: "house", x: 1500, y: 1260, w: 260, h: 190, doorPos: "right"  }, // SE neighborhood
  { t: "house", x: 1780, y: 1040, w: 240, h: 180, doorPos: "left"   }, // E of mid street

  // ---------- PLAZA / INTERACTABLES ----------
  { t: "bench",    x: 1000, y: 1080 },
  { t: "sign",     x:  990, y: 1060, text: "Compose" },

  // Mailbox anchored at far street node (kept from your original)
  { t: "mailbox",  x: 2050, y:  950 },

  // Wardrobe near the side-street corner (clear of traffic)
  { t: "wardrobe", x: 1350, y: 1120 },

  // ---------- LAMPS (bigger; at corners & along streets) ----------
  { t: "lamp", x:  960, y: 1080, scale: 1.9 },  // west corner of plaza
  { t: "lamp", x: 1040, y: 1080, scale: 1.9 },  // east corner of plaza
  { t: "lamp", x: 1400, y: 1080, scale: 1.8 },  // mid-street node
  { t: "lamp", x: 1000, y: 1400, scale: 1.8 },  // side-street node
  { t: "lamp", x: 1400, y: 1400, scale: 1.7 },  // far side-street node
  { t: "lamp", x: 2050, y:  950, scale: 2.0 },  // mailbox node (a bit brighter)

  // ---------- TREE GROVES ----------
  // West grove (north of plaza)
  { t: "tree", x:  780, y:  900, scale: 3.8 },
  { t: "tree", x:  820, y:  940, scale: 3.6 },
  { t: "tree", x:  900, y:  880, scale: 3.4 },
  { t: "bush", x:  760, y:  940, scale: 1.6 },
  { t: "bush", x:  840, y:  880, scale: 1.6 },

  // East grove (between mid-street and mailbox)
  { t: "tree", x: 1600, y: 1200, scale: 3.2 },
  { t: "tree", x: 1660, y: 1240, scale: 3.0 },
  { t: "tree", x: 1720, y: 1180, scale: 3.0 },
  { t: "bush", x: 1580, y: 1245, scale: 1.7 },
  { t: "bush", x: 1700, y: 1150, scale: 1.7 },

  // South grove (below side street)
  { t: "tree", x: 1100, y: 1480, scale: 3.4 },
  { t: "tree", x: 1180, y: 1440, scale: 3.2 },
  { t: "bush", x: 1060, y: 1460, scale: 1.8 },
  { t: "bush", x: 1220, y: 1420, scale: 1.6 },

  // ---------- ROCK CLUSTERS (off to the sides) ----------
  { t: "rocks", x:  980, y: 1180, count: 4, baseScale: 1.0 },
  { t: "rocks", x: 1450, y:  900, count: 3, baseScale: 1.2, tint: 0x8d8d8d },

  // ---------- Extra edge dressing (kept clear of paths) ----------
  { t: "bush", x: 1320, y:  980, scale: 1.6 },
  { t: "bush", x: 1420, y: 1000, scale: 1.5 },
  { t: "bush", x: 1520, y: 1080, scale: 1.4 },
];

export function serializeLayout(items: Item[]) {
  return JSON.stringify(items, null, 2);
}

export function deserializeLayout(json: string): Item[] {
  const arr = JSON.parse(json) as Item[];
  // small sanity pass
  return Array.isArray(arr) ? arr.filter(x => !!x && typeof x.t === "string") : [];
}