// src/game/world/objects/props/Dirt.ts
import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class Dirt extends BaseObject {
  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, size = 64) {
    super(scene, obstacles, "dirt", x, y);

    this.addGraphics(g => {
      g.fillStyle(0x8d6e63, 1).fillRect(-size / 2, -size / 2, size, size);
      g.lineStyle(1, 0x5d4037, 0.6).strokeRect(-size / 2, -size / 2, size, size);
    });
  }
}

export class DirtFactory implements ObjectFactory {
  readonly type = "dirt";
  create(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, item: Item): WorldObject {
    return new Dirt(scene, obstacles, item.x, item.y);
  }
}
