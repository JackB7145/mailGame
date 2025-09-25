import Phaser from "phaser";

export type Accessory = "none" | "cap" | "visor";
export type Customization = { color: number; accessory: Accessory };

export type CustomizerOptions = {
  initial: Customization;
  onChange: (c: Customization) => void;
  onFinish: () => void;
};

export class Customizer {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private startText!: Phaser.GameObjects.Text;

  // UI data
  private COLORS: Array<[string, number]> = [
    ["Neon", 0x00ff6a],
    ["Cyan", 0x2de1fc],
    ["Amber", 0xffc400],
    ["Magenta", 0xff3fa4],
    ["White", 0xffffff],
  ];
  private ACCS: Accessory[] = ["none", "cap", "visor"];

  // UI refs
  private uiColors: Phaser.GameObjects.Rectangle[] = [];
  private uiColorLabels: Phaser.GameObjects.Text[] = [];
  private uiAccTexts: Phaser.GameObjects.Text[] = [];

  // Focus vs Confirmed
  private section: "color" | "acc" | "start" = "color";
  private colorIdx = 0;
  private accIdx = 0;
  private confirmedColorIdx = 0; // one confirmed color
  private confirmedAccIdx = 0;   // one confirmed hat

  private current!: Customization;
  private onChange: (c: Customization) => void;
  private onFinish: () => void;

  constructor(scene: Phaser.Scene, opts: CustomizerOptions) {
    this.scene = scene;
    this.onChange = opts.onChange;
    this.onFinish = opts.onFinish;

    // seed from initial
    this.current = { ...opts.initial };
    this.confirmedColorIdx = Math.max(
      0,
      this.COLORS.findIndex(([, hex]) => hex === this.current.color)
    );
    if (this.confirmedColorIdx < 0) this.confirmedColorIdx = 0;

    this.confirmedAccIdx = Math.max(0, this.ACCS.indexOf(this.current.accessory));
    if (this.confirmedAccIdx < 0) this.confirmedAccIdx = 0;

    this.colorIdx = this.confirmedColorIdx;
    this.accIdx = this.confirmedAccIdx;

    this.buildUI();
    this.bindKeys();
    this.refreshHighlight();
  }

  open() { this.container.setVisible(true); }
  close() { this.container.setVisible(false); }
  isOpen() { return this.container.visible; }

  private buildUI() {
    const s = this.scene;
    const ui = s.add.container(0, 0).setScrollFactor(0).setDepth(10000);
    this.container = ui;

    const vw = s.scale.width, vh = s.scale.height;
    const panelW = 520, panelH = 320;

    const dim = s.add.rectangle(0, 0, vw, vh, 0x000000, 0.6).setOrigin(0).setInteractive();
    ui.add(dim);

    const panel = s.add.rectangle(vw / 2, vh / 2, panelW, panelH, 0x0a0a0a, 1)
      .setStrokeStyle(2, 0x00ff6a, 1)
      .setInteractive();
    ui.add(panel);

    ui.add(
      s.add.text(vw / 2, vh / 2 - panelH / 2 + 22, "[ Courier Setup ]", {
        color: "#00ff6a", fontFamily: "Courier New, monospace", fontSize: "18px",
      }).setOrigin(0.5)
    );

    // ----- Colors -----
    const colorRowY = vh / 2 - 42;
    const startX = vw / 2 - ((this.COLORS.length - 1) * 80) / 2;

    this.COLORS.forEach(([label, hex], i) => {
      const x = startX + i * 80;
      const chip = s.add
        .rectangle(x, colorRowY, 60, 32, hex, 1)
        .setStrokeStyle(4, 0x00ff6a, 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          // focus and confirm on click
          this.colorIdx = i;
          this.confirmedColorIdx = i;
          this.current.color = hex;
          this.section = "color";
          this.onChange({ ...this.current });
          this.refreshHighlight();
        });

      const txt = s.add
        .text(x, colorRowY + 24, label, {
          color: "#00ff6a", fontFamily: "Courier New, monospace", fontSize: "12px",
        })
        .setOrigin(0.5, 0);

      ui.add(chip); ui.add(txt);
      this.uiColors.push(chip); this.uiColorLabels.push(txt);
    });

