// src/state/session.ts
import type { Customization } from "../ui/Customizer";
import { getCustomizationFor, saveCustomizationFor } from "../../lib/api";

const ACTIVE_USER_KEY = "mailme:activeUser";      // { username: string, t: number }
const ACCENT_CACHE_KEY = "mailme:lastAccentHex";  // "#rrggbb"
const COURIER_CACHE_KEY = "courier:custom";       // { color: "#rrggbb" | number, accessory?: string, ... }
const DEFAULT_COLOR = 0x00ff6a;                   // neon green

/* ---------- active user ---------- */
function getActiveUsername(): string | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { username?: string };
    return (parsed?.username || "").trim() || null;
  } catch {
    return null;
  }
}

/* ---------- color helpers ---------- */
// Accepts "#rrggbb", "#rgb", "red", or number; returns a 0xRRGGBB number.
function normalizeColorToInt(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v >>> 0;
  if (typeof v !== "string") return DEFAULT_COLOR;

  const s = v.trim().toLowerCase();
  const named: Record<string, number> = {
    red: 0xff0000,
    white: 0xffffff,
    cyan: 0x2de1fc,
    amber: 0xffc400,
    magenta: 0xff3fa4,
    neon: DEFAULT_COLOR,
    green: DEFAULT_COLOR,
  };
  if (named[s] != null) return named[s];

  const m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    let hex = m[1];
    if (hex.length === 3) hex = hex.split("").map(ch => ch + ch).join("");
    return parseInt(hex, 16) >>> 0;
  }
  return DEFAULT_COLOR;
}

// Force non-black (Phaser treats 0 as black)
function coerceNonBlack(n: number): number {
  const nn = n >>> 0;
  return nn === 0 ? DEFAULT_COLOR : nn;
}

function colorNumberToHex(n: number) {
  return `#${(n >>> 0).toString(16).padStart(6, "0")}`;
}

/* ---------- CSS accent vars ---------- */
function setCssAccentFromNumber(color: number) {
  const safe = coerceNonBlack(color);
  const r = (safe >> 16) & 255;
  const g = (safe >> 8) & 255;
  const b = safe & 255;
  const hex = colorNumberToHex(safe);

  const root = document.documentElement.style;
  root.setProperty("--accent", hex);
  root.setProperty("--accent-r", String(r));
  root.setProperty("--accent-g", String(g));
  root.setProperty("--accent-b", String(b));

  // keep both caches for compatibility
  try { localStorage.setItem(ACCENT_CACHE_KEY, hex); } catch {}
  try {
    const existing = localStorage.getItem(COURIER_CACHE_KEY);
    const prev = existing ? JSON.parse(existing) : {};
    localStorage.setItem(COURIER_CACHE_KEY, JSON.stringify({ ...prev, color: hex }));
  } catch {}
}

/** Prime CSS vars synchronously from cache (prevents green/black flash) */
export function primeAccentFromCache() {
  // Preferred: courier:custom
  try {
    const raw = localStorage.getItem(COURIER_CACHE_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as any;
      const n =
        typeof obj?.color === "number"
          ? obj.color >>> 0
          : typeof obj?.color === "string"
          ? normalizeColorToInt(obj.color)
          : null;
      if (typeof n === "number") {
        setCssAccentFromNumber(coerceNonBlack(n));
        return;
      }
    }
  } catch { /* ignore */ }

  // Fallback: legacy hex
  try {
    const hex = localStorage.getItem(ACCENT_CACHE_KEY);
    if (hex && /^#([0-9a-f]{6})$/i.test(hex)) {
      const n = parseInt(hex.slice(1), 16) >>> 0;
      setCssAccentFromNumber(coerceNonBlack(n));
    }
  } catch { /* ignore */ }
}

/* ---------- customization global + pub/sub ---------- */
type Listener = (c: Customization) => void;
let _custom: Customization | null = null;
const listeners = new Set<Listener>();

