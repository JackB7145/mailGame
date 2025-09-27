import Phaser from "phaser";
import { BaseObject } from "../BaseObjects";

export class Bench extends BaseObject {
  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number, y: number
  ) {
    super(scene, obstacles, "bench", x, y);

    this.addGraphics(g => {
      g.fillStyle(0x5d4037, 1).fillRect(-42,  6, 10, 28).fillRect(32,  6, 10, 28);
      g.fillStyle(0x8d6e63, 1).fillRect(-56,  0, 112, 14).fillRect(-56, -18, 112, 10);
      g.lineStyle(2, 0x3e2723, 0.5).strokeRect(-56, 0, 112, 14).strokeRect(-56, -18, 112, 10);

      g.fillStyle(0x263238, 1).fillRoundedRect(12, -2, 16, 14, 3).fillRect(14, -8, 12, 6);
      g.lineStyle(2, 0xffffff, 1);
      const shaft: Array<[number, number]> = [[6,-3],[0,-9],[-8,-12],[-18,-13],[-28,-12]];
      g.beginPath().moveTo(shaft[0][0], shaft[0][1]);
      for (let i=1;i<shaft.length;i++) g.lineTo(shaft[i][0], shaft[i][1]); g.strokePath();
      const barbs: Array<[number, number]> = [[0,-8],[-6,-10],[-13,-11],[-21,-11]];
      for (const [bx, by] of barbs) { g.beginPath().moveTo(bx, by).lineTo(bx-10, by-4).strokePath(); }
    });

    this.addText(0, -36, "Compose", {
      color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
    }).setOrigin(0.5, 1);

    if (obstacles) this.addStaticBox(0, 8, 112, 24).setVisible(false);
  }
}
