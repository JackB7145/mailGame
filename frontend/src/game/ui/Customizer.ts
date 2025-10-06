// src/ui/Customizer.ts
import Phaser from "phaser";

export type Accessory = "none" | "cap" | "visor";
export type Customization = { color: number; accessory: Accessory };

export type CustomizerOptions = {
  initial: Customization;
  onChange: (c: Customization) => void; // fires only on confirm (click/Enter)
  onFinish: () => void;
};

export class Customizer {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;

  // chrome
  private panel!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private startText!: Phaser.GameObjects.Text;

  // preview avatar
  private previewBody!: Phaser.GameObjects.Graphics;
  private previewAcc!: Phaser.GameObjects.Graphics;

  // UI data
  private readonly COLORS: Array<[string, number]> = [
    ["Neon", 0x00ff6a],
    ["Cyan", 0x2de1fc],
    ["Amber", 0xffc400],
    ["Magenta", 0xff3fa4],
    ["White", 0xffffff],
  ];
  private readonly ACCS: Accessory[] = ["none", "cap", "visor"];

  // UI refs
  private uiColorChips: Phaser.GameObjects.Rectangle[] = [];
  private uiColorLabels: Phaser.GameObjects.Text[] = [];
  private uiAccTexts: Phaser.GameObjects.Text[] = [];

  // state
  private section: "color" | "acc" | "start" = "color";
  private focusColorIdx = 0;
  private focusAccIdx = 0;
  private confirmedColorIdx = 0;
  private confirmedAccIdx = 0;

  private current: Customization; // confirmed selection
  private onChange: (c: Customization) => void;
  private onFinish: () => void;

  constructor(scene: Phaser.Scene, opts: CustomizerOptions) {
    this.scene = scene;
    this.onChange = opts.onChange;
    this.onFinish = opts.onFinish;

    // seed from initial (confirmed)
    this.current = { ...opts.initial };
    this.confirmedColorIdx = Math.max(
      0,
      this.COLORS.findIndex(([, hex]) => hex === this.current.color)
    );
    if (this.confirmedColorIdx < 0) this.confirmedColorIdx = 0;

    this.confirmedAccIdx = Math.max(0, this.ACCS.indexOf(this.current.accessory));
    if (this.confirmedAccIdx < 0) this.confirmedAccIdx = 0;

    // initial focus mirrors confirmed
    this.focusColorIdx = this.confirmedColorIdx;
    this.focusAccIdx = this.confirmedAccIdx;

    this.buildUI();
    this.bindKeys();
    this.refreshAll();
  }

  open() { this.container.setVisible(true); }
  close() { this.container.setVisible(false); }
  isOpen() { return this.container.visible; }

  // helpers
  private toHex(n: number) { return `#${(n >>> 0).toString(16).padStart(6, "0")}`; }
  private confirmedColor(): number { return this.COLORS[this.confirmedColorIdx][1]; }
  private focusedColor(): number { return this.COLORS[this.focusColorIdx][1]; }

