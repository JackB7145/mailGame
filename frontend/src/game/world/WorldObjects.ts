import Phaser from "phaser";
import { Item } from "./layout"; // just for type safety
import { FACTORY_MAP } from "./objects";
import { WorldObject } from "./objects/BaseObjects"; 

/** Export this so MailScene (or Game.ts) can import the type */
export type Interactables = {
  compose: WorldObject;
  inbox: WorldObject;
  wardrobe: WorldObject;
};

/**
 * Create all world objects from an array of items (loaded from JSON).
 * 
 * @param scene - Phaser scene
 * @param obstacles - StaticGroup for colliders
 * @param items - Array of map items (from JSON or editor export)
 */
export function createWorldObjects(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  items: Item[]
): Interactables {
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

    // special interactables (references kept for gameplay)
    if (item.t === "bench") compose = obj;
    if (item.t === "mailbox") inbox = obj;
    if (item.t === "wardrobe") wardrobe = obj;
  }

  return { compose, inbox, wardrobe };
}
