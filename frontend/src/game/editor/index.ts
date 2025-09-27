import { Item } from "../world/layout";
import { EditorOptions, EditorState } from "./state";
import { buildHandles, teardownHandles } from "./handles";
import { buildPaletteHud, destroyPaletteHud } from "./hud/PaletteHud";
import { bindHotkeys, unbindHotkeys } from "../input/Hotkeys";
import { attachPointer, detachPointer } from "../input/Pointer";

export class SceneEditor {
  private state: EditorState;

  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    initial: Item[],
    opts?: EditorOptions
  ) {
    this.state = new EditorState(scene, obstacles, initial, opts);
  }

  enable() {
    const s = this.state;
    s.rebuildWorld();
    buildHandles(s);
    buildPaletteHud(s);
    attachPointer(s);
    bindHotkeys(s);
  }

  disable() {
    const s = this.state;
    detachPointer(s);
    unbindHotkeys(s);
    teardownHandles(s);
    destroyPaletteHud(s);
    s.world?.root?.destroy?.();
  }

  setPalette(t: Item["t"]) { this.state.palette = t; }
  get items() { return this.state.items; }
}
