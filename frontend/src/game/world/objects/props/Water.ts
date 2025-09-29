// src/game/world/objects/props/Water.ts
import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class Water extends BaseObject {
  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, size = 64) {
    super(scene, obstacles, "water", x, y);

    this.addGraphics(g => {
      g.fillStyle(0x42a5f5, 1).fillRect(-size / 2, -size / 2, size, size);
      g.lineStyle(1.5, 0x1e88e5, 0.8).strokeRect(-size / 2, -size / 2, size, size);
    });

    // Optional collider if you want water to block movement:
    // if (obstacles) this.addStaticBox(0, 0, size, size).setVisible(false);
  }
}

export class WaterFactory implements ObjectFactory {
  readonly type = "water";
  create(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, item: Item): WorldObject {
    return new Water(scene, obstacles, item.x, item.y);
  }
}
