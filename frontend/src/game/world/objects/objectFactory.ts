import Phaser from "phaser";
import { Item } from "../layout";
import { WorldObject } from "./BaseObjects";

/**
 * Contract that every object factory must implement.
 * Each factory knows how to build one specific object type.
 */
export interface ObjectFactory {
  readonly type: string;
  create(
    scene: Phaser.Scene,
    obstacles: Phaser.Physics.Arcade.StaticGroup,
    item: Item
  ): WorldObject;
}
