import Phaser from "phaser";
import { Music } from "../audio/music";

export type VolumeSliderOptions = {
  width?: number;
  height?: number;
  label?: string;
};

export function createVolumeSlider(
  scene: Phaser.Scene,
  opts: VolumeSliderOptions = {}
) {
  const w = Math.max(40, Math.floor(opts.width ?? 140));
  const h = Math.max(6, Math.floor(opts.height ?? 8));
  const labelText = opts.label ?? "Vol";

  const c = scene.add.container(0, 0).setScrollFactor(0);

  // Panel
  const panel = scene.add.graphics();
  panel.fillStyle(0x000000, 0.35).fillRoundedRect(-12, -10, w + 64, 40, 8);
  panel.lineStyle(1, 0xffffff, 0.15).strokeRoundedRect(-12, -10, w + 64, 40, 8);
  c.add(panel);

  // Label
  const label = scene.add.text(0, 0, labelText, {
    color: "#ffffff",
    fontFamily: "Courier New, monospace",
    fontSize: "14px",
  }).setOrigin(0, 0.5);
  label.setInteractive({ cursor: "pointer" });
  c.add(label);

  // Track / fill / thumb
  const trackX = 40;
  const track = scene.add.graphics().setPosition(trackX, 0);
  const fill  = scene.add.graphics().setPosition(trackX, 0);
  const thumb = scene.add.graphics().setPosition(trackX, 0);

  const drawTrack = () => {
    track.clear();
    track.fillStyle(0xffffff, 0.25).fillRoundedRect(0, -h/2, w, h, 4);
    track.lineStyle(1, 0xffffff, 0.2).strokeRoundedRect(0, -h/2, w, h, 4);
  };
  const drawFill = (p: number) => {
    const ww = Math.round(w * p); // allow 0 width for true mute
    fill.clear();
    if (ww > 0) fill.fillStyle(0xffffff, 0.65).fillRoundedRect(0, -h/2, ww, h, 4);
  };
  const drawThumb = (p: number) => {
    const tx = Math.round(w * p);
    thumb.clear();
    thumb.fillStyle(0xffffff, 1).fillCircle(tx, 0, 6);
    thumb.lineStyle(2, 0x222222, 0.8).strokeCircle(tx, 0, 6);
  };

  let value = typeof Music.getVolume === "function" ? Music.getVolume() : 0.5;
  drawTrack(); drawFill(value); drawThumb(value);

  // Hit zone
  const hit = scene.add.zone(trackX, 0, w, 24).setOrigin(0, 0.5);
  hit.setScrollFactor(0);
  hit.setInteractive({ cursor: "pointer" });

  c.add([track, fill, thumb, hit]);

  const applyValue = (v: number) => {
    value = Phaser.Math.Clamp(v, 0, 1);
    drawFill(value);
    drawThumb(value);
    Music.setVolume?.(value, scene, 60);
  };

  const setFromPointer = (p: Phaser.Input.Pointer) => {
    const b = hit.getBounds(); // screen-space bounds
    const clamped = Phaser.Math.Clamp(p.x - b.left, 0, b.width);
    applyValue(clamped / b.width);
  };

  hit.on("pointerdown", (p: Phaser.Input.Pointer) => setFromPointer(p));
  hit.on("pointermove", (p: Phaser.Input.Pointer) => { if (p.isDown) setFromPointer(p); });

  // mute toggle
  label.on("pointerdown", () => {
    const newV = value > 0 ? 0 : 0.5;
    applyValue(newV);
  });

  // Provide a tiny API
  (c as any).setValue = (v: number) => applyValue(v);
  (c as any).getValue = () => value;

  return c;
}
