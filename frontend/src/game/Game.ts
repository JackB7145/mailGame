// src/game/Game.ts
import Phaser from "phaser";

type Spawn = { x: number; y: number };
type Accessory = "none" | "cap" | "visor";
type Customization = { color: number; accessory: Accessory };

export class MailScene extends Phaser.Scene {
  static KEY = "mail";

  // world
  private WORLD_W = 3200;
  private WORLD_H = 2200;

  // spawn from Intro
  private spawnFromIntro: Spawn | null = null;

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
  private customizing = true;
  private custom: Customization = { color: 0x00ff6a, accessory: "none" };
  private ui!: { container: Phaser.GameObjects.Container };

  constructor() {
    super(MailScene.KEY);
  }

  // Accept spawn from IntroScene
  init(data: { spawnX?: number; spawnY?: number }) {
    if (typeof data?.spawnX === "number" && typeof data?.spawnY === "number") {
      this.spawnFromIntro = { x: data.spawnX, y: data.spawnY };
    }
  }

  create() {
    // Make sure input goes to the front-most thing (our overlay will swallow clicks)
    this.input.setTopOnly(true);
    // Always enable keyboard/mouse
    const kb = this.input.keyboard;
    if (kb) kb.enabled = true;

    // Load last customization if present
    try {
      const raw = localStorage.getItem("courier:custom");
      if (raw) this.custom = JSON.parse(raw);
    } catch { /* ignore */ }

    // ---------- BACKGROUND ----------
    const bg = this.add.graphics();
    bg.fillStyle(0x86c5ff, 1);
    bg.fillRect(0, 0, this.WORLD_W, 720);
    bg.fillStyle(0x67c161, 1);
    bg.fillRect(0, 720, this.WORLD_W, this.WORLD_H - 720);
    bg.setDepth(0);

    const paths = this.add.graphics();
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
    paths.setDepth(200);

    // ---------- PHYSICS ----------
    this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
    this.obstacles = this.physics.add.staticGroup();
    this.addWorldFence();

    // ---------- WORLD OBJECTS ----------
    this.createHouse(900, 920, 220, 170);
    this.createHouse(1500, 1280, 260, 190);

    this.createTree(1200, 980);
    this.createTree(1260, 1010);
    this.createTree(1600, 1200);
    this.createTree(1625, 1240);

    this.compose = this.createBenchWithQuill(1000, 1080);
    this.inbox   = this.createMailbox(2050, 950);

    // Wardrobe (to reopen customization)
    this.wardrobe = this.createWardrobe(1350, 1120);

    // ---------- PLAYER ----------
    const startX = this.spawnFromIntro?.x ?? 980;
    const startY = this.spawnFromIntro?.y ?? 1040;

    this.playerBody = this.physics.add.image(startX, startY, "").setDepth(startY);
    this.playerBody.setCircle(10);
    this.playerBody.setOffset(-10, -10);
    this.playerBody.setSize(20, 20);
    this.playerBody.setCollideWorldBounds(true);

    this.playerSprite = this.makePlayerSprite(startX, startY, this.custom);
    this.playerSprite.setDepth(startY);

    this.physics.add.collider(this.playerBody, this.obstacles);

    // ---------- INPUT & CAMERA ----------
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
    const hud = this.add.text(12, 12,
      this.customizing ? "Customize your courier…" : "Arrows/WASD to move, E to interact.",
      { color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "14px" }
    ).setScrollFactor(0).setDepth(9999).setName("hud-text");

    // ---------- CUSTOMIZATION OVERLAY ----------
    this.ui = this.buildCustomizationUI();
    this.ui.container.setVisible(true);
    this.customizing = true;
  }

