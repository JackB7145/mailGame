import Phaser from "phaser";

export type Keys = {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  E: Phaser.Input.Keyboard.Key;
};

export function createInput(scene: Phaser.Scene): Keys {
  const cursors = scene.input.keyboard!.createCursorKeys();
  const W = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  const A = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  const S = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  const D = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  const E = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  return { cursors, W, A, S, D, E };
}
