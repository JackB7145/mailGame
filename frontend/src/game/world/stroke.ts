import Phaser from "phaser";

export function strokePolyline(
  g: Phaser.GameObjects.Graphics,
  pts: { x: number; y: number }[]
) {
  if (!pts.length) return;
  g.beginPath().moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}
