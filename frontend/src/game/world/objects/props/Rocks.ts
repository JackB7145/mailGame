import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class Rocks extends BaseObject {
  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, count = 3, baseScale = 1.0, tint = 0x9e9e9e) {
    super(scene, obstacles, "rocks", x, y);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (let i = 0; i < count; i++) {
      const s = baseScale * Phaser.Math.FloatBetween(0.8, 1.4);
      const r = Math.round(8 * s);
      const dx = Phaser.Math.Between(-12, 12);
      const dy = Phaser.Math.Between(-6, 6);

      this.addGraphics(g => {
        g.fillStyle(tint, 1);
        g.fillCircle(dx, dy, r);
        g.fillCircle(dx + Math.round(r * 0.4), dy - Math.round(r * 0.2), Math.round(r * 0.7));
      });

      minX = Math.min(minX, dx - r); maxX = Math.max(maxX, dx + r);
      minY = Math.min(minY, dy - r); maxY = Math.max(maxY, dy + r);
    }
  }
}

export class RocksFactory implements ObjectFactory {
  readonly type = "rocks";
  create(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, item: Item): WorldObject {
    return new Rocks(scene, obstacles, item.x, item.y, 3, 1.4);
  }
}
