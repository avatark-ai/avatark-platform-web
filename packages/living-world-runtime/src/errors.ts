import type { WorldId, LocationId, UserId } from "./types.ts";

// Fields are assigned explicitly in each constructor body, not via
// TypeScript parameter-property shorthand: Node's --experimental-strip-
// types (this repo's test runner, see package.json) only strips types,
// it does not support parameter properties.

export class UnknownWorldError extends Error {
  readonly worldId: WorldId;

  constructor(worldId: WorldId) {
    super(`Unknown world: ${worldId}`);
    this.name = "UnknownWorldError";
    this.worldId = worldId;
  }
}

export class UnknownLocationError extends Error {
  readonly worldId: WorldId;
  readonly locationId: LocationId;

  constructor(worldId: WorldId, locationId: LocationId) {
    super(`World ${worldId} has no location: ${locationId}`);
    this.name = "UnknownLocationError";
    this.worldId = worldId;
    this.locationId = locationId;
  }
}

export class InvalidWorldTransitionError extends Error {
  readonly worldId: WorldId;
  readonly userId: UserId;
  readonly locationId: LocationId;

  constructor(worldId: WorldId, userId: UserId, locationId: LocationId, reason: string) {
    super(`Invalid transition in world ${worldId} to ${locationId}: ${reason}`);
    this.name = "InvalidWorldTransitionError";
    this.worldId = worldId;
    this.userId = userId;
    this.locationId = locationId;
  }
}

export class WorldNotEnteredError extends Error {
  readonly worldId: WorldId;
  readonly userId: UserId;

  constructor(worldId: WorldId, userId: UserId) {
    super(`World ${worldId} has not been entered yet by this user; nothing to resume`);
    this.name = "WorldNotEnteredError";
    this.worldId = worldId;
    this.userId = userId;
  }
}
