import Phaser from "phaser";

export type FullscreenButtonOptions = {
  width?: number;   // outer panel width
  height?: number;  // outer panel height
  corner?: number;  // panel radius
  hint?: string;    // optional label (unused by default)
};

export function createFullscreenButton(
  scene: Phaser.Scene,
  opts: FullscreenButtonOptions = {}
) {
  const W = Math.max(28, Math.floor(opts.width ?? 36));
  const H = Math.max(20, Math.floor(opts.height ?? 28));
  const R = Math.max(6, Math.floor(opts.corner ?? 8));

  const c = scene.add.container(0, 0).setScrollFactor(0);

  // background panel
  const panel = scene.add.graphics();
  const drawPanel = (alpha = 0.35) => {
    panel.clear();
    panel.fillStyle(0x000000, alpha).fillRoundedRect(0, 0, W, H, R);
    panel.lineStyle(1, 0xffffff, 0.15).strokeRoundedRect(0, 0, W, H, R);
  };
  drawPanel();
  c.add(panel);

  // icon (drawn with lines so we can tweak on state)
  const icon = scene.add.graphics();
  const drawIcon = (isFs: boolean) => {
    icon.clear();
    icon.lineStyle(2, 0xffffff, 0.95);

    const pad = 7;
    const x0 = pad, y0 = pad;
    const x1 = W - pad, y1 = H - pad;

    if (!isFs) {
      // "enter fullscreen" – four corner brackets pointing out
      icon.strokePoints([{x:x0,y:y0},{x:x0+6,y:y0}]); // └─
      icon.strokePoints([{x:x0,y:y0},{x:x0,y:y0+6}]);

      icon.strokePoints([{x:x1,y:y0},{x:x1-6,y:y0}]); // ─┘ (top-right)
      icon.strokePoints([{x:x1,y:y0},{x:x1,y:y0+6}]);

      icon.strokePoints([{x:x0,y:y1},{x:x0+6,y:y1}]); // ─┘ (bottom-left mirrored)
      icon.strokePoints([{x:x0,y:y1},{x:x0,y:y1-6}]);

      icon.strokePoints([{x:x1,y:y1},{x:x1-6,y:y1}]); // └─ (bottom-right)
      icon.strokePoints([{x:x1,y:y1},{x:x1,y:y1-6}]);
    } else {
      // "exit fullscreen" – four corner brackets pointing in
      icon.strokePoints([{x:x0+6,y:y0},{x:x0,y:y0}]); // ─┐
      icon.strokePoints([{x:x0,y:y0+6},{x:x0,y:y0}]);

      icon.strokePoints([{x:x1-6,y:y0},{x:x1,y:y0}]); // ┌─
      icon.strokePoints([{x:x1,y:y0+6},{x:x1,y:y0}]);

      icon.strokePoints([{x:x0+6,y:y1},{x:x0,y:y1}]); // ─┘
      icon.strokePoints([{x:x0,y:y1-6},{x:x0,y:y1}]);

      icon.strokePoints([{x:x1-6,y:y1},{x:x1,y:y1}]); // ┘─
      icon.strokePoints([{x:x1,y:y1-6},{x:x1,y:y1}]);
    }
    icon.setPosition(0, 0);
  };
  drawIcon(scene.scale.isFullscreen);
  c.add(icon);

  // hit zone
  const hit = scene.add.zone(0, 0, W, H).setOrigin(0, 0);
  hit.setScrollFactor(0);
  hit.setInteractive({ cursor: "pointer" });
  c.add(hit);

  // hover affordance
  hit.on("pointerover", () => drawPanel(0.5));
  hit.on("pointerout",  () => drawPanel(0.35));

  const toggle = () => {
    if (!scene.scale.isFullscreen) scene.scale.startFullscreen();
    else scene.scale.stopFullscreen();
  };
  hit.on("pointerdown", toggle);

  // react to external fullscreen changes (F11, ESC, etc.)
  const onEnter = () => drawIcon(true);
  const onLeave = () => drawIcon(false);
  scene.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, onEnter);
  scene.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, onLeave);

  // make container report a real size for HUD anchoring
  c.setSize(W, H);

  // cleanup
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, onEnter);
    scene.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, onLeave);
  });

  // tiny API if you ever need it
  (c as any).setFocused = (b: boolean) => drawPanel(b ? 0.5 : 0.35);

  return c;
}