  private buildUI() {
    const s = this.scene;
    const ui = s.add.container(0, 0).setScrollFactor(0).setDepth(10_000);
    this.container = ui;

    const vw = s.scale.width, vh = s.scale.height;
    const panelW = 520, panelH = 380;

    // backdrop
    ui.add(
      s.add.rectangle(0, 0, vw, vh, 0x000000, 0.6).setOrigin(0).setInteractive()
    );

    // panel + title
    this.panel = s.add
      .rectangle(vw / 2, vh / 2, panelW, panelH, 0x0a0a0a, 1)
      .setInteractive();
    ui.add(this.panel);

    this.titleText = s.add
      .text(vw / 2, vh / 2 - panelH / 2 + 22, "[ Courier Setup ]", {
        color: this.toHex(this.confirmedColor()),
        fontFamily: "Courier New, monospace",
        fontSize: "18px",
      })
      .setOrigin(0.5);
    ui.add(this.titleText);

    // preview
    this.previewBody = s.add.graphics();
    this.previewAcc = s.add.graphics();
    const previewContainer = s.add.container(vw / 2, vh / 2 - 80, [
      this.previewBody,
      this.previewAcc,
    ]);
    ui.add(previewContainer);

    // colors row
    const colorRowY = vh / 2 + 10;
    const startX = vw / 2 - ((this.COLORS.length - 1) * 80) / 2;

    this.COLORS.forEach(([label, fill], i) => {
      const x = startX + i * 80;

      const chip = s.add
        .rectangle(x, colorRowY, 60, 32, fill, 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.confirmColor(i));
      ui.add(chip);
      this.uiColorChips.push(chip);

      const text = s.add
        .text(x, colorRowY + 24, label, {
          color: this.toHex(this.confirmedColor()),
          fontFamily: "Courier New, monospace",
          fontSize: "12px",
        })
        .setOrigin(0.5, 0);
      ui.add(text);
      this.uiColorLabels.push(text);
    });

    // accessories row
    const accY = colorRowY + 80;
    const accStartX = vw / 2 - ((this.ACCS.length - 1) * 140) / 2;

    this.ACCS.forEach((acc, i) => {
      const t = s.add
        .text(accStartX + i * 140, accY, `[ ${acc} ]`, {
          color: this.toHex(this.confirmedColor()),
          fontFamily: "Courier New, monospace",
          fontSize: "18px",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.confirmAccessory(i));
      ui.add(t);
      this.uiAccTexts.push(t);
    });

    // start
    this.startText = s.add
      .text(vw / 2, vh / 2 + panelH / 2 - 30, "Start", {
        color: "#001b0d",
        backgroundColor: this.toHex(this.confirmedColor()),
        fontFamily: "Courier New, monospace",
        fontSize: "18px",
        padding: { left: 16, right: 16, top: 6, bottom: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.finish());
    ui.add(this.startText);
  }

  private bindKeys() {
    this.scene.input.keyboard?.on("keydown", (ev: KeyboardEvent) => {
      if (!this.isOpen()) return;

      let consume = true;
      switch (ev.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          if (this.section === "color") {
            this.focusColorIdx = (this.focusColorIdx + this.COLORS.length - 1) % this.COLORS.length;
          } else if (this.section === "acc") {
            this.focusAccIdx = (this.focusAccIdx + this.ACCS.length - 1) % this.ACCS.length;
          }
          break;

        case "ArrowRight":
        case "d":
        case "D":
          if (this.section === "color") {
            this.focusColorIdx = (this.focusColorIdx + 1) % this.COLORS.length;
          } else if (this.section === "acc") {
            this.focusAccIdx = (this.focusAccIdx + 1) % this.ACCS.length;
          }
          break;

        case "ArrowUp":
        case "w":
        case "W":
          if (this.section === "start") this.section = "acc";
          else if (this.section === "acc") this.section = "color";
          break;

        case "ArrowDown":
        case "s":
        case "S":
          if (this.section === "color") this.section = "acc";
          else if (this.section === "acc") this.section = "start";
          break;

        case "Enter":
          if (this.section === "color") this.confirmColor(this.focusColorIdx);
          else if (this.section === "acc") this.confirmAccessory(this.focusAccIdx);
          else if (this.section === "start") this.finish();
          break;

        case "Tab":
          ev.preventDefault();
          this.section =
            this.section === "color" ? "acc" :
            this.section === "acc" ? "start" : "color";
          break;

        case "Escape":
          this.finish();
          break;

        default:
          consume = false;
      }

      if (consume) {
        ev.preventDefault();
        this.refreshAll(); // redraw preview + highlights + chrome
      }
    });
  }

  // --- confirmations (these are the only places we call onChange) ---
  private confirmColor(i: number) {
    this.confirmedColorIdx = i;
    this.focusColorIdx = i;
    this.current.color = this.COLORS[i][1];
    this.onChange({ ...this.current });
    this.refreshAll();
  }

  private confirmAccessory(i: number) {
    this.confirmedAccIdx = i;
    this.focusAccIdx = i;
    this.current.accessory = this.ACCS[i];
    this.onChange({ ...this.current });
    this.refreshAll();
  }

  private finish() {
    this.close();
    this.onFinish();
  }

  // --- drawing ---
  private refreshAll() {
    this.updatePreview();       // preview follows focus
    this.refreshHighlights();   // chips / labels reflect focus vs confirmed
    this.updateChromeAccent();  // chrome uses confirmed color
  }

  private updatePreview() {
    const fill = this.focusedColor();
    const acc = this.ACCS[this.focusAccIdx];

    this.previewBody.clear();
    this.previewAcc.clear();

    // body
    this.previewBody.fillStyle(fill, 1).fillCircle(0, 0, 24);
    const rim = this.darken(fill, 0.75);
    this.previewBody.lineStyle(3, rim, 0.85).strokeCircle(0, 0, 24);

    // accessory
    if (acc === "cap") {
      this.previewAcc.fillStyle(this.darken(fill, 0.6), 1).fillCircle(0, -14, 12);
      this.previewAcc.fillRect(-12, -14, 24, 6);
    } else if (acc === "visor") {
      this.previewAcc.fillStyle(this.lighten(fill, 0.5), 0.9).fillRect(-18, -6, 36, 10);
    }
  }

  private refreshHighlights() {
    const accent = this.focusedColor();
    const accentHex = this.toHex(accent);

    // Color chips
    this.uiColorChips.forEach((chip, i) => {
      const isConfirmed = i === this.confirmedColorIdx;
      const isFocused = i === this.focusColorIdx && this.section === "color";
      if (isConfirmed) chip.setStrokeStyle(5, 0xffffff, 1);
      else if (isFocused) chip.setStrokeStyle(4, accent, 1);
      else chip.setStrokeStyle(2, 0x1b5e20, 0.8); // dim
    });

    this.uiColorLabels.forEach((t, i) => {
      const isConfirmed = i === this.confirmedColorIdx;
      const isFocused = i === this.focusColorIdx && this.section === "color";
      t.setColor(isConfirmed ? "#ffffff" : isFocused ? accentHex : "#00ff6a");
    });

    // Accessory labels
    this.uiAccTexts.forEach((t, i) => {
      const isConfirmed = i === this.confirmedAccIdx;
      const isFocused = i === this.focusAccIdx && this.section === "acc";
      if (isConfirmed) t.setColor("#ffffff");
      else if (isFocused) t.setColor(accentHex);
      else t.setColor("#00ff6a");
    });

    // Start button focus state (just brighten when 'start' focused)
    this.startText.setBackgroundColor(
      this.section === "start" ? this.toHex(this.lighten(this.confirmedColor(), 0.2)) :
                                 this.toHex(this.confirmedColor())
    );
  }

  private updateChromeAccent() {
    const conf = this.confirmedColor();
    const hex = this.toHex(conf);
    this.panel.setStrokeStyle(2, conf, 1);
    this.titleText.setColor(hex);
  }

  // color math
  private darken(color: number, f: number) {
    const r = ((color >> 16) & 255) * f;
    const g = ((color >> 8) & 255) * f;
    const b = (color & 255) * f;
    return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
  }
  private lighten(color: number, f: number) {
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    const nr = Math.min(255, r + (255 - r) * f);
    const ng = Math.min(255, g + (255 - g) * f);
    const nb = Math.min(255, b + (255 - b) * f);
    return ((nr & 255) << 16) | ((ng & 255) << 8) | (nb & 255);
  }
}
