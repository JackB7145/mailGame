// src/game/world/WorldObjects.ts
import Phaser from "phaser";
import { Item } from "./layout";
import { FACTORY_MAP } from "./objects";
import { WorldObject } from "./objects/BaseObjects";

// Things the game needs quick access to
export type Interactables = {
  compose: WorldObject;
  inbox: WorldObject;
  wardrobe: WorldObject;
};

// Full build handle (used by editor + rebuild)
export type BuildHandles = {
  root: Phaser.GameObjects.Container;
  objects: WorldObject[];
  interactables: Interactables;
};

export function buildFromItems(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  items: Item[]
): BuildHandles {
  const root = scene.add.container(0, 0);
  const objects: WorldObject[] = [];

  let compose!: WorldObject;
  let inbox!: WorldObject;
  let wardrobe!: WorldObject;

  for (const item of items) {
    const factory = FACTORY_MAP.get(item.t);
    if (!factory) {
      console.warn(`No factory registered for type: ${item.t}`);
      continue;
    }

    const obj = factory.create(scene, obstacles, item);
    root.add(obj.container);
    objects.push(obj);

    if (item.t === "bench") compose = obj;
    if (item.t === "mailbox") inbox = obj;
    if (item.t === "wardrobe") wardrobe = obj;
  }

  return { root, objects, interactables: { compose, inbox, wardrobe } };
}

// Wrapper for MailScene (only cares about interactables)
export function createWorldObjects(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  items: Item[]
): Interactables {
  return buildFromItems(scene, obstacles, items).interactables;
}
