import { Item } from "../world/layout";

export const PALETTE_ORDER: Item["t"][] = [
  "tree", "bush", "rocks", "lamp",
  "house", "bench", "mailbox", "wardrobe", "sign",
  "water", "dirt", "gravel", "planks", 
];

export function newItemFromPalette(palette: Item["t"], x: number, y: number): Item {
  switch (palette) {
    case "house":    return { t: "house", x, y, w: 240, h: 180, doorPos: "center" };
    case "tree":     return { t: "tree", x, y, scale: 3.2 };
    case "bush":     return { t: "bush", x, y, scale: 1.6 };
    case "rocks":    return { t: "rocks", x, y, count: 3, baseScale: 1.0 };
    case "lamp":     return { t: "lamp", x, y, scale: 1.8 };
    case "sign":     return { t: "sign", x, y, text: "Sign" };
    case "bench":    return { t: "bench", x, y };
    case "mailbox":  return { t: "mailbox", x, y };
    case "wardrobe": return { t: "wardrobe", x, y };
    case "water":    return { t: "water", x, y, size: 64 };
    case "dirt":     return { t: "dirt", x, y, size: 64 };
    case "gravel":   return { t: "gravel", x, y, size: 64 };
    case "planks":   return { t: "planks", x, y, size: 64 };
  }
}