    // ----- Accessories -----
    const accY = colorRowY + 100;
    const accStartX = vw / 2 - ((this.ACCS.length - 1) * 140) / 2;

    this.ACCS.forEach((acc, i) => {
      const t = s.add
        .text(accStartX + i * 140, accY, `[ ${acc} ]`, {
          color: "#00ff6a", fontFamily: "Courier New, monospace", fontSize: "18px",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.accIdx = i;
          this.confirmedAccIdx = i;
          this.current.accessory = this.ACCS[i];
          this.section = "acc";
          this.onChange({ ...this.current });
          this.refreshHighlight();
        });

      ui.add(t);
      this.uiAccTexts.push(t);
    });

    // ----- Start -----
    this.startText = s.add
      .text(vw / 2, vh / 2 + panelH / 2 - 30, "Start", {
        color: "#001b0d",
        backgroundColor: "#00ff6a",
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

      const k = ev.key;
      let consume = true;

      switch (k) {
        case "ArrowLeft":
        case "a":
        case "A":
          if (this.section === "color") this.colorIdx = (this.colorIdx + this.COLORS.length - 1) % this.COLORS.length;
          else if (this.section === "acc") this.accIdx = (this.accIdx + this.ACCS.length - 1) % this.ACCS.length;
          break;

        case "ArrowRight":
        case "d":
        case "D":
          if (this.section === "color") this.colorIdx = (this.colorIdx + 1) % this.COLORS.length;
          else if (this.section === "acc") this.accIdx = (this.accIdx + 1) % this.ACCS.length;
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
          // ENTER confirms the currently focused item in its section
          if (this.section === "color") {
            this.confirmedColorIdx = this.colorIdx;
            const [, hex] = this.COLORS[this.colorIdx];
            this.current.color = hex;
            this.onChange({ ...this.current });
          } else if (this.section === "acc") {
            this.confirmedAccIdx = this.accIdx;
            this.current.accessory = this.ACCS[this.accIdx];
            this.onChange({ ...this.current });
          } else if (this.section === "start") {
            this.finish();
          }
          break;

        case "Tab":
          ev.preventDefault();
          this.section = this.section === "color" ? "acc" : this.section === "acc" ? "start" : "color";
          break;

        case "Escape":
          this.finish();
          break;

        default:
          consume = false;
      }

      if (consume) {
        ev.preventDefault();
        this.refreshHighlight();
      }
    });
  }

  private finish() {
    this.close();
    this.onFinish();
  }

  private refreshHighlight() {
    // Colors: confirmed = WHITE thick stroke + bright label
    //          focused  = NEON green thick stroke
    //          idle     = thin green stroke
    this.uiColors.forEach((chip, i) => {
      const isConfirmed = i === this.confirmedColorIdx;
      const isFocused = i === this.colorIdx && this.section === "color";
      if (isConfirmed) {
        chip.setStrokeStyle(5, 0xffffff, 1);
      } else if (isFocused) {
        chip.setStrokeStyle(4, 0x00ff6a, 1);
      } else {
        chip.setStrokeStyle(2, 0x00ff6a, 1);
      }
    });
    this.uiColorLabels.forEach((t, i) => {
      const isConfirmed = i === this.confirmedColorIdx;
      const isFocused = i === this.colorIdx && this.section === "color";
      t.setColor(isConfirmed ? "#ffffff" : isFocused ? "#baffd6" : "#00ff6a");
    });

    // Accessories: confirmed = white brackets + bright text
    //              focused   = green arrows around
    this.uiAccTexts.forEach((t, i) => {
      const isConfirmed = i === this.confirmedAccIdx;
      const isFocused = i === this.accIdx && this.section === "acc";
      if (isConfirmed) {
        t.setColor("#ffffff");
        t.setText(`[ ${this.ACCS[i]} ]`); // white text stands out
      } else if (isFocused) {
        t.setColor("#baffd6");
        t.setText(`> [ ${this.ACCS[i]} ] <`);
      } else {
        t.setColor("#00ff6a");
        t.setText(`[ ${this.ACCS[i]} ]`);
      }
    });

    // Start: brighter background when focused
    this.startText.setBackgroundColor(this.section === "start" ? "#69f0ae" : "#00ff6a");
  }
}
