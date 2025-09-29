// src/game/world/objects/index.ts
import { ObjectFactory } from "./objectFactory";

// import all factories from props
import { BenchFactory } from "./props/Bench";
import { HouseFactory } from "./props/House";
import { LampFactory } from "./props/Lamp";
import { MailboxFactory } from "./props/MailBox";
import { RocksFactory } from "./props/Rocks";
import { SignFactory } from "./props/Sign";
import { TreeFactory } from "./props/Tree";
import { WardrobeFactory } from "./props/Wardrobe";
import { WaterFactory } from "./props/Water";
import { DirtFactory } from "./props/Dirt";
import { GravelFactory } from "./props/Gravel";
import { PlanksFactory } from "./props/Planks";

// Build the global registry of object factories
export const FACTORY_MAP: Map<string, ObjectFactory> = new Map();

// add to FACTORY_MAP
[
  new BenchFactory(),
  new HouseFactory(),
  new LampFactory(),
  new MailboxFactory(),
  new RocksFactory(),
  new SignFactory(),
  new TreeFactory(),
  new WardrobeFactory(),
  new WaterFactory(),
  new DirtFactory(),
  new GravelFactory(),
  new PlanksFactory(),
].forEach(factory => FACTORY_MAP.set(factory.type, factory));


// Re-export base + types so everything can import from this barrel
export * from "./BaseObjects";
export * from "./objectFactory";
export * from "./props/Bench";
export * from "./props/House";
export * from "./props/Lamp";
export * from "./props/MailBox";
export * from "./props/Rocks";
export * from "./props/Sign";
export * from "./props/Tree";
export * from "./props/Wardrobe";
