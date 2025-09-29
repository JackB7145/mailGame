// src/game/world/objects/props/Gravel.ts
import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class Gravel extends BaseObject {
  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, size = 64) {
    super(scene, obstacles, "gravel", x, y);

    this.addGraphics(g => {
      g.fillStyle(0x9e9e9e, 1).fillRect(-size / 2, -size / 2, size, size);
      g.lineStyle(1, 0x616161, 0.6).strokeRect(-size / 2, -size / 2, size, size);
    });
  }
}

export class GravelFactory implements ObjectFactory {
  readonly type = "gravel";
  create(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, item: Item): WorldObject {
    return new Gravel(scene, obstacles, item.x, item.y);
  }
}
