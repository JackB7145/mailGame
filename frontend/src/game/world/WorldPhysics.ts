// src/game/world/WorldPhysics.ts
import Phaser from "phaser";

/**
 * Create the physics world and a shared staticGroup for obstacles/colliders.
 */
export function createPhysicsWorld(scene: Phaser.Scene, W: number, H: number) {
  scene.physics.world.setBounds(0, 0, W, H);
  const obstacles = scene.physics.add.staticGroup();

  // add a surrounding fence (visual + colliders)
  addWorldFence(scene, obstacles, W, H);

  return obstacles;
}

/**
 * Invisible static collider rectangle helper.
 */
export function createStaticBox(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  cx: number,
  cy: number,
  w: number,
  h: number
) {
  const img = scene.physics.add.staticImage(cx, cy, undefined as any);
  const body = img.body as Phaser.Physics.Arcade.StaticBody;
  body.setSize(w, h);
  body.updateFromGameObject();
  img.setDepth(cy);
  obstacles.add(img);
  return img;
}

/**
 * World fence (drawn outline + 4 invisible colliders).
 * Keeps the player in-bounds and gives a nice border.
 */
export function addWorldFence(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  W: number,
  H: number
) {
  const inset = 120;
  const left = inset;
  const right = W - inset;
  const top = 820;
  const bottom = H - 120;

  // Optional visual outline (can remove if you only want colliders)
  const fence = scene.add.graphics();
  fence.lineStyle(4, 0x3e2723, 1);
  fence.strokeRect(left, top, right - left, bottom - top);
  fence.setDepth(top);

  // Colliders (thin static boxes just outside the visual rectangle)
  createStaticBox(scene, obstacles, (left + right) / 2, top - 4, right - left, 8).setVisible(false);
  createStaticBox(scene, obstacles, (left + right) / 2, bottom + 4, right - left, 8).setVisible(false);
  createStaticBox(scene, obstacles, left - 4, (top + bottom) / 2, 8, bottom - top).setVisible(false);
  createStaticBox(scene, obstacles, right + 4, (top + bottom) / 2, 8, bottom - top).setVisible(false);
}
