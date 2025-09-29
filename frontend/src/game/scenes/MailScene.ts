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
import { createWorldObjects, Interactables } from "../world/WorldObjects";
import { createInput, Keys } from "../input/InputBindings";
import { PlayerController } from "../player/PlayerController";

// editor
import { Item } from "../world/layout";
import { SceneEditor } from "../editor";

type Spawn = { x: number; y: number };

export class MailScene extends Phaser.Scene {
  static KEY = "mail";

  private readonly WORLD_W = 3200;
  private readonly WORLD_H = 2200;

  private spawnFromIntro: Spawn | null = null;
  private deferCustomize = false;

  private keys!: Keys;
  private player!: PlayerController;
  private hud!: Hud;
  private inter!: Interactables;

  private customizing = false;
  private custom: Customization = { color: 0x00ff6a, accessory: "none" };
  private customizer!: Customizer;

  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private editor?: SceneEditor;

  // ✅ cache the map data once
  private mapData: Item[] = [];

  constructor() {
    super(MailScene.KEY);
  }

  preload() {
    if (!this.cache.audio.exists("bgm")) {
      this.load.audio("bgm", ["bgm.mp3"]);
    }

    // load the JSON map (public/maps/mymap.json)
    this.load.json("map", "maps/mymap.json");
  }

  init(data: { spawnX?: number; spawnY?: number; deferCustomize?: boolean }) {
    if (typeof data?.spawnX === "number" && typeof data?.spawnY === "number") {
      this.spawnFromIntro = { x: data.spawnX, y: data.spawnY };
    }
    this.deferCustomize = !!data?.deferCustomize;
  }

  create() {
    this.input.setTopOnly(true);

    try {
      const raw = localStorage.getItem("courier:custom");
      if (raw) this.custom = JSON.parse(raw);
    } catch {}

    // ✅ store mapData once, fallback to empty array
    this.mapData = this.cache.json.get("map") ?? [];

    startMusicWithUnlock(this, "bgm");
    createWorldLayers(this, this.WORLD_W, this.WORLD_H);
    this.obstacles = createPhysicsWorld(this, this.WORLD_W, this.WORLD_H);

    // build world once from mapData
    this.inter = createWorldObjects(this, this.obstacles, this.mapData);

    const startX = this.spawnFromIntro?.x ?? 980;
    const startY = this.spawnFromIntro?.y ?? 1040;
    this.player = new PlayerController(this, startX, startY, this.custom);
    this.player.attachColliders(this.obstacles);
    this.player.followWith(this.cameras.main);

    this.keys = createInput(this);

    this.hud = new Hud(this);
    this.addHint(this.deferCustomize ? "…" : "Customize your courier…");

    const fsBtn = createFullscreenButton(this, { width: 36, height: 28 });
    this.hud.add("fullscreen", fsBtn);
    this.hud.anchor("fullscreen", "top-right", 24, 24);

    const vol = createVolumeSlider(this, { width: 140, height: 8, label: "Vol" });
    const fsW = Math.round(fsBtn.getBounds().width);
    this.hud.add("volume", vol);
    this.hud.anchor("volume", "top-right", 24 + fsW + 8, 24);

    this.customizer = new Customizer(this, {
      initial: this.custom,
      onChange: (c) => {
        this.custom = c;
        this.player.setCustomization(c);
        try {
          localStorage.setItem("courier:custom", JSON.stringify(c));
        } catch {}
      },
      onFinish: () => {
        this.customizing = false;
        this.setHint("Arrows/WASD to move, E to interact.");
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

    // F10 toggles the editor
    this.input.keyboard?.on("keydown-F10", () => {
      if (this.editor) {
        this.editor.disable();
        this.editor = undefined;
        this.scene.restart({
          spawnX: this.player.body.x,
          spawnY: this.player.body.y,
          deferCustomize: false,
        });
      } else {
        // ✅ reuse the same mapData
        this.editor = new SceneEditor(this, this.obstacles, this.mapData, {
          grid: 20,
          startPalette: "tree",
        });

        this.editor.enable();
        this.setHint(
          "EDIT MODE — E+LMB select/move, LMB place, RMB delete, G/H tools, Ctrl+S save"
        );
      }
    });
  }

  update() {
    if (this.customizing || this.editor) {
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
          this.inter.inbox.container.x,
          this.inter.inbox.container.y
        ) < 64;
      const nearCompose =
        Phaser.Math.Distance.Between(
          p.x,
          p.y,
          this.inter.compose.container.x,
          this.inter.compose.container.y
        ) < 64;
      const nearWardrobe =
        Phaser.Math.Distance.Between(
          p.x,
          p.y,
          this.inter.wardrobe.container.x,
          this.inter.wardrobe.container.y
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
}
