import Phaser from "phaser";
import { BaseObject } from "../BaseObjects";

export class Sign extends BaseObject {
  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number, y: number,
    text = "Welcome"
  ) {
    super(scene, obstacles, "sign", x, y);

    this.addGraphics(g => {
      g.fillStyle(0x6d4c41, 1).fillRect(-3, -24, 6, 28);
      g.fillStyle(0x8d6e63, 1).fillRoundedRect(-40, -40, 80, 24, 4);
      g.lineStyle(1, 0x3e2723, 0.8).strokeRoundedRect(-40, -40, 80, 24, 4);
    });

    this.addText(0, -38, text, {
      color: "#3e2723", fontFamily: "Courier New, monospace", fontSize: "12px",
    });

    if (obstacles) this.addStaticBox(0, -8, 70, 14).setVisible(false);
  }
}
