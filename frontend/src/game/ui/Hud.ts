import Phaser from "phaser";

export type HudAnchor =
  | "top-left" | "top-right"
  | "bottom-left" | "bottom-right"
  | "center";

type AnchorCfg = {
  anchor: HudAnchor;
  offsetX: number;
  offsetY: number;
};

type WidgetRec = {
  container: Phaser.GameObjects.Container;
  place?: AnchorCfg;
};

export class Hud {
  readonly scene: Phaser.Scene;
  readonly root: Phaser.GameObjects.Container;
  private widgets = new Map<string, WidgetRec>();
  private depth = 10000;

  constructor(scene: Phaser.Scene, depth = 10000) {
    this.scene = scene;
    this.depth = depth;

    // Fixed overlay root
    this.root = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(depth);

    // auto-cleanup on scene shutdown
    scene.events.on(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
  }

  /** Add an existing container as a named widget. */
  add(name: string, container: Phaser.GameObjects.Container) {
    container.setScrollFactor(0).setDepth(this.depth + 1);
    this.root.add(container);
    this.widgets.set(name, { container });
    return container;
  }

  /** Create a minimal text label widget. */
  addText(
    name: string,
    text: string,
    x = 12, y = 12,
    style: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#ffffff",
      fontFamily: "Courier New, monospace",
      fontSize: "14px"
    }
  ) {
    const c = this.scene.add.container(x, y);
    const t = this.scene.add.text(0, 0, text, style).setOrigin(0, 0);
    c.add(t);
    return this.add(name, c);
  }

  /** Anchor a widget to a corner/center with offsets (screen space). */
  anchor(name: string, anchor: HudAnchor, offsetX: number, offsetY: number) {
    const rec = this.widgets.get(name);
    if (!rec) return;
    rec.place = { anchor, offsetX, offsetY };
    this.layout(); // position right away
  }

  /** Get a widget container. */
  get(name: string) {
    return this.widgets.get(name)?.container;
  }

  /** Update anchored widget positions on resize. */
  private layout() {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    for (const [_, rec] of this.widgets) {
      if (!rec.place) continue;
      const { container } = rec;
      const { anchor, offsetX, offsetY } = rec.place;

      let x = 0, y = 0;
      switch (anchor) {
        case "top-left":     x = offsetX;          y = offsetY;          break;
        case "top-right":    x = w - offsetX;      y = offsetY;          break;
        case "bottom-left":  x = offsetX;          y = h - offsetY;      break;
        case "bottom-right": x = w - offsetX;      y = h - offsetY;      break;
        case "center":       x = Math.round(w/2);  y = Math.round(h/2);  break;
      }

      // If you want right/bottom offsets measured from edges, set origin accordingly:
      if (anchor.endsWith("right")) container.setPosition(x - container.width, y);
      else if (anchor.startsWith("bottom")) container.setPosition(x, y - container.height);
      else container.setPosition(x, y);
    }
  }

  /** Remove and destroy a widget. */
  remove(name: string) {
    const rec = this.widgets.get(name);
    if (!rec) return;
    rec.container.destroy(true);
    this.widgets.delete(name);
  }

  /** Destroy the HUD entirely. */
  destroy() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.root.destroy(true);
    this.widgets.clear();
  }
}
