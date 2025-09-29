// src/game/state.ts
import Phaser from "phaser";
import KeyCodes = Phaser.Input.Keyboard.KeyCodes;

import { Item } from "../world/layout";
import { buildFromItems, BuildHandles } from "../world/WorldObjects";
import { updatePaletteHud } from "./hud/PaletteHud";  // <-- import HUD updater

export type EditorOptions = { grid?: number; startPalette?: Item["t"] };

export class EditorState {
  scene: Phaser.Scene;
  obstacles: Phaser.Physics.Arcade.StaticGroup;

  items: Item[] = [];
  world!: BuildHandles;

  grid = 20;

  private _palette: Item["t"] = "tree"; // use private field
  get palette() {
    return this._palette;
  }
  set palette(tool: Item["t"]) {
    this._palette = tool;
    updatePaletteHud(this);  // ✅ automatically refresh HUD whenever palette changes
  }

  selectedIndex: number | null = null;

  dragging = false;
  suppressPlace = false;
  dirtyRebuild?: Phaser.Time.TimerEvent;

  keyCtrl?: Phaser.Input.Keyboard.Key;

  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    initial: Item[],
    opts?: EditorOptions
  ) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.items = initial.slice();
    if (opts?.grid) this.grid = opts.grid;
    if (opts?.startPalette) this.palette = opts.startPalette; // ✅ calls setter, updates HUD
  }

  snap(v: number) {
    return Math.round(v / this.grid) * this.grid;
  }

  requestRebuild(immediate = false) {
    this.dirtyRebuild?.remove?.();
    if (immediate) {
      this.rebuildWorld();
      return;
    }
    this.dirtyRebuild = this.scene.time.delayedCall(30, () => this.rebuildWorld());
  }

  rebuildWorld() {
    this.world?.root?.destroy?.();
    this.world = buildFromItems(this.scene, this.obstacles, this.items);
  }

  setSelected(i: number | null) {
    this.selectedIndex = i;
  }

  attachCtrlKeys() {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    this.keyCtrl = kb.addKey(KeyCodes.CTRL, true);
  }

  findClosestIndex(x: number, y: number) {
    let best = -1,
      bestD = Number.POSITIVE_INFINITY;
    this.items.forEach((it, i) => {
      const d = Phaser.Math.Distance.Squared(x, y, it.x, it.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  suppressOnce() {
    this.suppressPlace = true;
    this.scene.time.delayedCall(0, () => (this.suppressPlace = false));
  }
}
