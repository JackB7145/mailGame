// src/game/Game.ts
import Phaser from "phaser";
import { IntroScene } from "./scenes/IntroScene";
import { MailScene } from "./scenes/MailScene";

export function startGame(parent: string | HTMLElement) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#000000",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: screen.width,
      height: screen.height,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    audio: {
      disableWebAudio: false,
      noAudio: false,
    },
    scene: [IntroScene, MailScene],
  };

  // eslint-disable-next-line no-new
  new Phaser.Game(config);
}
