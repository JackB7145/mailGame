import Phaser from "phaser";
import { createStaticBox } from "../WorldPhysics";

export function createHouse(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  x: number, y: number, w: number, h: number,
  opts: {
    doorPos?: "left" | "center" | "right";
    palette?: {
      wall?: number; wallShade?: number; trim?: number;
      roof?: number; roofTrim?: number; window?: number; door?: number;
    };
  } = {}
) {
  const p = {
    wall: 0xA1887F, wallShade: 0x8D6E63, trim: 0x3E2723,
    roof: 0x6D4C41, roofTrim: 0x3E2723, window: 0xCFE8FF, door: 0x4E342E,
    ...(opts.palette ?? {}),
  };

  const over = Math.max(8, Math.round(w * 0.06));
  const roofH = Math.max(24, Math.round(h * 0.45));
  const bodyX = x - w / 2;
  const bodyY = y - h / 2;

  const c = scene.add.container(0, 0).setDepth(y);

  // ground shadow
  {
    const sh = scene.add.graphics();
    sh.fillStyle(0x000000, 0.15);
    const sw = Math.round(w * 0.9);
    const shH = Math.max(8, Math.round(h * 0.08));
    sh.fillEllipse(x, y + h / 2 + shH * 0.4, sw, shH);
    c.add(sh);
  }

  // roof
  {
    const g = scene.add.graphics();
    g.fillStyle(p.roof, 1).lineStyle(2, p.roofTrim, 0.9);

    const apexX = x, apexY = bodyY - roofH;
    const leftX = bodyX - over, rightX = bodyX + w + over, eaveY = bodyY;

    g.beginPath().moveTo(apexX, apexY).lineTo(rightX, eaveY).lineTo(leftX, eaveY).closePath();
    g.fillPath().strokePath();

    g.lineStyle(3, p.trim, 0.8).beginPath().moveTo(leftX, eaveY).lineTo(rightX, eaveY).strokePath();

    const chimW = Math.max(10, Math.round(w * 0.12));
    const chimH = Math.max(16, Math.round(roofH * 0.55));
    const chimX = x + Math.round(w * 0.22);
    const chimTop = apexY + Math.round(roofH * 0.25);
    g.fillStyle((p.roof * 0.95) & 0xffffff, 1).fillRect(chimX, chimTop, chimW, chimH);
    g.lineStyle(2, p.roofTrim, 0.9).strokeRect(chimX, chimTop, chimW, chimH);

    c.add(g);
  }

  // walls + shade + fascia
  {
    const g = scene.add.graphics();
    g.fillStyle(p.wall, 1).fillRect(bodyX, bodyY, w, h);
    const shadeW = Math.round(w * 0.33);
    g.fillStyle(p.wallShade, 0.55).fillRect(bodyX, bodyY, shadeW, h);
    g.lineStyle(2, p.trim, 0.8).strokeRect(bodyX, bodyY, w, h);
    g.fillStyle(p.trim, 1).fillRect(bodyX, bodyY - 4, w, 4);
    c.add(g);
  }

  // windows
  const winW = Math.max(22, Math.round(w * 0.22));
  const winH = Math.max(16, Math.round(winW * 0.75));
  const winY = bodyY + Math.round(h * 0.28);
  const gapX = Math.max(16, Math.round(w * 0.12));
  const addWindow = (cx: number) => {
    const wx = Math.round(cx - winW / 2), wy = winY;
    const gw = scene.add.graphics();
    gw.fillStyle(p.trim, 1).fillRect(wx - 2, wy - 2, winW + 4, winH + 4);
    gw.fillStyle(p.window, 1).fillRect(wx, wy, winW, winH);
    gw.lineStyle(1.5, p.trim, 0.9)
      .beginPath().moveTo(wx + winW / 2, wy).lineTo(wx + winW / 2, wy + winH)
      .moveTo(wx, wy + winH / 2).lineTo(wx + winW, wy + winH / 2).strokePath();
    c.add(gw);
  };
  addWindow(x - gapX);
  addWindow(x + gapX);

  // door + steps
  const doorW = Math.max(22, Math.round(w * 0.22));
  const doorH = Math.max(40, Math.round(h * 0.48));
  let doorCenterX = x;
  if (opts.doorPos === "left")  doorCenterX = x - Math.round(w * 0.22);
  if (opts.doorPos === "right") doorCenterX = x + Math.round(w * 0.22);
  const doorX = Math.round(doorCenterX - doorW / 2);
  const doorY = Math.round(y + h / 2 - doorH);

  {
    const gd = scene.add.graphics();
    gd.fillStyle(p.trim, 1).fillRect(doorX - 3, doorY - 3, doorW + 6, doorH + 6);
    gd.fillStyle(p.door, 1).fillRect(doorX, doorY, doorW, doorH);
    gd.fillStyle(0xFFD54F, 1).fillCircle(doorX + doorW - 6, doorY + Math.round(doorH * 0.55), 2);
    const stepH = 4;
    gd.fillStyle(0x2f2f2f, 0.8).fillRect(doorX - 6, doorY + doorH, doorW + 12, stepH);
    gd.fillStyle(0x262626, 0.9).fillRect(doorX - 10, doorY + doorH + stepH, doorW + 20, stepH);
    c.add(gd);
  }

  createStaticBox(scene, obstacles, x, y, w, h).setVisible(false);
}
