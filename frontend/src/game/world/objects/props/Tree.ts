import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class Tree extends BaseObject {
  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, scale = 1.6, tint?: number) {
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

    // collider footprint
    const hit = Math.round(26 * scale);
    this.addStaticBox(0, Math.round(6 * scale), hit, hit).setVisible(false);
  }
}

export class TreeFactory implements ObjectFactory {
  readonly type = "tree";
  create(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, item: Item): WorldObject {
    return new Tree(scene, obstacles, item.x, item.y, 1.4, 0.4);
  }
}
