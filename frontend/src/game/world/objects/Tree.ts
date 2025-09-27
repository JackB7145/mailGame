// src/game/world/objects/Tree.ts
import Phaser from "phaser";
import { BaseObject } from "./BaseObjects";

export class Tree extends BaseObject {
  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    scale = 1.6,
    tint?: number
  ) {
    // BaseObject(scene, obstacles, kind, x, y)
    super(scene, obstacles, "tree", x, y);

    // trunk
    this.addGraphics(g => {
      g.fillStyle(0x795548, 1);
      g.fillRect(-6 * scale, -2 * scale, 12 * scale, 26 * scale);
    });

    // canopy
    this.addGraphics(g => {
      g.fillStyle(tint ?? 0x2e7d32, 1);
      g.fillCircle(-10 * scale, -14 * scale, 20 * scale);
      g.fillCircle(  10 * scale, -14 * scale, 20 * scale);
      g.fillCircle(   0,         -30 * scale, 22 * scale);
    });

    // collider footprint (now uses BaseObject's stored obstacles)
    const hit = Math.round(26 * scale);
    this.addStaticBox(0, Math.round(6 * scale), hit, hit);
  }
}
