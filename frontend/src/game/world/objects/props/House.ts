// src/game/world/objects/props/House.ts
import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

type DoorPos = "left" | "center" | "right";
type Palette = {
  wall?: number; wallShade?: number; trim?: number;
  roof?: number; roofTrim?: number; window?: number; door?: number;
};

export class House extends BaseObject {
  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number, y: number,
    w: number, h: number,
    opts: { doorPos?: DoorPos; palette?: Palette } = {}
  ) {
    super(scene, obstacles, "house", x, y);

    // 🔹 Normalize JSON scale to reasonable bounds
    const scaleFactor = 0.5; // tweak this until JSON/export matches editor sizes
    w = Math.round(w * scaleFactor);
    h = Math.round(h * scaleFactor);

    const p = {
      wall: 0xA1887F, wallShade: 0x8D6E63, trim: 0x3E2723,
      roof: 0x6D4C41, roofTrim: 0x3E2723, window: 0xCFE8FF, door: 0x4E342E,
      ...(opts.palette ?? {})
    };

    const over = Math.max(8, Math.round(w * 0.06));
    const roofH = Math.max(24, Math.round(h * 0.45));
    const bodyX = -w / 2;
    const bodyY = -h / 2;

    // shadow
    this.addGraphics(g => {
      g.fillStyle(0x000000, 0.15);
      const sw = Math.round(w * 0.9);
      const shH = Math.max(8, Math.round(h * 0.08));
      g.fillEllipse(0, h / 2 + shH * 0.4, sw, shH);
    });

    this.addGraphics(g => {
      g.fillStyle(p.roof, 1);
      g.lineStyle(2, p.roofTrim, 0.9);

      const apexX = 0, apexY = bodyY - roofH;
      const leftX = bodyX - over, rightX = bodyX + w + over, eaveY = bodyY;
      g.beginPath();
      g.moveTo(apexX, apexY);
      g.lineTo(rightX, eaveY);
      g.lineTo(leftX, eaveY);
      g.closePath();
      g.fillPath();
      g.strokePath();

      // eave line
      g.lineStyle(3, p.trim, 0.8);
      g.beginPath();
      g.moveTo(leftX, eaveY);
      g.lineTo(rightX, eaveY);
      g.strokePath();

      // chimney
      const chimW = Math.max(10, Math.round(w * 0.12));
      const chimH = Math.max(16, Math.round(roofH * 0.55));
      const chimX = Math.round(w * 0.22);
      const chimTop = apexY + Math.round(roofH * 0.25);

      g.fillStyle(0x888888, 1); // solid medium grey
      g.fillRect(chimX, chimTop, chimW, chimH);

      g.lineStyle(2, p.roofTrim, 0.9);
      g.strokeRect(chimX, chimTop, chimW, chimH);
    });

    // walls + shade
    this.addGraphics(g => {
      g.fillStyle(p.wall, 1).fillRect(bodyX, bodyY, w, h);
      const shadeW = Math.round(w * 0.33);
      g.fillStyle(p.wallShade, 0.55).fillRect(bodyX, bodyY, shadeW, h);
      g.lineStyle(2, p.trim, 0.8).strokeRect(bodyX, bodyY, w, h);
      g.fillStyle(p.trim, 1).fillRect(bodyX, bodyY - 4, w, 4);
    });

    // windows
    const winW = Math.max(22, Math.round(w * 0.22));
    const winH = Math.max(16, Math.round(winW * 0.75));
    const winY = bodyY + Math.round(h * 0.28);
    const gapX = Math.max(16, Math.round(w * 0.12));
    const addWindow = (wx: number) => this.addGraphics(g => {
      g.fillStyle(p.trim, 1).fillRect(wx - 2, winY - 2, winW + 4, winH + 4);
      g.fillStyle(p.window, 1).fillRect(wx, winY, winW, winH);
      g.lineStyle(1.5, p.trim, 0.9);
      g.beginPath();
      g.moveTo(wx + winW / 2, winY); g.lineTo(wx + winW / 2, winY + winH);
      g.moveTo(wx, winY + winH / 2); g.lineTo(wx + winW, winY + winH / 2);
      g.strokePath();
    });
    addWindow(-gapX - winW / 2);
    addWindow( gapX - winW / 2);

    // door
    const doorW = Math.max(22, Math.round(w * 0.22));
    const doorH = Math.max(40, Math.round(h * 0.48));
    let doorCenterX = 0;
    if (opts.doorPos === "left")  doorCenterX = -Math.round(w * 0.22);
    if (opts.doorPos === "right") doorCenterX =  Math.round(w * 0.22);
    const doorX = Math.round(doorCenterX - doorW / 2);
    const doorY = Math.round(h / 2 - doorH);

    this.addGraphics(g => {
      g.fillStyle(p.trim, 1).fillRect(doorX - 3, doorY - 3, doorW + 6, doorH + 6);
      g.fillStyle(p.door, 1).fillRect(doorX, doorY, doorW, doorH);
      g.fillStyle(0xFFD54F, 1).fillCircle(doorX + doorW - 6, doorY + Math.round(doorH * 0.55), 2);
      const stepH = 4;
      g.fillStyle(0x2f2f2f, 0.8).fillRect(doorX - 6, doorY + doorH, doorW + 12, stepH);
      g.fillStyle(0x262626, 0.9).fillRect(doorX - 10, doorY + doorH + stepH, doorW + 20, stepH);
    });

  }
}

export class HouseFactory implements ObjectFactory {
  readonly type = "house";
  create(scene: Phaser.Scene, obstacles: Phaser.Physics.Arcade.StaticGroup, item: Item): WorldObject {
    const houseItem = item as Extract<Item, { t: "house" }>;
    return new House(
      scene,
      obstacles,
      houseItem.x,
      houseItem.y,
      houseItem.w,
      houseItem.h,
      { doorPos: houseItem.doorPos as DoorPos }
    );
  }
}

