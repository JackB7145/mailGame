import Phaser from "phaser";
import { BaseObject } from "../BaseObjects";

export class Mailbox extends BaseObject {
  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number, y: number
  ) {
    super(scene, obstacles, "mailbox", x, y);

    this.addGraphics(g => {
      g.fillStyle(0x8d6e63, 1).fillRect(-8, -40, 16, 80);
      g.fillStyle(0x3b82f6, 1).fillRoundedRect(-26, -66, 52, 36, 6);
      g.lineStyle(2, 0xffffff, 1).strokeRoundedRect(-26, -66, 52, 36, 6);
      g.fillStyle(0xff3b30, 1).fillRect(14, -76, 4, 14).fillRect(14, -76, 18, 4);
      g.lineStyle(2, 0xffffff, 1).strokeRect(-14, -56, 28, 18);
      g.lineBetween(-14, -56, 0, -47);
      g.lineBetween( 14, -56, 0, -47);
    });

    this.addText(0, -86, "Inbox", {
      color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
    }).setOrigin(0.5, 1);

    if (obstacles) this.addStaticBox(0, -6, 52, 80).setVisible(false);
  }
}
