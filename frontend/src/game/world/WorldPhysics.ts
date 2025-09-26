import Phaser from "phaser";
import { addWorldFence } from "../objects/world"; // if you still have this, fine; else remove.

export function createPhysicsWorld(scene: Phaser.Scene, W: number, H: number) {
  scene.physics.world.setBounds(0, 0, W, H);
  const obstacles = scene.physics.add.staticGroup();
  addWorldFence(scene, obstacles, W, H);
  return obstacles;
}

// Export a tiny helper so object creators can add colliders easily.
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
