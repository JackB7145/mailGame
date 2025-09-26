// src/game/scenes/MailScene.ts
import { Customizer, Customization, Accessory } from "../ui/Customizer";
import Phaser from "phaser";
import { Music } from "../audio/music";
import { Hud } from "../ui/Hud";
import { createVolumeSlider } from "../ui/HudVolumeSlider";
import {
  addWorldFence,
  createBenchWithQuill,
  createHouse,
  createMailbox,
  createTree,
  createWardrobe,
} from "../objects/world";

type Spawn = { x: number; y: number };

export class MailScene extends Phaser.Scene {
  static KEY = "mail";

  private WORLD_W = 3200;
  private WORLD_H = 2200;

  // spawn from intro
  private spawnFromIntro: Spawn | null = null;
  private deferCustomize = false;

  // player
  private playerBody!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private playerSprite!: Phaser.GameObjects.Container;

  // input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;

  // interactables
  private inbox!: Phaser.GameObjects.Container;
  private compose!: Phaser.GameObjects.Container;
  private wardrobe!: Phaser.GameObjects.Container;

  // collisions
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;

  // customization
  private customizing = false;
  private custom: Customization = { color: 0x00ff6a, accessory: "none" };
  private customizer!: Customizer;

  constructor() { super(MailScene.KEY); }

  // ---- AUDIO PRELOAD (idempotent) ----
  preload() {
    if (!this.cache.audio.exists("bgm")) {
      this.load.audio("bgm", ["bgm.mp3"]);
    }
  }

  init(data: { spawnX?: number; spawnY?: number; deferCustomize?: boolean }) {
    if (typeof data?.spawnX === "number" && typeof data?.spawnY === "number") {
      this.spawnFromIntro = { x: data.spawnX, y: data.spawnY };
    }
    this.deferCustomize = !!data?.deferCustomize;
  }

