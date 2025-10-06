// src/game/PlayerController.ts
import Phaser from "phaser";
import { Customization, Accessory } from "../ui/Customizer";
import {
  getCustomization,
  subscribeCustomization,
  setCustomizationGlobal,
  getPlayerColor, // ← safe accessor (uses cache if session isn't hydrated yet)
} from "../state/session";

// Optional: final fallback to CSS var if you ever need it
function readCssAccent(): number | null {
  try {
    const cs = getComputedStyle(document.documentElement);
    const hex = cs.getPropertyValue("--accent").trim(); // "#rrggbb"
    const m = hex.match(/^#([0-9a-f]{6})$/i);
    if (!m) return null;
    return parseInt(m[1], 16) >>> 0;
  } catch {
    return null;
  }
}

export class PlayerController {
  readonly body: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private sprite: Phaser.GameObjects.Container;
  private custom: Customization;
  private unsub?: () => void;

  constructor(
    private scene: Phaser.Scene,
    startX: number,
    startY: number,
    initial: Customization
  ) {
    // Source of truth is the GLOBAL store/caches
    // 1) color via getPlayerColor (session → courier:custom → legacy hex → default)
    const color = getPlayerColor() ?? initial.color ?? 0x00ff6a;
    // 2) accessory from session if present, else initial, else "none"
    const sessionCust = getCustomization();
    const accessory = sessionCust?.accessory ?? initial.accessory ?? "none";

    this.custom = { color, accessory };

    // physics body
    this.body = scene.physics.add.image(startX, startY, "").setDepth(startY);
    this.body.setCircle(10).setOffset(-10, -10).setSize(20, 20).setVisible(false);
    this.body.setCollideWorldBounds(true);

    // visuals
    this.sprite = this.makeSprite(startX, startY, this.custom);
    this.sprite.setDepth(startY);

    // keep visuals in sync with global session updates
    this.unsub = subscribeCustomization((c) => {
      // If the session later hydrates from backend and changes color/hat, reflect it:
      this.custom = { color: c.color, accessory: c.accessory };
      this.refreshVisual();
    });

    // Extra safety: if session was empty and CSS already had a non-default accent,
    // adopt it once (prevents rare first-frame mismatch).
    if (!sessionCust) {
      const cssColor = readCssAccent();
      if (cssColor && cssColor !== this.custom.color) {
        this.custom = { ...this.custom, color: cssColor };
        this.refreshVisual();
      }
    }
  }

  attachColliders(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.scene.physics.add.collider(this.body, obstacles);
  }

  followWith(cam: Phaser.Cameras.Scene2D.Camera) {
    cam.setBounds(0, 0, this.scene.physics.world.bounds.width, this.scene.physics.world.bounds.height);
    cam.startFollow(this.body, true, 0.12, 0.12);
  }

  /** Write through to GLOBAL store so DB + subscribers stay in sync */
  setCustomization(c: Customization) {
    setCustomizationGlobal(c);
    // local refresh arrives via subscription; this is defensive:
    this.custom = c;
    this.refreshVisual();
  }

  updateMovement(keys: { left: boolean; right: boolean; up: boolean; down: boolean }, speed = 230) {
    let vx = 0, vy = 0;
    if (keys.left)  vx -= 1;
    if (keys.right) vx += 1;
    if (keys.up)    vy -= 1;
    if (keys.down)  vy += 1;
    if (vx && vy) { const inv = Math.SQRT1_2; vx *= inv; vy *= inv; }
    this.body.setVelocity(vx * speed, vy * speed);

    const y = this.body.y;
    this.sprite.setDepth(y);
    this.sprite.setPosition(this.body.x, y);
  }

  destroy() {
    this.sprite.destroy(true);
    this.body.destroy();
    this.unsub?.();
  }

  // ----- visuals -----
  private makeSprite(x: number, y: number, custom: Customization) {
    const c = this.scene.add.container(x, y);

    const g = this.scene.add.graphics();
    g.fillStyle(custom.color, 1).fillCircle(0, 0, 12);
    // simple dark rim that works for any color:
    const rim = this.darken(custom.color, 0.75);
    g.lineStyle(2, rim, 0.8).strokeCircle(0, 0, 12);
    c.add(g);

    const acc = this.drawAccessory(custom.accessory);
    if (acc) c.add(acc);

    return c;
  }

  private drawAccessory(type: Accessory) {
    if (type === "none") return null;
    const g = this.scene.add.graphics();
    if (type === "cap") {
      g.fillStyle(0x004d40, 1).fillCircle(0, -6, 7).fillRect(-6, -6, 12, 4);
    } else if (type === "visor") {
      g.fillStyle(0x1de9b6, 0.9).fillRect(-9, -4, 18, 6);
    }
    return g;
  }

  private darken(color: number, factor: number) {
    const r = ((color >> 16) & 255) * factor;
    const g = ((color >> 8) & 255) * factor;
    const b = (color & 255) * factor;
    return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
  }

  private refreshVisual() {
    this.sprite.destroy(true);
    this.sprite = this.makeSprite(this.body.x, this.body.y, this.custom);
    this.sprite.setDepth(this.body.y);
  }
}
