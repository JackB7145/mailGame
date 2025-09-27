import Phaser from "phaser";
import { EditorState } from "../state";
import { PALETTE_ORDER } from "../constants";

export function buildPaletteHud(state: EditorState) {
  destroyPaletteHud(state);

  const c = state.scene.add.container(0, 0).setScrollFactor(0).setDepth(100001);
  const bg = state.scene.add
    .rectangle(0, 0, 220, 28, 0x000000, 0.45)
    .setOrigin(0)
    .setStrokeStyle(1, 0xffffff, 0.2);
  const text = state.scene.add.text(8, 6, "", {
    fontFamily: "Courier New, monospace",
    fontSize: "14px",
    color: "#ffffff",
  });
  c.add([bg, text]);

  const place = () => c.setPosition(12, state.scene.scale.height - 40);
  state.scene.scale.on("resize", place);
  place();

  state.paletteHud = c;
  updatePaletteHud(state);
}

export function updatePaletteHud(state: EditorState) {
  const t = state.paletteHud?.list.find(
    o => o instanceof Phaser.GameObjects.Text
  ) as Phaser.GameObjects.Text | undefined;

  if (!t) return;
  const idx = PALETTE_ORDER.indexOf(state.palette);
  t.setText(
    `Tool [G/H or 1-9]: ${state.palette.toUpperCase()} (#${idx + 1}/${PALETTE_ORDER.length})  — E+LMB select/move`
  );
}

export function destroyPaletteHud(state: EditorState) {
  state.paletteHud?.destroy();
  state.paletteHud = undefined;
}
