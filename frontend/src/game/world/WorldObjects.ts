// src/game/world/WorldObjects.ts
import Phaser from "phaser";
import { LAYOUT, Item } from "./layout";
import {
  createTree, createBush,
  createHouse,
  createMailbox, createBenchWithQuill, createWardrobe,
  createRocks, createLamp, createSign,
} from "./objects";

/** Export this so MailScene can import the type */
export type Interactables = {
  compose: Phaser.GameObjects.Container;
  inbox: Phaser.GameObjects.Container;
  wardrobe: Phaser.GameObjects.Container;
};

export function createWorldObjects(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup
): Interactables {
  let compose!: Phaser.GameObjects.Container;
  let inbox!: Phaser.GameObjects.Container;
  let wardrobe!: Phaser.GameObjects.Container;

  const run = (it: Item) => {
    switch (it.t) {
      case "house":
        return createHouse(scene, obstacles, it.x, it.y, it.w, it.h, { doorPos: it.doorPos });
      case "tree":
        return createTree(scene, obstacles, it.x, it.y, it.scale, it.tint);
      case "bush":
        return createBush(scene, obstacles, it.x, it.y, it.scale, it.tint);
      case "rocks":
        return createRocks(scene, obstacles, it.x, it.y, it.count, it.baseScale, it.tint);
      case "lamp":
        return createLamp(scene, obstacles, it.x, it.y, it.scale);
      case "sign":
        return createSign(scene, obstacles, it.x, it.y, it.text);
      case "bench":
        compose = createBenchWithQuill(scene, obstacles, it.x, it.y);
        return compose;
      case "mailbox":
        inbox = createMailbox(scene, obstacles, it.x, it.y);
        return inbox;
      case "wardrobe":
        wardrobe = createWardrobe(scene, obstacles, it.x, it.y);
        return wardrobe;
    }
  };

  for (const item of LAYOUT) run(item);

  return { compose, inbox, wardrobe };
}
