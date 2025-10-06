// src/hooks/useAccent.ts
import { useEffect, useMemo, useState } from "react";
import { subscribeCustomization, getCustomization } from "../game/state/session"; 

function readCssAccent(): number | null {
  try {
    const cs = getComputedStyle(document.documentElement);
    const hex = cs.getPropertyValue("--accent").trim();
    const m = hex.match(/^#([0-9a-f]{6})$/i);
    if (!m) return null;
    return parseInt(m[1], 16) >>> 0;
  } catch {
    return null;
  }
}

export function useAccent() {
  const initial = readCssAccent() ?? getCustomization()?.color ?? 0x00ff6a;
  const [color, setColor] = useState<number>(initial);

  useEffect(() => subscribeCustomization((c) => setColor(c.color)), []);

  const hex = useMemo(() => `#${(color >>> 0).toString(16).padStart(6, "0")}`, [color]);
  const rgba = useMemo(
    () => (a: number) =>
      `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, ${a})`,
    [color]
  );

  return { color, hex, rgba };
}
