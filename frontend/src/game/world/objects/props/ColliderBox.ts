import Phaser from "phaser";
import { BaseObject, WorldObject, StaticBodyWithOffsets } from "../BaseObjects";
import { ObjectFactory } from "../objectFactory";
import { Item } from "../../layout";

export class ColliderBox extends BaseObject {
  private debugGraphic?: Phaser.GameObjects.Graphics;
  private body: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };

  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    w = 16,
    h = 16
  ) {
    super(scene, obstacles, "collider", x, y);

    // Create a real rectangle collider
    this.body = this.addStaticBox(0, 0, w, h) as Phaser.GameObjects.Rectangle & {
      body: Phaser.Physics.Arcade.StaticBody;
    };

    // Hide it visually; it's a physics-only box
    this.body.setVisible(false);

    // Optional debug overlay
    this.debugGraphic = this.addGraphics((g) => {
      g.fillStyle(0xff0000, 0.3).fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(1, 0xff0000, 0.8).strokeRect(-w / 2, -h / 2, w, h);
    });

    const inEditor = (scene as any).editor !== undefined;
    this.debugGraphic.setVisible(!!inEditor);
  }

  /**
   * Override: create a static Rectangle instead of an Image.
   */
  protected addStaticBox(dx: number, dy: number, w: number, h: number): StaticBodyWithOffsets {
    const rect = this.scene.add.rectangle(
      this.container.x + dx,
      this.container.y + dy,
      w,
      h,
      0x000000,
      0 // fully transparent
    ) as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody } & {
      __dx: number;
      __dy: number;
    };

    this.scene.physics.add.existing(rect, true);
    const body = rect.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(w, h);
    body.updateFromGameObject();

    rect.__dx = dx;
    rect.__dy = dy;
    rect.setOrigin(0.5, 0.5);
    rect.setDepth(this.container.y);

    this.obstacles.add(rect as unknown as Phaser.GameObjects.GameObject);
    this.staticBodies.push(rect as unknown as StaticBodyWithOffsets);

    return rect;
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
