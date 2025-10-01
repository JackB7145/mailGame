export type Item =
  | { t: "house"; x: number; y: number; w: number; h: number; doorPos?: "left"|"center"|"right" }
  | { t: "tree"; x: number; y: number; scale?: number; tint?: number }
  | { t: "rocks"; x: number; y: number; count?: number; baseScale?: number; tint?: number }
  | { t: "lamp"; x: number; y: number; scale?: number }
  | { t: "sign"; x: number; y: number; text?: string }
  | { t: "bench"; x: number; y: number }
  | { t: "mailbox"; x: number; y: number }
  | { t: "wardrobe"; x: number; y: number }
  // ✅ NEW TILES
  | { t: "water"; x: number; y: number; size?: number }
  | { t: "dirt"; x: number; y: number; size?: number }
  | { t: "gravel"; x: number; y: number; size?: number }
  | { t: "planks"; x: number; y: number; size?: number }
  // ✅ NEW COLLIDER
  | { t: "collider"; x: number; y: number; w: number; h: number };

//
// Design notes
// - Plaza at (1000,1080) with bench + sign
// - Main street runs 1000,1080 → 1400,1080 → 2050,950 (mailbox at the far node)
// - Side street runs 1000,1080 → 1000,1400 → 1400,1400; wardrobe near that corner
// - Houses sit OFF the paths with clear yards and lamps by path corners
// - Trees form groves; bushes hug edges; rocks away from walkable routes
//

export function serializeLayout(items: Item[]) {
  return JSON.stringify(items, null, 2);
}

export function deserializeLayout(json: string): Item[] {
  const arr = JSON.parse(json) as Item[];
  // small sanity pass
  return Array.isArray(arr) ? arr.filter(x => !!x && typeof x.t === "string") : [];
}
