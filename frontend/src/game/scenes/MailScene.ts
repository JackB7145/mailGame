// src/game/scenes/MailScene.ts
import Phaser from "phaser";
import { Music } from "../audio/Music";
import { Customizer, Customization, Accessory } from "../ui/Customizer";
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
    // Load only if not already in the cache.
    if (!this.cache.audio.exists("bgm")) {
      // RELATIVE path so it works under subpaths; file must be in /public/bgm.mp3
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
    // Try immediately if not locked
    if (!this.sound.locked) startMusic();
    // If locked, arm one-shots for the first gesture/unlock
    if (this.sound.locked) {
      const begin = () => {
        startMusic();
        disarm();
      };
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
