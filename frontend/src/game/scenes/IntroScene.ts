// src/game/scenes/IntroScene.ts
import Phaser from "phaser";

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

  // HTMLAudio fallback handle (if WebAudio refuses)
  private htmlBgm?: HTMLAudioElement;

  constructor() { super("intro"); }

  preload() {
    // Use RELATIVE path so subpaths work. File must live at /public/bgm.mp3
    this.load.audio("bgm", ["bgm.mp3"]);
    this.load.on("filecomplete-audio-bgm", () => {
      console.debug("[Intro] bgm loaded:", this.cache.audio.exists("bgm"));
    });
    this.load.on("loaderror", (_key, file: any) => {
      console.warn("[Intro] Load error:", file?.src || _key);
    });
  }

  create() {
    // Safety: ensure WebAudio is enabled in your game config:
    // audio: { disableWebAudio: false, noAudio: false }

    const w = this.scale.width;
    const h = this.scale.height;

    // Launch MailScene underneath; defer its customizer
    const spawn = Phaser.Utils.Array.GetRandom(this.SPAWNS);
    this.scene.launch("mail", { spawnX: spawn.x, spawnY: spawn.y, deferCustomize: true });

    // Build curtains next tick and force this scene on top
    this.time.delayedCall(20, () => {
      this.buildCloudCurtains(w, h);
      this.scene.bringToTop();
    });

    // ---- MUSIC START (bullet-proof) ----
    const startPhaserMusic = () => {
      if (this.sound.get("bgm")) return; // already playing
      try {
        const s = this.sound.add("bgm", { loop: true, volume: 0.45 });
        s.play(); // may throw if still locked
        this.sound.pauseOnBlur = false;
        console.debug("[Intro] WebAudio music started");
      } catch (err) {
        console.warn("[Intro] WebAudio play failed, falling back to HTMLAudio", err);
        this.startHtmlFallback();
      }
    };

    const tryStart = () => {
      if (!this.cache.audio.exists("bgm")) {
        console.warn("[Intro] bgm not in cache yet (load error or wrong path?)");
      }
      if (this.sound.locked) {
        // If locked here, we rely on gesture/unlock below
        console.debug("[Intro] Audio is locked; waiting for gesture/unlock");
        return;
      }
      startPhaserMusic();
    };

    // Try immediately (works if browser isn't locked)
    tryStart();

    // If locked, arm once for any gesture/unlock
    if (this.sound.locked) {
      const hint = this.add.text(
        12, 12, "Click or press any key to enable sound",
        { color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px" }
      ).setScrollFactor(0).setDepth(10000);

      const begin = () => { hint.destroy(); startPhaserMusic(); disarm(); };

      const onUnlock = () => { begin(); };
      const onPointer = () => { begin(); };
      const onKey = () => { begin(); };
      const onTouch = () => { begin(); };

      const disarm = () => {
        this.sound.off("unlocked", onUnlock);
        this.input.off("pointerdown", onPointer);
        this.input.keyboard?.off("keydown", onKey as any);
        window.removeEventListener("touchstart", onTouch as any);
        window.removeEventListener("pointerdown", onPointer as any);
      };

      this.sound.once("unlocked", onUnlock);
      this.input.once("pointerdown", onPointer);
      this.input.keyboard?.once("keydown", onKey as any);
      window.addEventListener("touchstart", onTouch, { once: true, passive: true });
      window.addEventListener("pointerdown", onPointer, { once: true });
    }
    // ------------------------------------
  }

  private startHtmlFallback() {
    if (this.htmlBgm) return;
    try {
      const el = new Audio("bgm.mp3"); // relative path (served from /public)
      el.loop = true;
      el.volume = 0.45;
      el.play().then(() => {
        this.htmlBgm = el;
        console.debug("[Intro] HTMLAudio fallback started");
      }).catch(err => {
        console.error("[Intro] HTMLAudio fallback failed to play", err);
      });
    } catch (e) {
      console.error("[Intro] HTMLAudio fallback error", e);
    }
  }

  private buildCloudCurtains(w: number, h: number) {
    // White backfill to guarantee no gaps during spawn
    this.add.rectangle(0, 0, w, h, 0xffffff, 1)
      .setOrigin(0).setScrollFactor(0).setDepth(9998);

    if (!this.textures.exists("puffBig")) {
      const g = this.add.graphics({ x: 0, y: 0 }).setVisible(false);
      g.fillStyle(0xffffff, 1).fillCircle(128, 128, 128);
      g.generateTexture("puffBig", 256, 256);
      g.destroy();
    }

    this.clouds = this.add.container(0, 0).setDepth(9999);

    const NUM_BIG = 64;
    const NUM_MED = 48;
    const margin  = Math.max(w, h) * 0.9;

    const spawnPuff = (dir: "left" | "right") => {
      const x = Phaser.Math.Between(-margin, w + margin);
      const y = Phaser.Math.Between(-margin * 0.25, h + margin * 0.25);
      const scale = Phaser.Math.FloatBetween(1.6, 3.2);
      const shade = Phaser.Math.Between(232, 255);
      const tint  = (shade << 16) | (shade << 8) | shade;

      const img = this.add.image(x, y, "puffBig")
        .setScale(scale)
        .setTint(tint)
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
          remaining--;
          if (remaining === 0) {
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
