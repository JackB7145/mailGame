import Phaser from "phaser";
import { Customization, Accessory } from "../ui/Customizer";

export class PlayerController {
  readonly body: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private sprite: Phaser.GameObjects.Container;
  private custom: Customization;

  constructor(
    private scene: Phaser.Scene,
    startX: number,
    startY: number,
    initial: Customization
  ) {
    this.custom = initial;

    // physics body
    this.body = scene.physics.add.image(startX, startY, "").setDepth(startY);
    this.body.setCircle(10).setOffset(-10, -10).setSize(20, 20);
    this.body.setCollideWorldBounds(true);

    // visuals
    this.sprite = this.makeSprite(startX, startY, this.custom);
    this.sprite.setDepth(startY);
  }

  attachColliders(obstacles: Phaser.Physics.Arcade.StaticGroup) {
    this.scene.physics.add.collider(this.body, obstacles);
  }

  followWith(cam: Phaser.Cameras.Scene2D.Camera) {
    cam.setBounds(0, 0, this.scene.physics.world.bounds.width, this.scene.physics.world.bounds.height);
    cam.startFollow(this.body, true, 0.12, 0.12);
  }

  setCustomization(c: Customization) {
    this.custom = c;
    this.refreshVisual();
  }

  updateMovement(keys: {
    left: boolean; right: boolean; up: boolean; down: boolean;
  }, speed = 230) {
    let vx = 0, vy = 0;
    if (keys.left)  vx -= 1;
    if (keys.right) vx += 1;
    if (keys.up)    vy -= 1;
    if (keys.down)  vy += 1;
    if (vx && vy) { const inv = Math.SQRT1_2; vx *= inv; vy *= inv; }
    this.body.setVelocity(vx * speed, vy * speed);

    const y = this.body.y;
    this.sprite.setDepth(y);
    this.sprite.setPosition(this.body.x, y);
  }

  destroy() {
    this.sprite.destroy(true);
    this.body.destroy();
  }

  // ----- visuals -----
  private makeSprite(x: number, y: number, custom: Customization) {
    const c = this.scene.add.container(x, y);

    const g = this.scene.add.graphics();
    g.fillStyle(custom.color, 1).fillCircle(0, 0, 12);
    g.lineStyle(2, 0x003b23, 0.6).strokeCircle(0, 0, 12);
    c.add(g);

    const acc = this.drawAccessory(custom.accessory);
    if (acc) c.add(acc);

    return c;
  }

  private drawAccessory(type: Accessory) {
    if (type === "none") return null;
    const g = this.scene.add.graphics();
    if (type === "cap") {
      g.fillStyle(0x004d40, 1).fillCircle(0, -6, 7).fillRect(-6, -6, 12, 4);
    } else if (type === "visor") {
      g.fillStyle(0x1de9b6, 0.9).fillRect(-9, -4, 18, 6);
    }
    return g;
  }

  private refreshVisual() {
    this.sprite.destroy(true);
    this.sprite = this.makeSprite(this.body.x, this.body.y, this.custom);
    this.sprite.setDepth(this.body.y);
  }
}
