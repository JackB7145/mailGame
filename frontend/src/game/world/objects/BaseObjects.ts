import Phaser from "phaser";

/** Minimal runtime contract every world object exposes */
export interface WorldObject {
  readonly kind: string;
  readonly container: Phaser.GameObjects.Container;
  setPosition(x: number, y: number): void;
  destroy(): void;
}

/**
 * Extend any static body (Image or Rectangle) with offset metadata.
 * This lets derived classes choose which shape they want to use.
 */
export type StaticBodyWithOffsets =
  | (Phaser.Types.Physics.Arcade.ImageWithStaticBody & {
      __dx: number;
      __dy: number;
    })
  | (Phaser.GameObjects.Rectangle & {
      body: Phaser.Physics.Arcade.StaticBody;
      __dx: number;
      __dy: number;
    });

/**
 * Base for all world objects.
 * Stores the scene, a container, the obstacles StaticGroup, and any static bodies you create.
 */
export abstract class BaseObject implements WorldObject {
  readonly kind: string;
  readonly scene: Phaser.Scene;
  readonly container: Phaser.GameObjects.Container;

  /** Physics group (colliders) for this world */
  protected readonly obstacles: Phaser.Physics.Arcade.StaticGroup;

  /** Keep refs to static bodies so we can move/cleanup them with the object */
  protected staticBodies: StaticBodyWithOffsets[] = [];

  constructor(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    kind: string,
    x: number,
    y: number
  ) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.kind = kind;

    this.container = scene.add.container(x, y);
    this.container.setDepth(y);
  }

  setPosition(x: number, y: number) {
    this.container.setPosition(x, y);
    this.container.setDepth(y);

    // Keep static bodies aligned (use stored offsets)
    this.staticBodies.forEach((b) => {
      b.setPosition(x + b.__dx, y + b.__dy);
      (b.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      b.setDepth(y);
    });
  }

  /** Add a graphics that is parented to this.container */
  protected addGraphics(make: (g: Phaser.GameObjects.Graphics) => void) {
    const g = this.scene.add.graphics();
    make(g);
    g.removeFromDisplayList();
    this.container.add(g);
    return g;
  }

  protected addText(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
  ) {
    const t = this.scene.add.text(0, 0, text, style);
    t.setOrigin(0.5);
    t.removeFromDisplayList();
    t.setPosition(x, y);
    this.container.add(t);
    return t;
  }

  /**
   * Default static collider box using a staticImage.
   * Derived classes can override this to use Rectangles instead.
   */
  protected addStaticBox(dx: number, dy: number, w: number, h: number): StaticBodyWithOffsets {
    const img = this.scene.physics.add.staticImage(
      this.container.x + dx,
      this.container.y + dy,
      ""
    ) as Phaser.Types.Physics.Arcade.ImageWithStaticBody & {
      __dx: number;
      __dy: number;
    };

    img.__dx = dx;
    img.__dy = dy;

    const body = img.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(w, h);
    body.updateFromGameObject();
    img.setDepth(this.container.y);

    this.obstacles.add(img as unknown as Phaser.GameObjects.GameObject);
    this.staticBodies.push(img);
    return img;
  }

  destroy() {
    this.staticBodies.forEach((b) => {
      this.obstacles.remove(b, true, true);
    });
    this.staticBodies = [];
    this.container.destroy(true);
  }
}
