import Phaser from "phaser";
import { createStaticBox } from "../WorldPhysics";

/** Mailbox (unchanged visuals, wrapped) */
export function createMailbox(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number, y: number
) {
  const g = scene.add.graphics();
  g.fillStyle(0x8d6e63, 1).fillRect(x - 8, y - 40, 16, 80);
  g.fillStyle(0x3b82f6, 1).fillRoundedRect(x - 26, y - 66, 52, 36, 6);
  g.lineStyle(2, 0xffffff, 1).strokeRoundedRect(x - 26, y - 66, 52, 36, 6);
  g.fillStyle(0xff3b30, 1).fillRect(x + 14, y - 76, 4, 14).fillRect(x + 14, y - 76, 18, 4);
  g.lineStyle(2, 0xffffff, 1).strokeRect(x - 14, y - 56, 28, 18);
  g.lineBetween(x - 14, y - 56, x, y - 47);
  g.lineBetween(x + 14, y - 56, x, y - 47);
  g.setDepth(y);

  scene.add.text(x, y - 86, "Inbox", {
    color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
  }).setOrigin(0.5, 1).setDepth(y - 36);

  createStaticBox(scene, obstacles, x, y - 6, 52, 80).setVisible(false);
  return scene.add.container(x, y).setDepth(y);
}

/** Bench + quill */
export function createBenchWithQuill(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number, y: number
) {
  const g = scene.add.graphics();
  g.fillStyle(0x5d4037, 1).fillRect(x - 42, y + 6, 10, 28).fillRect(x + 32, y + 6, 10, 28);
  g.fillStyle(0x8d6e63, 1).fillRect(x - 56, y, 112, 14).fillRect(x - 56, y - 18, 112, 10);
  g.lineStyle(2, 0x3e2723, 0.5).strokeRect(x - 56, y, 112, 14).strokeRect(x - 56, y - 18, 112, 10);

  g.fillStyle(0x263238, 1).fillRoundedRect(x + 12, y - 2, 16, 14, 3).fillRect(x + 14, y - 8, 12, 6);
  g.lineStyle(2, 0xffffff, 1);
  const shaft: Array<[number, number]> = [
    [x + 6, y - 3], [x + 0, y - 9], [x - 8, y - 12], [x - 18, y - 13], [x - 28, y - 12],
  ];
  g.beginPath().moveTo(shaft[0][0], shaft[0][1]); for (let i = 1; i < shaft.length; i++) g.lineTo(shaft[i][0], shaft[i][1]); g.strokePath();
  const barbs: Array<[number, number]> = [[x + 0, y - 8],[x - 6, y - 10],[x - 13, y - 11],[x - 21, y - 11]];
  for (const [bx, by] of barbs) { g.beginPath().moveTo(bx, by).lineTo(bx - 10, by - 4).strokePath(); }

  g.setDepth(y);
  scene.add.text(x, y - 36, "Compose", { color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px" })
      .setOrigin(0.5, 1).setDepth(y - 36);

  createStaticBox(scene, obstacles, x, y + 8, 112, 24).setVisible(false);
  return scene.add.container(x, y).setDepth(y);
}

/** Wardrobe */
export function createWardrobe(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number, y: number
) {
  const g = scene.add.graphics();
  g.fillStyle(0x5d4037, 1).fillRect(x - 22, y - 40, 44, 80);
  g.lineStyle(2, 0x3e2723, 1).strokeRect(x - 22, y - 40, 44, 80);
  g.fillStyle(0xd7ccc8, 1).fillCircle(x - 6, y, 2).fillCircle(x + 6, y, 2);
  g.setDepth(y);

  scene.add.text(x, y - 52, "Wardrobe", {
    color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
  }).setOrigin(0.5, 1).setDepth(y - 52);

  createStaticBox(scene, obstacles, x, y, 44, 80).setVisible(false);
  return scene.add.container(x, y).setDepth(y);
}

/** Rock cluster (procedural) */
export function createRocks(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number, y: number,
  count = 3, baseScale = 1.0, tint = 0x9e9e9e
) {
  const group = scene.add.container(x, y).setDepth(y);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < count; i++) {
    const s = baseScale * Phaser.Math.FloatBetween(0.8, 1.4);
    const r = Math.round(8 * s);
    const dx = Phaser.Math.Between(-12, 12);
    const dy = Phaser.Math.Between(-6, 6);

    const g = scene.add.graphics();
    g.fillStyle(tint, 1);
    // draw a slightly irregular blob
    const cx = x + dx, cy = y + dy;
    g.fillCircle(cx, cy, r);
    g.fillCircle(cx + Math.round(r * 0.4), cy - Math.round(r * 0.2), Math.round(r * 0.7));
    g.setDepth(y + dy);
    group.add(g);

    minX = Math.min(minX, cx - r); maxX = Math.max(maxX, cx + r);
    minY = Math.min(minY, cy - r); maxY = Math.max(maxY, cy + r);
  }

  // simple footprint collider
  const cw = Math.max(8, maxX - minX);
  const ch = Math.max(6, maxY - minY) * 0.6;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2 + 6;
  createStaticBox(scene, obstacles, cx, cy, cw, ch).setVisible(false);

  return group;
}

/** Decorative lamp post */
export function createLamp(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number, y: number,
  scale = 1.8 // ↑ bigger by default
) {
  const postH = Math.round(52 * scale);
  const postW = Math.max(4, Math.round(4 * scale));
  const headW = Math.round(16 * scale);
  const headH = Math.round(12 * scale);
  const glowR = Math.round(26 * scale);

  const g = scene.add.graphics();

  // post
  g.fillStyle(0x263238, 1)
    .fillRect(x - postW / 2, y - postH + 14, postW, postH);

  // lamp head
  g.fillStyle(0xfff59d, 1)
    .fillRoundedRect(x - headW / 2, y - postH - headH / 2, headW, headH, 3);
  g.lineStyle(1, 0x000000, 0.4)
    .strokeRoundedRect(x - headW / 2, y - postH - headH / 2, headW, headH, 3);

  // soft glow
  g.fillStyle(0xfff59d, 0.12).fillCircle(x, y - postH + 2, glowR);

  g.setDepth(y);

  // collider along the lower post so player can't walk through
  createStaticBox(
    scene,
    obstacles,
    x,
    y - postH / 2 + 14,
    postW + 4,
    Math.round(postH * 0.6)
  ).setVisible(false);

  return scene.add.container(x, y).setDepth(y);
}

/** Wooden sign */
export function createSign(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number, y: number, text = "Welcome"
) {
  const g = scene.add.graphics();
  g.fillStyle(0x6d4c41, 1).fillRect(x - 3, y - 24, 6, 28);
  g.fillStyle(0x8d6e63, 1).fillRoundedRect(x - 40, y - 40, 80, 24, 4);
  g.lineStyle(1, 0x3e2723, 0.8).strokeRoundedRect(x - 40, y - 40, 80, 24, 4);
  g.setDepth(y);

  scene.add.text(x, y - 38, text, {
    color: "#3e2723", fontFamily: "Courier New, monospace", fontSize: "12px",
  }).setOrigin(0.5, 0.5).setDepth(y - 20);

  createStaticBox(scene, obstacles, x, y - 8, 70, 14).setVisible(false);
  return scene.add.container(x, y).setDepth(y);
}
