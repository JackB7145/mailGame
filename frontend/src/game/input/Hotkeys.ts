// src/game/editor/input/Hotkeys.ts
import { EditorState } from "../editor/state";
import { PALETTE_ORDER } from "../editor/constants";
import { saveJson, saveTsModule, promptLoadJson } from "../editor/save";
import { buildHandles, teardownHandles } from "../editor/handles";

export function bindHotkeys(state: EditorState) {
  // keep reference so we can unbind later
  const onKeyDown = (ev: KeyboardEvent) => {
    // Esc: clear selection
    if (ev.key === "Escape") {
      state.setSelected(null);
      teardownHandles(state);
      buildHandles(state);
      return;
    }

    // Delete / Backspace: delete currently selected
    if ((ev.key === "Delete" || ev.key === "Backspace") && state.selectedIndex != null) {
      state.items.splice(state.selectedIndex, 1);
      state.setSelected(null);
      state.requestRebuild(true);
      teardownHandles(state);
      buildHandles(state);
      return;
    }

    // Z: delete the nearest prefab under the cursor (keyboard-only delete)
    if (ev.key.toLowerCase() === "z") {
      const p = state.scene.input.activePointer;
      const x = state.snap(p.worldX);
      const y = state.snap(p.worldY);
      const idx = state.findClosestIndex(x, y);
      if (idx >= 0) {
        state.items.splice(idx, 1);
        if (state.selectedIndex === idx) state.setSelected(null);
        state.requestRebuild(true);
        teardownHandles(state);
        buildHandles(state);
      }
      return;
    }

    // G/H: cycle palette
    if (ev.key.toLowerCase() === "g" || ev.key.toLowerCase() === "h") {
      const dir = ev.key.toLowerCase() === "g" ? -1 : 1;
      const i = PALETTE_ORDER.indexOf(state.palette);
      const next = (i + dir + PALETTE_ORDER.length) % PALETTE_ORDER.length;
      state.palette = PALETTE_ORDER[next];
      return;
    }

    // 1..9: direct palette select
    const n = Number(ev.key);
    if (Number.isInteger(n) && n >= 1 && n <= PALETTE_ORDER.length) {
      state.palette = PALETTE_ORDER[n - 1];
      return;
    }

    // Ctrl/Cmd+S: save (Shift → TS module)
    if (ev.key.toLowerCase() === "s" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      if (ev.shiftKey) saveTsModule(state);
      else saveJson(state);
      return;
    }

    // Ctrl/Cmd+L: load from prompt
    if (ev.key.toLowerCase() === "l" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      promptLoadJson(state);
      return;
    }
  };

  state.__hotkeysHandler = onKeyDown;
  window.addEventListener("keydown", onKeyDown);
}

export function unbindHotkeys(state: EditorState) {
  if (state.__hotkeysHandler) {
    window.removeEventListener("keydown", state.__hotkeysHandler);
    state.__hotkeysHandler = undefined;
  }
}
