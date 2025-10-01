import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class Wardrobe extends BaseObject {
  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number) {
    super(scene, obstacles, "wardrobe", x, y);

    this.addGraphics(g => {
      g.fillStyle(0x5d4037, 1).fillRect(-22, -40, 44, 80);
      g.lineStyle(2, 0x3e2723, 1).strokeRect(-22, -40, 44, 80);
      g.fillStyle(0xd7ccc8, 1).fillCircle(-6, 0, 2).fillCircle(6, 0, 2);
    });

    this.addText(0, -52, "Wardrobe", {
      color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
    }).setOrigin(0.5, 1);

  }
}

export class WardrobeFactory implements ObjectFactory {
  readonly type = "wardrobe";
  create(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, item: Item): WorldObject {
    return new Wardrobe(scene, obstacles, item.x, item.y);
  }
}
