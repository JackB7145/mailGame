// src/game/scenes/IntroScene.ts
import Phaser from "phaser";
import { startMusicWithUnlock } from "../systems/MusicStarter"; // shared with MailScene

type Spawn = { x: number; y: number };

export class IntroScene extends Phaser.Scene {
  private clouds!: Phaser.GameObjects.Container;

  private SPAWNS: Spawn[] = [
    { x: 1000, y: 1080 },
    { x: 980,  y: 1040 },
    { x: 1500, y: 1280 },
    { x: 2050, y: 950  },
    { x: 1400, y: 1400 },
  ];

  constructor() { super("intro"); }

  preload() {
    // Served from /public/bgm.mp3
    if (!this.cache.audio.exists("bgm")) {
      this.load.audio("bgm", ["bgm.mp3"]);
    }
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Launch MailScene underneath; defer its customizer UI until curtains open
    const spawn = Phaser.Utils.Array.GetRandom(this.SPAWNS);
    this.scene.launch("mail", { spawnX: spawn.x, spawnY: spawn.y, deferCustomize: true });

    // Build curtains next tick and keep this scene on top
    this.time.delayedCall(20, () => {
      this.buildCloudCurtains(w, h);
      this.scene.bringToTop();
    });

    // Start BGM via shared singleton (autoplay-safe; slider will control it)
    startMusicWithUnlock(this, "bgm");
  }

  // ---------- Curtains ----------
  private buildCloudCurtains(w: number, h: number) {
    // backfill
    this.add.rectangle(0, 0, w, h, 0xffffff, 1)
      .setOrigin(0).setScrollFactor(0).setDepth(9998);

    // lazy texture
    if (!this.textures.exists("puffBig")) {
      const g = this.add.graphics({ x: 0, y: 0 }).setVisible(false);
      g.fillStyle(0xffffff, 1).fillCircle(128, 128, 128);
      g.generateTexture("puffBig", 256, 256);
      g.destroy();
    }

    this.clouds = this.add.container(0, 0).setDepth(9999);

    const NUM_BIG = 64, NUM_MED = 48, margin = Math.max(w, h) * 0.9;
    const spawnPuff = (dir: "left" | "right") => {
      const x = Phaser.Math.Between(-margin, w + margin);
      const y = Phaser.Math.Between(-margin * 0.25, h + margin * 0.25);
      const scale = Phaser.Math.FloatBetween(1.6, 3.2);
      const shade = Phaser.Math.Between(232, 255);
      const tint  = (shade << 16) | (shade << 8) | shade;

      const img = this.add.image(x, y, "puffBig")
        .setScale(scale).setTint(tint)
        .setAlpha(Phaser.Math.FloatBetween(0.92, 0.98))
        .setScrollFactor(0);
      img.setData("dir", dir);
      this.clouds.add(img);
    };

    for (let i = 0; i < NUM_BIG; i++) spawnPuff(i % 2 === 0 ? "left" : "right");
    for (let i = 0; i < NUM_MED; i++) spawnPuff(i % 2 === 1 ? "left" : "right");

    this.time.delayedCall(350, () => this.splitCurtains(w));
  }

  private splitCurtains(w: number) {
    if (!this.clouds) {
      this.game.events.emit("ui:open-customizer");
      this.scene.stop();
      return;
    }

    const dur = 1200;
    let remaining = this.clouds.list?.length ?? 0;

    if (remaining === 0) {
      this.game.events.emit("ui:open-customizer");
      this.scene.stop();
      return;
    }

    this.clouds.iterate((obj: Phaser.GameObjects.GameObject) => {
      const img = obj as Phaser.GameObjects.Image;
      const dir: "left" | "right" = img.getData("dir");
      const off = Math.max(w + img.displayWidth * 3, w * 1.5);
      const targetX = dir === "left" ? -off : w + off;

      this.tweens.add({
        targets: img,
        x: targetX,
        alpha: 0.6,
        duration: dur + Phaser.Math.Between(-240, 240),
        ease: "Sine.easeInOut",
        onComplete: () => {
          if (--remaining === 0) {
            const mail = this.scene.get("mail") as any;
            if (mail?.scene?.isActive() && typeof mail.openCustomizer === "function") {
              mail.openCustomizer();
            } else {
              this.game.events.emit("ui:open-customizer");
            }
            this.clouds.destroy(true);
            this.scene.stop();
          }
        },
      });
    });
  }
}
