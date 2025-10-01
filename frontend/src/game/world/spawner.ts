// src/game/world/spawner.ts
import Phaser from "phaser";
import { Item } from "./layout";
import {
  Tree,
  Rocks,
  Lamp,
  House,
  Bench,
  Mailbox,
  Wardrobe,
  Sign,
  ColliderBox, // 👈 new import
} from "./objects";

export type BuildHandles = {
  root: Phaser.GameObjects.Container;
  interactables: {
    compose?: Phaser.GameObjects.Container;
    inbox?: Phaser.GameObjects.Container;
    wardrobe?: Phaser.GameObjects.Container;
  };
  objects: Array<{ destroy: () => void }>;
};

export function buildFromItems(
  scene: Phaser.Scene,
  obstacles: Phaser.Physics.Arcade.StaticGroup,
  items: Item[]
): BuildHandles {
  const root = scene.add.container(0, 0);
  const interact: BuildHandles["interactables"] = {};
  const objects: Array<{ destroy: () => void }> = [];

  const add = (
    obj?: { container: Phaser.GameObjects.Container; destroy: () => void }
  ) => {
    if (!obj) return;
    root.add(obj.container);
    objects.push(obj);
  };

  for (const it of items) {
    switch (it.t) {
      case "house":
        add(
          new House(scene, obstacles, it.x, it.y, it.w, it.h, {
            doorPos: it.doorPos,
          })
        );
        break;
      case "tree":
        add(new Tree(scene, obstacles, it.x, it.y, it.scale, it.tint));
        break;
      case "rocks":
        add(
          new Rocks(
            scene,
            obstacles,
            it.x,
            it.y,
            it.count,
            it.baseScale,
            it.tint
          )
        );
        break;
      case "lamp":
        add(new Lamp(scene, obstacles, it.x, it.y, it.scale));
        break;
      case "sign":
        add(new Sign(scene, obstacles, it.x, it.y, it.text));
        break;
      case "bench": {
        const o = new Bench(scene, obstacles, it.x, it.y);
        add(o);
        interact.compose = o.container;
        break;
      }
      case "mailbox": {
        const o = new Mailbox(scene, obstacles, it.x, it.y);
        add(o);
        interact.inbox = o.container;
        break;
      }
      case "wardrobe": {
        const o = new Wardrobe(scene, obstacles, it.x, it.y);
        add(o);
        interact.wardrobe = o.container;
        break;
      }
      case "collider": {
        add(new ColliderBox(scene, obstacles, it.x, it.y, it.w, it.h));
        break;
      }
    }
  }

  return { root, interactables: interact, objects };
}
