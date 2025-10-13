import Phaser from "phaser";
import { BaseObject, WorldObject } from "../BaseObjects";
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

    // ✅ Use rectangle + static body instead of textureless staticImage
    this.body = this.addStaticBox(0, 0, w, h);

    // Hide rectangle visually — physics only
    this.body.setVisible(false);

    // Debug overlay for editor mode
    this.debugGraphic = this.addGraphics((g) => {
      g.fillStyle(0xff0000, 0.3).fillRect(-w / 2, -h / 2, w, h);
      g.lineStyle(1, 0xff0000, 0.8).strokeRect(-w / 2, -h / 2, w, h);
    });

    // Show if editor active
    const inEditor = (scene as any).editor !== undefined;
    this.debugGraphic.setVisible(!!inEditor);
  }

  /**
   * Creates a static physics rectangle at given offsets relative to container.
   * This fixes the issue where staticImage() produced a zero-sized collider.
   */
  protected addStaticBox(dx: number, dy: number, w: number, h: number) {
    // Make a real geometry rectangle
    const rect = this.scene.add.rectangle(
      this.container.x + dx,
      this.container.y + dy,
      w,
      h,
      0x000000,
      0 // transparent
    ) as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.StaticBody };

    // Add static physics body
    this.scene.physics.add.existing(rect, true);

    const body = rect.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(w, h);
    body.updateFromGameObject();

    rect.setOrigin(0.5, 0.5);
    rect.setDepth(this.container.y);

    // Track body in groups for collision and management
    this.obstacles.add(rect as unknown as Phaser.GameObjects.GameObject);
    this.staticBodies.push(rect);

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
