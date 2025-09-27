import Phaser from "phaser";
import { EditorState } from "./state";

export function buildHandles(state: EditorState) {
  teardownHandles(state);

  const { scene, items } = state;

  // World-space (no setScrollFactor(0)), so the handles track the camera.
  state.handlesRoot = scene.add.container(0, 0).setDepth(100000);

  items.forEach((it, i) => {
    const z = scene.add.zone(it.x, it.y, 28, 28).setOrigin(0.5);
    z.setInteractive({ cursor: "grab" });
    scene.input.setDraggable(z);

    const ring = scene.add.graphics();
    drawRing(ring, it.x, it.y, state.selectedIndex === i);
    state.handlesRoot.add([ring, z]);

    z.on("pointerdown", () => {
      state.setSelected(i);
      drawRing(ring, it.x, it.y, true);
      // prevent immediate placement from this same click
      state.suppressOnce();
    });

    z.on("dragstart", () => {
      state.dragging = true;
      state.setSelected(i);
      drawRing(ring, it.x, it.y, true);
    });

    z.on("drag", (_: any, x: number, y: number) => {
      const nx = state.snap(x), ny = state.snap(y);
      it.x = nx; it.y = ny;
      z.setPosition(nx, ny);
      drawRing(ring, nx, ny, true);
      state.requestRebuild();
    });

    z.on("dragend", () => {
      state.dragging = false;
      state.suppressOnce();           // stop a ghost place on mouseup
      state.requestRebuild(true);
    });
  });
}

export function teardownHandles(state: EditorState) {
  state.handlesRoot?.destroy?.();
}

function drawRing(g: Phaser.GameObjects.Graphics, x: number, y: number, active: boolean) {
  g.clear();
  g.lineStyle(2, active ? 0x00ff6a : 0x86c5ff, active ? 1 : 0.9);
  g.strokeCircle(x, y, active ? 18 : 14);
}
