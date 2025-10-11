// src/game/scenes/MailScene.ts
import Phaser from "phaser";
import { Music } from "../audio/music";
import { Hud } from "../ui/Hud";
import { createVolumeSlider } from "../ui/HudVolumeSlider";
import { createFullscreenButton } from "../ui/widgets/FullscreenButton";

import { Customizer, Customization } from "../ui/Customizer";
import { startMusicWithUnlock } from "../systems/MusicStarter";
import { createWorldLayers } from "../world/WorldLayers";
import { createPhysicsWorld } from "../world/WorldPhysics";
import { buildFromItems, BuildHandles } from "../world/WorldObjects";
import { createInput, Keys } from "../input/InputBindings";
import { PlayerController } from "../player/PlayerController";
import { Item } from "../world/layout";

// ✅ session helpers handle all customization logic
import { loadCustomization, getCustomization, setCustomizationGlobal } from "../state/session";

type Spawn = { x: number; y: number };

export class MailScene extends Phaser.Scene {
  static KEY = "mail";

  private readonly WORLD_W = 3200;
  private readonly WORLD_H = 2200;

  private spawnFromIntro: Spawn | null = null;

  private keys!: Keys;
  private player!: PlayerController;
  private hud!: Hud;

  private customizing = false;
  private custom: Customization = { color: 0x00ff6a, accessory: "none" };
  private customizer!: Customizer;

  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private build!: BuildHandles;
  private mapData: Item[] = [];

  // Pause overlay
  private pauseRoot!: Phaser.GameObjects.Container;
  private pauseVisible = false;

  constructor() {
    super(MailScene.KEY);
  }

  preload() {
    if (!this.cache.audio.exists("bgm")) this.load.audio("bgm", ["bgm.mp3"]);
    this.load.json("map", "maps/mymap.json");
  }

  init(data: { spawnX?: number; spawnY?: number }) {
    if (typeof data?.spawnX === "number" && typeof data?.spawnY === "number") {
      this.spawnFromIntro = { x: data.spawnX, y: data.spawnY };
    }
  }