  update() {
    // y-sorted draw order
    const y = this.playerBody.y;
    this.playerSprite.setDepth(y);
    this.playerSprite.x = this.playerBody.x;
    this.playerSprite.y = this.playerBody.y;

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
      if (nearWardrobe) this.openCustomization();
    }
  }

  // ---------------- customization UI (robust clickable) ----------------

  private openCustomization() {
    if (this.ui?.container) {
      this.ui.container.setVisible(true);
      this.customizing = true;
      const hud = this.children.getByName("hud-text") as Phaser.GameObjects.Text;
      if (hud) hud.setText("Customize your courier…");
    }
  }

  private saveCustomization() {
    try { localStorage.setItem("courier:custom", JSON.stringify(this.custom)); } catch {}
  }

  private buildCustomizationUI() {
    const ui = this.add.container(0, 0).setScrollFactor(0).setDepth(10000);
    const vw = this.scale.width, vh = this.scale.height;
    const panelW = 460, panelH = 260;

    // Dimmer that SWALLOWS INPUT (critical for clicks)
    const dim = this.add.rectangle(0, 0, vw, vh, 0x000000, 0.55)
      .setOrigin(0)
      .setInteractive({ useHandCursor: false });
    ui.add(dim);

    // Panel: a plain Rectangle GameObject (NOT graphics) so it has its own hit area
    const panel = this.add.rectangle(vw / 2, vh / 2, panelW, panelH, 0x0a0a0a, 1)
      .setStrokeStyle(2, 0x00ff6a, 1)
      .setInteractive({ useHandCursor: false });
    ui.add(panel);

    // Title
    const title = this.add.text(vw / 2, vh / 2 - panelH / 2 + 22, "[ Courier Setup ]", {
      color: "#00ff6a", fontFamily: "Courier New, monospace", fontSize: "18px",
    }).setOrigin(0.5);
    ui.add(title);

    // --- Color chips (rectangles with proper hit areas) ---
    const colors: Array<[string, number]> = [
      ["Neon",   0x00ff6a],
      ["Cyan",   0x2de1fc],
      ["Amber",  0xffc400],
      ["Magenta",0xff3fa4],
      ["White",  0xffffff],
    ];
    const colorRowY = vh / 2 - 20;
    const startX = vw / 2 - (colors.length - 1) * 60 / 2;

    colors.forEach(([name, col], i) => {
      const x = startX + i * 60;
      const chip = this.add.rectangle(x, colorRowY, 44, 24, col, 1)
        .setStrokeStyle(2, 0x00ff6a)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, colorRowY + 18, name, {
        color: "#00ff6a", fontFamily: "Courier New, monospace", fontSize: "12px",
      }).setOrigin(0.5, 0);

      chip.on("pointerover", () => chip.setStrokeStyle(2, 0xbaffd6));
      chip.on("pointerout",  () => chip.setStrokeStyle(2, 0x00ff6a));
      chip.on("pointerdown", () => {
        this.custom.color = col;
        this.refreshPlayerVisual();
        this.saveCustomization();
      });

      ui.add(chip); ui.add(label);
    });

    // --- Accessory choices (texts with hit areas) ---
    const accs: Accessory[] = ["none", "cap", "visor"];
    const accY = colorRowY + 64;
    const accStartX = vw / 2 - (accs.length - 1) * 80 / 2;

    accs.forEach((acc, i) => {
      const t = this.add.text(accStartX + i * 80, accY, `[${acc}]`, {
        color: "#00ff6a", fontFamily: "Courier New, monospace", fontSize: "14px",
      }).setOrigin(0.5);
      // give it a geometry hit area
      const hit = this.add.zone(t.x, t.y, t.width + 10, t.height + 10)
        .setOrigin(0.5)
        .setRectangleDropZone(t.width + 10, t.height + 10) as Phaser.GameObjects.Zone;
      hit.setInteractive({ useHandCursor: true });

      hit.on("pointerover", () => t.setColor("#baffd6"));
      hit.on("pointerout",  () => t.setColor("#00ff6a"));
      hit.on("pointerdown", () => {
        this.custom.accessory = acc;
        this.refreshPlayerVisual();
        this.saveCustomization();
      });

      ui.add(t); ui.add(hit);
    });

    // --- Start button (explicit interactive) ---
    const start = this.add.text(vw / 2, vh / 2 + panelH / 2 - 26, "Start", {
      color: "#001b0d",
      backgroundColor: "#00ff6a",
      fontFamily: "Courier New, monospace",
      fontSize: "16px",
      padding: { left: 12, right: 12, top: 4, bottom: 4 },
    }).setOrigin(0.5);
    // give it a zone for a reliable hit area
    const startZone = this.add.zone(start.x, start.y, start.width + 16, start.height + 10)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startZone.on("pointerover", () => start.setBackgroundColor("#69f0ae"));
    startZone.on("pointerout",  () => start.setBackgroundColor("#00ff6a"));
    startZone.on("pointerdown", () => {
      ui.setVisible(false);
      this.customizing = false;
      const hud = this.children.getByName("hud-text") as Phaser.GameObjects.Text;
      if (hud) hud.setText("Arrows/WASD to move, E to interact.");
    });

    ui.add(start);
    ui.add(startZone);

    return { container: ui };
  }

  private refreshPlayerVisual() {
    if (this.playerSprite) this.playerSprite.destroy(true);
    this.playerSprite = this.makePlayerSprite(this.playerBody.x, this.playerBody.y, this.custom);
    this.playerSprite.setDepth(this.playerBody.y);
  }

  private makePlayerSprite(x: number, y: number, custom: Customization) {
    const c = this.add.container(x, y);

    // body disk (GameObject Graphics is fine for visuals)
    const g = this.add.graphics();
    g.fillStyle(custom.color, 1);
    g.fillCircle(0, 0, 12);
    g.lineStyle(2, 0x003b23, 0.6);
    g.strokeCircle(0, 0, 12);
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
      g.fillStyle(0x004d40, 1);
      g.fillCircle(0, -6, 7);
      g.fillRect(-6, -6, 12, 4);
    } else if (type === "visor") {
      g.fillStyle(0x1de9b6, 0.9);
      g.fillRect(-9, -4, 18, 6);
    }
    return g;
  }

  // ---------------- world building ----------------

  private strokePolyline(
    g: Phaser.GameObjects.Graphics,
    pts: { x: number; y: number }[]
  ) {
    if (!pts.length) return;
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
  }

  private addWorldFence() {
    const inset = 120;
    const left = inset, right = this.WORLD_W - inset;
    const top = 820, bottom = this.WORLD_H - 120;

    const fence = this.add.graphics();
    fence.lineStyle(4, 0x3e2723, 1);
    fence.strokeRect(left, top, right - left, bottom - top);
    fence.setDepth(top);

    this.createStaticBox((left + right) / 2, top - 4,  right - left, 8).setVisible(false);
    this.createStaticBox((left + right) / 2, bottom + 4, right - left, 8).setVisible(false);
    this.createStaticBox(left - 4,  (top + bottom) / 2, 8, bottom - top).setVisible(false);
    this.createStaticBox(right + 4, (top + bottom) / 2, 8, bottom - top).setVisible(false);
  }

  private createTree(x: number, y: number) {
    // trunk
    const trunk = this.add.graphics();
    trunk.fillStyle(0x795548, 1);
    trunk.fillRect(x - 6, y - 2, 12, 26);
    trunk.setDepth(y - 6);

    // canopy
    const canopy = this.add.graphics();
    canopy.fillStyle(0x2e7d32, 1);
    canopy.fillCircle(x - 10, y - 14, 20);
    canopy.fillCircle(x + 10, y - 14, 20);
    canopy.fillCircle(x,      y - 30, 22);
    canopy.setDepth(y + 12);

    // collision footprint
    this.createStaticBox(x, y + 6, 26, 26).setVisible(false);
  }

  private createHouse(x: number, y: number, w: number, h: number) {
    const g = this.add.graphics();
    g.fillStyle(0x8d6e63, 1);
    g.fillRect(x - w / 2, y - h / 2, w, h);
    g.lineStyle(2, 0x3e2723, 0.6);
    g.strokeRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle(0x6d4c41, 1);
    g.fillRect(x - w / 2, y - h / 2 - 12, w, 22);
    g.fillStyle(0x4e342e, 1);
    g.fillRect(x - 12, y + h / 2 - 40, 24, 40);
    g.fillStyle(0xcfd8dc, 1);
    g.fillRect(x - w / 2 + 18, y - h / 2 + 24, 28, 20);
    g.fillRect(x + w / 2 - 46, y - h / 2 + 24, 28, 20);
    g.setDepth(y);

    this.createStaticBox(x, y, w, h).setVisible(false);
  }

  private createMailbox(x: number, y: number) {
    const g = this.add.graphics();
    g.fillStyle(0x8d6e63, 1);
    g.fillRect(x - 8, y - 40, 16, 80);
    g.fillStyle(0x3b82f6, 1);
    g.fillRoundedRect(x - 26, y - 66, 52, 36, 6);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRoundedRect(x - 26, y - 66, 52, 36, 6);
    g.fillStyle(0xff3b30, 1);
    g.fillRect(x + 14, y - 76, 4, 14);
    g.fillRect(x + 14, y - 76, 18, 4);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(x - 14, y - 56, 28, 18);
    g.lineBetween(x - 14, y - 56, x, y - 47);
    g.lineBetween(x + 14, y - 56, x, y - 47);
    g.setDepth(y);

    this.add.text(x, y - 86, "Inbox", {
      color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
    }).setOrigin(0.5, 1).setDepth(y - 36);

    this.createStaticBox(x, y - 6, 52, 80).setVisible(false);

    const c = this.add.container(x, y);
    c.setDepth(y);
    return c;
  }

  private createBenchWithQuill(x: number, y: number) {
    const g = this.add.graphics();
    g.fillStyle(0x5d4037, 1);
    g.fillRect(x - 42, y + 6, 10, 28);
    g.fillRect(x + 32, y + 6, 10, 28);
    g.fillStyle(0x8d6e63, 1);
    g.fillRect(x - 56, y, 112, 14);
    g.fillRect(x - 56, y - 18, 112, 10);
    g.lineStyle(2, 0x3e2723, 0.5);
    g.strokeRect(x - 56, y, 112, 14);
    g.strokeRect(x - 56, y - 18, 112, 10);

    g.fillStyle(0x263238, 1);
    g.fillRoundedRect(x + 12, y - 2, 16, 14, 3);
    g.fillRect(x + 14, y - 8, 12, 6);

    g.lineStyle(2, 0xffffff, 1);
    const shaft: Array<[number, number]> = [
      [x + 6, y - 3], [x + 0, y - 9], [x - 8, y - 12], [x - 18, y - 13], [x - 28, y - 12],
    ];
    g.beginPath(); g.moveTo(shaft[0][0], shaft[0][1]);
    for (let i = 1; i < shaft.length; i++) g.lineTo(shaft[i][0], shaft[i][1]);
    g.strokePath();

    const barbs: Array<[number, number]> = [
      [x + 0, y - 8], [x - 6, y - 10], [x - 13, y - 11], [x - 21, y - 11],
    ];
    for (const [bx, by] of barbs) {
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 10, by - 4); g.strokePath();
    }

    g.setDepth(y);

    this.add.text(x, y - 36, "Compose", {
      color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
    }).setOrigin(0.5, 1).setDepth(y - 36);

    this.createStaticBox(x, y + 8, 112, 24).setVisible(false);

    const c = this.add.container(x, y);
    c.setDepth(y);
    return c;
  }

  private createWardrobe(x: number, y: number) {
    // A simple wardrobe/cabinet sprite (just shapes)
    const g = this.add.graphics();
    g.fillStyle(0x5d4037, 1);
    g.fillRect(x - 22, y - 40, 44, 80);
    g.lineStyle(2, 0x3e2723, 1);
    g.strokeRect(x - 22, y - 40, 44, 80);
    // handles
    g.fillStyle(0xd7ccc8, 1);
    g.fillCircle(x - 6, y, 2);
    g.fillCircle(x + 6, y, 2);
    g.setDepth(y);

    this.add.text(x, y - 52, "Wardrobe", {
      color: "#ffffff", fontFamily: "Courier New, monospace", fontSize: "12px",
    }).setOrigin(0.5, 1).setDepth(y - 52);

    this.createStaticBox(x, y, 44, 80).setVisible(false);

    const c = this.add.container(x, y);
    c.setDepth(y);
    return c;
  }

  // invisible static collider rectangle
  private createStaticBox(cx: number, cy: number, w: number, h: number) {
    const img = this.physics.add.staticImage(cx, cy, undefined as any);
    (img.body as Phaser.Physics.Arcade.StaticBody).setSize(w, h);
    (img.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    img.setDepth(cy);
    this.obstacles.add(img);
    return img;
  }
}