  create() {
    this.input.setTopOnly(true);

    // --- START/ENSURE BACKGROUND MUSIC (loops forever, autoplay-safe) ---
    const startMusic = () => Music.play(this, "bgm", 0.5);
    if (!this.sound.locked) startMusic();
    if (this.sound.locked) {
      const begin = () => { startMusic(); disarm(); };
      const onUnlock = () => begin();
      const onPointer = () => begin();
      const onKey = () => begin();
      const onTouch = () => begin();
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
    // -------------------------------------------------------------------

    // saved customization
    try {
      const raw = localStorage.getItem("courier:custom");
      if (raw) this.custom = JSON.parse(raw);
    } catch {}

    // background layers
    const sky = this.add.graphics().setDepth(0);
    sky.fillStyle(0x86c5ff, 1).fillRect(0, 0, this.WORLD_W, 720);

    const ground = this.add.graphics().setDepth(0);
    ground.fillStyle(0x67c161, 1).fillRect(0, 720, this.WORLD_W, this.WORLD_H - 720);

    const paths = this.add.graphics().setDepth(200);
    paths.lineStyle(64, 0xa8876a, 1);
    this.strokePolyline(paths, [
      { x: 1000, y: 1080 },
      { x: 1400, y: 1080 },
      { x: 2050, y: 950 },
    ]);
    paths.lineStyle(54, 0xa8876a, 1);
    this.strokePolyline(paths, [
      { x: 1000, y: 1080 },
      { x: 1000, y: 1400 },
      { x: 1400, y: 1400 },
    ]);

    // physics world
    this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
    this.obstacles = this.physics.add.staticGroup();
    addWorldFence(this, this.obstacles, this.WORLD_W, this.WORLD_H);

    // world objects (houses/trees/POIs)
    createHouse(this, this.obstacles, 900, 920, 220, 170);
    createHouse(this, this.obstacles, 1500, 1280, 260, 190);

    createTree(this, this.obstacles, 1200, 980);
    createTree(this, this.obstacles, 1260, 1010);
    createTree(this, this.obstacles, 1600, 1200);
    createTree(this, this.obstacles, 1625, 1240);

    this.compose  = createBenchWithQuill(this, this.obstacles, 1000, 1080);
    this.inbox    = createMailbox(this, this.obstacles, 2050, 950);
    this.wardrobe = createWardrobe(this, this.obstacles, 1350, 1120);

    // player spawn
    const startX = this.spawnFromIntro?.x ?? 980;
    const startY = this.spawnFromIntro?.y ?? 1040;

    // physics body used for movement/collision
    this.playerBody = this.physics.add.image(startX, startY, "").setDepth(startY);
    this.playerBody.setCircle(10).setOffset(-10, -10).setSize(20, 20);
    this.playerBody.setCollideWorldBounds(true);

    // visual container (y-sorted) + accessory
    this.playerSprite = this.makePlayerSprite(startX, startY, this.custom);
    this.playerSprite.setDepth(startY);

    this.physics.add.collider(this.playerBody, this.obstacles);

    // input & camera
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
    cam.startFollow(this.playerBody, true, 0.12, 0.12);

    // HUD
    this.add.text(
      12, 12,
      this.deferCustomize ? "…" : "Customize your courier…",
      { color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "14px" }
    ).setScrollFactor(0).setDepth(9999).setName("hud-text");

    // ===== VOLUME SLIDER (HUD) =====
    const addVolumeSlider = (w = 140, h = 8) => {
      const container = this.add.container(0, 0).setScrollFactor(0).setDepth(10000);
      container.setName("volume-slider");

      // panel
      const panel = this.add.graphics();
      panel.fillStyle(0x000000, 0.35).fillRoundedRect(-12, -10, w + 64, 40, 8);
      panel.lineStyle(1, 0xffffff, 0.15).strokeRoundedRect(-12, -10, w + 64, 40, 8);
      container.add(panel);

      // label
      const label = this.add.text(0, 0, "Vol", {
        color: "#ffffff",
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
      }).setOrigin(0, 0.5);
      container.add(label);

      // slider gfx
      const trackX = 40;
      const track = this.add.graphics().setPosition(trackX, 0);
      const fill  = this.add.graphics().setPosition(trackX, 0);
      const thumb = this.add.graphics().setPosition(trackX, 0);

      const drawTrack = () => {
        track.clear();
        track.fillStyle(0xffffff, 0.25).fillRoundedRect(0, -h/2, w, h, 4);
        track.lineStyle(1, 0xffffff, 0.2).strokeRoundedRect(0, -h/2, w, h, 4);
      };
      const drawFill = (p: number) => {
        const ww = Math.max(4, Math.round(w * p));
        fill.clear();
        fill.fillStyle(0xffffff, 0.65).fillRoundedRect(0, -h/2, ww, h, 4);
      };
      const drawThumb = (p: number) => {
        const tx = Math.round(w * p);
        thumb.clear();
        thumb.fillStyle(0xffffff, 1).fillCircle(tx, 0, 6);
        thumb.lineStyle(2, 0x222222, 0.8).strokeCircle(tx, 0, 6);
      };

      let value = (typeof (Music as any).getVolume === "function") ? (Music as any).getVolume() : 0.5;
      drawTrack();
      drawFill(value);
      drawThumb(value);

      // hit zone
      const hit = this.add.zone(trackX, 0, w, 24).setOrigin(0, 0.5);
      hit.setInteractive({ cursor: "pointer" });
      container.add([track, fill, thumb, hit]);

      const applyValue = (v: number) => {
        value = Phaser.Math.Clamp(v, 0, 1);
        drawFill(value);
        drawThumb(value);
        if (typeof (Music as any).setVolume === "function") {
          (Music as any).setVolume(value, this, 60);
        }
      };

     // AFTER (use screen coords + zone bounds)
      hit.setScrollFactor(0);

      const setFromPointer = (p: Phaser.Input.Pointer) => {
        const b = hit.getBounds();                 // screen-space rect
        const clamped = Phaser.Math.Clamp(p.x - b.left, 0, b.width);
        applyValue(clamped / b.width);
      };

      // if hot-reloading, clear old listeners (optional)
      hit.removeAllListeners?.();

      hit.on("pointerdown", (p: Phaser.Input.Pointer) => setFromPointer(p));
      hit.on("pointermove", (p: Phaser.Input.Pointer) => { if (p.isDown) setFromPointer(p); });



      // mute toggle via label
      label.setInteractive({ cursor: "pointer" }).on("pointerdown", () => {
        const newV = value > 0 ? 0 : 0.5;
        applyValue(newV);
      });

      // anchor top-right & keep on resize
      const place = () => {
        container.setPosition(this.scale.width - (w + 88), 28);
      };
      this.scale.on("resize", () => place());
      place();

      return container;
    };

    addVolumeSlider();
    // ===== END VOLUME SLIDER =====

    // customizer overlay
    this.customizer = new Customizer(this, {
      initial: this.custom,
      onChange: (c) => {
        this.custom = c;
        this.refreshPlayerVisual();
        try { localStorage.setItem("courier:custom", JSON.stringify(c)); } catch {}
      },
      onFinish: () => {
        this.customizing = false;
        const hud = this.children.getByName("hud-text") as Phaser.GameObjects.Text;
        if (hud) hud.setText("Arrows/WASD to move, E to interact.");
      },
    });

    if (this.deferCustomize) {
      this.customizing = true;
      this.customizer.close();
      this.game.events.once("ui:open-customizer", () => this.openCustomizer());
    } else {
      this.customizing = true;
      this.customizer.open();
    }
  }

  update() {
    // y-sorted depth & position binding
    const y = this.playerBody.y;
    this.playerSprite.setDepth(y);
    this.playerSprite.setPosition(this.playerBody.x, y);

    if (this.customizing) {
      this.playerBody.setVelocity(0, 0);
      return;
    }

    // movement
    const speed = 230;
    let vx = 0, vy = 0;
    if (this.cursors.left?.isDown || this.keyA.isDown)  vx -= 1;
    if (this.cursors.right?.isDown || this.keyD.isDown) vx += 1;
    if (this.cursors.up?.isDown || this.keyW.isDown)    vy -= 1;
    if (this.cursors.down?.isDown || this.keyS.isDown)  vy += 1;
    if (vx && vy) { const inv = Math.SQRT1_2; vx *= inv; vy *= inv; }
    this.playerBody.setVelocity(vx * speed, vy * speed);

    // interactions
    const nearInbox    = Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, this.inbox.x,    this.inbox.y)    < 64;
    const nearCompose  = Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, this.compose.x,  this.compose.y)  < 64;
    const nearWardrobe = Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, this.wardrobe.x, this.wardrobe.y) < 64;

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (nearInbox)    this.game.events.emit("inbox:interact");
      if (nearCompose)  this.game.events.emit("compose:interact");
      if (nearWardrobe) { this.openCustomizer(); }
    }
  }

  /** Public API so IntroScene can open the customizer after the cloud reveal */
  public openCustomizer() {
    this.customizing = true;
    this.customizer.open();
    const hud = this.children.getByName("hud-text") as Phaser.GameObjects.Text;
    if (hud) hud.setText("Customize your courier…");
  }

  // --- visuals for player ---
  private makePlayerSprite(x: number, y: number, custom: Customization) {
    const c = this.add.container(x, y);

    // body
    const g = this.add.graphics();
    g.fillStyle(custom.color, 1).fillCircle(0, 0, 12);
    g.lineStyle(2, 0x003b23, 0.6).strokeCircle(0, 0, 12);
    c.add(g);

    // accessory
    const acc = this.drawAccessory(custom.accessory);
    if (acc) c.add(acc);

    return c;
  }

  private drawAccessory(type: Accessory) {
    if (type === "none") return null;
    const g = this.add.graphics();
    if (type === "cap") {
      g.fillStyle(0x004d40, 1).fillCircle(0, -6, 7).fillRect(-6, -6, 12, 4);
    } else if (type === "visor") {
      g.fillStyle(0x1de9b6, 0.9).fillRect(-9, -4, 18, 6);
    }
    return g;
  }

  private refreshPlayerVisual() {
    if (this.playerSprite) this.playerSprite.destroy(true);
    this.playerSprite = this.makePlayerSprite(this.playerBody.x, this.playerBody.y, this.custom);
    this.playerSprite.setDepth(this.playerBody.y);
  }

  private strokePolyline(
    g: Phaser.GameObjects.Graphics,
    pts: { x: number; y: number }[]
  ) {
    if (!pts.length) return;
    g.beginPath().moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
  }
}