  create() {
    this.input.setTopOnly(true);

    // Run async setup safely inside IIFE (Phaser doesn't await create())
    (async () => {
      // ✅ Load customization from backend via session (handles cache + accent)
      try {
        const loaded = await loadCustomization();
        if (loaded) this.custom = loaded;
        else {
          const local = getCustomization();
          if (local) this.custom = local;
        }
      } catch (err) {
        console.warn("Customization load failed:", err);
      }

      // ---------- Build world after customization is loaded ----------
      this.mapData = this.cache.json.get("map") ?? [];

      startMusicWithUnlock(this, "bgm");
      createWorldLayers(this, this.WORLD_W, this.WORLD_H);
      this.obstacles = createPhysicsWorld(this, this.WORLD_W, this.WORLD_H);

      this.build = buildFromItems(this, this.obstacles, this.mapData);
      this.add.existing(this.build.root);

      const startX = this.spawnFromIntro?.x ?? 980;
      const startY = this.spawnFromIntro?.y ?? 1040;
      this.player = new PlayerController(this, startX, startY, this.custom);
      this.player.attachColliders(this.obstacles);
      this.player.followWith(this.cameras.main);

      this.keys = createInput(this);
      this.hud = new Hud(this);
      this.addHint("WASD/Arrows to move, E interact, F settings.");

      // ✅ Customizer setup (fully session-integrated)
      this.customizer = new Customizer(this, {
        initial: this.custom,
        onChange: (c) => {
          this.custom = c;
          this.player.setCustomization(c);
          setCustomizationGlobal(c); // updates CSS + backend + caches
        },
        onFinish: () => {
          this.customizing = false;
          this.setHint("WASD/Arrows to move, E interact, F settings.");
        },
      });

      this.customizer.close();
      this.customizing = false;
      this.buildPauseOverlay();

      // Pause overlay toggle
      this.input.keyboard?.on("keydown-F", () => {
        if (this.customizer?.isOpen?.()) return;
        this.togglePauseOverlay();
      });

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.input.keyboard?.removeAllListeners("keydown-F");
      });
    })();
  }

  update() {
    // ✅ guard: prevent running before player is ready
    if (!this.player) return;

    if (this.customizing || this.pauseVisible) {
      this.player.body.setVelocity(0, 0);
      return;
    }

    const k = this.keys;
    this.player.updateMovement({
      left: !!k.cursors.left?.isDown || k.A.isDown,
      right: !!k.cursors.right?.isDown || k.D.isDown,
      up: !!k.cursors.up?.isDown || k.W.isDown,
      down: !!k.cursors.down?.isDown || k.S.isDown,
    });

    if (Phaser.Input.Keyboard.JustDown(k.E)) {
      const p = this.player.body;
      const nearInbox =
        Phaser.Math.Distance.Between(
          p.x,
          p.y,
          this.build.interactables.inbox.container.x,
          this.build.interactables.inbox.container.y
        ) < 64;
      const nearCompose =
        Phaser.Math.Distance.Between(
          p.x,
          p.y,
          this.build.interactables.compose.container.x,
          this.build.interactables.compose.container.y
        ) < 64;
      const nearWardrobe =
        Phaser.Math.Distance.Between(
          p.x,
          p.y,
          this.build.interactables.wardrobe.container.x,
          this.build.interactables.wardrobe.container.y
        ) < 64;

      if (nearInbox) this.game.events.emit("inbox:interact");
      if (nearCompose) this.game.events.emit("compose:interact");
      if (nearWardrobe) this.openCustomizer();
    }
  }

  public openCustomizer() {
    this.customizing = true;
    this.customizer.open();
    this.setHint("Customize your courier…");
  }

  private addHint(text: string) {
    const c = this.hud.addText("hint", text, 12, 12);
    this.hud.anchor("hint", "top-left", 12, 12);
    return c;
  }

  private setHint(text: string) {
    const c = this.hud.get("hint");
    const t = c?.list.find(
      (o) => o instanceof Phaser.GameObjects.Text
    ) as Phaser.GameObjects.Text | undefined;
    t?.setText(text);
  }

  // ----------------- Pause Overlay -----------------
  private buildPauseOverlay() {
    const DIALOG_W = 360;
    const DIALOG_H = 160;

    const root = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(11000)
      .setVisible(false);
    this.pauseRoot = root;

    const dim = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.5)
      .setOrigin(0)
      .setInteractive();
    root.add(dim);

    const panel = this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        DIALOG_W,
        DIALOG_H,
        0x0a0a0a,
        1
      )
      .setStrokeStyle(2, 0xffffff, 0.2)
      .setInteractive();
    root.add(panel);

    const title = this.add
      .text(panel.x, panel.y - DIALOG_H / 2 + 18, "Settings", {
        color: "#ffffff",
        fontFamily: "Courier New, monospace",
        fontSize: "16px",
      })
      .setOrigin(0.5);
    root.add(title);

    const fsBtn = createFullscreenButton(this, { width: 36, height: 28 });
    const vol = createVolumeSlider(this, { width: 180, height: 8, label: "Vol" });

    fsBtn.setPosition(panel.x - 120, panel.y + 20);
    vol.setPosition(panel.x - 60, panel.y + 20);

    root.add(fsBtn);
    root.add(vol);

    const onResize = () => {
      dim.setSize(this.scale.width, this.scale.height);
      panel.setPosition(this.scale.width / 2, this.scale.height / 2);
      title.setPosition(panel.x, panel.y - DIALOG_H / 2 + 18);
      fsBtn.setPosition(panel.x - 120, panel.y + 20);
      vol.setPosition(panel.x - 60, panel.y + 20);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      root.destroy(true);
    });
  }

  private togglePauseOverlay() {
    this.pauseVisible = !this.pauseVisible;
    this.pauseRoot.setVisible(this.pauseVisible);
    this.physics.world.isPaused = this.pauseVisible;
  }
}