export function getCustomization(): Customization | null { return _custom; }
/** Safe getter—never returns black */
export function getPlayerColor(): number { return _custom ? coerceNonBlack(_custom.color) : DEFAULT_COLOR; }

export function subscribeCustomization(fn: Listener): () => void {
  listeners.add(fn);
  if (_custom) fn(_custom);
  return () => listeners.delete(fn);
}

// API payload mapper
function toApiPayload(c: Customization): {
  playerColor?: string; playerHat?: string; position?: number[];
} {
  const colorNum = coerceNonBlack(normalizeColorToInt((c as any).color));
  const colorHex = colorNumberToHex(colorNum);
  const hatVal = (c as any).accessory ?? (c as any).playerHat;
  const posVal = (c as any).position as number[] | undefined;
  return { playerColor: colorHex, playerHat: hatVal, position: posVal };
}

// Persist helper -> call backend (by username)
async function persistCustomization(c: Customization) {
  const username = getActiveUsername();
  if (!username) return;
  await saveCustomizationFor(username, toApiPayload(c));
}

// Set + broadcast + persist (debounced)
let _persistTimer: any = null;
export function setCustomizationGlobal(c: Customization) {
  const color = coerceNonBlack(normalizeColorToInt((c as any).color));
  const norm: Customization = { color, accessory: (c as any).accessory };

  _custom = norm;
  listeners.forEach((fn) => fn(norm));

  // update CSS vars + both caches immediately
  try { setCssAccentFromNumber(color); } catch {}
  try {
    const existing = localStorage.getItem(COURIER_CACHE_KEY);
    const prev = existing ? JSON.parse(existing) : {};
    localStorage.setItem(COURIER_CACHE_KEY, JSON.stringify({
      ...prev,
      color: colorNumberToHex(color),
      accessory: norm.accessory,
    }));
  } catch {}

  clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    persistCustomization(norm).catch(() => {});
  }, 150);
}

/* ---------- position global ---------- */
type Pos = { x: number; y: number };
let _pos: Pos | null = null;
const posListeners = new Set<(p: Pos) => void>();

export function getPosition(): Pos | null { return _pos; }
export function subscribePosition(fn: (p: Pos) => void) {
  posListeners.add(fn);
  if (_pos) fn(_pos);
  return () => posListeners.delete(fn);
}
export function setPositionGlobal(p: Pos) {
  _pos = p;
  posListeners.forEach(fn => fn(p));
}

/* ---------- initial load from backend ---------- */
export async function loadCustomization(): Promise<Customization | null> {
  const username = getActiveUsername();
  if (!username) return null;

  try {
    const resp = await getCustomizationFor(username);
    const api = resp?.customization ?? null;
    if (!api) return null;

    // Get the player's color from API and clamp away from black
    const color = coerceNonBlack(normalizeColorToInt((api as any).playerColor));
    const accessory = ((api as any).playerHat ?? "none") as Customization["accessory"];

    const norm: Customization = { color, accessory };
    _custom = norm;
    listeners.forEach((fn) => fn(norm));

    // update CSS + caches now (prevents flash on mount)
    try { setCssAccentFromNumber(color); } catch {}
    try {
      const existing = localStorage.getItem(COURIER_CACHE_KEY);
      const prev = existing ? JSON.parse(existing) : {};
      localStorage.setItem(COURIER_CACHE_KEY, JSON.stringify({
        ...prev,
        color: colorNumberToHex(color),
        accessory,
      }));
    } catch {}

    // hydrate position if present
    const pos = (api as any).position;
    if (Array.isArray(pos) && pos.length === 2 && pos.every(n => typeof n === "number")) {
      setPositionGlobal({ x: pos[0], y: pos[1] });
    }

    return norm;
  } catch {
    return null;
  }
}

/* Optional explicit init */
export function initAccentFromSession() {
  const c = getCustomization();
  if (c) setCssAccentFromNumber(c.color);
}
