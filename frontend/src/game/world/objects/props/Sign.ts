import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";
import { sign } from "crypto";

export class Sign extends BaseObject {
  constructor(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, text = "Welcome") {
    super(scene, obstacles, "sign", x, y);

    this.addGraphics(g => {
      g.fillStyle(0x6d4c41, 1).fillRect(-3, -24, 6, 28);
      const signW = 125; // wider
      const signH = 45;  // taller
      const signX = -signW / 2;
      const signY = -signH - 16; // raise it above the post

      g.fillStyle(0x8d6e63, 1).fillRoundedRect(signX, signY, signW, signH, 6);
      g.lineStyle(2, 0x3e2723, 0.9).strokeRoundedRect(signX, signY, signW, signH, 6);

    });

    this.addText(0, -38, text, {
      color: "#3e2723", fontFamily: "Courier New, monospace", fontSize: "12px",
    });
  }
}

// Assuming Item has: { t: "sign"; x: number; y: number; text?: string }

export class SignFactory implements ObjectFactory {
  readonly type = "sign";

  create(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    item: Item
  ): WorldObject {
    // Narrow to the sign shape
    const signItem = item as Extract<Item, { t: "sign"; text?: string }>;

    // Use map-provided text when present; otherwise default
    console.log(signItem.text)
    return new Sign(scene, obstacles, signItem.x, signItem.y, signItem.text ?? "Welcome Home");
  }
}
