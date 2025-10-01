import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class ColliderBox extends BaseObject {
  private debugGraphic?: Phaser.GameObjects.Graphics;
  private body: Phaser.GameObjects.GameObject;

  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number, y: number,
    w = 16, h = 16
  ) {
    super(scene, obstacles, "collider", x, y);

    // Add the physics body
    this.body = this.addStaticBox(0, 0, w, h);
    (this.body as any).setVisible(false); // physics only

    // Prepare debug graphic
    this.debugGraphic = this.addGraphics((g) => {
      g.fillStyle(0xff0000, 0.3).fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(1, 0xff0000, 0.8).strokeRect(-w / 2, -h / 2, w, h);
    });

    // 👇 If editor is active, show immediately
    const inEditor = (scene as any).editor !== undefined; 
    this.debugGraphic.setVisible(!!inEditor);
  }

  public setDebugVisible(visible: boolean) {
    if (this.debugGraphic) {
      this.debugGraphic.setVisible(visible);
    }
  }
}

export class ColliderBoxFactory implements ObjectFactory {
  readonly type = "collider";

  create(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    item: Item
  ): WorldObject {
    const colliderItem = item as Extract<Item, { t: "collider"; w: number; h: number }>;
    return new ColliderBox(
      scene,
      obstacles,
      colliderItem.x,
      colliderItem.y,
      colliderItem.w,
      colliderItem.h
    );
  }
}
