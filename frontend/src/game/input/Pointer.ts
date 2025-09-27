// src/game/editor/input/Pointer.ts
import Phaser from "phaser";
import { EditorState } from "../editor/state";
import { newItemFromPalette } from "../editor/constants";
import { buildHandles, teardownHandles } from "../editor/handles";

export function attachPointer(state: EditorState) {
  const onPointer = (p: Phaser.Input.Pointer) => {
    // ignore one-shot suppression (after selection/drag end)
    if (state.suppressPlace || state.dragging) return;

    const x = state.snap(p.worldX);
    const y = state.snap(p.worldY);

    // Ctrl/Cmd + LMB = select nearest (no placement)
    const ctrlOrMeta = (state.keyCtrl?.isDown || state.keyMeta?.isDown) === true;
    if (ctrlOrMeta && p.leftButtonDown()) {
      const idx = state.findClosestIndex(x, y);
      if (idx >= 0) {
        state.setSelected(idx);
        teardownHandles(state);
        buildHandles(state);
      }
      state.suppressPlace = true;
      state.scene.time.delayedCall(0, () => (state.suppressPlace = false));
      return;
    }

    // LMB = place new prefab
    if (p.leftButtonDown()) {
      const it = newItemFromPalette(state.palette, x, y);
      state.items.push(it);
      state.requestRebuild(true);
      teardownHandles(state);
      buildHandles(state);
      return;
    }

    // No RMB delete here (conflicts with browser/toolbars) — use Z key instead.
  };

  state.scene.input.on("pointerdown", onPointer);
  // store/remove via Phaser event key; Phaser keeps a reference internally
  (state as any).__pointerHandler = onPointer;
}

export function detachPointer(state: EditorState) {
  const handler = (state as any).__pointerHandler as ((p: Phaser.Input.Pointer) => void) | undefined;
  if (handler) {
    state.scene.input.off("pointerdown", handler as any);
    (state as any).__pointerHandler = undefined;
  }
}
