// src/game/world/objects/props/Planks.ts
import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class Planks extends BaseObject {
  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, size = 64) {
    super(scene, obstacles, "planks", x, y);

    this.addGraphics(g => {
      g.fillStyle(0xa1887f, 1).fillRect(-size / 2, -size / 2, size, size);
      g.lineStyle(2, 0x5d4037, 0.6).strokeRect(-size / 2, -size / 2, size, size);

      // Simple plank stripes
      g.lineStyle(1, 0x4e342e, 0.8);
      for (let i = -size / 2 + 8; i < size / 2; i += 12) {
        g.beginPath();
        g.moveTo(-size / 2, i);
        g.lineTo(size / 2, i);
        g.strokePath();
      }
    });
  }
}

export class PlanksFactory implements ObjectFactory {
  readonly type = "planks";
  create(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, item: Item): WorldObject {
    return new Planks(scene, obstacles, item.x, item.y);
  }
}
