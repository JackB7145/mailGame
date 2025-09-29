import Phaser from "phaser";

export function createWorldLayers(scene: Phaser.Scene, W: number, H: number) {
  const sky = scene.add.graphics().setDepth(0);
  sky.fillStyle(0x86c5ff, 1).fillRect(0, 0, W, 720);

  const ground = scene.add.graphics().setDepth(0);
  ground.fillStyle(0x67c161, 1).fillRect(0, 720, W, H - 720);

}
