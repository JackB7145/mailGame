import Phaser from "phaser";
import { strokePolyline } from "./stroke";

export function createWorldLayers(scene: Phaser.Scene, W: number, H: number) {
  const sky = scene.add.graphics().setDepth(0);
  sky.fillStyle(0x86c5ff, 1).fillRect(0, 0, W, 720);

  const ground = scene.add.graphics().setDepth(0);
  ground.fillStyle(0x67c161, 1).fillRect(0, 720, W, H - 720);

  const paths = scene.add.graphics().setDepth(200);
  paths.lineStyle(64, 0xa8876a, 1);
  strokePolyline(paths, [
    { x: 1000, y: 1080 },
    { x: 1400, y: 1080 },
    { x: 2050, y: 950 },
  ]);
  paths.lineStyle(54, 0xa8876a, 1);
  strokePolyline(paths, [
    { x: 1000, y: 1080 },
    { x: 1000, y: 1400 },
    { x: 1400, y: 1400 },
  ]);
}
