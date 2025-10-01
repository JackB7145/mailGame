import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class Lamp extends BaseObject {
  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, scale = 1.8) {
    super(scene, obstacles, "lamp", x, y);

    const postH = Math.round(52 * scale);
    const postW = Math.max(4, Math.round(4 * scale));
    const headW = Math.round(16 * scale);
    const headH = Math.round(12 * scale);
    const glowR = Math.round(26 * scale);

    this.addGraphics(g => {
      g.fillStyle(0x263238, 1).fillRect(-postW / 2, -postH + 14, postW, postH);
      g.fillStyle(0xfff59d, 1).fillRoundedRect(-headW / 2, -postH - headH / 2, headW, headH, 3);
      g.lineStyle(1, 0x000000, 0.4).strokeRoundedRect(-headW / 2, -postH - headH / 2, headW, headH, 3);
      g.fillStyle(0xfff59d, 0.12).fillCircle(0, -postH + 2, glowR);
    });
  }
}

export class LampFactory implements ObjectFactory {
  readonly type = "lamp";
  create(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, item: Item): WorldObject {
    return new Lamp(scene, obstacles, item.x, item.y, 1.4);
  }
}
