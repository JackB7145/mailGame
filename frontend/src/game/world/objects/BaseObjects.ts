import Phaser from "phaser";

/** Minimal runtime contract every world object exposes */
export interface WorldObject {
  readonly kind: string;
  readonly container: Phaser.GameObjects.Container;
  setPosition(x: number, y: number): void;
  destroy(): void;
}

/** Extend Phaser’s static body with offset metadata */
type StaticBodyWithOffsets = Phaser.Types.Physics.Arcade.ImageWithStaticBody & {
  __dx: number;
  __dy: number;
};

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

  // NOTE: include `obstacles` in the ctor and keep it on the instance
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

    // keep static bodies aligned (we store the original offset in __dx/__dy)
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
   * Create a static physics box at world coords, relative to this.container’s position.
   * Call without passing the obstacles; we use the instance’s group.
   */
  protected addStaticBox(dx: number, dy: number, w: number, h: number) {
    const img = this.scene.physics.add.staticImage(
      this.container.x + dx,
      this.container.y + dy, 
      ""
    ) as StaticBodyWithOffsets;

    // remember relative offsets so we can move the body when the object moves
    img.__dx = dx;
    img.__dy = dy;

    (img.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h);
    (img.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    img.setDepth(this.container.y);

    this.obstacles.add(img as unknown as Phaser.GameObjects.GameObject);
    this.staticBodies.push(img);
    return img;
  }

  destroy() {
    this.staticBodies.forEach((b) => b.destroy());
    this.staticBodies = [];
    this.container.destroy(true);
  }
}
