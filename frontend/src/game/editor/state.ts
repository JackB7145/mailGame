import Phaser from "phaser";
import KeyCodes = Phaser.Input.Keyboard.KeyCodes;

import { Item } from "../world/layout";
import { buildFromItems, BuildHandles } from "../world/spawner";

export type EditorOptions = { grid?: number; startPalette?: Item["t"] };

export class EditorState {
  scene: Phaser.Scene;
  obstacles: Phaser.Physics.Arcade.StaticGroup;

  items: Item[] = [];
  world!: BuildHandles;
  handlesRoot!: Phaser.GameObjects.Container;

  grid = 20;
  palette: Item["t"] = "tree";
  selectedIndex: number | null = null;

  dragging = false;
  suppressPlace = false;
  dirtyRebuild?: Phaser.Time.TimerEvent;

  keyCtrl?: Phaser.Input.Keyboard.Key;
  keyMeta?: Phaser.Input.Keyboard.Key; // if you want Cmd on macOS

  paletteHud?: Phaser.GameObjects.Container;

  // keep a handle so we can unbind hotkeys
  __hotkeysHandler?: (ev: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, initial: Item[], opts?: EditorOptions) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.items = initial.slice();
    if (opts?.grid) this.grid = opts.grid;
    if (opts?.startPalette) this.palette = opts.startPalette;
  }

  snap(v: number) { return Math.round(v / this.grid) * this.grid; }

  requestRebuild(immediate = false) {
    this.dirtyRebuild?.remove?.();
    if (immediate) { this.rebuildWorld(); return; }
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

  // NEW: find nearest prefab to a point (editor uses this for “Z” delete)
  findClosestIndex(x: number, y: number) {
    let best = -1, bestD = Number.POSITIVE_INFINITY;
    this.items.forEach((it, i) => {
      const d = Phaser.Math.Distance.Squared(x, y, it.x, it.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
  
  /** Block placement for one tick (used after select/dragend so the same click doesn't place). */
  suppressOnce() {
    this.suppressPlace = true;
    this.scene.time.delayedCall(0, () => (this.suppressPlace = false));
  }


}
