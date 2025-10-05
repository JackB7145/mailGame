// src/game/scenes/IntroScene.ts
import Phaser from "phaser";
import { startMusicWithUnlock } from "../systems/MusicStarter";

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
    if (!this.cache.audio.exists("bgm")) this.load.audio("bgm", ["bgm.mp3"]);
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    // 1) Build translucent curtains FIRST (prevents flicker)
    this.buildCloudCurtains(w, h);

    // 2) Launch MailScene UNDERNEATH
    const spawn = Phaser.Utils.Array.GetRandom(this.SPAWNS);
    this.scene.launch("mail", { spawnX: spawn.x, spawnY: spawn.y });

    // Keep Intro above Mail
    this.scene.bringToTop();

    startMusicWithUnlock(this, "bgm");
  }

  // ---------- Curtains ----------
  private buildCloudCurtains(w: number, h: number) {
    // DO NOT set this.cameras.main.setBackgroundColor(...) — keep Intro transparent

    // Translucent sky tint so map is visible immediately
    const SKY = 0xAFCBFF;
    const BACKDROP_ALPHA = 0.30; // tweak 0.18..0.38 to taste
    this.add.rectangle(0, 0, w, h, SKY, BACKDROP_ALPHA)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(9998)
      .setBlendMode(Phaser.BlendModes.NORMAL); // ensure normal alpha blend

    // Soft puff texture (lazy-generate)
    if (!this.textures.exists("puffBig")) {
      const g = this.add.graphics({ x: 0, y: 0 }).setVisible(false);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(128, 128, 104);
      g.fillCircle(98, 138, 84);
      g.fillCircle(158, 138, 86);
      g.fillCircle(128, 108, 78);
      g.generateTexture("puffBig", 256, 256);
      g.destroy();
    }

    this.clouds = this.add.container(0, 0).setDepth(9999);

    const NUM_BIG = 64, NUM_MED = 48, margin = Math.max(w, h) * 0.9;

    // Softer clouds so the world reads through
    const spawnPuff = (dir: "left" | "right") => {
      const x = Phaser.Math.Between(-margin, w + margin);
      const y = Phaser.Math.Between(-margin * 0.25, h + margin * 0.25);
      const scale = Phaser.Math.FloatBetween(1.6, 3.0);

      // very subtle shadow (barely-there)
      const shadow = this.add.image(x + 2, y + 3, "puffBig")
        .setScale(scale * 1.01)
        .setTint(0x8CB6E6)
        .setAlpha(0.08)
        .setScrollFactor(0);
      shadow.setData("dir", dir);

      // cloud itself (semi-transparent)
      const img = this.add.image(x, y, "puffBig")
        .setScale(scale)
        .setTint(0xF7FBFF)
        .setAlpha(0.62) // 0.55–0.68 works well
        .setScrollFactor(0);
      img.setData("dir", dir);

      this.clouds.add(shadow);
      this.clouds.add(img);
    };

    for (let i = 0; i < NUM_BIG; i++) spawnPuff(i % 2 === 0 ? "left" : "right");
    for (let i = 0; i < NUM_MED; i++) spawnPuff(i % 2 === 1 ? "left" : "right");

    // Let the clouds sit briefly, then move
    this.time.delayedCall(375, () => this.splitCurtains(w));
  }

  private splitCurtains(w: number) {
    if (!this.clouds) { this.scene.stop(); return; }

    const dur = 1800;
    let remaining = this.clouds.list?.length ?? 0;
    if (remaining === 0) { this.scene.stop(); return; }

    this.clouds.iterate((obj: Phaser.GameObjects.GameObject) => {
      const img = obj as Phaser.GameObjects.Image;
      const dir: "left" | "right" = img.getData("dir");
      const off = Math.max(w + img.displayWidth * 3, w * 1.5);
      const targetX = dir === "left" ? -off : w + off;

      this.tweens.add({
        targets: img,
        x: targetX,
        alpha: 0.50, // stays soft during motion
        duration: dur + Phaser.Math.Between(-240, 240),
        ease: "Sine.easeInOut",
        onComplete: () => {
          if (--remaining === 200) {
            this.clouds.destroy(true);
            this.scene.stop();
          }
        },
      });
    });
  }
}
