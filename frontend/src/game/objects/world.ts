import Phaser from "phaser";

export function addWorldFence(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, worldW: number, worldH: number) {
  const inset = 120;
  const left = inset, right = worldW - inset;
  const top = 820, bottom = worldH - 120;

  const fence = scene.add.graphics();
  fence.lineStyle(4, 0x3e2723, 1).strokeRect(left, top, right - left, bottom - top);
  fence.setDepth(top);

  createStaticBox(scene, obstacles, (left + right) / 2, top - 4, right - left, 8).setVisible(false);
  createStaticBox(scene, obstacles, (left + right) / 2, bottom + 4, right - left, 8).setVisible(false);
  createStaticBox(scene, obstacles, left - 4, (top + bottom) / 2, 8, bottom - top).setVisible(false);
  createStaticBox(scene, obstacles, right + 4, (top + bottom) / 2, 8, bottom - top).setVisible(false);
}

export function createHouse(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number, w: number, h: number) {
  const g = scene.add.graphics();
  g.fillStyle(0x8d6e63, 1).fillRect(x - w / 2, y - h / 2, w, h);
  g.lineStyle(2, 0x3e2723, 0.6).strokeRect(x - w / 2, y - h / 2, w, h);
  g.fillStyle(0x6d4c41, 1).fillRect(x - w / 2, y - h / 2 - 12, w, 22);
  g.fillStyle(0x4e342e, 1).fillRect(x - 12, y + h / 2 - 40, 24, 40);
  g.fillStyle(0xcfd8dc, 1);
  g.fillRect(x - w / 2 + 18, y - h / 2 + 24, 28, 20);
  g.fillRect(x + w / 2 - 46, y - h / 2 + 24, 28, 20);
  g.setDepth(y);

  createStaticBox(scene, obstacles, x, y, w, h).setVisible(false);
}

export function createTree(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number) {
  const trunk = scene.add.graphics();
  trunk.fillStyle(0x795548, 1).fillRect(x - 6, y - 2, 12, 26).setDepth(y - 6);

  const canopy = scene.add.graphics();
  canopy.fillStyle(0x2e7d32, 1);
  canopy.fillCircle(x - 10, y - 14, 20);
  canopy.fillCircle(x + 10, y - 14, 20);
  canopy.fillCircle(x,      y - 30, 22);
  canopy.setDepth(y + 12);

  createStaticBox(scene, obstacles, x, y + 6, 26, 26).setVisible(false);
}

export function createMailbox(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number) {
  const g = scene.add.graphics();
  g.fillStyle(0x8d6e63, 1).fillRect(x - 8, y - 40, 16, 80);
  g.fillStyle(0x3b82f6, 1).fillRoundedRect(x - 26, y - 66, 52, 36, 6);
  g.lineStyle(2, 0xffffff, 1).strokeRoundedRect(x - 26, y - 66, 52, 36, 6);
  g.fillStyle(0xff3b30, 1).fillRect(x + 14, y - 76, 4, 14).fillRect(x + 14, y - 76, 18, 4);
  g.lineStyle(2, 0xffffff, 1);
  g.strokeRect(x - 14, y - 56, 28, 18);
  g.lineBetween(x - 14, y - 56, x, y - 47);
  g.lineBetween(x + 14, y - 56, x, y - 47);
  g.setDepth(y);

  scene.add.text(x, y - 86, "Inbox", {
    color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
  }).setOrigin(0.5, 1).setDepth(y - 36);

  createStaticBox(scene, obstacles, x, y - 6, 52, 80).setVisible(false);

  const c = scene.add.container(x, y);
  c.setDepth(y);
  return c;
}

export function createBenchWithQuill(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number) {
  const g = scene.add.graphics();
  g.fillStyle(0x5d4037, 1).fillRect(x - 42, y + 6, 10, 28).fillRect(x + 32, y + 6, 10, 28);
  g.fillStyle(0x8d6e63, 1).fillRect(x - 56, y, 112, 14).fillRect(x - 56, y - 18, 112, 10);
  g.lineStyle(2, 0x3e2723, 0.5).strokeRect(x - 56, y, 112, 14).strokeRect(x - 56, y - 18, 112, 10);

  g.fillStyle(0x263238, 1).fillRoundedRect(x + 12, y - 2, 16, 14, 3).fillRect(x + 14, y - 8, 12, 6);

  g.lineStyle(2, 0xffffff, 1);
  const shaft: Array<[number, number]> = [[x + 6, y - 3],[x + 0, y - 9],[x - 8, y - 12],[x - 18, y - 13],[x - 28, y - 12]];
  g.beginPath().moveTo(shaft[0][0], shaft[0][1]);
  for (let i = 1; i < shaft.length; i++) g.lineTo(shaft[i][0], shaft[i][1]);
  g.strokePath();
  const barbs: Array<[number, number]> = [[x + 0, y - 8],[x - 6, y - 10],[x - 13, y - 11],[x - 21, y - 11]];
  for (const [bx, by] of barbs) g.beginPath().moveTo(bx, by).lineTo(bx - 10, by - 4).strokePath();

  g.setDepth(y);
  scene.add.text(x, y - 36, "Compose", {
    color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
  }).setOrigin(0.5, 1).setDepth(y - 36);

  createStaticBox(scene, obstacles, x, y + 8, 112, 24).setVisible(false);

  const c = scene.add.container(x, y);
  c.setDepth(y);
  return c;
}

export function createWardrobe(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, x: number, y: number) {
  const g = scene.add.graphics();
  g.fillStyle(0x5d4037, 1).fillRect(x - 22, y - 40, 44, 80);
  g.lineStyle(2, 0x3e2723, 1).strokeRect(x - 22, y - 40, 44, 80);
  g.fillStyle(0xd7ccc8, 1).fillCircle(x - 6, y, 2).fillCircle(x + 6, y, 2);
  g.setDepth(y);

  scene.add.text(x, y - 52, "Wardrobe", {
    color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
  }).setOrigin(0.5, 1).setDepth(y - 52);

  createStaticBox(scene, obstacles, x, y, 44, 80).setVisible(false);

  const c = scene.add.container(x, y);
  c.setDepth(y);
  return c;
}

export function createStaticBox(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  cx: number, cy: number, w: number, h: number
) {
  const img = scene.physics.add.staticImage(cx, cy, undefined as any);
  (img.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h);
  (img.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  img.setDepth(cy);
  obstacles.add(img);
  return img;
}
