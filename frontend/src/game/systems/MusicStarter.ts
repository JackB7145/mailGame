import Phaser from "phaser";
import { Music } from "../audio/music";

export function startMusicWithUnlock(scene: Phaser.Scene, key = "bgm") {
  const start = () => Music.play(scene, key, Music.getVolume());

  if (!scene.sound.locked) {
    start();
    return;
  }
  const begin = () => { start(); disarm(); };
  const onUnlock = () => begin();
  const onPointer = () => begin();
  const onKey = () => begin();
  const onTouch = () => begin();
  const disarm = () => {
    scene.sound.off("unlocked", onUnlock);
    scene.input.off("pointerdown", onPointer);
    scene.input.keyboard?.off("keydown", onKey as any);
    window.removeEventListener("touchstart", onTouch as any);
    window.removeEventListener("pointerdown", onPointer as any);
  };
  scene.sound.once("unlocked", onUnlock);
  scene.input.once("pointerdown", onPointer);
  scene.input.keyboard?.once("keydown", onKey as any);
  window.addEventListener("touchstart", onTouch, { once: true, passive: true });
  window.addEventListener("pointerdown", onPointer, { once: true });
}
