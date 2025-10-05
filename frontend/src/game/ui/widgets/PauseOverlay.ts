import Phaser from "phaser";
import { createVolumeSlider } from "../HudVolumeSlider";
import { createFullscreenButton } from "./FullScreenButton";

export type PauseOverlay = {
  container: Phaser.GameObjects.Container;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
};

export function createPauseOverlay(scene: Phaser.Scene): PauseOverlay {
  const DIALOG_W = 360;
  const DIALOG_H = 160;

  const root = scene.add.container(0, 0).setScrollFactor(0).setDepth(11000);
  root.setVisible(false);

  // dim background (blocks clicks to the game)
  const dim = scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5)
    .setOrigin(0)
    .setInteractive();
  root.add(dim);

  // centered panel
  const panel = scene.add
    .rectangle(scene.scale.width / 2, scene.scale.height / 2, DIALOG_W, DIALOG_H, 0x0a0a0a, 1)
    .setStrokeStyle(2, 0xffffff, 0.2)
    .setInteractive();
  root.add(panel);

  // title
  const title = scene.add
    .text(panel.x, panel.y - DIALOG_H / 2 + 18, "Settings", {
      color: "#ffffff",
      fontFamily: "Courier New, monospace",
      fontSize: "16px",
    })
    .setOrigin(0.5);
  root.add(title);

  // widgets
  const fsBtn = createFullscreenButton(scene, { width: 36, height: 28 });
  const vol   = createVolumeSlider(scene, { width: 180, height: 8, label: "Vol" });

  // layout widgets inside panel
  fsBtn.setPosition(panel.x - 120, panel.y + 20);  // left-ish
  vol.setPosition(panel.x - 60, panel.y + 20);     // to the right of FS button
  root.add(fsBtn);
  root.add(vol);

  // keep sized on resize
  const onResize = () => {
    dim.setSize(scene.scale.width, scene.scale.height);
    panel.setPosition(scene.scale.width / 2, scene.scale.height / 2);
    title.setPosition(panel.x, panel.y - DIALOG_H / 2 + 18);
    fsBtn.setPosition(panel.x - 120, panel.y + 20);
    vol.setPosition(panel.x - 60, panel.y + 20);
  };
  scene.scale.on(Phaser.Scale.Events.RESIZE, onResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, onResize);
    root.destroy(true);
  });

  const open = () => root.setVisible(true);
  const close = () => root.setVisible(false);
  const toggle = () => root.setVisible(!root.visible);
  const isOpen = () => root.visible;

  return { container: root, open, close, toggle, isOpen };
}
