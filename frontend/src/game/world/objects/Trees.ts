import Phaser from "phaser";
import { createStaticBox } from "../WorldPhysics";

/** Big fluffy canopy tree (parametric) */
export function createTree(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number, y: number,
  scale = 1.6,
  tint: number = 0x2e7d32
) {
  const trunkW = Math.round(12 * scale * 0.8);
  const trunkH = Math.round(26 * scale * 0.9);

  const trunk = scene.add.graphics();
  trunk.fillStyle(0x795548, 1).fillRect(x - trunkW / 2, y - 2, trunkW, trunkH).setDepth(y - 6);

  const canopy = scene.add.graphics();
  canopy.fillStyle(tint, 1);
  const r1 = Math.round(20 * scale);
  const r2 = Math.round(22 * scale);
  const offY = Math.round(14 * scale);
  const offX = Math.round(10 * scale);
  canopy.fillCircle(x - offX, y - offY, r1)
        .fillCircle(x + offX, y - offY, r1)
        .fillCircle(x,        y - offY - Math.round(16 * (scale - 1)), r2)
        .setDepth(y + 12);

  const hitSize = Math.round(26 * scale);
  createStaticBox(scene, obstacles, x, y + Math.round(6 * scale), hitSize, hitSize).setVisible(false);
}

/** Small round bush (ground cover) */
export function createBush(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number, y: number, scale = 1.0, tint = 0x3fa34d
) {
  const r = Math.max(8, Math.round(10 * scale));
  const g = scene.add.graphics();
  g.fillStyle(tint, 1).fillCircle(x, y, r).setDepth(y);
  createStaticBox(scene, obstacles, x, y, Math.round(r * 1.6), Math.round(r * 1.2)).setVisible(false);
}
